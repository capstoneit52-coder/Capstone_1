import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

export default function HmoPicker({
  patientId,
  appointmentDate,  // "YYYY-MM-DD" string (required for filtering)
  value,             // selected patient_hmo_id (number | null)
  onChange,          // (id | null) => void
  disabled = false,
  required = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!patientId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await api.get(`/api/patients/${patientId}/hmos`);
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setErr(parseErr(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [patientId]);

  const options = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    // filter by effectiveness relative to appointmentDate
    const filtered = list.filter((h) => {
      const effOk = !h.effective_date || onlyDate(h.effective_date) <= appointmentDate;
      const expOk = !h.expiry_date || onlyDate(h.expiry_date) >= appointmentDate;
      return effOk && expOk;
    });
    // sort: primary first, then provider name
    return filtered.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.provider_name || "").localeCompare(b.provider_name || "");
    });
  }, [items, appointmentDate]);

  return (
    <div>
      <label className="text-sm text-zinc-700 dark:text-zinc-200">
        HMO to use {required && <span className="text-red-600">*</span>}
      </label>
      <div className="mt-1">
        {loading ? (
          <div className="text-sm text-zinc-500">Loading HMOs…</div>
        ) : err ? (
          <div className="text-sm text-red-600">{err}</div>
        ) : (
          <select
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled || options.length === 0}
          >
            <option value="">— Self-pay / No HMO —</option>
            {options.map((h) => (
              <option key={h.id} value={h.id}>
                {h.provider_name}
                {h.is_primary ? " (Primary)" : ""}
                {maskSuffix(h)}
              </option>
            ))}
          </select>
        )}
        {options.length === 0 && !loading && !err && (
          <div className="text-xs mt-1 text-zinc-500">
            No valid HMO for {appointmentDate}. Add or update HMO in profile first.
          </div>
        )}
      </div>
    </div>
  );
}

function onlyDate(v) {
  if (!v) return "";
  const s = String(v);
  return s.includes("T") ? s.split("T")[0] : s;
}

function parseErr(e) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

// Optional: mask ID/policy suffix to help the patient distinguish entries without exposing full values
function maskSuffix(h) {
  const member = (h.member_id_encrypted || "").toString();
  const policy = (h.policy_no_encrypted || "").toString();
  const tail = (str) => (str.length > 4 ? str.slice(-4) : str);
  const parts = [];
  if (member) parts.push(`ID••${tail(member)}`);
  if (policy) parts.push(`P#••${tail(policy)}`);
  return parts.length ? ` — ${parts.join(" / ")}` : "";
}
