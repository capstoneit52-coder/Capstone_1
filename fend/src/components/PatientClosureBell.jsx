import { useState } from "react";
import usePatientClosureAlerts from "../hooks/usePatientClosureAlerts";
import { Link } from "react-router-dom";

export default function PatientClosureBell({ withinDays = 7, impactDays = 30 }) {
  const { closures, impacts, loading, dismissed, dismissForToday } =
    usePatientClosureAlerts({ withinDays, impactDays });
  const [open, setOpen] = useState(false);

  const hasPersonal = impacts.length > 0;
  const hasGeneral  = closures.length > 0;
  const hasAlerts   = !loading && (hasPersonal || hasGeneral) && !dismissed;

  return (
    <div className="position-relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="btn btn-light d-inline-flex align-items-center"
        title="Notifications"
        aria-label="Notifications"
      >
        <span role="img" aria-label="bell">🔔</span>
        {hasAlerts && <span className="badge bg-danger ms-2">●</span>}
      </button>

      {open && (
        <div className="position-absolute end-0 mt-2" style={{ width: 320, zIndex: 1050 }}>
          <div className="card shadow">
            <div className="card-header py-2">
              <strong>Notifications</strong>
              <div className="small text-muted">Closures & affected appointments</div>
            </div>

            <div className="list-group list-group-flush" style={{ maxHeight: 320, overflow: "auto" }}>
              {loading && (
                <div className="list-group-item small text-muted">Loading…</div>
              )}

              {!loading && hasPersonal && (
                <>
                  <div className="list-group-item small fw-semibold bg-light">Your appointments affected</div>
                  {impacts.map((it, idx) => (
                    <div key={idx} className="list-group-item small">
                      <div className="fw-semibold">{it.date} {it.time_slot ? `(${it.time_slot})` : ""}</div>
                      <div className="text-muted">
                        Clinic closed{it.closure_message ? ` — ${it.closure_message}` : ""}.
                      </div>
                      <div className="mt-1">
                        <Link to={`/patient/appointments`} className="btn btn-link btn-sm p-0">
                          View / reschedule
                        </Link>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {!loading && hasGeneral && (
                <>
                  <div className="list-group-item small fw-semibold bg-light">Upcoming clinic closures</div>
                  {closures.map((c, idx) => (
                    <div key={idx} className="list-group-item small">
                      <div className="fw-semibold">{c.date}</div>
                      <div className="text-muted">{c.closure_message || "Clinic closed"}</div>
                    </div>
                  ))}
                </>
              )}

              {!loading && !hasPersonal && !hasGeneral && (
                <div className="list-group-item small text-muted">No notifications.</div>
              )}
            </div>

            {(hasPersonal || hasGeneral) && (
              <div className="card-footer py-2 text-end">
                <button className="btn btn-link btn-sm"
                  onClick={() => { dismissForToday(); setOpen(false); }}>
                  Dismiss for today
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
