import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Attach admin access token to every request
api.interceptors.request.use((config) => {
  const token = window.__wealthos_admin_token__;
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// On 401, attempt a token refresh then retry once
let isRefreshing = false;
let pendingQueue = [];

function processPending(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers["Authorization"] = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
        window.__wealthos_admin_token__ = data.accessToken;
        processPending(null, data.accessToken);
        original.headers["Authorization"] = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        processPending(refreshErr);
        window.__wealthos_admin_token__ = null;
        window.location.href = import.meta.env.BASE_URL + "login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
