import { useState, useEffect } from "react";
import api from "../lib/api";

function colorClass(pct) {
  if (pct === null) return { ring: "text-gray-300", text: "text-gray-500", label: "gray" };
  if (pct >= 70) return { ring: "text-red-500", text: "text-red-600", label: "red" };
  if (pct >= 50) return { ring: "text-yellow-500", text: "text-yellow-600", label: "yellow" };
  return { ring: "text-green-500", text: "text-green-600", label: "green" };
}

function ProgressRing({ pct, size = 80 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = pct !== null ? circumference - (Math.min(pct, 100) / 100) * circumference : circumference;
  const { ring } = colorClass(pct);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`${ring} transition-all duration-700`}
        style={{ stroke: "currentColor" }}
      />
    </svg>
  );
}

function UsageCard({ name, used, limit, pct, unit, note }) {
  const { text } = colorClass(pct);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <ProgressRing pct={pct ?? 0} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${text}`}>
            {pct !== null ? `${pct}%` : "—"}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-gray-900 font-semibold">{name}</h3>
        {limit !== null ? (
          <p className="text-gray-500 text-sm mt-1">
            {(used ?? 0).toLocaleString("en-IN")} / {limit.toLocaleString("en-IN")} {unit}
          </p>
        ) : (
          <p className="text-gray-500 text-sm mt-1">{used?.toLocaleString("en-IN")} {unit}</p>
        )}
        {note && <p className="text-gray-400 text-xs mt-1">{note}</p>}
      </div>
    </div>
  );
}

export default function ApiUsage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/api-usage")
      .then((res) => setUsage(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load usage"))
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

  const cards = [
    {
      name: "Firestore Reads",
      used: usage.firestore_reads_today,
      limit: usage.firestore_reads_limit,
      pct: usage.firestore_reads_pct,
      unit: "reads/day",
    },
    {
      name: "Firestore Writes",
      used: usage.firestore_writes_today,
      limit: usage.firestore_writes_limit,
      pct: usage.firestore_writes_pct,
      unit: "writes/day",
    },
    {
      name: "Alpha Vantage",
      used: usage.alpha_vantage_calls_today,
      limit: usage.alpha_vantage_limit,
      pct: usage.alpha_vantage_pct,
      unit: "calls/day",
    },
    {
      name: "Yahoo Finance",
      used: usage.yahoo_finance_calls_today,
      limit: null,
      pct: null,
      unit: "calls today",
      note: "No hard limit — unofficial API",
    },
    {
      name: "Claude API",
      used: usage.claude_tokens_used_today,
      limit: null,
      pct: null,
      unit: "tokens today",
      note: `₹${usage.claude_cost_inr_today} estimated cost today (₹3 per 1k tokens)`,
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-gray-900 text-2xl font-bold">API Usage</h1>
        <p className="text-gray-500 text-sm mt-1">
          Daily usage for today ({usage.last_reset_date ?? "—"})
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((c) => (
          <UsageCard key={c.name} {...c} />
        ))}
      </div>
    </div>
  );
}
