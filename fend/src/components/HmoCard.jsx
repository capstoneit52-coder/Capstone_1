import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

/**
 * HmoCard.jsx
 * Role-aware HMO manager as a drop-in card for Patient Profile or Edit Visit pages.
 *
 * Props:
 * - patientId: number (required) — the patient whose HMO list we manage
 * - currentUserRole?: 'admin' | 'staff' | 'patient' (optional if you use Auth context)
 * - currentUserPatientId?: number | null — set when role is 'patient' so we can detect self-access
 * - compact?: boolean — smaller paddings for tight layouts (e.g., inside Visit editor)
 * - onChange?: (items: any[]) => void — callback after create/update/delete
 *
 * API endpoints expected (Laravel 12):
 *   GET    /api/patients/{patient}/hmos
 *   POST   /api/patients/{patient}/hmos
 *   PUT    /api/patients/{patient}/hmos/{hmo}
 *   DELETE /api/patients/{patient}/hmos/{hmo}
 *
 * Security & behavior notes:
 * - Member ID / policy are encrypted at-rest by backend casts.
 * - Frontend only controls basic CRUD; backend policies should still enforce who can manage what.
 * - UI permissions:
 *    • Patient can manage only their own HMOs (patientId === currentUserPatientId)
 *    • Staff/Admin can manage any patient’s HMOs (subject to backend)
 */
export default function HmoCard({
  patientId,
  currentUserRole,
  currentUserPatientId = null,
  compact = false,
  onChange,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canManage = useMemo(() => {
    if (currentUserRole === "admin" || currentUserRole === "staff") return true;
    if (currentUserRole === "patient") return Number(patientId) === Number(currentUserPatientId);
    return false; // default lock-down if unknown role
  }, [currentUserRole, patientId, currentUserPatientId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/api/patients/${patientId}/hmos`);
        if (mounted) {
          setItems(data || []);
          onChange && onChange(data || []);
        }
      } catch (e) {
        if (mounted) setError(parseErr(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [patientId]);

  const onCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const onEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSaved = (savedItem, mode) => {
    setShowForm(false);
    setEditingItem(null);
    setItems((prev) => {
      const next =
        mode === "create"
          ? normalizeAndSort([savedItem, ...prev])
          : normalizeAndSort(prev.map((it) => (it.id === savedItem.id ? savedItem : it)));
      onChange && onChange(next);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/api/patients/${patientId}/hmos/${confirmDelete.id}`);
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== confirmDelete.id);
        onChange && onChange(next);
        return next;
      });
    } catch (e) {
      alert(parseErr(e));
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div
      className={`w-full ${compact ? "p-3" : "p-4"} bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/60 dark:border-zinc-800/60`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-semibold">HMO</h3>
        {canManage && (
          <button
            onClick={onCreate}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
          >
            + Add HMO
          </button>
        )}
      </div>

      {loading && <div className="text-sm text-zinc-500">Loading HMOs…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !items?.length && (
        <div className="text-sm text-zinc-500">No HMO on file.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items?.map((it) => (
          <HmoItemCard
            key={it.id}
            item={it}
            onEdit={() => onEdit(it)}
            onAskDelete={() => setConfirmDelete(it)}
            canManage={canManage}
          />
        ))}
      </div>

      {showForm && (
        <HmoFormModal
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
          patientId={patientId}
          initial={editingItem}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          title="Delete HMO?"
          message={`This will remove ${confirmDelete.provider_name} from this patient. You can restore from audit logs in backend if implemented.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function HmoItemCard({ item, onEdit, onAskDelete, canManage }) {
  return (
    <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.provider_name}</span>
            {item.is_primary ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                Primary
              </span>
            ) : null}
          </div>
          <div className="text-xs mt-1 text-zinc-500">
            {formatDates(item.effective_date, item.expiry_date)}
          </div>
          <div className="text-sm mt-2 space-y-1">
            {item.member_id_encrypted && (
              <div>
                <span className="text-zinc-500">Member ID:</span>{" "}
                {item.member_id_encrypted}
              </div>
            )}
            {item.policy_no_encrypted && (
              <div>
                <span className="text-zinc-500">Policy #:</span>{" "}
                {item.policy_no_encrypted}
              </div>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Edit
            </button>
            <button
              onClick={onAskDelete}
              className="px-2.5 py-1 text-xs rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HmoFormModal({ onClose, onSaved, patientId, initial }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => ({
    provider_name: initial?.provider_name || "",
    member_id: initial?.member_id_encrypted || "",
    policy_no: initial?.policy_no_encrypted || "",
    effective_date: onlyDate(initial?.effective_date) || "",
    expiry_date: onlyDate(initial?.expiry_date) || "",
    is_primary: !!initial?.is_primary,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setSubmitting(true);
    setErr("");
    try {
      let res;
      const payload = {
        provider_name: form.provider_name,
        member_id: form.member_id,
        policy_no: form.policy_no,
        effective_date: form.effective_date,
        expiry_date: form.expiry_date,
        is_primary: form.is_primary,
      };
      if (isEdit) {
        res = await api.put(`/api/patients/${patientId}/hmos/${initial.id}`, payload);
        onSaved(res.data, "update");
      } else {
        res = await api.post(`/api/patients/${patientId}/hmos`, payload);
        onSaved(res.data, "create");
      }
    } catch (e) {
      setErr(parseErr(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200/60 dark:border-zinc-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold">{isEdit ? "Edit HMO" : "Add HMO"}</h4>
          <button
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ✕
          </button>
        </div>

        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField
            label="Provider Name"
            required
            value={form.provider_name}
            onChange={(v) => setForm({ ...form, provider_name: v })}
          />
          <TextField
            label="Member ID"
            value={form.member_id}
            onChange={(v) => setForm({ ...form, member_id: v })}
          />
          <TextField
            label="Policy #"
            value={form.policy_no}
            onChange={(v) => setForm({ ...form, policy_no: v })}
          />
          <DateField
            label="Effective Date"
            value={form.effective_date}
            onChange={(v) => setForm({ ...form, effective_date: v })}
          />
          <DateField
            label="Expiry Date"
            value={form.expiry_date}
            onChange={(v) => setForm({ ...form, expiry_date: v })}
          />
          <div className="flex items-center gap-2 pt-2">
            <input
              id="is_primary"
              type="checkbox"
              className="h-4 w-4"
              checked={form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            />
            <label htmlFor="is_primary" className="text-sm">
              Mark as Primary
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={submitting || !form.provider_name}
            className="px-3 py-1.5 text-sm rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
          >
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200/60 dark:border-zinc-800/60 p-4">
        <h4 className="text-base font-semibold mb-2">{title}</h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm rounded-xl border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, required }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <input
        type="text"
        className="w-full mt-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="date"
        className="w-full mt-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        value={onlyDate(value)}
        onChange={(e) => onChange(e.target.value)}
        min={label === 'Expiry Date' ? tomorrow() : undefined}
      />
    </div>
  );
}

function Label({ children, required = false }) {
  return (
    <label className="text-sm text-zinc-700 dark:text-zinc-200">
      {children} {required && <span className="text-red-600">*</span>}
    </label>
  );
}

function onlyDate(v) {
  if (!v) return "";
  const s = String(v);
  return s.includes("T") ? s.split("T")[0] : s;
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function parseErr(e) {
  const msg = e?.response?.data?.message || e?.message || "Request failed";
  const errs = e?.response?.data?.errors;
  if (errs) {
    try {
      const first = Object.values(errs)[0];
      if (Array.isArray(first) && first.length) return `${msg}: ${first[0]}`;
    } catch (_) {}
  }
  return msg;
}

function normalizeAndSort(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    const pa = (a.provider_name || "").toLowerCase();
    const pb = (b.provider_name || "").toLowerCase();
    return pa.localeCompare(pb);
  });
}

function formatDates(start, end) {
  const s = onlyDate(start);
  const e = onlyDate(end);
  if (!s && !e) return "No validity dates";
  if (s && e) return `Valid ${s} → ${e}`;
  if (s && !e) return `Effective ${s}`;
  if (!s && e) return `Until ${e}`;
  return "";
}
