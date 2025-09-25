import { useEffect, useState } from "react";
import api from "../../api/api";

const weekdayLabels = [
  "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"
];

function WeeklyScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => { fetchSchedules(); }, []);

  const fetchSchedules = async () => {
    try {
      const res = await api.get("/api/weekly-schedule");
      setSchedules(res.data);
    } catch (err) {
      console.error("Failed to load weekly schedule", err);
    }
  };

  const handleChange = (id, field, value) => {
    setSchedules(prev =>
      prev.map(row => {
        if (row.id !== id) return row;

        if (field === "is_open") {
          const isOpen = value;
          return {
            ...row,
            is_open: isOpen,
            // if closing a day, clear times in UI (optional UX)
            open_time: isOpen ? (row.open_time || "08:00") : "",
            close_time: isOpen ? (row.close_time || "17:00") : "",
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleSave = async (id) => {
    const row = schedules.find(r => r.id === id);
    setSavingId(id);
    try {
      await api.patch(`/api/weekly-schedule/${id}`, {
        is_open: !!row.is_open,
        open_time: row.is_open ? row.open_time : null,
        close_time: row.is_open ? row.close_time : null,
        note: row.note ?? null,
        // intentionally NOT sending dentist_count / max_per_slot anymore
      });
      alert(`✅ ${weekdayLabels[row.weekday]} saved.`);
    } catch (err) {
      console.error("Failed to save", err);
      alert("❌ Save failed. See console.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h5 className="mb-3">🗓️ Weekly Default Schedule (Open/Close & Hours)</h5>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th style={{minWidth:140}}>Day</th>
            <th style={{minWidth:120}}>Open Status</th>
            <th style={{minWidth:120}}>Opening</th>
            <th style={{minWidth:120}}>Closing</th>
            <th>Note</th>
            <th style={{minWidth:110}}>Action</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map(s => (
            <tr key={s.id}>
              <td>{weekdayLabels[s.weekday]}</td>

              <td>
                <select
                  className="form-select"
                  value={s.is_open ? "true" : "false"}
                  onChange={(e) => handleChange(s.id, "is_open", e.target.value === "true")}
                >
                  <option value="true">Open</option>
                  <option value="false">Closed</option>
                </select>
              </td>

              <td>
                {!s.is_open ? (
                  <input className="form-control" disabled placeholder="—" />
                ) : (
                  <input
                    type="time"
                    className="form-control"
                    value={s.open_time || ""}
                    onChange={(e) => handleChange(s.id, "open_time", e.target.value)}
                  />
                )}
              </td>

              <td>
                {!s.is_open ? (
                  <input className="form-control" disabled placeholder="—" />
                ) : (
                  <input
                    type="time"
                    className="form-control"
                    value={s.close_time || ""}
                    onChange={(e) => handleChange(s.id, "close_time", e.target.value)}
                  />
                )}
              </td>

              <td>
                <input
                  type="text"
                  className="form-control"
                  value={s.note || ""}
                  onChange={(e) => handleChange(s.id, "note", e.target.value)}
                  placeholder="Optional"
                />
              </td>

              <td>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleSave(s.id)}
                  disabled={savingId === s.id}
                >
                  {savingId === s.id ? "Saving..." : "Save"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <small className="text-muted">
        Dentist headcount and per‑slot capacity are managed in{" "}
        <strong>📊 Capacity (14 days)</strong> and by dentist schedules—not here.
      </small>
    </div>
  );
}

export default WeeklyScheduleManager;
