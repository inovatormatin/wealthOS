import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, RefreshCw, TrendingUp, TrendingDown, Wallet, BarChart2 } from "lucide-react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import HoldingModal from "../components/HoldingModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../context/ToastContext";
import api from "../lib/api";

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function pnlClass(value) {
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-500";
  return "text-gray-500";
}

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const ASSET_BADGE = {
  Stocks: "bg-blue-50 text-blue-700",
  "Mutual Funds": "bg-purple-50 text-purple-700",
  FD: "bg-yellow-50 text-yellow-700",
  RD: "bg-orange-50 text-orange-700",
  Gold: "bg-amber-50 text-amber-700",
  PPF: "bg-green-50 text-green-700",
};

export default function Portfolio() {
  const toast = useToast();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(null); // null | "add" | holding object
  const [confirmDelete, setConfirmDelete] = useState(null); // holding id
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    api
      .get("/holdings")
      .then(({ data }) => setHoldings(data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function handleRefreshPrices() {
    setRefreshing(true);
    try {
      const { data } = await api.post("/holdings/refresh-prices");
      toast.success(`Updated ${data.updated} stock price${data.updated !== 1 ? "s" : ""}.`);
      setRefresh((r) => r + 1);
    } catch {
      toast.error("Failed to refresh prices");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/holdings/${id}`);
      setRefresh((r) => r + 1);
      toast.success("Holding deleted");
    } catch {
      toast.error("Failed to delete holding");
    }
  }

  function handleSaved() {
    setModal(null);
    setRefresh((r) => r + 1);
    toast.success(modal === "add" ? "Holding added" : "Holding updated");
  }

  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  const totalCurrentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalPnL = totalCurrentValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const portfolioData = useMemo(() => {
    const map = {};
    holdings.forEach((h) => {
      map[h.asset_type] = (map[h.asset_type] || 0) + h.currentValue;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  const hasStocks = holdings.some((h) => h.asset_type === "Stocks");

  if (fetchError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-gray-500 text-sm">Failed to load portfolio. Check your connection.</p>
        <button
          onClick={() => setRefresh((r) => r + 1)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all your investments in one place</p>
        </div>
        <div className="flex items-center gap-3">
          {hasStocks && (
            <button
              onClick={handleRefreshPrices}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 text-sm font-medium text-gray-700 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh Prices"}
            </button>
          )}
          <button
            onClick={() => setModal("add")}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Holding
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Invested", value: formatINR(totalInvested), icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Current Value", value: formatINR(totalCurrentValue), icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50" },
          {
            label: "Total P&L",
            value: (totalPnL >= 0 ? "+" : "") + formatINR(totalPnL),
            icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
            color: totalPnL >= 0 ? "text-green-600" : "text-red-500",
            bg: totalPnL >= 0 ? "bg-green-50" : "bg-red-50",
          },
          {
            label: "Returns",
            value: (totalPnLPercent >= 0 ? "+" : "") + totalPnLPercent.toFixed(2) + "%",
            icon: totalPnLPercent >= 0 ? TrendingUp : TrendingDown,
            color: totalPnLPercent >= 0 ? "text-green-600" : "text-red-500",
            bg: totalPnLPercent >= 0 ? "bg-green-50" : "bg-red-50",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={color} size={18} />
            </div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Holdings Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Holdings</h2>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-7 h-7 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : holdings.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">No holdings yet</p>
              <button
                onClick={() => setModal("add")}
                className="mt-3 text-primary-600 text-sm font-medium hover:underline"
              >
                Add your first holding
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-50">
                    <th className="text-left px-5 py-3 font-medium">Asset</th>
                    <th className="text-right px-4 py-3 font-medium">Units</th>
                    <th className="text-right px-4 py-3 font-medium">Buy Price</th>
                    <th className="text-right px-4 py-3 font-medium">Current</th>
                    <th className="text-right px-4 py-3 font-medium">Invested</th>
                    <th className="text-right px-4 py-3 font-medium">Value</th>
                    <th className="text-right px-5 py-3 font-medium">P&L</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {holdings.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50 group transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ASSET_BADGE[h.asset_type] || "bg-gray-100 text-gray-600"}`}>
                            {h.asset_type === "Mutual Funds" ? "MF" : h.asset_type}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900 leading-tight">{h.name}</p>
                            {h.ticker && (
                              <p className="text-xs text-gray-400">{h.ticker}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{h.units}</td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{formatINR(h.buy_price)}</td>
                      <td className="px-4 py-3.5 text-right text-gray-900 font-medium">{formatINR(h.current_price)}</td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{formatINR(h.invested)}</td>
                      <td className="px-4 py-3.5 text-right text-gray-900 font-medium">{formatINR(h.currentValue)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <p className={`font-semibold ${pnlClass(h.pnl)}`}>
                          {h.pnl >= 0 ? "+" : ""}{formatINR(h.pnl)}
                        </p>
                        <p className={`text-xs ${pnlClass(h.pnlPercent)}`}>
                          {h.pnlPercent >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModal(h)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(h.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Portfolio Mix Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Portfolio Mix</h2>
          <p className="text-xs text-gray-400 mb-4">By asset type</p>
          {portfolioData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              <p className="text-sm">Add holdings to see your mix</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {portfolioData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatINR(value)}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {modal && (
        <HoldingModal
          holding={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this holding? This cannot be undone."
          onConfirm={() => {
            handleDelete(confirmDelete);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
