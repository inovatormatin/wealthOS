const { db, admin } = require("./firebase");

const SYSTEM_DOC = db.collection("system").doc("api_usage");

function getTodayKey() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
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

// Fire-and-forget increment — resets if date has changed
function safeIncrement(fields) {
  const today = getTodayKey();
  SYSTEM_DOC.get()
    .then((snap) => {
      if (!snap.exists || snap.data().last_reset_date !== today) {
        return SYSTEM_DOC.set({ ...FRESH_DOC(today), ...fields });
      }
      const updates = {};
      for (const [key, val] of Object.entries(fields)) {
        updates[key] = admin.firestore.FieldValue.increment(val);
      }
      return SYSTEM_DOC.update(updates);
    })
    .catch(() => {});
}

function trackAlphaVantageCall() {
  safeIncrement({ alpha_vantage_calls_today: 1 });
}

function trackYahooFinanceCall() {
  safeIncrement({ yahoo_finance_calls_today: 1 });
}

function trackClaudeAPICall(tokensUsed = 0) {
  safeIncrement({ claude_api_calls_today: 1, claude_tokens_used_today: tokensUsed });
}

function trackScreenerTokens(tokensUsed = 0) {
  safeIncrement({ screener_tokens_today: tokensUsed });
}

module.exports = { trackAlphaVantageCall, trackYahooFinanceCall, trackClaudeAPICall, trackScreenerTokens };
