import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function PromoArchive() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchive();
  }, [year]);

  const loadArchive = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/discounts-archive?year=${year}`);
      setPromos(data);
    } catch (err) {
      console.error("Failed to load archive", err);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(`Promo Archive - ${year}`, 14, 16);

    autoTable(doc, {
      startY: 20,
      head: [["Service", "Start", "End", "Price", "Status", "Activated"]],
      body: promos.map((promo) => [
        promo.service?.name || "-",
        promo.start_date,
        promo.end_date,
        `PHP ${Number(promo.discounted_price).toFixed(2)}`, // Replaces ₱ with "PHP"
        promo.status.charAt(0).toUpperCase() + promo.status.slice(1), // Capitalize
        promo.activated_at?.split("T")[0] || "-",
      ]),
      theme: "grid",
      styles: {
        fontSize: 10,
        font: "helvetica",
        textColor: 20,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: 255,
      },
    });

    doc.save(`PromoArchive-${year}.pdf`);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "planned":
        return <span className="badge bg-secondary">Planned</span>;
      case "launched":
        return <span className="badge bg-success">Launched</span>;
      case "canceled":
        return <span className="badge bg-warning text-dark">Canceled</span>;
      case "done":
        return <span className="badge bg-dark">Done</span>;
      default:
        return <span className="badge bg-light text-dark">Unknown</span>;
    }
  };

  return (
    <div className="container">
      <h1 className="mb-4">🗂️ Promo Archive</h1>

      <div className="row align-items-end mb-3">
        <div className="col-md-4">
          <label className="form-label">Filter by Year</label>
          <select
            className="form-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {[...Array(10)].map((_, i) => {
              const y = currentYear - i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>
        <div className="col-md-4 mt-3 mt-md-0">
          <button className="btn btn-outline-dark w-100" onClick={exportToPDF}>
            🖨️ Export as PDF
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading archived promos..." />
      ) : (
        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>Service</th>
              <th>Start</th>
              <th>End</th>
              <th>Price (₱)</th>
              <th>Status</th>
              <th>Activated</th>
            </tr>
          </thead>
          <tbody>
            {promos.length > 0 ? (
              promos.map((promo) => (
                <tr key={promo.id}>
                  <td>{promo.service?.name || "-"}</td>
                  <td>{promo.start_date}</td>
                  <td>{promo.end_date}</td>
                  <td>₱{Number(promo.discounted_price).toFixed(2)}</td>
                  <td>{renderStatusBadge(promo.status)}</td>
                  <td>{promo.activated_at?.split("T")[0] || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center text-muted">
                  No promos found for {year}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
