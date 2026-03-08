import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../lib/categories";
import TransactionModal from "../components/TransactionModal";
import api from "../lib/api";

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function Transactions() {
  const [allTxs, setAllTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const [filters, setFilters] = useState({
    month: currentMonthKey(),
    type: "all",
    category: "all",
  });

  const [modal, setModal] = useState(null); // null | "add" | tx object (edit)
  const [deletingId, setDeletingId] = useState(null);

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const allCategories = useMemo(
    () => ["all", ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES],
    []
  );

  useEffect(() => {
    setLoading(true);
    api
      .get("/transactions")
      .then(({ data }) => setAllTxs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const filtered = useMemo(() => {
    return allTxs
      .filter((t) => !filters.month || t.date.startsWith(filters.month))
      .filter((t) => filters.type === "all" || t.type === filters.type)
      .filter((t) => filters.category === "all" || t.category === filters.category);
  }, [allTxs, filters]);

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  // Category-wise summary for current filter
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      if (!map[t.category]) map[t.category] = { income: 0, expense: 0 };
      map[t.category][t.type === "income" ? "income" : "expense"] += t.amount;
    });
    return Object.entries(map)
      .map(([cat, vals]) => ({ category: cat, ...vals }))
      .sort((a, b) => b.expense + b.income - (a.expense + a.income));
  }, [filtered]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      setRefresh((r) => r + 1);
    } catch {
      alert("Failed to delete");
    }
  }

  function handleSaved() {
    setModal(null);
    setRefresh((r) => r + 1);
  }

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track every rupee in and out</p>
        </div>
        <button
          onClick={() => setModal("add")}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Month */}
        <select
          value={filters.month}
          onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All time</option>
          {monthOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Type tabs */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {["all", "income", "expense"].map((t) => (
            <button
              key={t}
              onClick={() => setFilters((f) => ({ ...f, type: t }))}
              className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                filters.type === t
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t === "all" ? "All" : t === "income" ? "Income" : "Expenses"}
            </button>
          ))}
        </div>

        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Categories</option>
          {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center gap-3">
          <ArrowUpCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-xs text-green-700 font-medium">Income</p>
            <p className="text-base font-bold text-green-800">{formatINR(totalIncome)}</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl px-4 py-3 flex items-center gap-3">
          <ArrowDownCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-xs text-red-600 font-medium">Expenses</p>
            <p className="text-base font-bold text-red-700">{formatINR(totalExpenses)}</p>
          </div>
        </div>
        <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
          totalIncome - totalExpenses >= 0 ? "bg-blue-50" : "bg-orange-50"
        }`}>
          <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
            totalIncome - totalExpenses >= 0 ? "bg-blue-200 text-blue-700" : "bg-orange-200 text-orange-700"
          }`}>=</div>
          <div>
            <p className={`text-xs font-medium ${
              totalIncome - totalExpenses >= 0 ? "text-blue-700" : "text-orange-700"
            }`}>Net</p>
            <p className={`text-base font-bold ${
              totalIncome - totalExpenses >= 0 ? "text-blue-800" : "text-orange-800"
            }`}>{formatINR(totalIncome - totalExpenses)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Transaction List */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100">
            {loading ? (
              <div className="py-16 flex justify-center">
                <div className="w-7 h-7 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-gray-400 text-sm">No transactions found</p>
                <button
                  onClick={() => setModal("add")}
                  className="mt-3 text-primary-600 text-sm font-medium hover:underline"
                >
                  Add your first transaction
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {filtered.map((tx) => (
                  <li key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 group transition-colors">
                    {/* Type indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === "income" ? "bg-green-100" : "bg-red-100"
                    }`}>
                      {tx.type === "income"
                        ? <ArrowUpCircle className="w-4 h-4 text-green-600" />
                        : <ArrowDownCircle className="w-4 h-4 text-red-500" />
                      }
                    </div>

                    {/* Category + note */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{tx.category}</p>
                      {tx.note && (
                        <p className="text-xs text-gray-400 truncate">{tx.note}</p>
                      )}
                    </div>

                    {/* Date */}
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(tx.date)}</span>

                    {/* Amount */}
                    <span className={`text-sm font-semibold shrink-0 ${
                      tx.type === "income" ? "text-green-600" : "text-red-500"
                    }`}>
                      {tx.type === "income" ? "+" : "−"}{formatINR(tx.amount)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setModal(tx)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">By Category</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <ul className="space-y-3">
              {categoryBreakdown.map(({ category, income, expense }) => (
                <li key={category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">{category}</span>
                    <span className="text-xs text-gray-500">{formatINR(expense || income)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${expense ? "bg-red-400" : "bg-green-500"}`}
                      style={{
                        width: `${Math.min(100, ((expense || income) / (totalExpenses || totalIncome || 1)) * 100).toFixed(0)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <TransactionModal
          tx={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
