import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";

const EMP_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "locum", label: "Locum" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const WEEKDAYS = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

export default function DentistScheduleManager() {
  const emptyForm = {
    id: null,
    dentist_code: "",
    dentist_name: "",
    is_pseudonymous: true, // default true (no real names needed)
    employment_type: "full_time",
    status: "active",
    contract_end_date: "",
    sun: false, mon: true, tue: true, wed: true, thu: true, fri: true, sat: false,
  };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => { fetchRows(); }, []);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/dentists");
      setRows(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load dentists. Check admin auth and routes.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.dentist_code || "").toLowerCase().includes(q) ||
      (r.dentist_name || "").toLowerCase().includes(q) ||
      (r.employment_type || "").toLowerCase().includes(q) ||
      (r.status || "").toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const openCreate = () => {
    setForm(emptyForm);
    setErrors({});
    setEditMode(false);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      dentist_code: row.dentist_code || "",
      dentist_name: row.dentist_name || "",
      is_pseudonymous: !!row.is_pseudonymous,
      employment_type: row.employment_type || "full_time",
      status: row.status || "active",
      contract_end_date: row.contract_end_date || "",
      sun: !!row.sun, mon: !!row.mon, tue: !!row.tue, wed: !!row.wed,
      thu: !!row.thu, fri: !!row.fri, sat: !!row.sat,
    });
    setErrors({});
    setEditMode(true);
    setShowModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.dentist_code.trim()) e.dentist_code = "Dentist code is required.";
    if (!EMP_TYPES.find(t => t.value === form.employment_type)) e.employment_type = "Invalid employment type.";
    if (!STATUSES.find(s => s.value === form.status)) e.status = "Invalid status.";
    const anyDay = WEEKDAYS.some(d => !!form[d.key]);
    if (!anyDay) e.weekdays = "Select at least one working day.";
    if (form.contract_end_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.contract_end_date)) {
      e.contract_end_date = "Use YYYY-MM-DD format.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        dentist_code: form.dentist_code.trim(),
        dentist_name: form.dentist_name?.trim() || null, // optional
        is_pseudonymous: !!form.is_pseudonymous,
        employment_type: form.employment_type,
        status: form.status,
        contract_end_date: form.contract_end_date || null,
        sun: !!form.sun, mon: !!form.mon, tue: !!form.tue, wed: !!form.wed,
        thu: !!form.thu, fri: !!form.fri, sat: !!form.sat,
      };

      if (editMode && form.id) {
        await api.put(`/api/dentists/${form.id}`, payload);
        alert("Dentist updated.");
      } else {
        await api.post("/api/dentists", payload);
        alert("Dentist created.");
      }
      setShowModal(false);
      fetchRows();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setErrors(data.errors);
      else alert(data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete dentist ${row.dentist_code}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/dentists/${row.id}`);
      alert("Deleted.");
      fetchRows();
    } catch (err) {
      alert(err?.response?.data?.message || "Delete failed.");
    }
  };

  const DayBadge = ({ on, label }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${on ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
      {label}
    </span>
  );

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Dentists</h1>
        <button onClick={openCreate} className="rounded-xl px-3 py-2 border bg-white hover:bg-gray-50">+ Add Dentist</button>
      </div>

      <div className="mb-3">
        <input
          className="w-full md:w-80 border rounded-lg px-3 py-2"
          placeholder="Search code / name / type / status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">Code</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Pseudonymous</th>
                <th className="p-2 border">Employment</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Weekdays</th>
                <th className="p-2 border">Contract End</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2 border font-medium">{r.dentist_code}</td>
                  <td className="p-2 border">{r.dentist_name || <span className="text-gray-400">—</span>}</td>
                  <td className="p-2 border">{r.is_pseudonymous ? "Yes" : "No"}</td>
                  <td className="p-2 border">{r.employment_type}</td>
                  <td className="p-2 border">{r.status}</td>
                  <td className="p-2 border">
                    <div className="flex flex-wrap gap-1">
                      {WEEKDAYS.map((d) => (
                        <DayBadge key={d.key} on={!!r[d.key]} label={d.label} />
                      ))}
                    </div>
                  </td>
                  <td className="p-2 border">{r.contract_end_date || <span className="text-gray-400">—</span>}</td>
                  <td className="p-2 border">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded border" onClick={() => openEdit(r)}>Edit</button>
                      <button className="px-2 py-1 rounded border" onClick={() => onDelete(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-3 text-center text-gray-500" colSpan={8}>No dentists found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{editMode ? "Edit Dentist" : "Add Dentist"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500">✕</button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Dentist Code<span className="text-red-500">*</span></label>
                  <input className="w-full border rounded px-3 py-2"
                    value={form.dentist_code}
                    onChange={(e) => setForm({ ...form, dentist_code: e.target.value })} />
                  {errors.dentist_code && <p className="text-xs text-red-600 mt-1">{String(errors.dentist_code)}</p>}
                </div>

                <div>
                  <label className="block text-sm">Dentist Name (optional)</label>
                  <input className="w-full border rounded px-3 py-2"
                    value={form.dentist_name}
                    onChange={(e) => setForm({ ...form, dentist_name: e.target.value })} />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isPseudo"
                    type="checkbox"
                    checked={!!form.is_pseudonymous}
                    onChange={(e) => setForm({ ...form, is_pseudonymous: e.target.checked })}
                  />
                  <label htmlFor="isPseudo" className="text-sm">Use pseudonymous identity?</label>
                </div>

                <div>
                  <label className="block text-sm">Employment Type<span className="text-red-500">*</span></label>
                  <select className="w-full border rounded px-3 py-2"
                    value={form.employment_type}
                    onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
                    {EMP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {errors.employment_type && <p className="text-xs text-red-600 mt-1">{String(errors.employment_type)}</p>}
                </div>

                <div>
                  <label className="block text-sm">Status<span className="text-red-500">*</span></label>
                  <select className="w-full border rounded px-3 py-2"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {errors.status && <p className="text-xs text-red-600 mt-1">{String(errors.status)}</p>}
                </div>

                <div>
                  <label className="block text-sm">Contract End (optional)</label>
                  <input type="date" className="w-full border rounded px-3 py-2"
                    value={form.contract_end_date || ""}
                    onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} />
                  {errors.contract_end_date && <p className="text-xs text-red-600 mt-1">{String(errors.contract_end_date)}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Working Days<span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-3">
                  {WEEKDAYS.map(d => (
                    <label key={d.key} className="inline-flex items-center gap-2">
                      <input type="checkbox"
                        checked={!!form[d.key]}
                        onChange={(e) => setForm({ ...form, [d.key]: e.target.checked })} />
                      <span>{d.label}</span>
                    </label>
                  ))}
                </div>
                {errors.weekdays && <p className="text-xs text-red-600 mt-1">{String(errors.weekdays)}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="px-3 py-2 rounded border" onClick={() => setShowModal(false)}>Cancel</button>
                <button disabled={saving} type="submit" className="px-3 py-2 rounded border bg-black text-white disabled:opacity-50">
                  {saving ? "Saving…" : (editMode ? "Save Changes" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}