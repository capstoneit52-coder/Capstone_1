import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ServiceSelectModal } from "../../components/ServiceDiscountModals";
import PromoOverview from "./PromoOverview";

export default function ServiceDiscountManager() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    discounted_price: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState(null);

  useEffect(() => {
    api.get("/api/services").then((res) => setServices(res.data));
  }, []);

  const loadPromos = async (serviceId) => {
    setSelectedService(serviceId);
    const res = await api.get(`/api/services/${serviceId}/discounts`);

    setPromos(res.data.promos);
    if (res.data.cleanup_count > 0) {
      setCleanupMessage(
        `${res.data.cleanup_count} expired promo(s) marked as done.`
      );
      setTimeout(() => setCleanupMessage(null), 5000); // Hide after 5 seconds
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const savePromo = async () => {
    setLoading(true);
    setErrors({});
    try {
      if (editMode && editingPromoId) {
        await api.put(`/api/discounts/${editingPromoId}`, form);
      } else {
        const res = await api.post(
          `/api/services/${selectedService}/discounts`,
          form
        );

        if (res.data.warning) {
          alert(
            `⚠ Promo saved, but some dates are clinic closed:\n${res.data.warning}`
          );
        }
      }

      // Only reset after successful save
      setForm({ start_date: "", end_date: "", discounted_price: "" });
      setEditMode(false);
      setEditingPromoId(null);
      await loadPromos(selectedService);
    } catch (err) {
      if (err.response?.status === 422) {
        const message = err.response.data.message;
        const fieldErrors = err.response.data.errors;

        if (message?.includes("clinic closed")) {
          alert(`❌ Cannot save promo: ${message}`);
          return; // stop here, don't reset form
        }

        setErrors(fieldErrors || { message });
      } else {
        console.error("Unknown error", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const launchPromo = async (id) => {
    await api.post(`/api/discounts/${id}/launch`);
    loadPromos(selectedService);
  };

  const cancelPromo = async (id) => {
    await api.post(`/api/discounts/${id}/cancel`);
    loadPromos(selectedService);
  };
  const selected = services.find((s) => s.id === Number(selectedService));
  const openPromoCreation = () => setShowServiceModal(true);

  const selectService = (serviceId) => {
    setShowServiceModal(false);
    setForm({ start_date: "", end_date: "", discounted_price: "" });
    setErrors({});
    setEditMode(false);
    setEditingPromoId(null);
    loadPromos(serviceId);
  };

  const isCancelable = (promo) => {
    if (promo.status !== "launched" || !promo.activated_at) return false;
    const activated = new Date(promo.activated_at);
    const now = new Date();
    const diff = (now - activated) / (1000 * 60 * 60 * 24); // in days
    return diff <= 1;
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
    <div className="container">
      <h1 className="mb-4">💸 Service Promo Discounts</h1>

      {cleanupMessage && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          ✅ {cleanupMessage}
        </div>
      )}

      <div className="mb-3">
        <button className="btn btn-primary me-2" onClick={openPromoCreation}>
          + Make Promo
        </button>
        <span
          className="text-muted"
          title="Services marked as Special/Package are excluded from discounts."
        >
          ⓘ Specials/Packages cannot be discounted
        </span>
      </div>

      {selectedService ? (
        <>
          {/* Promo creation section */}

          <div className="alert alert-info">
            Creating promo for: <strong>{selected?.name}</strong>
            <br />
            {selected?.category && (
              <span className="text-muted">
                🏷️ Category: <strong>{selected.category}</strong>
              </span>
            )}
            {selected?.is_excluded_from_analytics ? (
              <>
                <br />
                <span className="badge bg-secondary">
                  🔒 Excluded from analytics
                </span>
              </>
            ) : null}
          </div>

          <div className="row g-3 align-items-end mb-3">
            <div className="col-md-3">
              <label className="form-label">Start Date</label>
              <input
                name="start_date"
                type="date"
                className="form-control"
                value={form.start_date}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Date</label>
              <input
                name="end_date"
                type="date"
                className="form-control"
                value={form.end_date}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Discounted Price (₱)</label>
              <input
                name="discounted_price"
                type="number"
                className="form-control"
                value={form.discounted_price}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <button onClick={savePromo} className="btn btn-success w-100">
                {editMode ? "Update Promo" : "Save Promo"}
              </button>
            </div>
            {errors.message && (
              <div className="alert alert-danger mt-2">❌ {errors.message}</div>
            )}
          </div>

          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Price</th>
                <th>Status</th>
                <th>Activated</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.length > 0 ? (
                promos.map((promo) => (
                  <tr key={promo.id}>
                    <td>{promo.start_date}</td>
                    <td>{promo.end_date}</td>
                    <td>₱{Number(promo.discounted_price).toFixed(2)}</td>
                    <td>{renderStatusBadge(promo.status)}</td>
                    <td>{promo.activated_at?.split("T")[0] || "-"}</td>
                    <td className="text-center">
                      {promo.status === "planned" && (
                        <>
                          <button
                            className="btn btn-sm btn-success me-1"
                            onClick={() => launchPromo(promo.id)}
                          >
                            Launch
                          </button>
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => cancelPromo(promo.id)}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-sm btn-info me-1"
                            onClick={() => {
                              setEditMode(true);
                              setEditingPromoId(promo.id);
                              setForm({
                                start_date: promo.start_date,
                                end_date: promo.end_date,
                                discounted_price: promo.discounted_price,
                              });
                            }}
                          >
                            Edit
                          </button>
                        </>
                      )}
                      {promo.status === "launched" && isCancelable(promo) && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => cancelPromo(promo.id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    No promos available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      ) : (
        <PromoOverview />
      )}

      {/* Modals from shared component */}
      <ServiceSelectModal
        show={showServiceModal}
        services={services.filter((s) => !s.is_special)}
        onSelect={selectService}
        onClose={() => setShowServiceModal(false)}
      />

      {loading && <LoadingSpinner message="Saving promo..." />}
    </div>
  );
}
