const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const { db, admin } = require("../lib/firebase");
const authenticate = require("../middleware/authenticate");
const { trackScreenerTokens } = require("../lib/usageTracker");

const router = express.Router();

const SYSTEM_PROMPT = `You are a fundamental stock screener for Indian equity markets (NSE/BSE).
Your job is to identify the top 10 publicly listed Indian companies that
show strong fundamentals RIGHT NOW based on the latest available data.
Screening criteria (all must be met):

Revenue growing 15%+ YoY for at least 2 consecutive years
PAT (Profit After Tax) growing YoY — no loss-making year in last 3 years
ROE (Return on Equity) above 15%
ROCE (Return on Capital Employed) above 15%
Debt-to-Equity below 1.0

Use web search to find the latest quarterly results, annual reports, and
screener data from sources like Screener.in, Moneycontrol, NSE India,
or BSE India.
Return ONLY a valid JSON array with exactly 10 objects. No preamble, no
markdown, no explanation outside the JSON. Each object must have:
{
  "rank": number,
  "name": string,
  "ticker": string,
  "sector": string,
  "revenue_growth": string,
  "roe": string,
  "roce": string,
  "pat_trend": string,
  "debt_to_equity": string,
  "score": number,
  "why": string,
  "data_as_of": string
}`;

// ── Superadmin guard ──────────────────────────────────────────────────────────
async function requireSuperAdmin(req, res, next) {
  try {
    const snap = await db.collection("users").doc(req.user.uid).get();
    if (!snap.exists || snap.data().role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    next();
  } catch {
    return res.status(500).json({ error: "Failed to verify admin role" });
  }
}

// ── Claude call with 90-second timeout ───────────────────────────────────────
async function callClaudeScreener() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const apiCall = client.messages.create({
    // model: "claude-sonnet-4-20250514",
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content:
          "Screen the NSE/BSE market right now and return the top 10 fundamentally strong Indian companies as a JSON array matching the required format exactly.",
      },
    ],
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Screener timed out after 90 seconds")), 90000)
  );

  const response = await Promise.race([apiCall, timeout]);

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  return { text, tokensUsed };
}

function parseCompanies(text) {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in Claude response");
  return JSON.parse(jsonMatch[0]);
}

// ── POST /api/admin/screener/run — superadmin only ───────────────────────────
router.post("/run", authenticate, requireSuperAdmin, async (req, res) => {
  try {
    let text, tokensUsed;

    try {
      ({ text, tokensUsed } = await callClaudeScreener());
    } catch (err) {
      return res.status(500).json({ error: `Claude API call failed: ${err.message}` });
    }

    // Parse JSON — retry once on failure
    let companies;
    try {
      companies = parseCompanies(text);
    } catch {
      try {
        ({ text, tokensUsed } = await callClaudeScreener());
        companies = parseCompanies(text);
      } catch {
        return res
          .status(500)
          .json({ error: "Claude returned malformed JSON after retry. Please try again." });
      }
    }

    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(500).json({ error: "No companies returned by screener" });
    }

    // Fire-and-forget usage tracking
    trackScreenerTokens(tokensUsed);

    const payload = {
      companies,
      ran_at: admin.firestore.FieldValue.serverTimestamp(),
      ran_by: req.user.uid,
      total_companies: companies.length,
      tokens_used: tokensUsed,
    };

    // Overwrite screener/latest + append to history in parallel
    await Promise.all([
      db.collection("screener").doc("latest").set(payload),
      db.collection("screener_history").add(payload),
    ]);

    return res.json({
      companies,
      ran_at: new Date().toISOString(),
      ran_by: req.user.uid,
      total_companies: companies.length,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.error("screener run error:", err);
    return res.status(500).json({ error: err.message || "Screener failed" });
  }
});

// ── GET /api/screener/latest — any authenticated user ────────────────────────
router.get("/latest", authenticate, async (_req, res) => {
  try {
    const snap = await db.collection("screener").doc("latest").get();
    if (!snap.exists) {
      return res.json({ companies: [], ran_at: null, never_run: true });
    }
    const d = snap.data();
    return res.json({
      companies: d.companies ?? [],
      ran_at: d.ran_at?.toDate?.()?.toISOString() ?? null,
      ran_by: d.ran_by ?? null,
      total_companies: d.total_companies ?? 0,
    });
  } catch (err) {
    console.error("screener latest error:", err);
    return res.status(500).json({ error: "Failed to fetch screener results" });
  }
});

// ── GET /api/screener/history — superadmin only ──────────────────────────────
router.get("/history", authenticate, requireSuperAdmin, async (_req, res) => {
  try {
    const snap = await db
      .collection("screener_history")
      .orderBy("ran_at", "desc")
      .limit(10)
      .get();

    const history = snap.docs.map((doc) => {
      const d = doc.data();
      const tokens = d.tokens_used ?? 0;
      return {
        id: doc.id,
        ran_at: d.ran_at?.toDate?.()?.toISOString() ?? null,
        ran_by: d.ran_by ?? null,
        total_companies: d.total_companies ?? 0,
        tokens_used: tokens,
        estimated_cost_inr: parseFloat(((tokens / 1000) * 3).toFixed(2)),
        companies: d.companies ?? [],
      };
    });

    return res.json(history);
  } catch (err) {
    console.error("screener history error:", err);
    return res.status(500).json({ error: "Failed to fetch screener history" });
  }
});

module.exports = router;
