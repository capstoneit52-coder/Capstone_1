import { useEffect, useState } from "react";
import api from "../api/api";

export default function usePatientClosureAlerts({ withinDays = 7, impactDays = 30 } = {}) {
  const [closures, setClosures] = useState([]);  // general closed days
  const [impacts, setImpacts] = useState([]);    // my affected appts
  const [loading, setLoading] = useState(true);

  const todayKey = new Date().toDateString();
  const cacheKey = `closure_alerts_${withinDays}_${todayKey}`;
  const dismissedKey = `closure_alerts_dismissed_${todayKey}`;

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      try {
        // cache general closures for the day
        const cached = localStorage.getItem(cacheKey);
        let general = [];
        if (cached) {
          try { general = JSON.parse(cached) ?? []; } catch {}
        } else {
          const res = await api.get(`/api/clinic-calendar/alerts?withinDays=${withinDays}`);
          general = res?.data?.closures ?? [];
          localStorage.setItem(cacheKey, JSON.stringify(general));
        }
        const imp = await api
          .get(`/api/me/closure-impacts?days=${impactDays}`)
          .then(r => r?.data?.impacts ?? [])
          .catch(() => []);

        if (!alive) return;
        setClosures(general);
        setImpacts(imp);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  }, [cacheKey, withinDays, impactDays]);

  const dismissForToday = () => localStorage.setItem(dismissedKey, "1");
  const dismissed = !!localStorage.getItem(dismissedKey);

  return { closures, impacts, loading, dismissed, dismissForToday };
}
