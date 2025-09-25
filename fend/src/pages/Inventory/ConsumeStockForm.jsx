import { useMemo, useState, useEffect } from "react";
import api from "../../api/api";

export default function ConsumeStockForm({ items = [], user = null, onConsumed }) {
  const isStaff = user?.role === "staff";

  const [form, setForm] = useState({
    item_id: "",
    quantity: "",
    ref_type: isStaff ? "visit" : "", // staff must consume against a finished visit
    ref_id: "",
    notes: "",
  });

  const selectedItem = useMemo(
    () => items.find((i) => i.id === Number(form.item_id)),
    [items, form.item_id]
  );

  const handle = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();

    const payload = {
      item_id: Number(form.item_id),
      quantity: Number(form.quantity),
    };

    // Only send nullable fields when present
    if (isStaff) {
      payload.ref_type = "visit";
      if (form.ref_id) payload.ref_id = Number(form.ref_id);
    } else {
      if (form.ref_type) payload.ref_type = form.ref_type;
      if (form.ref_id) payload.ref_id = Number(form.ref_id);
    }
    if (form.notes?.trim()) payload.notes = form.notes.trim();

    try {
      await api.post("/api/inventory/consume", payload);
      setForm((f) => ({ ...f, quantity: "", ref_id: "", notes: "" }));
      onConsumed?.();
      alert("Stock consumed.");
    } catch (err) {
      alert(err?.response?.data?.message || "Consume failed");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="block text-sm mb-1">Item</span>
        <select
          className="border rounded px-3 py-2 w-full"
          value={form.item_id}
          onChange={(e) => handle("item_id", e.target.value)}
          required
        >
          <option value="">Select item…</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name} ({it.sku_code})
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-sm mb-1">Quantity</span>
          <input
            className="border rounded px-3 py-2 w-full"
            type="number"
            step="0.001"
            min="0.001"
            placeholder="e.g., 1"
            value={form.quantity}
            onChange={(e) => handle("quantity", e.target.value)}
            required
          />
        </label>

        {/* Reference */}
        {isStaff ? (
          <label className="block">
            <span className="block text-sm mb-1">Visit ID (required for staff)</span>
            <input
              className="border rounded px-3 py-2 w-full"
              type="number"
              min="1"
              placeholder="Finished Visit ID"
              value={form.ref_id}
              onChange={(e) => handle("ref_id", e.target.value)}
              required
            />
            <span className="text-xs text-gray-500">
              Backend requires a <b>finished</b> visit for staff consumption.
            </span>
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-sm mb-1">Reference type (optional)</span>
              <select
                className="border rounded px-3 py-2 w-full"
                value={form.ref_type}
                onChange={(e) => handle("ref_type", e.target.value)}
              >
                <option value="">None</option>
                <option value="visit">Visit</option>
                <option value="appointment">Appointment</option>
              </select>
            </label>

            {form.ref_type && (
              <label className="block">
                <span className="block text-sm mb-1">
                  {form.ref_type === "visit" ? "Visit ID" : "Appointment ID"}
                </span>
                <input
                  className="border rounded px-3 py-2 w-full"
                  type="number"
                  min="1"
                  placeholder="e.g., 123"
                  value={form.ref_id}
                  onChange={(e) => handle("ref_id", e.target.value)}
                />
              </label>
            )}
          </div>
        )}
      </div>

      <label className="block">
        <span className="block text-sm mb-1">Notes (optional)</span>
        <textarea
          className="border rounded px-3 py-2 w-full"
          rows={2}
          value={form.notes}
          onChange={(e) => handle("notes", e.target.value)}
        />
      </label>

      <button className="border rounded px-3 py-2">Consume</button>
    </form>
  );
}
