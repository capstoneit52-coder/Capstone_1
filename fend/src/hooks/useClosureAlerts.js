import { useEffect, useState } from "react";
import api from "../api/api";

export default function useClosureAlerts(withinDays = 7) {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayKey = new Date().toDateString();
  const cacheKey = `closure_alerts_${withinDays}_${todayKey}`;
  const dismissedKey = `closure_alerts_dismissed_${todayKey}`;

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setClosures(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {
        // fall through to fetch
      }
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await api.get(`/api/clinic-calendar/alerts?withinDays=${withinDays}`);
        const items = res?.data?.closures ?? [];
        if (!isMounted) return;
        setClosures(items);
        localStorage.setItem(cacheKey, JSON.stringify(items));
      } catch {
        if (isMounted) setClosures([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [cacheKey, withinDays]);

  const dismissForToday = () => localStorage.setItem(dismissedKey, "1");
  const dismissed = !!localStorage.getItem(dismissedKey);

  return { closures, loading, dismissed, dismissForToday };
}
