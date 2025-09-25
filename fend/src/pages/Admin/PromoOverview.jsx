import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function PromoOverview() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/discounts-overview");
      setPromos(data);
    } catch (err) {
      console.error("Failed to load overview promos", err);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "planned":
        return <span className="badge bg-secondary">Planned</span>;
      case "launched":
        return <span className="badge bg-success">Launched</span>;
      case "canceled":
        return <span className="badge bg-warning text-dark">Canceled</span>;
      default:
        return <span className="badge bg-light text-dark">Unknown</span>;
    }
  };

  return (
    <div className="mt-4">
      <h5 className="text-muted mb-3">📋 Active and Planned Promos</h5>
      {loading ? (
        <LoadingSpinner message="Loading promos..." />
      ) : promos.length > 0 ? (
        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>Service</th>
              <th>Start</th>
              <th>End</th>
              <th>Price</th>
              <th>Status</th>
              <th>Activated</th>
            </tr>
          </thead>
          <tbody>
            {promos.map((promo) => (
              <tr key={promo.id}>
                <td>{promo.service?.name || "-"}</td>
                <td>{promo.start_date}</td>
                <td>{promo.end_date}</td>
                <td>₱{Number(promo.discounted_price).toFixed(2)}</td>
                <td>{renderStatusBadge(promo.status)}</td>
                <td>{promo.activated_at?.split("T")[0] || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted">No active or planned promos.</p>
      )}
    </div>
  );
}
