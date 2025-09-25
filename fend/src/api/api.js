import axios from "axios";

const api = axios.create({
  baseURL: "", // same-origin; Laravel + SPA via ngrok
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "ngrok-skip-browser-warning": "true",
  },
});

// Inject XSRF token from cookie
api.interceptors.request.use((config) => {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (m) config.headers["X-XSRF-TOKEN"] = decodeURIComponent(m[1]);
  return config;
});

// Be gentle on 401s — don't kick users out for harmless probes
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status;
    const raw = err.config?.url || "";

    // Normalize to a pathname we can reliably match
    let path = raw;
    try {
      path = new URL(raw, window.location.origin).pathname;
    } catch {}

    // 1) Always respect opt-out
    if (err.config?.skip401Handler) return Promise.reject(err);

    // 2) Soft-probe endpoints: never redirect
    const softProbePaths = new Set(["/api/user", "/user"]);
    if (status === 401 && softProbePaths.has(path)) {
      return Promise.reject(err);
    }

    // 3) Optional: only redirect on 401 if we're currently under a protected area
    const protectedPrefixes = ["/app/admin", "/app/staff", "/app/patient"];
    const here = window.location.pathname;
    const onProtected = protectedPrefixes.some((p) => here.startsWith(p));

    if (status === 401 && onProtected) {
      // Hard redirect to login
      api.setToken?.(null);
      window.location.href = "/app/login";
      return;
    }

    // Otherwise, stay put and let the caller decide
    return Promise.reject(err);
  }
);

api.logout = () => api.post("/logout");

export default api;
