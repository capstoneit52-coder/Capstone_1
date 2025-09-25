import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend
);

export default function AdminAnalyticsDashboard() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/analytics/summary", { params: { period: month } });
      setData(res.data || null);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const k = data?.kpis || {};

  const sparkData = useMemo(() => {
    const series = data?.series?.visits_by_day || [];
    const labels = series.map((r) => r.day.slice(-2));
    const values = series.map((r) => Number(r.count) || 0);
    return {
      labels,
      datasets: [
        {
          label: "Visits",
          data: values,
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13,110,253,0.15)",
          tension: 0.3,
          pointRadius: 0,
          fill: true,
        },
      ],
    };
  }, [data]);

  const sparkOptions = useMemo(() => ({
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    elements: { point: { radius: 0 } },
    scales: { x: { display: false }, y: { display: false } },
  }), []);

  const payBar = useMemo(() => {
    const cash = k?.payment_method_share?.cash ?? {};
    const hmo = k?.payment_method_share?.hmo ?? {};
    return {
      labels: ["Cash", "HMO"],
      datasets: [
        {
          label: "This Month",
          backgroundColor: ["#198754", "#6f42c1"],
          borderColor: ["#198754", "#6f42c1"],
          borderWidth: 1,
          data: [Number(cash.share_pct || 0), Number(hmo.share_pct || 0)],
        },
      ],
    };
  }, [k]);

  const payBarOptions = useMemo(() => ({
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } },
    },
  }), []);

  const pct = (v) => (typeof v === "number" ? `${v > 0 ? "+" : ""}${v.toFixed(2)}%` : "0%");

  const kpiCard = (title, value, change) => (
    <div className="card h-100">
      <div className="card-body">
        <div className="text-muted">{title}</div>
        <div className="fs-3 fw-bold">{value ?? 0}</div>
        <div className={"small " + ((change ?? 0) >= 0 ? "text-success" : "text-danger")}>
          {pct(change)} vs last month
        </div>
        <div style={{ height: 40 }} className="mt-2">
          <Line data={sparkData} options={sparkOptions} height={40} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="m-0">📊 Admin Analytics</h3>
        <div className="d-flex gap-2 align-items-center">
          <input
            type="month"
            className="form-control"
            style={{ width: 170 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Select month"
          />
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-3">
              {kpiCard("Total Visits", k?.total_visits?.value, k?.total_visits?.pct_change)}
            </div>
            <div className="col-12 col-md-3">
              {kpiCard("Approved Appointments", k?.approved_appointments?.value, k?.approved_appointments?.pct_change)}
            </div>
            <div className="col-12 col-md-3">
              {kpiCard("No-shows", k?.no_shows?.value, k?.no_shows?.pct_change)}
            </div>
            <div className="col-12 col-md-3">
              {kpiCard("Avg Visit (min)", k?.avg_visit_duration_min?.value?.toFixed?.(1) ?? 0, k?.avg_visit_duration_min?.pct_change)}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="card h-100">
                <div className="card-header">Payment Method Share</div>
                <div className="card-body">
                  <Bar data={payBar} options={payBarOptions} />
                  <div className="mt-2 small text-muted">
                    Change vs last month: Cash {pct(k?.payment_method_share?.cash?.pct_point_change || 0)} • HMO {pct(k?.payment_method_share?.hmo?.pct_point_change || 0)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card h-100">
                <div className="card-header">Top Services</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    {(data?.top_services || []).map((s) => (
                      <li key={`${s.service_id}-${s.service_name}`} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>{s.service_name}</span>
                        <span>
                          <strong className="me-2">{s.count}</strong>
                          <span className={(s.pct_change ?? 0) >= 0 ? "text-success" : "text-danger"}>{pct(s.pct_change)}</span>
                        </span>
                      </li>
                    ))}
                    {(data?.top_services || []).length === 0 && (
                      <li className="list-group-item">No data</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="card">
              <div className="card-header">Alerts</div>
              <div className="card-body">
                {(data?.alerts || []).length === 0 ? (
                  <div className="text-muted">No alerts.</div>
                ) : (
                  <ul className="m-0">
                    {(data?.alerts || []).map((a, idx) => (
                      <li key={idx} className={"mb-1 " + (a.type === "warning" ? "text-warning" : "text-info")}>{a.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

