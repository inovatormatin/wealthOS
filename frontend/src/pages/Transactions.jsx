import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  INVESTMENT_CATEGORIES,
  SAVINGS_CATEGORIES,
} from "../lib/categories";
import TransactionModal from "../components/TransactionModal";
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
  const toast = useToast();
  const [allTxs, setAllTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [filters, setFilters] = useState({
    month: currentMonthKey(),
    type: "all",
    category: "all",
  });

  const [modal, setModal] = useState(null); // null | "add" | tx object (edit)
  const [confirmDelete, setConfirmDelete] = useState(null); // tx id to delete

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const allCategories = useMemo(
    () => ["all", ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...INVESTMENT_CATEGORIES, ...SAVINGS_CATEGORIES],
    []
  );

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    api
      .get("/transactions")
      .then(({ data }) => setAllTxs(data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [refresh]);

  const filtered = useMemo(() => {
    return allTxs
      .filter((t) => !filters.month || t.date.startsWith(filters.month))
      .filter((t) => filters.type === "all" || t.type === filters.type)
      .filter((t) => filters.category === "all" || t.category === filters.category);
  }, [allTxs, filters]);

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalInvestment = filtered.filter((t) => t.type === "investment").reduce((s, t) => s + t.amount, 0);
  const totalSavings = filtered.filter((t) => t.type === "savings").reduce((s, t) => s + t.amount, 0);

  // Category-wise summary for current filter
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      if (!map[t.category]) map[t.category] = { total: 0, type: t.type };
      map[t.category].total += t.amount;
    });
    return Object.entries(map)
      .map(([category, { total, type }]) => ({ category, total, type }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const categoryBreakdownTotal = categoryBreakdown.reduce((s, c) => s + c.total, 0);

  async function handleDelete(id) {
    try {
      await api.delete(`/transactions/${id}`);
      setRefresh((r) => r + 1);
      toast.success("Transaction deleted");
    } catch {
      toast.error("Failed to delete transaction");
    }
  }

  function handleSaved() {
    setModal(null);
    setRefresh((r) => r + 1);
    toast.success(modal === "add" ? "Transaction added" : "Transaction updated");
  }

  if (fetchError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-gray-500 text-sm">Failed to load transactions. Check your connection.</p>
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
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-5xl mx-auto">
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
        <div className="flex rounded-lg border border-gray-200 bg-white p-1 flex-wrap gap-0.5">
          {[
            { key: "all",        label: "All" },
            { key: "income",     label: "Income" },
            { key: "expense",    label: "Expense" },
            { key: "investment", label: "Invest" },
            { key: "savings",    label: "Savings" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilters((f) => ({ ...f, type: key }))}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filters.type === key
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}
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
          <optgroup label="Income">{INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
          <optgroup label="Expense">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
          <optgroup label="Investment">{INVESTMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
          <optgroup label="Savings">{SAVINGS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
        </select>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
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
            <p className="text-xs text-red-600 font-medium">Expense</p>
            <p className="text-base font-bold text-red-700">{formatINR(totalExpenses)}</p>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-3">
          <ArrowUpCircle className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-xs text-blue-700 font-medium">Investment</p>
            <p className="text-base font-bold text-blue-800">{formatINR(totalInvestment)}</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl px-4 py-3 flex items-center gap-3">
          <ArrowUpCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs text-amber-700 font-medium">Savings</p>
            <p className="text-base font-bold text-amber-800">{formatINR(totalSavings)}</p>
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
                      tx.type === "income"     ? "bg-green-100" :
                      tx.type === "expense"    ? "bg-red-100"   :
                      tx.type === "investment" ? "bg-blue-100"  : "bg-amber-100"
                    }`}>
                      {tx.type === "income"
                        ? <ArrowUpCircle className="w-4 h-4 text-green-600" />
                        : tx.type === "expense"
                        ? <ArrowDownCircle className="w-4 h-4 text-red-500" />
                        : tx.type === "investment"
                        ? <ArrowUpCircle className="w-4 h-4 text-blue-500" />
                        : <ArrowUpCircle className="w-4 h-4 text-amber-500" />
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
                      tx.type === "income"     ? "text-green-600" :
                      tx.type === "expense"    ? "text-red-500"   :
                      tx.type === "investment" ? "text-blue-600"  : "text-amber-600"
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
                        onClick={() => setConfirmDelete(tx.id)}
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
              {categoryBreakdown.map(({ category, total, type }) => (
                <li key={category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">{category}</span>
                    <span className="text-xs text-gray-500">{formatINR(total)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        type === "income"     ? "bg-green-500" :
                        type === "expense"    ? "bg-red-400"   :
                        type === "investment" ? "bg-blue-400"  : "bg-amber-400"
                      }`}
                      style={{
                        width: `${Math.min(100, (total / (categoryBreakdownTotal || 1)) * 100).toFixed(0)}%`,
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

      {/* Confirm Delete */}
      {confirmDelete && (
        <ConfirmDialog
          message="Delete this transaction? This cannot be undone."
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
