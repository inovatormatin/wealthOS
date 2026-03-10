import { useState, useEffect } from "react";
import { Play, Clock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import api from "../lib/api";

function formatTs(iso) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CompanyTable({ companies }) {
  if (!companies?.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Rank</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Company</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Sector</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Rev Growth</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">ROE</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">ROCE</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">D/E</th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c, i) => (
            <tr key={c.rank ?? i} className={`border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
              <td className="px-4 py-2.5 text-gray-500 font-medium">#{c.rank}</td>
              <td className="px-4 py-2.5">
                <p className="text-gray-900 font-medium">{c.name}</p>
                <p className="text-gray-400 text-xs">{c.ticker}</p>
              </td>
              <td className="px-4 py-2.5 text-gray-600">{c.sector}</td>
              <td className="px-4 py-2.5 text-gray-700">{c.revenue_growth}</td>
              <td className="px-4 py-2.5 text-gray-700">{c.roe}</td>
              <td className="px-4 py-2.5 text-gray-700">{c.roce}</td>
              <td className="px-4 py-2.5 text-gray-700">{c.debt_to_equity}</td>
              <td className="px-4 py-2.5 text-right">
                <span
                  className={`font-bold ${
                    c.score > 80
                      ? "text-green-600"
                      : c.score >= 60
                      ? "text-yellow-600"
                      : "text-orange-600"
                  }`}
                >
                  {c.score}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryRow({ entry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3 text-gray-600 text-sm">{formatTs(entry.ran_at)}</td>
        <td className="px-4 py-3 text-gray-500 text-sm font-mono text-xs">{entry.ran_by}</td>
        <td className="px-4 py-3 text-gray-700 text-sm text-center">{entry.total_companies}</td>
        <td className="px-4 py-3 text-gray-600 text-sm text-right">
          {entry.tokens_used?.toLocaleString("en-IN")}
        </td>
        <td className="px-4 py-3 text-gray-700 text-sm text-right font-medium">
          ₹{entry.estimated_cost_inr}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1 ml-auto"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Hide" : "View"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 pb-4">
            <CompanyTable companies={entry.companies} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function ScreenerControl() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [latestRes, historyRes] = await Promise.all([
          api.get("/screener/latest"),
          api.get("/screener/history"),
        ]);
        setLatest(latestRes.data);
        setHistory(historyRes.data);
      } catch {
        // ignore — latest may be null on first run
      } finally {
        setLoadingHistory(false);
      }
    }
    load();
  }, []);

  async function handleRun() {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/admin/screener/run");
      setResult(res.data);
      setLatest(res.data);
      // Refresh history
      const historyRes = await api.get("/screener/history");
      setHistory(historyRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "Screener failed. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold">AI Company Screener</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
            <Clock size={14} />
            Last screened:{" "}
            <span className="font-medium text-gray-700">
              {latest?.never_run ? "Never" : formatTs(latest?.ran_at)}
            </span>
          </p>
        </div>
        <a
          href="/screener"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
        >
          <ExternalLink size={14} />
          View Live Results
        </a>
      </div>

      {/* Run button */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-gray-900 font-semibold mb-1">Run AI Screener</h2>
        <p className="text-gray-500 text-sm mb-5">
          Claude AI will search NSE/BSE data in real time and pick the top 10 fundamentally strong
          companies. This updates what all users see. Takes 30–60 seconds.
        </p>

        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          {running ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Claude is screening NSE/BSE companies... this may take 30–60 seconds
            </>
          ) : (
            <>
              <Play size={16} />
              Run AI Screener Now
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {result && !running && (
          <div className="mt-4">
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-2">
              Screener completed — {result.total_companies} companies found · {result.tokens_used?.toLocaleString("en-IN")} tokens used · ₹{((result.tokens_used ?? 0) / 1000 * 3).toFixed(2)} estimated cost
            </div>
            <CompanyTable companies={result.companies} />
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-gray-900 font-semibold">Screener History</h2>
          <p className="text-gray-400 text-xs mt-0.5">Last 10 runs</p>
        </div>

        {loadingHistory ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : history.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No runs yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Run by</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Companies</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Tokens</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Est. Cost</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <HistoryRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
