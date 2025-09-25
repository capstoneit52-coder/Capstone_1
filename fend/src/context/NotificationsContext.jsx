import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";
import api from "../api/api";

const Ctx = createContext(null);

export function NotificationsProvider({ children }) {
  const [items, setItems]   = useState([]);   // latest list (union: targeted + effective broadcasts)
  const [unread, setUnread] = useState(0);    // unread badge
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  // prevent overlapping calls
  const inFlight = useRef(false);

  const parseItems = (rows) => (rows || []).map((n) => ({
    ...n,
    data: typeof n.data === "string" ? safeJSON(n.data) : (n.data || null),
  }));
  function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

  const loadUnread = useCallback(async () => {
    try {
      const r = await api.get("/api/notifications/unread-count");
      setUnread(r?.data?.unread ?? 0);
    } catch { /* ignore */ }
  }, []);

  const loadList = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const r = await api.get("/api/notifications");
      setItems(parseItems(r.data));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load notifications.");
      setItems([]);
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  // Option 1 behavior: mark *all* read for this user on open
  const markAllRead = useCallback(async () => {
    try {
      await api.post("/api/notifications/mark-all-read");
      setUnread(0);
      // NOTE: list itself doesn’t change, only read status server-side.
    } catch { /* ignore */ }
  }, []);

  // Auto-refresh notifications every 2 minutes (reasonable for small clinic)
  useEffect(() => {
    // Initial load
    loadUnread();

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      loadUnread(); // Check for new notifications
    }, 120000); // 2 minutes (120 seconds)
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [loadUnread]);

  const value = useMemo(() => ({
    items, unread, loading, error,
    loadList, loadUnread, markAllRead,
  }), [items, unread, loading, error, loadList, loadUnread, markAllRead]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export default function useNotifications() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return v;
}
