const express = require("express");
const { db, admin } = require("../lib/firebase");
const authenticate = require("../middleware/authenticate");
const { fetchStockPrice } = require("../lib/priceService");
const { trackYahooFinanceCall, trackAlphaVantageCall, trackClaudeAPICall } = require("../lib/usageTracker");

const router = express.Router();

const ASSET_TYPES = ["Stocks", "Mutual Funds", "FD", "RD", "Gold", "PPF"];

function calcHolding(h) {
  const currentPrice = h.current_price ?? h.buy_price;
  const invested = h.buy_price * h.units;
  const currentValue = currentPrice * h.units;
  const pnl = currentValue - invested;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
  return { ...h, current_price: currentPrice, invested, currentValue, pnl, pnlPercent };
}

async function getUserHoldings(uid) {
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("holdings")
    .orderBy("purchase_date", "desc")
    .get();
  return snap.docs.map((d) => calcHolding({ id: d.id, ...d.data() }));
}

// GET /api/holdings/summary  — MUST be before /:id
router.get("/summary", authenticate, async (req, res) => {
  try {
    const holdings = await getUserHoldings(req.user.uid);

    const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
    const totalCurrentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalPnL = totalCurrentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Portfolio mix by asset type (for pie chart)
    const assetMap = {};
    holdings.forEach((h) => {
      assetMap[h.asset_type] = (assetMap[h.asset_type] || 0) + h.currentValue;
    });
    const portfolioData = Object.entries(assetMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return res.json({ totalInvested, totalCurrentValue, totalPnL, totalPnLPercent, portfolioData });
  } catch (err) {
    console.error("holdings summary error:", err);
    return res.status(500).json({ error: "Failed to fetch portfolio summary" });
  }
});

// POST /api/holdings/refresh-prices  — MUST be before /:id
router.post("/refresh-prices", authenticate, async (req, res) => {
  try {
    const snap = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("holdings")
      .where("asset_type", "==", "Stocks")
      .get();

    if (snap.empty) return res.json({ updated: 0, results: [] });

    const results = await Promise.all(
      snap.docs.map(async (doc) => {
        const holding = doc.data();
        if (!holding.ticker) return { id: doc.id, status: "skipped", reason: "no ticker" };

        const result = await fetchStockPrice(holding.ticker);
        if (!result) return { id: doc.id, ticker: holding.ticker, status: "failed" };

        // Track which price source was used
        if (result.source === "yahoo") trackYahooFinanceCall();
        else if (result.source === "alpha_vantage") trackAlphaVantageCall();
        else if (result.source === "ai") trackClaudeAPICall(0);

        await doc.ref.update({
          current_price: result.price,
          last_price_updated: admin.firestore.FieldValue.serverTimestamp(),
          price_source: result.source,
        });

        return { id: doc.id, ticker: holding.ticker, price: result.price, source: result.source, status: "updated" };
      })
    );

    const updated = results.filter((r) => r.status === "updated").length;
    return res.json({ updated, results });
  } catch (err) {
    console.error("refresh prices error:", err);
    return res.status(500).json({ error: "Failed to refresh prices" });
  }
});

// GET /api/holdings
router.get("/", authenticate, async (req, res) => {
  try {
    const holdings = await getUserHoldings(req.user.uid);
    return res.json(holdings);
  } catch (err) {
    console.error("list holdings error:", err);
    return res.status(500).json({ error: "Failed to fetch holdings" });
  }
});

// POST /api/holdings
router.post("/", authenticate, async (req, res) => {
  const { asset_type, name, ticker, buy_price, units, purchase_date, current_price } = req.body;

  if (!asset_type || !name || !buy_price || !units || !purchase_date) {
    return res.status(400).json({ error: "asset_type, name, buy_price, units and purchase_date are required" });
  }
  if (!ASSET_TYPES.includes(asset_type)) {
    return res.status(400).json({ error: `asset_type must be one of: ${ASSET_TYPES.join(", ")}` });
  }

  try {
    const ref = db.collection("users").doc(req.user.uid).collection("holdings").doc();
    const holding = {
      id: ref.id,
      asset_type,
      name,
      ticker: asset_type === "Stocks" ? (ticker || "").toUpperCase() : null,
      buy_price: Number(buy_price),
      current_price: current_price ? Number(current_price) : Number(buy_price),
      units: Number(units),
      purchase_date,
      last_price_updated: null,
      price_source: "manual",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(holding);
    return res.status(201).json(calcHolding(holding));
  } catch (err) {
    console.error("create holding error:", err);
    return res.status(500).json({ error: "Failed to create holding" });
  }
});

// PUT /api/holdings/:id
router.put("/:id", authenticate, async (req, res) => {
  const { asset_type, name, ticker, buy_price, units, purchase_date, current_price } = req.body;

  if (!asset_type || !name || !buy_price || !units || !purchase_date) {
    return res.status(400).json({ error: "asset_type, name, buy_price, units and purchase_date are required" });
  }

  try {
    const ref = db.collection("users").doc(req.user.uid).collection("holdings").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Holding not found" });

    const update = {
      asset_type,
      name,
      ticker: asset_type === "Stocks" ? (ticker || "").toUpperCase() : null,
      buy_price: Number(buy_price),
      current_price: current_price ? Number(current_price) : Number(buy_price),
      units: Number(units),
      purchase_date,
      price_source: "manual",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.update(update);
    return res.json(calcHolding({ id: req.params.id, ...snap.data(), ...update }));
  } catch (err) {
    console.error("update holding error:", err);
    return res.status(500).json({ error: "Failed to update holding" });
  }
});

// DELETE /api/holdings/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const ref = db.collection("users").doc(req.user.uid).collection("holdings").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Holding not found" });
    await ref.delete();
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("delete holding error:", err);
    return res.status(500).json({ error: "Failed to delete holding" });
  }
});

module.exports = router;
