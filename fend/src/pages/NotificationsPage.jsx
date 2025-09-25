import { useEffect } from "react";
import useNotifications from "../context/NotificationsContext";

export default function NotificationsPage() {
  const { items, loading, error, loadList } = useNotifications();

  useEffect(() => {
    if (items.length === 0) loadList(); // warm start from bell means this often skips
  }, [items.length, loadList]);

  return (
    <div className="container py-3">
      <h3>All Notifications</h3>
      {loading && <p>Loading…</p>}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {!loading && !error && items.length === 0 && <p>No notifications yet.</p>}
      {!loading && !error && (
        <ul className="list-group">
          {items.map((n) => (
            <li key={n.id} className="list-group-item">
              <div className="d-flex justify-content-between">
                <div className="me-3">
                  <div className="fw-semibold">{n.title || "Notification"}</div>
                  {n.body && <div className="text-muted">{n.body}</div>}
                  {n.data?.date && <div className="text-muted">Date: {n.data.date}</div>}
                </div>
                <small className="text-muted">{new Date(n.created_at).toLocaleString()}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
