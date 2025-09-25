import { useEffect, useState } from "react";
import api from "../../api/api";

function toDateTimeLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function todayYmd(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ReceiveStockForm({
  items = [],
  onReceived,
  initialItemId,
}) {
  const [form, setForm] = useState({
    item_id: "",
    qty_received: "",
    received_at: toDateTimeLocal(), // local yyyy-mm-ddThh:mm
    cost_per_unit: "",
    lot_number: "",
    batch_number: "",
    expiry_date: "",
    supplier_id: "",
    invoice_no: "",
    invoice_date: "",
    pack_size: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // supplier modal state
  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  // Optional prefill for item (used when jumping from Adjust)
  useEffect(() => {
    if (initialItemId) {
      setForm((s) => ({ ...s, item_id: String(initialItemId) }));
    }
  }, [initialItemId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/inventory/suppliers");
        setSuppliers(data);
      } catch (e) {
        console.error("Failed to load suppliers", e);
      }
    })();
  }, []);

  const item = items.find((i) => i.id === Number(form.item_id));
  const handle = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/inventory/receive", {
        ...form,
        // convert datetime-local to "YYYY-MM-DD HH:mm:ss"
        received_at: form.received_at
          ? form.received_at.replace("T", " ") + ":00"
          : null,
      });
      setForm((f) => ({
        ...f,
        qty_received: "",
        cost_per_unit: "",
        lot_number: "",
        batch_number: "",
        expiry_date: "",
        invoice_no: "",
        invoice_date: "",
        pack_size: "",
        notes: "",
      }));
      onReceived?.();
      alert("Stock received.");
    } catch (err) {
      alert(err?.response?.data?.message || "Receive failed");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    !saving &&
    form.item_id &&
    form.qty_received &&
    form.received_at &&
    form.batch_number && // now required in UI
    (item?.type !== "drug" || (form.lot_number && form.expiry_date));

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Item */}
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

      <div className="grid grid-cols-3 gap-2">
        {/* Quantity received */}
        <label className="block">
          <span className="block text-sm mb-1">Quantity received</span>
          <input
            className="border rounded px-3 py-2 w-full"
            type="number"
            step="0.001"
            min="0.001"
            placeholder="e.g., 10"
            value={form.qty_received}
            onChange={(e) => handle("qty_received", e.target.value)}
            required
          />
        </label>

        {/* Date & time received */}
        <label className="block">
          <span className="block text-sm mb-1">Date & time received</span>
          <input
            className="border rounded px-3 py-2 w-full"
            type="datetime-local"
            value={form.received_at}
            onChange={(e) => handle("received_at", e.target.value)}
            required
          />
          <span className="text-xs text-gray-500">
            Must be within the allowed backdate window (≤ 24 hours; not in the
            future).
          </span>
        </label>

        {/* Cost per unit */}
        <label className="block">
          <span className="block text-sm mb-1">Cost per unit (optional)</span>
          <input
            className="border rounded px-3 py-2 w-full"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 12.50"
            value={form.cost_per_unit}
            onChange={(e) => handle("cost_per_unit", e.target.value)}
          />
        </label>
      </div>

      {item?.type === "drug" && (
        <div className="text-xs text-gray-600">
          For <b>drugs</b>, <b>Lot number</b> and <b>Expiry date</b> are
          required.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {/* Lot number */}
        <label className="block">
          <span className="block text-sm mb-1">
            Lot number{item?.type === "drug" ? " *" : ""}
          </span>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="e.g., LOT-ABC-123"
            value={form.lot_number}
            onChange={(e) => handle("lot_number", e.target.value)}
            required={item?.type === "drug"}
          />
        </label>

        {/* Batch number (now required) */}
        <label className="block">
          <span className="block text-sm mb-1">Batch number *</span>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="e.g., BATCH-2025-09"
            value={form.batch_number}
            onChange={(e) => handle("batch_number", e.target.value)}
            required
          />
        </label>

        {/* Expiry date */}
        <label className="block">
          <span className="block text-sm mb-1">
            Expiry date{item?.type === "drug" ? " *" : ""}
          </span>
          <input
            className="border rounded px-3 py-2 w-full"
            type="date"
            min={todayYmd()} // must not be in the past
            value={form.expiry_date}
            onChange={(e) => handle("expiry_date", e.target.value)}
            required={item?.type === "drug"}
          />
          <span className="text-xs text-gray-500">
            If the item is a <b>drug</b>, expiry is required and must be a{" "}
            <b>future</b> date. For non-drugs, expiry is optional.
          </span>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Invoice no. */}
        <label className="block">
          <span className="block text-sm mb-1">Invoice no. (optional)</span>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="e.g., INV-000123"
            value={form.invoice_no}
            onChange={(e) => handle("invoice_no", e.target.value)}
          />
        </label>

        {/* Invoice date */}
        <label className="block">
          <span className="block text-sm mb-1">Invoice date (optional)</span>
          <input
            className="border rounded px-3 py-2 w-full"
            type="date"
            value={form.invoice_date}
            onChange={(e) => handle("invoice_date", e.target.value)}
          />
        </label>

        {/* Pack size */}
        <label className="block">
          <span className="block text-sm mb-1">Pack size note (optional)</span>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="e.g., 1 box = 100 pcs"
            value={form.pack_size}
            onChange={(e) => handle("pack_size", e.target.value)}
          />
        </label>
      </div>

      {/* Supplier with Add button */}
      <div>
        <label className="block">
          <span className="block text-sm mb-1">Supplier (optional)</span>
          <div className="flex gap-2">
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.supplier_id}
              onChange={(e) => handle("supplier_id", e.target.value)}
            >
              <option value="">No supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="border rounded px-3"
              onClick={() => setShowSupplierModal(true)}
              title="Add new supplier"
            >
              + Add
            </button>
          </div>
          <span className="text-xs text-gray-500">
            Linking a supplier improves audit trail and costing.
          </span>
        </label>
      </div>

      {/* Notes */}
      <label className="block">
        <span className="block text-sm mb-1">Notes (optional)</span>
        <textarea
          className="border rounded px-3 py-2 w-full"
          rows={2}
          placeholder="Additional remarks…"
          value={form.notes}
          onChange={(e) => handle("notes", e.target.value)}
        />
      </label>

      <button disabled={!canSubmit} className="border rounded px-3 py-2">
        {saving ? "Receiving…" : "Receive Stock"}
      </button>

      {/* Simple modal (no external deps). If you use react-bootstrap, replace with <Modal> */}
      {showSupplierModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded shadow-lg w-full max-w-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Add Supplier</h3>
              <button
                type="button"
                className="border rounded px-2 py-1"
                onClick={() => setShowSupplierModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              <label className="block">
                <span className="block text-sm mb-1">Name *</span>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={newSupplier.name}
                  onChange={(e) =>
                    setNewSupplier((s) => ({ ...s, name: e.target.value }))
                  }
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-sm mb-1">Contact person</span>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={newSupplier.contact_person || ""}
                    onChange={(e) =>
                      setNewSupplier((s) => ({
                        ...s,
                        contact_person: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="block text-sm mb-1">Phone</span>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={newSupplier.phone || ""}
                    onChange={(e) =>
                      setNewSupplier((s) => ({ ...s, phone: e.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-sm mb-1">Email</span>
                  <input
                    type="email"
                    className="border rounded px-3 py-2 w-full"
                    value={newSupplier.email || ""}
                    onChange={(e) =>
                      setNewSupplier((s) => ({ ...s, email: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="block text-sm mb-1">Address</span>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={newSupplier.address || ""}
                    onChange={(e) =>
                      setNewSupplier((s) => ({ ...s, address: e.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm mb-1">Notes</span>
                <textarea
                  className="border rounded px-3 py-2 w-full"
                  rows={2}
                  value={newSupplier.notes || ""}
                  onChange={(e) =>
                    setNewSupplier((s) => ({ ...s, notes: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="border rounded px-3 py-2"
                onClick={() => setShowSupplierModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="border rounded px-3 py-2"
                disabled={savingSupplier || !newSupplier.name}
                onClick={async () => {
                  try {
                    setSavingSupplier(true);
                    const { data } = await api.post(
                      "/api/inventory/suppliers",
                      newSupplier
                    );
                    // add to list and select it
                    setSuppliers((prev) => [...prev, data]);
                    setForm((s) => ({ ...s, supplier_id: String(data.id) }));
                    setShowSupplierModal(false);
                    setNewSupplier({
                      name: "",
                      contact_person: "",
                      phone: "",
                      email: "",
                      address: "",
                      notes: "",
                    });
                  } catch (err) {
                    alert(
                      err?.response?.data?.message || "Failed to add supplier"
                    );
                  } finally {
                    setSavingSupplier(false);
                  }
                }}
              >
                {savingSupplier ? "Saving…" : "Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
