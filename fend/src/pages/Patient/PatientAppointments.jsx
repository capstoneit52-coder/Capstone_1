import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [paying, setPaying] = useState(null); // appointment_id being processed

  useEffect(() => {
    (async () => {
      try {
        // ✅ prime CSRF once before any authenticated API calls
        await api.get("/sanctum/csrf-cookie");
      } catch (e) {
        // don't block; fetch may still work if cookie already present
        console.warn("CSRF prime failed (will retry later)", e);
      } finally {
        fetchAppointments(currentPage);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Refresh appointments when user returns to the page (e.g., after payment)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page focused, refreshing appointments...');
      fetchAppointments(currentPage);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible, refreshing appointments...');
        fetchAppointments(currentPage);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPage]);

  const fetchAppointments = async (page = 1) => {
    try {
      const res = await api.get(`/api/user-appointments?page=${page}`, {
        // this route often probes auth; ignore 401 auto-redirects
        skip401Handler: true,
      });
      
      // Debug: Log the response to see payment status
      console.log('Appointments API Response:', res.data.data);
      
      setAppointments(res.data.data);
      setMeta({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        per_page: res.data.per_page,
        total: res.data.total,
      });
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.post(`/api/appointment/${id}/cancel`);
      alert("Appointment canceled.");
      fetchAppointments(currentPage);
    } catch (err) {
      console.error("Cancel failed", err);
      alert("Failed to cancel appointment.");
    }
  };

  const handlePayNow = async (appointmentId) => {
    try {
      setPaying(appointmentId);

      // ✅ 1) make sure we have fresh CSRF + session
      await api.get("/sanctum/csrf-cookie");

      // ✅ 2) let backend compute amount + create Maya checkout
      const { data } = await api.post(
        "/api/maya/payments",
        { appointment_id: appointmentId },
        { skip401Handler: true }
      );

      if (data?.redirect_url) {
        // ✅ 3) go to Maya sandbox hosted page
        window.location.href = data.redirect_url;
      } else {
        alert("Payment link not available. Please try again.");
      }
    } catch (err) {
      console.error("Create Maya payment failed", err);
      // surface server hint if available
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.maya?.message ||
        "Unable to start payment. Please try again.";
      alert(serverMsg);
    } finally {
      setPaying(null);
    }
  };

  const renderStatusBadge = (status) => {
    const map = {
      approved: "bg-success",
      pending: "bg-warning text-dark",
      rejected: "bg-danger",
      cancelled: "bg-secondary text-white fw-semibold",
      completed: "bg-primary",
    };
    return <span className={`badge ${map[status] || "bg-secondary"}`}>{status}</span>;
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>📋 My Appointments</h3>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={() => fetchAppointments(currentPage)}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {loading && <LoadingSpinner message="Loading appointments..." />}

      {!loading && appointments.length === 0 && (
        <p className="text-muted mt-3">You have no appointments yet.</p>
      )}

      {!loading && appointments.length > 0 && (
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-sm align-middle">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Payment Method</th>
                <th>Payment Status</th>
                <th>Appt. Status</th>
                <th>Note</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const showPayNow =
                  a.payment_method === "maya" &&
                  a.payment_status === "awaiting_payment";

                return (
                  <tr key={a.id}>
                    <td>{a.date}</td>
                    <td>{a.service?.name || "—"}</td>
                    <td className="text-capitalize">{a.payment_method}</td>
                    <td>
                      <span
                        className={`badge ${
                          a.payment_status === "paid"
                            ? "bg-success"
                            : a.payment_status === "awaiting_payment"
                            ? "bg-warning text-dark"
                            : "bg-secondary"
                        }`}
                      >
                        {a.payment_status}
                      </span>
                    </td>
                    <td>{renderStatusBadge(a.status)}</td>
                    <td className="text-muted small">{a.notes || "—"}</td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        {showPayNow && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handlePayNow(a.id)}
                            disabled={paying === a.id}
                          >
                            {paying === a.id ? "Redirecting..." : "Pay now"}
                          </button>
                        )}

                        {a.status !== "cancelled" && a.status !== "rejected" && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleCancel(a.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              ◀ Previous
            </button>

            <span>
              Page {meta.current_page} of {meta.last_page}
            </span>

            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={currentPage === meta.last_page}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientAppointments;
