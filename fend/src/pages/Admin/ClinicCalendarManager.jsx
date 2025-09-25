import { useEffect, useState } from "react";
import api from "../../api/api";

function ClinicCalendarManager() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newIsOpen, setNewIsOpen] = useState(true);
  const [newOpenTime, setNewOpenTime] = useState("");
  const [newCloseTime, setNewCloseTime] = useState("");
  const [newNote, setNewNote] = useState("");
  const [existingOverride, setExistingOverride] = useState(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState(null);

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try {
      const res = await api.get("/api/clinic-calendar");
      setEntries(res.data);
    } catch (err) {
      console.error("Failed to fetch clinic calendar", err);
    } finally {
      setLoading(false);
    }
  };

  // OPTIONAL: resolve the date to prefill from weekly defaults or existing override
  useEffect(() => {
    const fetchResolvedSchedule = async () => {
      if (!newDate) return;
      try {
        const res = await api.get("/api/clinic-calendar/resolve", { params: { date: newDate }});
        const { source, data } = res.data; // expect { source: 'override'|'weekly', data: {...} }
        if (source === "override") {
          setExistingOverride(data);
          setNewIsOpen(!!data.is_open);
          setNewOpenTime(data.open_time ?? "");
          setNewCloseTime(data.close_time ?? "");
          setNewNote(data.note ?? "");
          alert("⚠️ This date already has an override. You are editing it.");
        } else {
          setExistingOverride(null);
          setNewIsOpen(!!data.is_open);
          setNewOpenTime(data.open_time ?? "");
          setNewCloseTime(data.close_time ?? "");
          setNewNote(data.note ?? "");
        }
      } catch (err) {
        // If /resolve is not implemented, you can ignore this block or remove it.
        console.warn("Resolve not available; continuing without it.");
      }
    };
    fetchResolvedSchedule();
  }, [newDate]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: newDate,
        is_open: newIsOpen,
        open_time: newIsOpen ? normTime(newOpenTime) : null,
        close_time: newIsOpen ? normTime(newCloseTime) : null,
        note: newNote || null,
        // DO NOT send dentist_count or capacity here
      };

      if (existingOverride) {
        await api.put(`/api/clinic-calendar/${existingOverride.id}`, payload);
      } else {
        await api.post("/api/clinic-calendar", payload);
      }

      // reset
      setShowAddModal(false);
      setNewDate(""); setNewIsOpen(true);
      setNewOpenTime(""); setNewCloseTime(""); setNewNote("");
      setExistingOverride(null);
      fetchEntries();
    } catch (err) {
      console.error("Failed to add/update entry", err);
      alert("Failed to save entry. Maybe the date already exists?");
    }
  };

  const openEditModal = (entry) => {
    setEditEntry({
      ...entry,
      open_time: entry.open_time ?? "",
      close_time: entry.close_time ?? "",
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/clinic-calendar/${editEntry.id}`, {
        is_open: !!editEntry.is_open,
        open_time: editEntry.is_open ? normTime(editEntry.open_time) : null,
        close_time: editEntry.is_open ? normTime(editEntry.close_time) : null,
        note: editEntry.note || null,
        // DO NOT send dentist_count or capacity here
      });
      setShowEditModal(false);
      setEditEntry(null);
      fetchEntries();
    } catch (err) {
      console.error("Failed to update entry", err);
      alert("Update failed.");
    }
  };

  const openDeleteModal = (entry) => { setDeleteEntry(entry); setShowDeleteModal(true); };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/clinic-calendar/${deleteEntry.id}`);
      setShowDeleteModal(false);
      setDeleteEntry(null);
      fetchEntries();
    } catch (err) {
      console.error("Failed to delete entry", err);
      alert("Deletion failed.");
    }
  };

  // Normalize time like "08:00" or "08:00:00" -> "HH:MM"
  const normTime = (t) => (t ? String(t).slice(0,5) : null);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>📅 Clinic Calendar Manager</h2>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>➕ Add Entry</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Date</th>
              <th>Open Status</th>
              <th>Opening</th>
              <th>Closing</th>
              <th>Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan="6">No entries yet.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>{entry.is_open ? "✅ Open" : "❌ Closed"}</td>
                  <td>{entry.open_time?.slice(0,5) || "—"}</td>
                  <td>{entry.close_time?.slice(0,5) || "—"}</td>
                  <td>{entry.note || "—"}</td>
                  <td>
                    <button className="btn btn-sm btn-warning me-2" onClick={() => openEditModal(entry)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => openDeleteModal(entry)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Clinic Calendar Entry</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
              </div>
              <div className="modal-body">
                <form onSubmit={handleAdd}>
                  <div className="mb-3">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      disabled={!!existingOverride}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Open Status</label>
                    <select
                      className="form-select"
                      value={newIsOpen ? "true" : "false"}
                      onChange={(e) => setNewIsOpen(e.target.value === "true")}
                    >
                      <option value="true">Open</option>
                      <option value="false">Closed</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Opening Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={newOpenTime}
                      onChange={(e) => setNewOpenTime(e.target.value)}
                      required={newIsOpen}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Closing Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={newCloseTime}
                      onChange={(e) => setNewCloseTime(e.target.value)}
                      required={newIsOpen}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Note</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => {
                        setShowAddModal(false);
                        setNewDate(""); setNewIsOpen(true);
                        setNewOpenTime(""); setNewCloseTime(""); setNewNote("");
                        setExistingOverride(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">Save</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editEntry && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Clinic Calendar Entry</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)} />
              </div>
              <div className="modal-body">
                <form onSubmit={handleEdit}>
                  <div className="mb-3">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" value={editEntry.date.slice(0,10)} disabled />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Open Status</label>
                    <select
                      className="form-select"
                      value={editEntry.is_open ? "true" : "false"}
                      onChange={(e) =>
                        setEditEntry({ ...editEntry, is_open: e.target.value === "true" })
                      }
                    >
                      <option value="true">Open</option>
                      <option value="false">Closed</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Opening Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={editEntry.open_time || ""}
                      onChange={(e) => setEditEntry({ ...editEntry, open_time: e.target.value })}
                      disabled={!editEntry.is_open}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Closing Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={editEntry.close_time || ""}
                      onChange={(e) => setEditEntry({ ...editEntry, close_time: e.target.value })}
                      disabled={!editEntry.is_open}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Note</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editEntry.note || ""}
                      onChange={(e) => setEditEntry({ ...editEntry, note: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="d-flex justify-content-end">
                    <button type="button" className="btn btn-secondary me-2" onClick={() => setShowEditModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Update</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteEntry && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">Confirm Deletion</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
              </div>
              <div className="modal-body">
                <p>
                  Delete the calendar entry for <strong>{deleteEntry.date.slice(0, 10)}</strong>?
                </p>
                <p>This action <strong>cannot be undone</strong>.</p>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-secondary me-2" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicCalendarManager;
