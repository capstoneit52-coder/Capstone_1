import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

// Local helpers
function onlyDate(v) {
  if (!v) return "";
  const s = String(v);
  return s.includes("T") ? s.split("T")[0] : s;
}

export default function StaffAppointmentManager() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // for rejection modal
  const [note, setNote] = useState("");
  const [processingId, setProcessingId] = useState(null); // holds appointment ID being processed
  const [verifyId, setVerifyId] = useState(null);
  const [verifyAppt, setVerifyAppt] = useState(null);
  const [verifyPwd, setVerifyPwd] = useState("");
  const [revealed, setRevealed] = useState(null);
  const [coverage, setCoverage] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/api/appointments?status=pending");
      setAppointments(res.data);
    } catch (err) {
      console.error("Failed to load appointments", err);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    setProcessingId(id);
    try {
      await api.post(`/api/appointments/${id}/approve`);
      fetchAppointments();
    } catch (err) {
      console.error("Approve error:", err.response?.data || err.message);
      alert(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Approval failed"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openVerify = (appt) => {
    if (appt.payment_method !== "hmo") return alert("Only for HMO payments");
    setVerifyId(appt.id);
    setVerifyAppt(appt);
    setVerifyPwd("");
    setRevealed(null);
    setCoverage("");
    setNote("");
  };

  const revealHmo = async () => {
    try {
      const { data } = await api.post(`/api/appointments/${verifyId}/hmo/reveal`, { password: verifyPwd });
      setRevealed(data);
    } catch (err) {
      alert(err?.response?.data?.message || "Invalid password or error");
    }
  };

  const notifyCoverage = async () => {
    if (!note.trim()) return alert("Please enter a note to send to the patient.");
    try {
      await api.post(`/api/appointments/${verifyId}/hmo/notify`, {
        message: note,
        coverage_amount: coverage ? Number(coverage) : undefined,
        approve: true,
      });
      setVerifyId(null);
      setVerifyAppt(null);
      setRevealed(null);
      setCoverage("");
      setNote("");
      fetchAppointments();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to send coverage update");
    }
  };

  const reject = async () => {
    if (!note.trim()) return alert("Note is required");

    setProcessingId(selected.id);
    try {
      await api.post(`/api/appointments/${selected.id}/reject`, { note });
      setSelected(null);
      setNote("");
      fetchAppointments();
    } catch (err) {
      console.error("Reject error:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Pending Appointments</h1>
      {appointments.length === 0 ? (
        <p>No pending appointments.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">#</th>
                <th className="p-2 border">Service</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Time</th>
                <th className="p-2 border">Payment</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, i) => (
                <tr key={appt.id} className="text-center">
                  <td className="p-2 border">{i + 1}</td>
                  <td className="p-2 border">{appt.service?.name}</td>
                  <td className="p-2 border">{appt.date}</td>
                  <td className="p-2 border">{appt.time_slot}</td>
                  <td className="p-2 border">{appt.payment_method}</td>
                  <td className="p-2 border capitalize">{appt.status}</td>
                  <td className="p-2 border">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => approve(appt.id)}
                        disabled={processingId === appt.id}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                      >
                        {processingId === appt.id ? "Approving..." : "Approve"}
                      </button>

                    {appt.payment_method === "hmo" && (
                      <button
                        onClick={() => openVerify(appt)}
                        className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
                      >
                        Verify HMO
                      </button>
                    )}

                      <button
                        onClick={() => setSelected(appt)}
                        disabled={processingId === appt.id}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-50"
                      >
                        {processingId === appt.id ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white p-6 rounded w-96 shadow-lg">
            <h2 className="text-lg font-bold mb-2">Reject Appointment</h2>
            <p className="text-sm mb-2">
              Enter reason for rejecting appointment on {selected.date} at{" "}
              {selected.time_slot}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border p-2 mb-2"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-gray-300 rounded"
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded"
                onClick={reject}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HMO Verify Modal */}
      {verifyId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white p-6 rounded w-[520px] shadow-lg">
            <h2 className="text-lg font-bold mb-3">HMO Verification</h2>
            {verifyAppt && (
              <div className="mb-3 text-sm">
                <div><strong>Service:</strong> {verifyAppt.service?.name || '—'}</div>
                <div><strong>Service Price:</strong> ₱{Number(verifyAppt.service?.price ?? 0).toLocaleString()}</div>
                <div><strong>Appointment Date:</strong> {onlyDate(verifyAppt.date)}</div>
              </div>
            )}
            {!revealed ? (
              <>
                <p className="text-sm mb-2">Enter your password to reveal patient HMO details.</p>
                <input
                  type="password"
                  className="w-full border p-2 mb-3"
                  value={verifyPwd}
                  onChange={(e) => setVerifyPwd(e.target.value)}
                  placeholder="Your password"
                />
                <div className="flex justify-end gap-2">
                  <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => setVerifyId(null)}>Cancel</button>
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={revealHmo}>Reveal</button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 text-sm">
                  <div><strong>Provider:</strong> {revealed.provider_name}</div>
                  <div><strong>Member ID:</strong> {revealed.member_id || '—'}</div>
                  <div><strong>Policy No:</strong> {revealed.policy_no || '—'}</div>
                  <div><strong>Effective:</strong> {onlyDate(revealed.effective_date) || '—'}</div>
                  <div><strong>Expiry:</strong> {onlyDate(revealed.expiry_date) || '—'}</div>
                </div>
                <div className="mb-2">
                  <label className="text-sm">Coverage Amount (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border p-2"
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                  />
                  {verifyAppt && coverage && (
                    <div className="text-xs text-zinc-600 mt-1">
                      Estimated balance: ₱{Math.max(0, Number(verifyAppt.service?.price ?? 0) - Number(coverage || 0)).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <label className="text-sm">Note to patient (what coverage means, balance, etc.)</label>
                  <textarea
                    className="w-full border p-2"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => { setVerifyId(null); setVerifyAppt(null); }}>Close</button>
                  <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={notifyCoverage}>Send & Approve</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
