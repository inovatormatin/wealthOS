import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";

function Badge({ children, green }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        green ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {children}
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return "—";
  const date = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Users() {
  const [data, setData] = useState({ users: [], total: 0, totalPages: 0 });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const LIMIT = 20;

  const load = useCallback(
    async (p) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/admin/users?page=${p}&limit=${LIMIT}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  const filtered = query
    ? data.users.filter(
        (u) =>
          u.name?.toLowerCase().includes(query.toLowerCase()) ||
          u.email?.toLowerCase().includes(query.toLowerCase()) ||
          u.city?.toLowerCase().includes(query.toLowerCase())
      )
    : data.users;

  function handleSearch(e) {
    e.preventDefault();
    setQuery(search);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{data.total.toLocaleString("en-IN")} total users</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, email, city..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setSearch(""); }}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">City</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Provider</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Onboarded</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Joined</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Holdings</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((u, i) => (
                  <tr
                    key={u.userId}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      i % 2 === 1 ? "bg-gray-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-900 font-medium">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{u.city || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-gray-600">{u.provider}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge green={u.onboarded}>{u.onboarded ? "Yes" : "No"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {u.holdingsCount}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {u.transactionsCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!query && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-gray-500 text-sm">
              Page {page + 1} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                disabled={page >= data.totalPages - 1}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
