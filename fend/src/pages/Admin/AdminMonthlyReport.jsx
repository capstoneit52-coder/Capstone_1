import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  ChartDataLabels
);

export default function AdminMonthlyReport() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ totals: { visits: 0 }, by_day: [], by_hour: [], by_visit_type: [], by_service: [] });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/reports/visits-monthly", { params: { month } });
      setData(res.data || {});
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const byHour = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < 24; i++) map.set(i, 0);
    (data.by_hour || []).forEach((r) => {
      const h = Number(r.hour) || 0;
      map.set(h, (map.get(h) || 0) + (Number(r.count) || 0));
    });
    return Array.from(map.entries()).map(([h, count]) => ({ label: String(h).padStart(2, "0"), count }));
  }, [data.by_hour]);

  const byDay = useMemo(() => {
    const arr = (data.by_day || []).map((d) => ({ day: d.day, count: Number(d.count) || 0 }));
    return arr;
  }, [data.by_day]);

  const visitType = useMemo(() => {
    const vt = (data.by_visit_type || []).map((r) => ({ label: r.visit_type, count: Number(r.count) || 0 }));
    if (vt.length === 0) return [{ label: "walkin", count: 0 }, { label: "appointment", count: 0 }];
    return vt;
  }, [data.by_visit_type]);

  const byService = useMemo(() => {
    return (data.by_service || []).map((r) => ({ label: r.service_name || "(Unspecified)", count: Number(r.count) || 0 }));
  }, [data.by_service]);

  // ------ Chart helpers ------
  const visitTypeColorMap = useMemo(() => ({
    appointment: "#6c757d", // gray
    walkin: "#0d6efd", // blue
  }), []);

  const getVisitTypeColors = (items) =>
    items.map((it, i) => visitTypeColorMap[it.label] || [
      "#0d6efd",
      "#6c757d",
      "#198754",
      "#dc3545",
      "#ffc107",
      "#20c997",
      "#6610f2",
    ][i % 7]);

  const lineData = useMemo(() => ({
    labels: byDay.map((d) => d.day),
    datasets: [
      {
        label: "Visits",
        data: byDay.map((d) => d.count),
        borderColor: "#0d6efd",
        backgroundColor: "rgba(13,110,253,0.15)",
        tension: 0.3,
        pointRadius: 3,
        fill: true,
      },
    ],
  }), [byDay]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      datalabels: { display: false },
      title: { display: false },
    },
    scales: {
      x: { title: { display: true, text: "Day" } },
      y: { title: { display: true, text: "Visits" }, beginAtZero: true, ticks: { precision: 0 } },
    },
  }), []);

  const hourAvgMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < 24; i++) map.set(i, 0);
    (data.by_hour_avg_per_day || []).forEach((r) => {
      const h = Number(r.hour) || 0;
      map.set(h, Number(r.avg_per_day) || 0);
    });
    return map;
  }, [data.by_hour_avg_per_day]);

  const hourBarData = useMemo(() => ({
    labels: byHour.map((d) => d.label),
    datasets: [
      {
        label: "Total (month)",
        data: byHour.map((d) => d.count),
        backgroundColor: "rgba(25,135,84,0.85)",
        borderColor: "#198754",
        borderWidth: 1,
        type: "bar",
        yAxisID: "y",
      },
      {
        label: "Avg per day",
        data: byHour.map((d) => Number(hourAvgMap.get(Number(d.label)) || 0)),
        borderColor: "#0d6efd",
        backgroundColor: "rgba(13,110,253,0.25)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        type: "line",
        yAxisID: "y",
      },
    ],
  }), [byHour, hourAvgMap]);

  const defaultDatalabels = {
    color: "#fff",
    font: { weight: "bold" },
    formatter: (v) => (v > 0 ? v : ""),
  };

  const hourBarOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
      datalabels: {
        anchor: "end",
        align: "end",
        offset: 2,
        ...defaultDatalabels,
      },
    },
    scales: {
      x: { title: { display: true, text: "Hour of Day" } },
      y: { title: { display: true, text: "Visits (total) / Avg per day" }, beginAtZero: true, ticks: { precision: 0 } },
    },
  }), []);

  const serviceBarData = useMemo(() => ({
    labels: byService.map((d) => d.label),
    datasets: [
      {
        label: "Visits",
        data: byService.map((d) => d.count),
        backgroundColor: "rgba(25,135,84,0.85)",
        borderColor: "#198754",
        borderWidth: 1,
      },
    ],
  }), [byService]);

  const serviceBarOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      datalabels: {
        anchor: "end",
        align: "end",
        offset: 2,
        ...defaultDatalabels,
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Service" },
        ticks: { autoSkip: false, maxRotation: 60, minRotation: 30 },
      },
      y: { title: { display: true, text: "Visits" }, beginAtZero: true, ticks: { precision: 0 } },
    },
  }), []);

  const visitTypeData = useMemo(() => {
    const labels = visitType.map((v) => v.label);
    const values = visitType.map((v) => v.count);
    const colors = getVisitTypeColors(visitType);
    return {
      labels,
      datasets: [
        {
          label: "Visit Type",
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    };
  }, [visitType]);

  const totalVisitType = useMemo(() => visitType.reduce((s, r) => s + r.count, 0) || 1, [visitType]);

  const visitTypeOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      datalabels: {
        color: "#fff",
        formatter: (value) => {
          if (!value) return "";
          const pct = Math.round((value / totalVisitType) * 100);
          return `${value} (${pct}%)`;
        },
      },
    },
  }), [totalVisitType]);

  // ------ Summaries for insights ------
  // Daily peaks (byDay)
  const daySummary = useMemo(() => {
    if (!byDay.length) return null;
    const total = byDay.reduce((sum, dayRow) => sum + dayRow.count, 0);
    const peak = byDay.reduce((a, b) => (a.count > b.count ? a : b));
    const low = byDay.reduce((a, b) => (a.count < b.count ? a : b));
    const avgPerDay = total / byDay.length;
    return { peak, low, total, avgPerDay };
  }, [byDay]);

  // Hourly peaks (byHour)
  const hourSummary = useMemo(() => {
    if (!byHour.length) return null;
    const peak = byHour.reduce((a, b) => (a.count > b.count ? a : b));
    const avgPerHour = byHour.reduce((sum, h) => sum + h.count, 0) / byHour.length;
    return { peakHour: Number(peak.label), peakCount: peak.count, avgPerHour };
  }, [byHour]);

  // Visit type split (visitType)
  const visitTypeSummary = useMemo(() => {
    if (!visitType.length) return null;
    const total = visitType.reduce((sum, v) => sum + v.count, 0);
    const pct = (n) => (total ? (n / total) * 100 : 0);
    const byName = Object.fromEntries(visitType.map((v) => [v.label, v.count]));
    return {
      total,
      walkinPct: pct(byName.walkin || 0),
      appointmentPct: pct(byName.appointment || 0),
    };
  }, [visitType]);

  // Top service (byService)
  const serviceSummary = useMemo(() => {
    if (!byService.length) return null;
    const total = byService.reduce((sum, srow) => sum + srow.count, 0);
    const top = byService.reduce((a, b) => (a.count > b.count ? a : b));
    const topShare = total ? (top.count / total) * 100 : 0;
    return { topService: top.label, topCount: top.count, topShare, total };
  }, [byService]);

  const downloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text(`Monthly Visits Report — ${month}`, 40, 40);
      doc.setFontSize(11);

      autoTable(doc, {
        startY: 60,
        head: [["Metric", "Value"]],
        body: [["Total Visits", String(data?.totals?.visits ?? 0)]],
        theme: "striped",
      });

      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY || 100) + 20,
        head: [["Day", "Count"]],
        body: (byDay || []).map((r) => [r.day, String(r.count)]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [13, 110, 253] },
      });

      // Insight for Daily Counts
      if (daySummary) {
        autoTable(doc, {
          startY: (doc.lastAutoTable?.finalY || 100) + 8,
          head: [["Insight"]],
          body: [[
            `Peak day: ${daySummary.peak.day} (${daySummary.peak.count} visits). ` +
            `Lowest day: ${daySummary.low.day} (${daySummary.low.count}). ` +
            `Avg/day: ${daySummary.avgPerDay.toFixed(1)}.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY || 100) + 20,
        head: [["Hour", "Total (month)", "Avg/day"]],
        body: (byHour || []).map((r) => [
          r.label,
          String(r.count),
          String((Number(hourAvgMap.get(Number(r.label)) || 0)).toFixed(2)),
        ]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [25, 135, 84] },
      });

      // Insight for By Hour
      if (hourSummary) {
        autoTable(doc, {
          startY: (doc.lastAutoTable?.finalY || 100) + 8,
          head: [["Insight"]],
          body: [[
            `Peak hour: ${hourSummary.peakHour}:00 (${hourSummary.peakCount} visits). ` +
            `Avg/hour: ${hourSummary.avgPerHour.toFixed(1)}. ` +
            `Tip: Staff up around peak hour.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY || 100) + 20,
        head: [["Visit Type", "Count"]],
        body: (visitType || []).map((r) => [r.label, String(r.count)]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [108, 117, 125] },
      });

      // Insight for Visit Type
      if (visitTypeSummary) {
        autoTable(doc, {
          startY: (doc.lastAutoTable?.finalY || 100) + 8,
          head: [["Insight"]],
          body: [[
            `Appointments: ${visitTypeSummary.appointmentPct.toFixed(0)}% · ` +
            `Walk-ins: ${visitTypeSummary.walkinPct.toFixed(0)}%. ` +
            `Tip: If walk-ins surge, consider more front-desk coverage.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY || 100) + 20,
        head: [["Service", "Count"]],
        body: (byService || []).map((r) => [r.label, String(r.count)]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 53, 69] },
      });

      // Insight for By Service
      if (serviceSummary) {
        autoTable(doc, {
          startY: (doc.lastAutoTable?.finalY || 100) + 8,
          head: [["Insight"]],
          body: [[
            `Top service: ${serviceSummary.topService} (${serviceSummary.topCount} visits, ` +
            `${serviceSummary.topShare.toFixed(0)}% of monthly volume). ` +
            `Tip: Ensure supplies/staffing align with demand.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      doc.save(`visits-report-${month}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF.");
    }
  };

  return (
    <div className="p-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="m-0">📈 Monthly Visits Report</h3>
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
          <button className="btn btn-dark" onClick={downloadPdf} disabled={loading}>
            Download PDF
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
              <div className="card h-100">
                <div className="card-body">
                  <div className="text-muted">Total Visits</div>
                  <div className="fs-3 fw-bold">{data?.totals?.visits ?? 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12 col-md-6 mb-3">
              <div className="card h-100">
                <div className="card-header">Daily Counts</div>
                <div className="card-body">
                  <Line data={lineData} options={lineOptions} />
                  {daySummary && (
                    <small className="text-muted d-block mt-2">
                      Peak day: {daySummary.peak.day} ({daySummary.peak.count} visits). Lowest day: {daySummary.low.day} ({daySummary.low.count}). Avg/day: {daySummary.avgPerDay.toFixed(1)}.
                    </small>
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 mb-3">
              <div className="card h-100">
                <div className="card-header">By Hour</div>
                <div className="card-body">
                  <Bar data={hourBarData} options={hourBarOptions} />
                  {hourSummary && (
                    <small className="text-muted d-block mt-2">
                      Peak hour: {hourSummary.peakHour}:00 ({hourSummary.peakCount} visits). Avg/hour: {hourSummary.avgPerHour.toFixed(1)}. Tip: Staff up around peak hour.
                    </small>
                  )}
                </div>
              </div>
            </div>
  {/* //------------------------------j */}         
{/* ----------------mas maliit na donut ---------------- */}
<div className="col-12 col-md-4 col-lg-3 mb-3">
  <div className="card h-100 shadow-sm">
    <div className="card-header p-2 text-center" style={{ fontSize: "0.9rem" }}>
      Visit Type
    </div>
    <div className="card-body d-flex flex-column align-items-center justify-content-center p-2">
      <div style={{ width: "250px", height: "250px" }}>
        <Doughnut
          data={visitTypeData}
          options={{
            ...visitTypeOptions,
            maintainAspectRatio: false,
            cutout: "65%", 
            plugins: {
              legend: { display: false }, 
              tooltip: { enabled: true },
            },
          }}
        />
      </div>

      {/* Custom Legend */}
      <div className="mt-2 w-100">
        {visitType.map((v, idx) => {
          const color = getVisitTypeColors(visitType)[idx];
          return (
            <div
              key={v.label}
              className="d-flex align-items-center justify-content-between"
              style={{ fontSize: "0.75rem", marginBottom: "3px" }}
            >
              <span className="d-flex align-items-center">
                <span
                  className="me-2"
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    backgroundColor: color,
                    borderRadius: 2,
                  }}
                />
                {v.label}
              </span>
              <strong>{v.count}</strong>
            </div>
          );
        })}
      </div>
      {visitTypeSummary && (
        <small className="text-muted d-block mt-2 text-center">
          Appointments: {visitTypeSummary.appointmentPct.toFixed(0)}% · Walk-ins: {visitTypeSummary.walkinPct.toFixed(0)}%. Tip: If walk-ins surge, consider more front-desk coverage.
        </small>
      )}
    </div>
  </div>
</div>


{/* //------------------------------j */}
            <div className="col-12 col-md-6 mb-3">
              <div className="card h-100">
                <div className="card-header">By Service</div>
                <div className="card-body">
                  <Bar data={serviceBarData} options={serviceBarOptions} />
                  {serviceSummary && (
                    <small className="text-muted d-block mt-2">
                      Top service: {serviceSummary.topService} ({serviceSummary.topCount} visits, {serviceSummary.topShare.toFixed(0)}% of monthly volume). Tip: Ensure supplies/staffing align with demand.
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

