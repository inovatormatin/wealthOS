import { useState, useEffect } from "react";
import { Users, UserCheck, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import api from "../lib/api";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-gray-900 text-2xl font-bold">
          {value === null ? "—" : value.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

function UsageMiniCard({ label, used, limit, pct }) {
  const color = pct >= 70 ? "bg-red-500" : pct >= 50 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-600 text-sm font-medium">{label}</span>
        <span className="text-gray-900 text-sm font-bold">{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-gray-400 text-xs">
        {used.toLocaleString("en-IN")} / {limit.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [freeTier, setFreeTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, usageRes, endpointsRes, freeTierRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/api-usage"),
          api.get("/admin/top-endpoints"),
          api.get("/admin/free-tier-status"),
        ]);
        setStats(statsRes.data);
        setUsage(usageRes.data);
        setEndpoints(endpointsRes.data.slice(0, 5));
        setFreeTier(freeTierRes.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    load();
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

  const warningServices = freeTier?.services.filter((s) => s.pct !== null && s.pct >= 70) ?? [];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-gray-900 text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">System overview at a glance</p>
      </div>

      {/* Alert Bar */}
      {warningServices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-700 font-semibold text-sm">Free Tier Warning</p>
            <p className="text-red-600 text-sm mt-0.5">
              {warningServices.map((s) => `${s.name} (${s.pct}%)`).join(", ")} above 70% usage.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} color="bg-indigo-500" />
        <StatCard icon={UserCheck} label="Onboarded" value={stats?.onboardedUsers} color="bg-green-500" />
        <StatCard icon={TrendingUp} label="New This Week" value={stats?.newLast7Days} color="bg-blue-500" />
        <StatCard icon={Calendar} label="New This Month" value={stats?.newLast30Days} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top endpoints chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-gray-900 font-semibold mb-4">Top 5 Endpoints (last 24h)</h2>
          {endpoints.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={endpoints} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis
                  type="category"
                  dataKey="endpoint"
                  width={160}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => [v, "Hits"]}
                />
                <Bar dataKey="hits" radius={[0, 4, 4, 0]}>
                  {endpoints.map((_, i) => (
                    <Cell key={i} fill={["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"][i] || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* API usage summary */}
        <div className="space-y-3">
          <h2 className="text-gray-900 font-semibold">Free Tier Usage Today</h2>
          {usage && (
            <>
              <UsageMiniCard
                label="Firestore Reads"
                used={usage.firestore_reads_today}
                limit={usage.firestore_reads_limit}
                pct={usage.firestore_reads_pct}
              />
              <UsageMiniCard
                label="Firestore Writes"
                used={usage.firestore_writes_today}
                limit={usage.firestore_writes_limit}
                pct={usage.firestore_writes_pct}
              />
              <UsageMiniCard
                label="Alpha Vantage"
                used={usage.alpha_vantage_calls_today}
                limit={usage.alpha_vantage_limit}
                pct={usage.alpha_vantage_pct}
              />
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex justify-between items-center">
                <span className="text-gray-600 text-sm font-medium">Claude API Cost Today</span>
                <span className="text-gray-900 font-bold text-sm">
                  ₹{usage.claude_cost_inr_today}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
