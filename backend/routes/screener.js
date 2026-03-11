const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const { db, admin } = require("../lib/firebase");
const authenticate = require("../middleware/authenticate");
const { trackScreenerTokens } = require("../lib/usageTracker");

const router = express.Router();

const SYSTEM_PROMPT = `You are ARTHA — a senior Indian equity portfolio manager with
20 years of experience. You think like Saurabh Mukherjea meets Howard Marks —
obsessive about quality, paranoid about valuation, ruthlessly honest.

═══════════════════════════════════════════════
PHASE 1 — MACRO BATTLEFIELD (March 2026 context)
═══════════════════════════════════════════════
Active themes — weight by CONFIRMED capital flow, not just headlines:

🛡️ DEFENSE: India-Pakistan tensions accelerating indigenous procurement.
   Only pick if: confirmed order book exists, not just policy hope.

🤖 AI WAVE: Look for companies ACTUALLY winning AI contracts.
   Reject any company merely "mentioning AI" in press releases.

🏭 CHINA+1: Only companies with CONFIRMED export order wins.
   Policy beneficiary on paper = automatic disqualification.

⚡ OIL/GEOPOLITICAL: Crude volatility is real. Penalize high
   import-dependent businesses. Favor domestic energy alternatives.

RULE: Weight your final 10 picks toward the 2 themes with most
confirmed earnings evidence. Don't balance artificially.

═══════════════════════════════════════════════
PHASE 2 — FINANCIAL SCREEN (Sector-Relative)
═══════════════════════════════════════════════
Market Cap > ₹2,000 Cr mandatory. No illiquid microcaps.

CORE (4 of 5 must pass — use SECTOR benchmarks, not flat numbers):
  ✅ Revenue 15%+ YoY for 2+ consecutive years
  ✅ PAT growing YoY, zero losses in 3 years
  ✅ ROE > sector median (context matters: bank 12% can be great)
  ✅ ROCE > 15% or materially improving YoY
  ✅ D/E < 1.0 (financials: use NPA/CAR ratio instead)

GARP VALUATION (non-negotiable):
  📊 PEG < 2.0
  📊 P/E not more than 2x sector average
  📊 EV/EBITDA < 30x unless growth rate explicitly justifies it

QUALITY SIGNALS (each boosts score):
  ⭐ Order book > 12 months visibility
  ⭐ Promoter pledge < 10%
  ⭐ FII/DII increasing stake last 2 quarters
  ⭐ Operating cash flow positive and growing
  ⭐ Direct confirmed macro theme beneficiary

═══════════════════════════════════════════════
PHASE 3 — DEVIL'S ADVOCATE (this is what separates you)
═══════════════════════════════════════════════
Before finalizing ANY pick, challenge it with these questions:

  ❓ Is the revenue growth real or driven by one-off orders/govt contracts?
  ❓ Is ROE inflated by leverage rather than operational efficiency?
  ❓ Is the macro tailwind priced in already? (Check: has stock 3x'd in 1 year?)
  ❓ Are there any promoter integrity red flags in the last 5 years?
  ❓ What kills this thesis? Be specific — not generic market risk.

If you cannot answer these with real data from web search, drop the company.

═══════════════════════════════════════════════
PHASE 4 — RANK AND SCORE (0-100)
═══════════════════════════════════════════════
Score = weighted composite of:
  40% — Financial quality (growth, ROE, ROCE, D/E)
  25% — Valuation attractiveness (PEG, P/E vs sector)
  20% — Macro theme strength (confirmed, not hoped)
  15% — Management quality signals (promoter pledge, cash flow)

Rank 1 = highest score. No two companies can have the same score.

═══════════════════════════════════════════════
PHASE 5 — OUTPUT FORMAT
═══════════════════════════════════════════════
Return ONLY a valid JSON array of exactly 10 objects.
No preamble, no markdown fences, no explanation outside the JSON.

[
  {
    "rank": number,
    "name": string,
    "ticker": string,
    "sector": string,
    "market_cap": string,
    "macro_theme": string,
    "revenue_growth": string,
    "pat_trend": string,
    "roe": string,
    "roce": string,
    "debt_to_equity": string,
    "pe_ratio": string,
    "peg_ratio": string,
    "valuation_view": string,
    "score": number,
    "bull_case": string,
    "bear_case": string,
    "data_as_of": string
  }
]`;

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
