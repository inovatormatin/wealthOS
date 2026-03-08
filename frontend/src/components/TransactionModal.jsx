import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  INVESTMENT_CATEGORIES,
  SAVINGS_CATEGORIES,
} from "../lib/categories";
import api from "../lib/api";

const today = () => new Date().toISOString().split("T")[0];

const TYPE_CONFIG = {
  income:     { label: "+ Income",    color: "bg-green-500 text-white",  submit: "bg-green-500 hover:bg-green-600" },
  expense:    { label: "− Expense",   color: "bg-red-500 text-white",    submit: "bg-red-500 hover:bg-red-600" },
  investment: { label: "↗ Invest",    color: "bg-blue-500 text-white",   submit: "bg-blue-500 hover:bg-blue-600" },
  savings:    { label: "🏦 Savings",  color: "bg-amber-500 text-white",  submit: "bg-amber-500 hover:bg-amber-600" },
};

function getCategoriesForType(type) {
  if (type === "income")     return INCOME_CATEGORIES;
  if (type === "expense")    return EXPENSE_CATEGORIES;
  if (type === "investment") return INVESTMENT_CATEGORIES;
  if (type === "savings")    return SAVINGS_CATEGORIES;
  return [];
}

export default function TransactionModal({ tx, onClose, onSaved }) {
  const isEdit = Boolean(tx);

  const [type, setType] = useState(tx?.type || "expense");
  const [form, setForm] = useState({
    category: tx?.category || "",
    amount: tx?.amount || "",
    date: tx?.date || today(),
    note: tx?.note || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = getCategoriesForType(type);

  // Reset category when type changes and current category doesn't belong to new type
  useEffect(() => {
    if (form.category && !categories.includes(form.category)) {
      setForm((f) => ({ ...f, category: "" }));
    }
  }, [type]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.category) return setError("Please select a category");
    if (!form.amount || Number(form.amount) <= 0) return setError("Enter a valid amount");

    setLoading(true);
    try {
      const payload = { type, ...form, amount: Number(form.amount) };
      if (isEdit) {
        await api.put(`/transactions/${tx.id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  }

  const cfg = TYPE_CONFIG[type];

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type Toggle — 2x2 grid */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-gray-200 p-1">
            {Object.entries(TYPE_CONFIG).map(([key, { label, color }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                  type === key ? color : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Amount + Date — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                value={form.amount}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                name="date"
                type="date"
                required
                value={form.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              name="note"
              type="text"
              value={form.note}
              onChange={handleChange}
              placeholder="e.g. Grocery run, SIP for Nifty 50…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ${cfg.submit}`}
            >
              {loading ? "Saving…" : isEdit ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
