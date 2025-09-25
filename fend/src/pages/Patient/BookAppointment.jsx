import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import HmoPicker from "../../components/HmoPicker";
// date helpers
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function sevenDaysOutStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function BookAppointment() {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState("");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bookingMessage, setBookingMessage] = useState("");

  // NEW: for HMO picker
  const [myPatientId, setMyPatientId] = useState(null);
  const [patientHmoId, setPatientHmoId] = useState(null);
  const [loadingPatientId, setLoadingPatientId] = useState(false);

  // try to get the logged-in patient's id
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingPatientId(true);
      try {
        const { data } = await api.get("/api/user");
        const pid = data?.patient?.id ?? null;
        if (mounted && pid) setMyPatientId(Number(pid));
      } catch (_) {
        // ignore; HMO section will show a warning
      } finally {
        if (mounted) setLoadingPatientId(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const fetchServices = async (date) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/appointment/available-services?date=${date}`);
      setServices(res.data);
    } catch (err) {
      setServices([]);
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (serviceId) => {
    setAvailableSlots([]);
    try {
      const res = await api.get(
        `/api/appointment/available-slots?date=${selectedDate}&service_id=${serviceId}`
      );
      setAvailableSlots(res.data.slots);
    } catch {
      setAvailableSlots([]);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setServices([]);
    setSelectedService(null);
    setAvailableSlots([]);
    setSelectedSlot("");
    setPaymentMethod("cash");
    setPatientHmoId(null); // reset HMO when date changes
    setBookingMessage("");
    if (date) fetchServices(date);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    fetchSlots(service.id);
    setSelectedSlot("");
    setBookingMessage("");
  };

  const handlePaymentChange = (e) => {
    const v = e.target.value;
    setPaymentMethod(v);
    if (v !== "hmo") {
      setPatientHmoId(null); // clear selection when leaving HMO
    }
  };

  const handleBookingSubmit = async () => {
    if (!selectedDate || !selectedService || !selectedSlot || !paymentMethod) {
      setBookingMessage("Please complete all booking fields.");
      return;
    }

    if (paymentMethod === "hmo" && !patientHmoId) {
      setBookingMessage("Please select an HMO for this appointment.");
      return;
    }

    try {
      const payload = {
        service_id: selectedService.id,
        date: selectedDate,
        start_time: selectedSlot,
        payment_method: paymentMethod,
      };
      if (paymentMethod === "hmo") {
        payload.patient_hmo_id = patientHmoId;
      }

      await api.post("/api/appointment", payload);

      setBookingMessage("✅ Appointment successfully booked! Redirecting...");
      setTimeout(() => {
        navigate("/patient");
      }, 2000);
    } catch (err) {
      setBookingMessage(err?.response?.data?.message || "Booking failed.");
    }
  };

  return (
// ----------------------------------------j
  <div className="d-flex flex-column align-items-center justify-content-start min-vh-100 pt-3">
  <h3 className="mb-4 text-center">📅 Book an Appointment</h3>
  <div className="mb-3 w-100" style={{ maxWidth: "320px" }}>
    <label className="form-label text-center w-100">Select a Date:</label>
    <input
      type="date"
      className="form-control text-center"
      value={selectedDate}
      onChange={handleDateChange}
      min={tomorrowStr()}
      max={sevenDaysOutStr()}
    />
  </div>
{/* //----------------------------------------j */}

      {loading && <LoadingSpinner message="Loading available services..." />}
      {error && <div className="alert alert-danger">{error}</div>}

      {services.length > 0 && (
        <div className="mt-4">
          <h5>Available Services:</h5>
          <ul className="list-group">
            {services.map((s) => (
              <li
                className="list-group-item d-flex justify-content-between align-items-center"
                key={`${s.id}-${s.type}`}
              >
                <div>
                  <strong>{s.name}</strong>
                  {s.type === "promo" && (
                    <div>
                      <span className="text-muted text-decoration-line-through">
                        ₱{s.original_price}
                      </span>{" "}
                      <span className="text-success">₱{s.promo_price}</span>{" "}
                      <span className="text-danger">({s.discount_percent}% off)</span>
                    </div>
                  )}
                  {s.type === "special" && (
                    <div className="text-info">
                      ₱{Number(s.price).toLocaleString()}{" "}
                      <span className="text-muted ms-2">Special Service</span>
                    </div>
                  )}
                  {s.type === "regular" && (
                    <div className="text-secondary">
                      ₱{Number(s.price).toLocaleString()}
                    </div>
                  )}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleServiceSelect(s)}>
                  Select
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedService && (
        <div className="mt-4">
          <h5>🕑 Select a Time Slot for {selectedService.name}</h5>

          {availableSlots.length === 0 && <p className="text-muted">No available slots.</p>}

          <select
            className="form-select"
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
          >
            <option value="">-- Select Time Slot --</option>
            {availableSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>

          <div className="mt-3">
            <label className="form-label">Payment Method:</label>
            <select className="form-select" value={paymentMethod} onChange={handlePaymentChange}>
              <option value="cash">Cash (on-site)</option>
              <option value="maya">Maya</option>
              <option value="hmo">HMO</option>
            </select>
          </div>

          {paymentMethod === "hmo" && (
            <div className="mt-3">
              <label className="form-label">Choose HMO:</label>
              {loadingPatientId ? (
                <div className="text-muted">Loading HMO list…</div>
              ) : myPatientId ? (
                <HmoPicker
                  patientId={myPatientId}
                  appointmentDate={selectedDate}
                  value={patientHmoId}
                  onChange={setPatientHmoId}
                  required
                />
              ) : (
                <div className="alert alert-warning">
                  We couldn’t load your patient profile. You may need to link your account at the
                  clinic, or try again later.
                </div>
              )}
            </div>
          )}

          <button className="btn btn-success mt-3" onClick={handleBookingSubmit}>
            Confirm Appointment
          </button>
          {bookingMessage && <div className="alert alert-info mt-3">{bookingMessage}</div>}
        </div>
      )}
    </div>
  );
}

export default BookAppointment;
