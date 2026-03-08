import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { TrendingUp, BarChart2, ArrowLeftRight, PieChart, Shield, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    icon: ArrowLeftRight,
    color: "bg-green-100 text-green-600",
    title: "Track Every Rupee",
    desc: "Log income, expenses, investments, and savings. Filter by month and category. See exactly where your money goes.",
  },
  {
    icon: PieChart,
    color: "bg-blue-100 text-blue-600",
    title: "Portfolio in One Place",
    desc: "Stocks, Mutual Funds, FD, RD, Gold, PPF — all tracked together. Auto-updated EOD prices with P&L calculated for you.",
  },
  {
    icon: BarChart2,
    color: "bg-purple-100 text-purple-600",
    title: "Smart Dashboard",
    desc: "6-month cash flow chart, expense breakdown, portfolio allocation — all from your real data, updated live.",
  },
  {
    icon: Zap,
    color: "bg-amber-100 text-amber-600",
    title: "AI Price Fallback",
    desc: "Stock prices fetched via Yahoo Finance → Alpha Vantage → Claude AI. Your portfolio is always up to date.",
  },
  {
    icon: Shield,
    color: "bg-red-100 text-red-600",
    title: "Your Data, Only Yours",
    desc: "Multi-user architecture with isolated data per account. JWT auth with short-lived tokens and httpOnly refresh cookies.",
  },
  {
    icon: TrendingUp,
    color: "bg-primary-100 text-primary-600",
    title: "Built for India",
    desc: "INR formatting, NSE tickers, PPF/NPS/FD support, Indian categories. Not a generic finance app retrofitted for India.",
  },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">WealthOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
          Built for Indian investors
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
          Your complete<br />
          <span className="text-primary-600">wealth operating system</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10">
          Track every rupee, manage all your investments, and understand your finances — in one clean dashboard built for India.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/register"
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Start for free →
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 mb-20">
        <div className="bg-white rounded-2xl border border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
          {[
            { label: "Asset classes", value: "6" },
            { label: "Transaction types", value: "4" },
            { label: "Price sources", value: "3" },
          ].map(({ label, value }) => (
            <div key={label} className="px-6 py-5 text-center">
              <p className="text-2xl font-extrabold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          Everything in one place
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <div className="bg-primary-600 rounded-2xl px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to take control?</h2>
          <p className="text-primary-100 text-sm mb-8 max-w-sm mx-auto">
            Set up your profile in 2 minutes. Start tracking finances and investments today.
          </p>
          <Link
            to="/register"
            className="inline-block px-6 py-3 bg-white text-primary-700 text-sm font-semibold rounded-xl hover:bg-primary-50 transition-colors"
          >
            Create your account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary-600 rounded flex items-center justify-center">
              <TrendingUp className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">WealthOS</span>
          </div>
          <p className="text-xs text-gray-400">Not SEBI registered. For personal use only.</p>
        </div>
      </footer>
    </div>
  );
}
