import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../api/api";

/** Loads /api/user and /api/inventory/settings, then renders children or redirects. */
export function Gate({ allow, to = "/404", children }) {
  const [state, setState] = useState({ loading: true, user: null, settings: null });
  const loc = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [u, s] = await Promise.all([api.get("/api/user"), api.get("/api/inventory/settings")]);
        if (mounted) setState({ loading: false, user: u.data, settings: s.data });
      } catch (e) {
        if (mounted) setState({ loading: false, user: null, settings: null });
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (state.loading) return <div className="p-4">Loading…</div>;

  const ok = allow({ user: state.user, settings: state.settings });
  if (!ok) return <Navigate to={to} state={{ from: loc }} replace />;

  return children;
}

/** Helpers */
export const isAdmin = ({ user }) => user?.role === "admin";
export const canStaffReceive = ({ user, settings }) =>
  user?.role === "admin" || (user?.role === "staff" && !!settings?.staff_can_receive);

export const canConsumeForFinishedVisit = ({ user, settings, visitFinished }) =>
  // Admins can always; staff only when visit is finished AND staff receive is on
  (user?.role === "admin") ||
  (user?.role === "staff" && !!settings?.staff_can_receive && visitFinished === true);
