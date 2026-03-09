import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session via refresh token cookie
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        window.__wealthos_admin_token__ = data.accessToken;

        // Verify superadmin role
        await api.get("/admin/stats");
        setUser(data.user);
      } catch {
        window.__wealthos_admin_token__ = null;
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
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
