import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";

export default function AdminGoalsPage() {
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [metric, setMetric] = useState("total_visits");
  const [target, setTarget] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [goals, setGoals] = useState([]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/goals", { params: { period } });
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const createGoal = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const periodStart = `${period}-01`;
      await api.post("/api/goals", {
        period_type: "month",
        period_start: periodStart,
        metric,
        target_value: Number(target) || 0,
      });
      await load();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to create goal.");
    } finally {
      setLoading(false);
    }
  };

  const derivedStatus = (g) => {
    const actual = Number(g.latest_actual || 0);
    const targetVal = Number(g.target_value || 1);
    const now = new Date();
    const start = new Date(g.period_start);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const totalDays = end.getDate();
    const dayIndex = Math.min(totalDays, now < start ? 1 : now > end ? totalDays : now.getDate());
    const expected = Math.round((targetVal * dayIndex) / totalDays);

    if (g.status === "missed") return { label: "Missed", color: "danger" };
    if (g.status === "done") return { label: "On track", color: "success" };

    if (actual >= expected) return { label: "On track", color: "success" };
    if (actual >= expected * 0.8) return { label: "At risk", color: "warning" };
    return { label: "At risk", color: "warning" };
  };

  const progressPct = (g) => {
    const actual = Number(g.latest_actual || 0);
    const target = Number(g.target_value || 1);
    return Math.min(100, Math.round((actual / target) * 100));
  };

  return (
    <div className="p-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="m-0">🎯 Performance Goals</h3>
        <div style={{ width: 180 }}>
          <input
            type="month"
            className="form-control"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <div className="card mb-3">
        <div className="card-header">Create Goal</div>
        <div className="card-body">
          <form className="row g-3" onSubmit={createGoal}>
            <div className="col-12 col-md-4">
              <label className="form-label">Metric</label>
              <select className="form-select" value={metric} onChange={(e) => setMetric(e.target.value)}>
                <option value="total_visits">Total Visits</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Period</label>
              <input type="month" className="form-control" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Target Value</label>
              <input type="number" min="1" className="form-control" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="col-12">
              <button className="btn btn-primary" disabled={loading}>
                Create Goal
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Goals for {period}</div>
        <div className="card-body">
          {loading ? (
            <div>Loading…</div>
          ) : goals.length === 0 ? (
            <div className="text-muted">No goals found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Status</th>
                    <th style={{ width: 220 }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((g) => (
                    <tr key={g.id}>
                      <td>{g.metric}</td>
                      <td>{g.target_value}</td>
                      <td>{g.latest_actual || 0}</td>
                      <td>
                        {(() => {
                          const s = derivedStatus(g);
                          return <span className={`badge bg-${s.color}`}>{s.label}</span>;
                        })()}
                      </td>
                      <td>
                        <div className="progress" style={{ height: 16 }}>
                          <div
                            className={`progress-bar ${progressPct(g) >= 100 ? 'bg-success' : progressPct(g) >= 70 ? 'bg-info' : 'bg-warning'}`}
                            role="progressbar"
                            style={{ width: `${progressPct(g)}%` }}
                            aria-valuenow={progressPct(g)}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          >
                            {progressPct(g)}%
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

