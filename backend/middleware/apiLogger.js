const { db, admin } = require("../lib/firebase");

const SYSTEM_DOC = db.collection("system").doc("api_usage");

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

const FRESH_DOC = (today) => ({
  last_reset_date: today,
  alpha_vantage_calls_today: 0,
  yahoo_finance_calls_today: 0,
  claude_api_calls_today: 0,
  claude_tokens_used_today: 0,
  firestore_reads_today: 0,
  firestore_writes_today: 0,
});

function incrementFirestoreCounter(field) {
  const today = getTodayKey();
  SYSTEM_DOC.get()
    .then((snap) => {
      if (!snap.exists || snap.data().last_reset_date !== today) {
        return SYSTEM_DOC.set({ ...FRESH_DOC(today), [field]: 1 });
      }
      return SYSTEM_DOC.update({ [field]: admin.firestore.FieldValue.increment(1) });
    })
    .catch(() => {});
}

function apiLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - start;

    // Fire and forget — log request to api_logs
    db.collection("api_logs")
      .add({
        endpoint: req.path,
        method: req.method,
        userId: req.user?.uid || null,
        responseTime,
        statusCode: res.statusCode,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch(() => {});

    // Increment Firestore usage counters
    if (req.method === "GET") {
      incrementFirestoreCounter("firestore_reads_today");
    } else if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      incrementFirestoreCounter("firestore_writes_today");
    }
  });

  next();
}

module.exports = apiLogger;
