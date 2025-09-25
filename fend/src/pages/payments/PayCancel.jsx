import { useNavigate } from "react-router-dom";

export default function PayCancel() {
  const nav = useNavigate();
  return (
    <div className="container py-5">
      <h3>🚫 Payment Cancelled</h3>
      <p className="text-muted">You cancelled the payment. You can try again anytime.</p>
      <button className="btn btn-secondary" onClick={() => nav("/patient/appointments")}>
        Back to My Appointments
      </button>
    </div>
  );
}
