import { useEffect, useState, useCallback } from "react";
import api from "../api/api";

export default function useNotifications() {
  const [items, setItems] = useState([]);     // latest list (dropdown)
  const [unread, setUnread] = useState(0);    // badge count
  const [loading, setLoading] = useState(true);

  const loadUnread = useCallback(async () => {
    try {
      const res = await api.get("/api/notifications/unread-count");
      setUnread(res?.data?.unread ?? 0);
    } catch {
      setUnread(0);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/notifications");
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post("/api/notifications/mark-all-read");
      setUnread(0);
      // Optionally refresh the list so items include read state (t.read_at)
      // await loadList();
    } catch {}
  }, []);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  return { items, unread, loading, loadList, loadUnread, markAllRead };
}
