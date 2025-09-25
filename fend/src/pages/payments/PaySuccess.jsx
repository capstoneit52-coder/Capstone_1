import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function PaySuccess() {
  const [search] = useSearchParams();
  const [msg, setMsg] = useState("Finalizing payment…");
  const nav = useNavigate();

  const mayaPaymentId = search.get("paymentId");            // Maya often sends this
  const ref = search.get("requestReferenceNumber") || "";   // sometimes present

  useEffect(() => {
    // Poll our backend (optional but nice) to reflect the latest status immediately
    const run = async () => {
      try {
        if (mayaPaymentId) {
          await api.get(`/api/maya/payments/${mayaPaymentId}/status`);
        }
        setMsg("Thanks! If not yet marked paid, it will update shortly.");
      } catch (e) {
        setMsg("Payment completed. We’re syncing the status…");
      }
    };
    run();
  }, [mayaPaymentId]);

  return (
    <div className="container py-5">
      <h3>✅ Payment Success</h3>
      <p className="text-muted">{msg}</p>
      {ref && <p className="small text-muted">Ref: {ref}</p>}
      <button className="btn btn-primary" onClick={() => nav("/patient/appointments")}>
        Back to My Appointments
      </button>
    </div>
  );
}
