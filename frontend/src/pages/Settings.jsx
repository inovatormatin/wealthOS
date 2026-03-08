import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../lib/api";

const EMPTY_PWD = { currentPassword: "", newPassword: "", confirmPassword: "" };

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

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    age: "",
    city: "",
    monthly_income: "",
    risk_level: "Moderate",
    goals: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [pwd, setPwd] = useState(EMPTY_PWD);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    api
      .get("/user/profile")
      .then(({ data }) => {
        setForm({
          name: data.name || "",
          age: data.age || "",
          city: data.city || "",
          monthly_income: data.monthly_income || "",
          risk_level: data.risk_level || "Moderate",
          goals: data.goals || [],
        });
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

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

    setSaving(true);
    try {
      await api.put("/user/profile", {
        ...form,
        age: Number(form.age),
        monthly_income: Number(form.monthly_income),
      });
      toast.success("Profile updated");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwdError("");

    if (pwd.newPassword.length < 8) {
      return setPwdError("New password must be at least 8 characters");
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      return setPwdError("Passwords do not match");
    }

    setPwdSaving(true);
    try {
      await api.post("/user/change-password", {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwd(EMPTY_PWD);
      toast.success("Password changed");
    } catch (err) {
      setPwdError(err.response?.data?.error || "Failed to change password");
    } finally {
      setPwdSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your profile and financial preferences</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        {/* Account info (read-only) */}
        <div className="mb-8 pb-6 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 text-lg font-bold flex items-center justify-center shrink-0">
              {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Personal</h2>
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
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Financial</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income (₹)</label>
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
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Financial Goals</h2>
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
            disabled={saving}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 mt-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Change Password</h2>

        {pwdError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {pwdError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { key: "currentPassword", label: "Current Password" },
            { key: "newPassword",     label: "New Password" },
            { key: "confirmPassword", label: "Confirm New Password" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={pwd[key]}
                  onChange={(e) => setPwd((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {key === "currentPassword" && (
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={pwdSaving}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {pwdSaving ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
