import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import api from "../lib/api";

function statusIcon(pct) {
  if (pct === null) return <Info size={18} className="text-gray-400" />;
  if (pct >= 70) return <AlertTriangle size={18} className="text-red-500" />;
  return <CheckCircle size={18} className="text-green-500" />;
}

function barColor(pct) {
  if (pct === null) return "bg-gray-300";
  if (pct >= 70) return "bg-red-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-green-500";
}

function cardBorder(pct) {
  if (pct === null) return "border-gray-200";
  if (pct >= 70) return "border-red-300";
  return "border-gray-200";
}

function ServiceCard({ name, used, limit, pct, unit, resetPeriod, note, costInr }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-6 ${cardBorder(pct)}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-gray-900 font-semibold text-base">{name}</h3>
          <p className="text-gray-400 text-xs mt-0.5 capitalize">Resets {resetPeriod}</p>
        </div>
        {statusIcon(pct)}
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        {limit !== null ? (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Used today</span>
            <span className="text-gray-900 font-semibold">
              {(used ?? 0).toLocaleString("en-IN")} / {limit.toLocaleString("en-IN")}
            </span>
          </div>
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{unit}</span>
            <span className="text-gray-900 font-semibold">
              {used !== null && used !== undefined ? (used).toLocaleString("en-IN") : "—"}
            </span>
          </div>
        )}
        {costInr !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Estimated cost</span>
            <span className="text-gray-900 font-semibold">₹{costInr}</span>
          </div>
        )}
        {pct !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">% used</span>
            <span
              className={`font-bold ${
                pct >= 70 ? "text-red-600" : pct >= 50 ? "text-yellow-600" : "text-green-600"
              }`}
            >
              {pct}%
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`${barColor(pct)} h-2.5 rounded-full transition-all duration-700`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {note && <p className="text-gray-400 text-xs mt-3">{note}</p>}

      {pct !== null && pct >= 70 && (
        <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-600 font-medium">
          Warning: above 70% of free tier limit
        </div>
      )}
    </div>
  );
}

export default function FreeTierStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/free-tier-status")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load free tier status"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-gray-900 text-2xl font-bold">Free Tier Status</h1>
        <p className="text-gray-500 text-sm mt-1">
          Current usage vs free tier limits across all services
        </p>
      </div>

      {data.hasWarning && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">
            One or more services are above 70% of free tier usage today.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.services.map((s) => (
          <ServiceCard key={s.name} {...s} />
        ))}
      </div>
    </div>
  );
}
