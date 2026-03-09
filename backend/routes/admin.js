const express = require("express");
const { db } = require("../lib/firebase");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// ── Superadmin guard ──────────────────────────────────────────────────────────
async function requireSuperAdmin(req, res, next) {
  try {
    const snap = await db.collection("users").doc(req.user.uid).get();
    if (!snap.exists || snap.data().role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    next();
  } catch (err) {
    console.error("superadmin check error:", err);
    return res.status(500).json({ error: "Failed to verify admin role" });
  }
}

router.use(authenticate, requireSuperAdmin);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const usersRef = db.collection("users");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalSnap, onboardedSnap, last7Snap, last30Snap] = await Promise.all([
      usersRef.count().get(),
      usersRef.where("onboarded", "==", true).count().get(),
      usersRef.where("created_at", ">=", sevenDaysAgo).count().get(),
      usersRef.where("created_at", ">=", thirtyDaysAgo).count().get(),
    ]);

    return res.json({
      totalUsers: totalSnap.data().count,
      onboardedUsers: onboardedSnap.data().count,
      newLast7Days: last7Snap.data().count,
      newLast30Days: last30Snap.data().count,
    });
  } catch (err) {
    console.error("admin stats error:", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ── GET /api/admin/api-usage ──────────────────────────────────────────────────
router.get("/api-usage", async (_req, res) => {
  try {
    const snap = await db.collection("system").doc("api_usage").get();
    const data = snap.exists ? snap.data() : {};

    const alpha = data.alpha_vantage_calls_today ?? 0;
    const yahoo = data.yahoo_finance_calls_today ?? 0;
    const claudeCalls = data.claude_api_calls_today ?? 0;
    const claudeTokens = data.claude_tokens_used_today ?? 0;
    const fsReads = data.firestore_reads_today ?? 0;
    const fsWrites = data.firestore_writes_today ?? 0;

    // Cost estimate: ₹3 per 1k tokens
    const claudeCostInr = ((claudeTokens / 1000) * 3).toFixed(2);

    return res.json({
      alpha_vantage_calls_today: alpha,
      alpha_vantage_limit: 25,
      alpha_vantage_pct: Math.round((alpha / 25) * 100),
      yahoo_finance_calls_today: yahoo,
      claude_api_calls_today: claudeCalls,
      claude_tokens_used_today: claudeTokens,
      claude_cost_inr_today: parseFloat(claudeCostInr),
      firestore_reads_today: fsReads,
      firestore_reads_limit: 50000,
      firestore_reads_pct: Math.round((fsReads / 50000) * 100),
      firestore_writes_today: fsWrites,
      firestore_writes_limit: 20000,
      firestore_writes_pct: Math.round((fsWrites / 20000) * 100),
      last_reset_date: data.last_reset_date ?? null,
    });
  } catch (err) {
    console.error("admin api-usage error:", err);
    return res.status(500).json({ error: "Failed to fetch API usage" });
  }
});

// ── GET /api/admin/top-endpoints ─────────────────────────────────────────────
router.get("/top-endpoints", async (_req, res) => {
  try {
    // Aggregate last 24 hours of logs
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const snap = await db
      .collection("api_logs")
      .where("timestamp", ">=", since)
      .orderBy("timestamp", "desc")
      .limit(2000)
      .get();

    const endpointMap = {};
    snap.docs.forEach((doc) => {
      const { endpoint, method, responseTime } = doc.data();
      const key = `${method} ${endpoint}`;
      if (!endpointMap[key]) {
        endpointMap[key] = { endpoint: key, hits: 0, totalResponseTime: 0 };
      }
      endpointMap[key].hits += 1;
      endpointMap[key].totalResponseTime += responseTime ?? 0;
    });

    const top = Object.values(endpointMap)
      .map((e) => ({
        endpoint: e.endpoint,
        hits: e.hits,
        avgResponseTime: Math.round(e.totalResponseTime / e.hits),
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return res.json(top);
  } catch (err) {
    console.error("admin top-endpoints error:", err);
    return res.status(500).json({ error: "Failed to fetch endpoint stats" });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  const page = Math.max(0, parseInt(req.query.page) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  try {
    const snap = await db
      .collection("users")
      .orderBy("created_at", "desc")
      .offset(page * limit)
      .limit(limit)
      .get();

    const totalSnap = await db.collection("users").count().get();

    const users = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const uid = doc.id;

        const [holdingsSnap, txSnap] = await Promise.all([
          db.collection("users").doc(uid).collection("holdings").count().get(),
          db.collection("users").doc(uid).collection("transactions").count().get(),
        ]);

        return {
          userId: uid,
          name: data.name ?? null,
          email: data.email ?? null,
          city: data.city ?? null,
          createdAt: data.created_at ?? null,
          onboarded: data.onboarded ?? false,
          provider: data.provider ?? "email",
          holdingsCount: holdingsSnap.data().count,
          transactionsCount: txSnap.data().count,
          // passwordHash intentionally excluded
        };
      })
    );

    return res.json({
      users,
      total: totalSnap.data().count,
      page,
      limit,
      totalPages: Math.ceil(totalSnap.data().count / limit),
    });
  } catch (err) {
    console.error("admin users error:", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── GET /api/admin/free-tier-status ──────────────────────────────────────────
router.get("/free-tier-status", async (_req, res) => {
  try {
    const snap = await db.collection("system").doc("api_usage").get();
    const data = snap.exists ? snap.data() : {};

    const fsReads = data.firestore_reads_today ?? 0;
    const fsWrites = data.firestore_writes_today ?? 0;
    const alphaVantage = data.alpha_vantage_calls_today ?? 0;
    const claudeTokens = data.claude_tokens_used_today ?? 0;
    const claudeCostInr = parseFloat(((claudeTokens / 1000) * 3).toFixed(2));

    const WARN_THRESHOLD = 70; // percent

    const services = [
      {
        name: "Firestore Reads",
        used: fsReads,
        limit: 50000,
        unit: "reads/day",
        resetPeriod: "daily",
        pct: Math.round((fsReads / 50000) * 100),
      },
      {
        name: "Firestore Writes",
        used: fsWrites,
        limit: 20000,
        unit: "writes/day",
        resetPeriod: "daily",
        pct: Math.round((fsWrites / 20000) * 100),
      },
      {
        name: "Alpha Vantage",
        used: alphaVantage,
        limit: 25,
        unit: "calls/day",
        resetPeriod: "daily",
        pct: Math.round((alphaVantage / 25) * 100),
      },
      {
        name: "Vercel Functions",
        used: null, // not tracked in Firestore — Vercel dashboard only
        limit: 100000,
        unit: "calls/month",
        resetPeriod: "monthly",
        pct: null,
        note: "Check Vercel dashboard for current usage",
      },
      {
        name: "Claude API",
        used: claudeTokens,
        limit: null, // pay-per-use, no hard limit
        unit: "tokens today",
        resetPeriod: "daily",
        pct: null,
        costInr: claudeCostInr,
        note: `₹${claudeCostInr} estimated cost today`,
      },
    ];

    const hasWarning = services.some((s) => s.pct !== null && s.pct >= WARN_THRESHOLD);

    return res.json({ services, hasWarning, warnThreshold: WARN_THRESHOLD });
  } catch (err) {
    console.error("admin free-tier-status error:", err);
    return res.status(500).json({ error: "Failed to fetch free tier status" });
  }
});

// ── GET /api/admin/logs ───────────────────────────────────────────────────────
router.get("/logs", async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100));
  try {
    const snap = await db
      .collection("api_logs")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const logs = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        endpoint: d.endpoint,
        method: d.method,
        userId: d.userId,
        responseTime: d.responseTime,
        statusCode: d.statusCode,
        timestamp: d.timestamp?.toDate?.()?.toISOString() ?? null,
      };
    });

    return res.json(logs);
  } catch (err) {
    console.error("admin logs error:", err);
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
});

module.exports = router;
