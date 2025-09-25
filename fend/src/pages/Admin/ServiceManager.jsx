import { useRef } from "react";
import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function ServiceManager() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    is_excluded_from_analytics: false,
    estimated_minutes: "",
    is_special: false,
    special_start_date: "",
    special_end_date: "",
    bundled_service_ids: [],
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const confirmModalRef = useRef(null);
  const [showPermanentConfirm, setShowPermanentConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await api.get("/api/services");
      setServices(res.data);
    } catch (err) {
      console.error("Failed to fetch services", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleDelete = (service) => {
    setServiceToDelete(service);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/services/${serviceToDelete.id}`);
      setShowDeleteModal(false);
      setServiceToDelete(null);
      fetchServices();
    } catch (err) {
      console.error("Failed to delete service", err);
    }
  };

  const handleSubmit = async () => {
    const isSpecial = formData.is_special;
    const hasNoDates =
      !formData.special_start_date && !formData.special_end_date;

    if (isSpecial && hasNoDates) {
      setShowPermanentConfirm(true);
      setPendingSubmit(() => () => saveService());
      return;
    }

    saveService();
  };

  const saveService = async () => {
    try {
      if (isEditMode) {
        await api.put(`/api/services/${editingId}`, formData);
      } else {
        await api.post("/api/services", formData);
      }
      setShowModal(false);
      fetchServices();
      resetForm();
      setFormErrors({});
    } catch (err) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors || {});
      } else {
        console.error("Failed to save service", err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      is_excluded_from_analytics: false,
      estimated_minutes: "",
      is_special: false,
      special_start_date: "",
      special_end_date: "",
      bundled_service_ids: [],
    });
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (service) => {
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price,
      category: service.category || "",
      is_excluded_from_analytics: service.is_excluded_from_analytics || false,
      estimated_minutes: service.estimated_minutes || "",
      is_special: service.is_special || false,
      special_start_date: service.special_start_date || "",
      special_end_date: service.special_end_date || "",
      bundled_service_ids: service.bundled_services?.map((s) => s.id) || [],
    });
    setEditingId(service.id);
    setIsEditMode(true);
    setShowModal(true);
  };

  return (
    <div className="container">
      <h1 className="mb-4">🦷 Service Management</h1>

      <div className="mb-3">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add New Service
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Fetching services..." />
      ) : (
        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Price (₱)</th>
              <th>Category</th>
              <th>Estimated Time</th>
              <th>Special</th>
              <th>Analytics</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  {service.name}
                  {service.bundled_services?.length > 0 && (
                    <div className="text-muted small">
                      ({service.bundled_services.map((s) => s.name).join(", ")})
                    </div>
                  )}
                </td>
                <td>{service.description}</td>
                <td>{Number(service.price).toFixed(2)}</td>
                <td>{service.category || "-"}</td>

                {/* Estimated Time */}
                <td>{service.estimated_minutes} mins</td>

                {/* Special Tag */}
                <td>
                  {service.is_special ? (
                    <>
                      <span className="badge bg-warning text-dark">
                        Special
                      </span>
                      <br />
                      <small>
                        {service.special_start_date && service.special_end_date
                          ? `${service.special_start_date} → ${service.special_end_date}`
                          : "(Permanent)"}
                      </small>
                    </>
                  ) : (
                    "-"
                  )}
                </td>

                <td>
                  {service.is_excluded_from_analytics ? "Excluded" : "Included"}
                </td>
                <td className="text-center">
                  <button
                    className="btn btn-sm btn-success me-2"
                    onClick={() => handleEdit(service)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(service)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {isEditMode ? "Edit Service" : "Add Service"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    Service Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    className={`form-control ${
                      formErrors.name ? "is-invalid" : ""
                    }`}
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  {formErrors.name && (
                    <div className="invalid-feedback">{formErrors.name[0]}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className={`form-control ${
                      formErrors.description ? "is-invalid" : ""
                    }`}
                    value={formData.description}
                    onChange={handleChange}
                  />
                  {formErrors.description && (
                    <div className="invalid-feedback">
                      {formErrors.description[0]}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Price (₱) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    className={`form-control ${
                      formErrors.price ? "is-invalid" : ""
                    }`}
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                  {formErrors.price && (
                    <div className="invalid-feedback">
                      {formErrors.price[0]}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Category <span className="text-danger">*</span>
                  </label>
                  <select
                    name="category"
                    className={`form-select ${
                      formErrors.category ? "is-invalid" : ""
                    }`}
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    <option value="Preventive">Preventive</option>
                    <option value="Restorative">Restorative</option>
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Other">Other</option>
                  </select>
                  {formErrors.category && (
                    <div className="invalid-feedback">
                      {formErrors.category[0]}
                    </div>
                  )}
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="excludeAnalytics"
                    name="is_excluded_from_analytics"
                    checked={formData.is_excluded_from_analytics}
                    onChange={handleChange}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="excludeAnalytics"
                  >
                    Exclude from analytics
                    <br />
                    <small className="text-muted">
                      Used to hide situational services like dentures from
                      charts and usage-based reports.
                    </small>
                  </label>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Estimated Procedure Time (minutes){" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    name="estimated_minutes"
                    className={`form-control ${
                      formErrors.estimated_minutes ? "is-invalid" : ""
                    }`}
                    value={formData.estimated_minutes}
                    onChange={handleChange}
                    required
                  />
                  <small className="text-muted">
                    This will be automatically rounded up to the nearest 30
                    minutes.
                  </small>
                  {formErrors.estimated_minutes && (
                    <div className="invalid-feedback">
                      {formErrors.estimated_minutes[0]}
                    </div>
                  )}
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isSpecial"
                    name="is_special"
                    checked={formData.is_special}
                    onChange={handleChange}
                  />
                  <label className="form-check-label" htmlFor="isSpecial">
                    Mark as Special / Package
                    <br />
                    <small className="text-muted">
                      Special services require a start and end date and cannot
                      be used with promo discounts.
                    </small>
                  </label>
                </div>
                {formData.is_special && (
                  <div className="mb-3">
                    <label className="form-label">
                      Start Date{" "}
                      <small className="text-muted">(optional)</small>
                    </label>
                    <input
                      type="date"
                      name="special_start_date"
                      className={`form-control ${
                        formErrors.special_start_date ? "is-invalid" : ""
                      }`}
                      value={formData.special_start_date}
                      onChange={handleChange}
                    />
                    {formErrors.special_start_date && (
                      <div className="invalid-feedback">
                        {formErrors.special_start_date[0]}
                      </div>
                    )}

                    <label className="form-label mt-2">
                      End Date <small className="text-muted">(optional)</small>
                    </label>
                    <input
                      type="date"
                      name="special_end_date"
                      className={`form-control ${
                        formErrors.special_end_date ? "is-invalid" : ""
                      }`}
                      value={formData.special_end_date}
                      onChange={handleChange}
                    />
                    {formErrors.special_end_date && (
                      <div className="invalid-feedback">
                        {formErrors.special_end_date[0]}
                      </div>
                    )}
                    <label className="form-label">Bundled Services</label>
                    <div
                      className="border rounded p-2"
                      style={{ maxHeight: 200, overflowY: "auto" }}
                    >
                      {services
                        .filter((s) => s.id !== editingId) // avoid self-bundle
                        .map((service) => (
                          <div key={service.id} className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`bundle-${service.id}`}
                              checked={formData.bundled_service_ids.includes(
                                service.id
                              )}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData((prev) => {
                                  const updatedIds = checked
                                    ? [...prev.bundled_service_ids, service.id]
                                    : prev.bundled_service_ids.filter(
                                        (id) => id !== service.id
                                      );
                                  return {
                                    ...prev,
                                    bundled_service_ids: updatedIds,
                                  };
                                });
                              }}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`bundle-${service.id}`}
                            >
                              {service.name}
                            </label>
                          </div>
                        ))}
                    </div>
                    <small className="text-muted">
                      Tick services to include in this package.
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">⚠️ Confirm Deletion</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete{" "}
                  <strong>{serviceToDelete?.name}</strong>?<br />
                  <span className="text-danger">
                    This action cannot be undone.
                  </span>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={confirmDelete}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPermanentConfirm && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Permanent Special</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPermanentConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  This special service has no start or end date.
                  <br />
                  Do you want to save it as a <strong>permanent package</strong>
                  ?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPermanentConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowPermanentConfirm(false);
                    if (pendingSubmit) pendingSubmit();
                  }}
                >
                  Yes, Save as Permanent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
