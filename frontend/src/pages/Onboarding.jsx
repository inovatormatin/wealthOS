import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const GOALS = [
  "Retirement",
  "Buy a Home",
  "Emergency Fund",
  "Child's Education",
  "Wealth Building",
  "Start a Business",
];

const RISK_OPTIONS = [
  {
    value: "Conservative",
    label: "Conservative",
    desc: "I prefer safety over high returns. FDs, PPF, bonds.",
  },
  {
    value: "Moderate",
    label: "Moderate",
    desc: "I'm comfortable with some risk for better returns. Mix of equity and debt.",
  },
  {
    value: "Aggressive",
    label: "Aggressive",
    desc: "I want maximum growth and can handle market ups and downs. Mostly equity.",
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || "",
    age: "",
    city: "",
    monthly_income: "",
    risk_level: "Moderate",
    goals: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function toggleGoal(goal) {
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(goal)
        ? f.goals.filter((g) => g !== goal)
        : [...f.goals, goal],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.age || form.age < 18 || form.age > 100) {
      return setError("Enter a valid age between 18 and 100");
    }
    if (!form.monthly_income || form.monthly_income <= 0) {
      return setError("Enter a valid monthly income");
    }

    setLoading(true);
    try {
      await api.put("/user/profile", {
        ...form,
        age: Number(form.age),
        monthly_income: Number(form.monthly_income),
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">WealthOS</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Set up your profile</h1>
          <p className="text-sm text-gray-500 mb-8">
            This helps WealthOS give you personalised insights. You can edit everything later.
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal */}
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Personal
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    name="age"
                    type="number"
                    required
                    min={18}
                    max={100}
                    value={form.age}
                    onChange={handleChange}
                    placeholder="e.g. 28"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    name="city"
                    type="text"
                    required
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* Financial */}
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Financial
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Income (₹)
                </label>
                <input
                  name="monthly_income"
                  type="number"
                  required
                  min={1}
                  value={form.monthly_income}
                  onChange={handleChange}
                  placeholder="e.g. 75000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">Risk Appetite</label>
              <div className="space-y-2">
                {RISK_OPTIONS.map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.risk_level === value
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="risk_level"
                      value={value}
                      checked={form.risk_level === value}
                      onChange={handleChange}
                      className="mt-0.5 accent-primary-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Goals */}
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Financial Goals
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((goal) => (
                  <label
                    key={goal}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      form.goals.includes(goal)
                        ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.goals.includes(goal)}
                      onChange={() => toggleGoal(goal)}
                      className="accent-primary-600"
                    />
                    {goal}
                  </label>
                ))}
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? "Saving..." : "Save & go to dashboard →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
