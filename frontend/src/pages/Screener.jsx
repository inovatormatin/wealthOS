import { useState, useEffect } from "react";
import api from "../lib/api";

// Sector → color pill (dynamic fallback for unknown sectors)
const SECTOR_COLORS = {
  Banking: "bg-blue-100 text-blue-700",
  IT: "bg-purple-100 text-purple-700",
  FMCG: "bg-green-100 text-green-700",
  Pharma: "bg-red-100 text-red-700",
  Auto: "bg-yellow-100 text-yellow-700",
  Infrastructure: "bg-orange-100 text-orange-700",
  Chemicals: "bg-teal-100 text-teal-700",
  Consumer: "bg-pink-100 text-pink-700",
  Energy: "bg-amber-100 text-amber-700",
  Telecom: "bg-indigo-100 text-indigo-700",
};

const FALLBACK_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-lime-100 text-lime-700",
  "bg-cyan-100 text-cyan-700",
  "bg-violet-100 text-violet-700",
];

function getSectorColor(sector, dynamicMap) {
  return SECTOR_COLORS[sector] ?? dynamicMap[sector] ?? "bg-gray-100 text-gray-600";
}

function scoreColor(score) {
  if (score > 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-orange-500";
}

function scoreTextColor(score) {
  if (score > 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-orange-600";
}

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function valuationBadgeStyle(view) {
  if (!view) return "bg-gray-100 text-gray-600";
  const v = view.toLowerCase();
  if (v.includes("undervalued")) return "bg-green-100 text-green-700";
  if (v.includes("fairly")) return "bg-blue-100 text-blue-700";
  if (v.includes("premium")) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

function Metric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className="text-gray-800 text-sm font-medium leading-snug">{value ?? "—"}</p>
    </div>
  );
}

function CompanyCard({ company, sectorColorMap }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <span className="bg-gray-900 text-white text-xs font-bold w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          #{company.rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-gray-900 font-bold text-base leading-tight truncate">
                {company.name}
              </h3>
              <p className="text-gray-400 text-xs font-mono mt-0.5">{company.ticker}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getSectorColor(
                  company.sector,
                  sectorColorMap
                )}`}
              >
                {company.sector}
              </span>
              {company.market_cap && (
                <span className="text-gray-400 text-xs">{company.market_cap}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Macro theme ── */}
      {company.macro_theme && (
        <span className="self-start inline-flex text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full leading-tight">
          {company.macro_theme}
        </span>
      )}

      {/* ── ARTHA Score ── */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-gray-500 text-xs">ARTHA Score</span>
          <span className={`text-xs font-bold ${scoreTextColor(company.score)}`}>
            {company.score}/100
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`${scoreColor(company.score)} h-1.5 rounded-full`}
            style={{ width: `${company.score}%` }}
          />
        </div>
      </div>

      {/* ── Core metrics — 2×2 grid ── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-gray-50 rounded-xl p-4">
        <Metric label="Revenue Growth" value={company.revenue_growth} />
        <Metric label="ROE" value={company.roe} />
        <Metric label="ROCE" value={company.roce} />
        <Metric label="Debt / Equity" value={company.debt_to_equity} />
      </div>

      {/* ── Valuation row ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-gray-400 text-xs mb-0.5">P/E</p>
          <p className="text-gray-800 text-sm font-medium">{company.pe_ratio ?? "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-gray-400 text-xs mb-0.5">PEG</p>
          <p className="text-gray-800 text-sm font-medium">{company.peg_ratio ?? "—"}</p>
        </div>
        {company.valuation_view && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${valuationBadgeStyle(
              company.valuation_view
            )}`}
          >
            {company.valuation_view}
          </span>
        )}
      </div>

      {/* ── PAT trend ── */}
      {company.pat_trend && (
        <p className="text-gray-500 text-xs">
          <span className="font-medium text-gray-600">PAT: </span>
          {company.pat_trend}
        </p>
      )}

      {/* ── Bull / Bear case ── */}
      <div className="space-y-2">
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-green-700 text-xs font-semibold mb-1">Bull case</p>
          <p className="text-gray-700 text-sm leading-relaxed">
            {company.bull_case ?? company.why}
          </p>
        </div>
        {company.bear_case && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-red-600 text-xs font-semibold mb-1">Bear case / risk</p>
            <p className="text-gray-700 text-sm leading-relaxed">{company.bear_case}</p>
          </div>
        )}
      </div>

      {/* ── Data as of ── */}
      <p className="text-gray-400 text-xs">Data: {company.data_as_of}</p>
    </div>
  );
}

export default function Screener() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sectorColorMap, setSectorColorMap] = useState({});

  useEffect(() => {
    api
      .get("/screener/latest")
      .then((res) => {
        setData(res.data);
        // Build dynamic color map for unknown sectors
        const unique = [...new Set((res.data.companies ?? []).map((c) => c.sector))].filter(
          (s) => !SECTOR_COLORS[s]
        );
        const map = {};
        unique.forEach((s, i) => {
          map[s] = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
        });
        setSectorColorMap(map);
      })
      .catch((err) => setError(err.response?.data?.error || "Failed to load screener data"))
      .finally(() => setLoading(false));
  }, []);

  const sectors = data?.companies?.length
    ? ["All", ...new Set(data.companies.map((c) => c.sector))]
    : ["All"];

  const filtered =
    sectorFilter === "All"
      ? data?.companies ?? []
      : (data?.companies ?? []).filter((c) => c.sector === sectorFilter);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-gray-900 text-2xl font-bold">Fundamentally Strong Companies</h1>
            <p className="text-gray-500 text-sm mt-1 max-w-lg">
              AI-screened from NSE/BSE based on revenue growth, ROE, ROCE and profitability.
              Updated manually by the WealthOS team.
            </p>
            {data?.ran_at && (
              <p className="text-gray-400 text-xs mt-1.5">
                Last updated {timeAgo(data.ran_at)}
              </p>
            )}
          </div>

          {/* Sector filter */}
          {!data?.never_run && sectors.length > 1 && (
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white self-start"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Sectors" : s}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Empty state */}
        {data?.never_run ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-gray-700 font-semibold text-lg mb-2">Coming soon</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Our team is preparing the first screener results. Check back soon.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No companies in this sector.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((company) => (
              <CompanyCard
                key={company.ticker ?? company.rank}
                company={company}
                sectorColorMap={sectorColorMap}
              />
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer — fixed at bottom */}
      {!data?.never_run && (
        <div className="border-t border-gray-200 bg-amber-50 px-6 py-3">
          <p className="text-amber-700 text-xs text-center leading-relaxed">
            This is not SEBI-registered investment advice. WealthOS shows fundamental data for
            informational purposes only. Do your own research before investing.
          </p>
        </div>
      )}
    </div>
  );
}
