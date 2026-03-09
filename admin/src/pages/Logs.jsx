import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import api from "../lib/api";

function statusColor(code) {
  if (code >= 500) return "bg-red-100 text-red-700";
  if (code >= 400) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function methodColor(method) {
  const map = {
    GET: "text-blue-600",
    POST: "text-green-600",
    PUT: "text-yellow-600",
    DELETE: "text-red-600",
    PATCH: "text-purple-600",
  };
  return map[method] || "text-gray-600";
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  async function fetchLogs() {
    try {
      const res = await api.get("/admin/logs?limit=100");
      setLogs(res.data);
      setLastRefresh(new Date());
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 30000); // auto-refresh every 30s
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold">Logs</h1>
          <p className="text-gray-500 text-sm mt-1">
            Last 100 API requests · Auto-refreshes every 30s
            {lastRefresh && (
              <span className="ml-2 text-gray-400">
                (updated {lastRefresh.toLocaleTimeString("en-IN")})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Time</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Method</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Endpoint</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">User ID</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Response (ms)</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No logs yet
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      i % 2 === 1 ? "bg-gray-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono font-semibold text-xs ${methodColor(log.method)}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 font-mono text-xs max-w-xs truncate">
                      {log.endpoint}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs max-w-xs truncate">
                      {log.userId || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 font-mono text-xs">
                      {log.responseTime ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${statusColor(
                          log.statusCode
                        )}`}
                      >
                        {log.statusCode}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
