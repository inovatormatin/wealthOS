const express = require("express");
const { db, admin } = require("../lib/firebase");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// Helper — fetch all transactions for a user (filtering done in JS to avoid composite index requirements)
async function getUserTransactions(uid) {
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("transactions")
    .orderBy("date", "desc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// GET /api/transactions/dashboard  — MUST be before /:id
router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const txs = await getUserTransactions(req.user.uid);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Current month stats
    const currentTxs = txs.filter((t) => t.date.startsWith(currentMonthKey));
    const income = currentTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = currentTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    // 6-month cash flow
    const cashFlow = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const monthTxs = txs.filter((t) => t.date.startsWith(key));
      cashFlow.push({
        month: label,
        inflow: monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        outflow: monthTxs.filter((t) => ["expense", "investment", "savings"].includes(t.type)).reduce((s, t) => s + t.amount, 0),
      });
    }

    // Expense breakdown (current month by category)
    const catMap = {};
    currentTxs
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      });
    const expenseBreakdown = Object.entries(catMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return res.json({
      currentMonth: { income, expenses, netSavings: income - expenses },
      cashFlow,
      expenseBreakdown,
    });
  } catch (err) {
    console.error("dashboard data error:", err);
    return res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// GET /api/transactions?month=YYYY-MM&type=income|expense&category=X
router.get("/", authenticate, async (req, res) => {
  const { month, type, category } = req.query;
  try {
    let txs = await getUserTransactions(req.user.uid);
    if (month) txs = txs.filter((t) => t.date.startsWith(month));
    if (type && type !== "all") txs = txs.filter((t) => t.type === type);
    if (category && category !== "all") txs = txs.filter((t) => t.category === category);
    return res.json(txs);
  } catch (err) {
    console.error("list transactions error:", err);
    return res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// POST /api/transactions
router.post("/", authenticate, async (req, res) => {
  const { type, category, amount, date, note } = req.body;

  if (!type || !category || !amount || !date) {
    return res.status(400).json({ error: "type, category, amount and date are required" });
  }
  if (!["income", "expense", "investment", "savings"].includes(type)) {
    return res.status(400).json({ error: "type must be income, expense, investment, or savings" });
  }
  if (Number(amount) <= 0) {
    return res.status(400).json({ error: "amount must be positive" });
  }

  try {
    const txRef = db
      .collection("users")
      .doc(req.user.uid)
      .collection("transactions")
      .doc();

    const tx = {
      id: txRef.id,
      type,
      category,
      amount: Number(amount),
      date,
      note: note || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await txRef.set(tx);
    return res.status(201).json(tx);
  } catch (err) {
    console.error("create transaction error:", err);
    return res.status(500).json({ error: "Failed to create transaction" });
  }
});

// PUT /api/transactions/:id
router.put("/:id", authenticate, async (req, res) => {
  const { type, category, amount, date, note } = req.body;

  if (!type || !category || !amount || !date) {
    return res.status(400).json({ error: "type, category, amount and date are required" });
  }

  try {
    const txRef = db
      .collection("users")
      .doc(req.user.uid)
      .collection("transactions")
      .doc(req.params.id);

    const snap = await txRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Transaction not found" });

    const update = {
      type,
      category,
      amount: Number(amount),
      date,
      note: note || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await txRef.update(update);
    return res.json({ id: req.params.id, ...update });
  } catch (err) {
    console.error("update transaction error:", err);
    return res.status(500).json({ error: "Failed to update transaction" });
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const txRef = db
      .collection("users")
      .doc(req.user.uid)
      .collection("transactions")
      .doc(req.params.id);

    const snap = await txRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Transaction not found" });

    await txRef.delete();
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("delete transaction error:", err);
    return res.status(500).json({ error: "Failed to delete transaction" });
  }
});

module.exports = router;
