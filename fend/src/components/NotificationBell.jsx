import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useNotifications from "../context/NotificationsContext";

export default function NotificationBell() {
  const { items, unread, loading, error, loadList, loadUnread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  // panel position (viewport coords)
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const panelWidth = 340; // px — matches your current style

  const computePosition = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();

    // Prefer right-aligning panel to the bell, then clamp within viewport
    let left = r.right - panelWidth;
    left = Math.max(8, left); // never off-screen left
    left = Math.min(left, window.innerWidth - panelWidth - 8); // never off-screen right

    const top = Math.max(8, r.bottom + 8); // small gap, avoid going above viewport
    setPos({ top, left });
  };

  useEffect(() => { loadUnread(); }, [loadUnread]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      computePosition();
      await loadList();
      await markAllRead(); // clear badge
      await loadUnread();  // returns 0
    }
  };

  // Close on Esc / outside click; reposition on resize
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onResize = () => computePosition();
    const onClickAway = (e) => {
      const panel = document.getElementById("notif-panel");
      if (!panel || !btnRef.current) return;
      if (!panel.contains(e.target) && !btnRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.addEventListener("mousedown", onClickAway);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousedown", onClickAway);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="btn btn-light d-inline-flex align-items-center"
        title="Notifications"
        aria-label="Notifications"
      >
        <span role="img" aria-label="bell">🔔</span>
        {unread > 0 && (
          <span className="badge bg-danger ms-2">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notif-panel"
          role="dialog"
          aria-modal="true"
          className="position-fixed" // <-- fixed to viewport, not the sidebar
          style={{
            top: pos.top,
            left: pos.left,
            width: panelWidth,
            zIndex: 1050,
            maxWidth: "calc(100vw - 16px)",
          }}
        >
          <div className="card shadow">
            <div className="card-header py-2 d-flex align-items-center justify-content-between">
              <div>
                <strong>Notifications</strong>
                <div className="small text-muted">Clinic updates &amp; alerts</div>
              </div>
              <button className="btn btn-link btn-sm p-0" onClick={() => setOpen(false)}>Close</button>
            </div>

            <div className="list-group list-group-flush" style={{ maxHeight: 340, overflow: "auto" }}>
              {loading && <div className="list-group-item small text-muted">Loading…</div>}
              {error && !loading && <div className="list-group-item small text-danger">{error}</div>}
              {!loading && !error && items.length === 0 && (
                <div className="list-group-item small text-muted">No notifications.</div>
              )}
              {!loading && !error && items.map((n) => (
                <div key={n.id} className="list-group-item small">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="me-2">
                      <div className="fw-semibold">
                        {n.title || "Notification"}
                        {n.severity === "danger"  && <span className="badge bg-danger ms-2">Important</span>}
                        {n.severity === "warning" && <span className="badge bg-warning text-dark ms-2">Warning</span>}
                        {n.severity === "info"    && <span className="badge bg-info text-dark ms-2">Info</span>}
                      </div>
                      {n.body && <div className="text-muted mt-1">{n.body}</div>}
                      {n.data?.date && <div className="text-muted">Date: {n.data.date}</div>}
                    </div>
                    <small className="text-muted">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </small>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-footer py-2 d-flex justify-content-between">
              <Link to="/notifications" className="btn btn-link btn-sm p-0">See all</Link>
              <button className="btn btn-link btn-sm p-0" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
