import { useState } from "react";
import { X } from "lucide-react";
import api from "../lib/api";

const ASSET_TYPES = ["Stocks", "Mutual Funds", "FD", "RD", "Gold", "PPF"];

const today = () => new Date().toISOString().split("T")[0];

export default function HoldingModal({ holding, onClose, onSaved }) {
  const isEdit = Boolean(holding);

  const [form, setForm] = useState({
    asset_type: holding?.asset_type || "Stocks",
    name: holding?.name || "",
    ticker: holding?.ticker || "",
    buy_price: holding?.buy_price || "",
    units: holding?.units || "",
    purchase_date: holding?.purchase_date || today(),
    current_price: holding?.current_price || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Name is required");
    if (form.asset_type === "Stocks" && !form.ticker.trim())
      return setError("NSE ticker is required for stocks");
    if (!form.buy_price || Number(form.buy_price) <= 0)
      return setError("Enter a valid buy price");
    if (!form.units || Number(form.units) <= 0)
      return setError("Enter a valid number of units");

    setLoading(true);
    try {
      const payload = {
        ...form,
        buy_price: Number(form.buy_price),
        units: Number(form.units),
        current_price: form.current_price ? Number(form.current_price) : Number(form.buy_price),
        ticker: form.ticker.toUpperCase(),
      };

      if (isEdit) {
        await api.put(`/holdings/${holding.id}`, payload);
      } else {
        await api.post("/holdings", payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save holding");
    } finally {
      setLoading(false);
    }
  }

  const isStock = form.asset_type === "Stocks";

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Edit Holding" : "Add Holding"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Asset Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ASSET_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, asset_type: type, ticker: "" }))}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    form.asset_type === type
                      ? "bg-primary-600 text-white border-primary-600"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isStock ? "Company Name" : "Name"}
            </label>
            <input
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder={isStock ? "e.g. Reliance Industries" : "e.g. HDFC Mid-Cap Fund"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* NSE Ticker — only for stocks */}
          {isStock && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NSE Ticker <span className="text-gray-400 font-normal">(for auto price updates)</span>
              </label>
              <input
                name="ticker"
                type="text"
                value={form.ticker}
                onChange={handleChange}
                placeholder="e.g. RELIANCE, HDFCBANK, TCS"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {/* Buy Price + Units */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buy Price (₹)
              </label>
              <input
                name="buy_price"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.buy_price}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.asset_type === "FD" || form.asset_type === "RD" ? "Principal (₹)" : "Units / Qty"}
              </label>
              <input
                name="units"
                type="number"
                min="0.001"
                step="any"
                required
                value={form.units}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Purchase Date + Current Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date
              </label>
              <input
                name="purchase_date"
                type="date"
                required
                value={form.purchase_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Price (₹)
                {isStock && <span className="text-gray-400 font-normal ml-1">optional</span>}
              </label>
              <input
                name="current_price"
                type="number"
                min="0.01"
                step="0.01"
                value={form.current_price}
                onChange={handleChange}
                placeholder={isStock ? "Auto-fetched" : "Enter current value"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

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
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? "Saving…" : isEdit ? "Update" : "Add Holding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
