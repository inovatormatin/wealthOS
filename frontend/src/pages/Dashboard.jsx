import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, BarChart2 } from "lucide-react";
import api from "../lib/api";

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function EmptyChart({ message }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-gray-400">
      <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/user/profile"), api.get("/transactions/dashboard")])
      .then(([profileRes, dashRes]) => {
        if (!profileRes.data.onboarded) {
          navigate("/onboarding", { replace: true });
          return;
        }
        setProfile(profileRes.data);
        setDashData(dashRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { income = 0, expenses = 0, netSavings = 0 } = dashData?.currentMonth || {};
  const portfolioValue = 0; // Sprint 4

  const stats = [
    {
      label: "Monthly Income",
      value: formatINR(income),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Monthly Expenses",
      value: formatINR(expenses),
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "Net Savings",
      value: formatINR(netSavings),
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Portfolio Value",
      value: formatINR(portfolioValue),
      icon: BarChart2,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cashFlowData = dashData?.cashFlow || [];
  const expenseBreakdown = dashData?.expenseBreakdown || [];
  const portfolioData = []; // Sprint 4
  const totalExpenses = expenseBreakdown.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {profile?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
            </div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Cash Flow — 2/3 width */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Cash Flow</h2>
              <p className="text-xs text-gray-400">Last 6 months</p>
            </div>
            {cashFlowData.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  Inflow
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                  Outflow
                </span>
              </div>
            )}
          </div>
          {cashFlowData.length === 0 ? (
            <EmptyChart message="Add transactions to see your cash flow" />
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatINR(value)}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="inflow" stroke="#22c55e" strokeWidth={2} fill="url(#inflow)" />
                <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} fill="url(#outflow)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Portfolio Pie — 1/3 width */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Portfolio Mix</h2>
            <p className="text-xs text-gray-400">By asset type</p>
          </div>
          {portfolioData.length === 0 ? (
            <EmptyChart message="Add holdings to see your portfolio mix" />
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <PieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {portfolioData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatINR(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Expense Breakdown</h2>
          <p className="text-xs text-gray-400">This month by category</p>
        </div>
        {expenseBreakdown.length === 0 ? (
          <EmptyChart message="Add expenses to see your spending breakdown" />
        ) : (
          <ul className="space-y-3">
            {expenseBreakdown.map(({ category, amount }) => {
              const pct = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(0) : 0;
              return (
                <li key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{category}</span>
                    <span className="text-gray-500">{formatINR(amount)} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
