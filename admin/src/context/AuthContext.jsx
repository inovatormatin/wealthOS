import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session via refresh token cookie.
  // Uses raw axios — not the api instance — so the interceptor never touches this call.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
        window.__wealthos_admin_token__ = data.accessToken;
        await api.get("/admin/stats"); // verify superadmin
        setUser(data.user);
      } catch {
        window.__wealthos_admin_token__ = null;
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    // When the interceptor detects a session expiry mid-session, it fires this
    // event instead of doing a hard page reload — React Router handles the redirect.
    const handler = () => setUser(null);
    window.addEventListener("admin:session-expired", handler);
    return () => window.removeEventListener("admin:session-expired", handler);
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    window.__wealthos_admin_token__ = data.accessToken;

    // Verify superadmin — throws 403 if not
    try {
      await api.get("/admin/stats");
    } catch (err) {
      // Not superadmin — clean up and rethrow
      window.__wealthos_admin_token__ = null;
      await api.post("/auth/logout").catch(() => {});
      const msg = err.response?.data?.error || "Access denied. Superadmin only.";
      throw new Error(msg);
    }

    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    window.__wealthos_admin_token__ = null;
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
