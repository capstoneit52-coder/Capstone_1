import { useSearchParams, useNavigate } from "react-router-dom";

export default function PayFailure() {
  const [search] = useSearchParams();
  const nav = useNavigate();
  const reason = search.get("reason") || "Payment failed.";

  return (
    <div className="container py-5">
      <h3>❌ Payment Failed</h3>
      <p className="text-muted">{reason}</p>
      <button className="btn btn-secondary" onClick={() => nav("/patient/appointments")}>
        Back to My Appointments
      </button>
    </div>
  );
}
