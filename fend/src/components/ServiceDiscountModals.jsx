import React from "react";

// 🔹 Modal for selecting a service to create a promo
export function ServiceSelectModal({ show, services, onSelect, onClose }) {
  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">🦷 Select Service</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <ul className="list-group">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  onClick={() => onSelect(s.id)}
                  role="button"
                >
                  <div>
                    <strong>{s.name}</strong>
                    <br />
                    <small className="text-muted">{s.description}</small>
                  </div>
                  <span className="badge bg-primary">₱{s.price}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔸 Modal for confirming deletion of a promo
export function DeletePromoModal({ show, promo, onConfirm, onCancel }) {
  if (!show || !promo) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">⚠️ Confirm Promo Deletion</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            <p>
              Delete promo for <strong>{promo.start_date}</strong> to{" "}
              <strong>{promo.end_date}</strong>?<br />
              <span className="text-danger">This action is permanent.</span>
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm}>Yes, Delete Promo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
