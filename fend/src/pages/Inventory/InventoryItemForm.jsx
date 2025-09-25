import { useState } from "react";
import api from "../../api/api";

export default function InventoryItemForm({ onCreated }) {
  const [form, setForm] = useState({
    name: "",
    sku_code: "",
    type: "supply",
    unit: "pcs",
    low_stock_threshold: 0,
    default_pack_size: "",
    is_controlled: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handle = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/inventory/items", form);
      setForm({ name:"", sku_code:"", type:"supply", unit:"pcs", low_stock_threshold:0, default_pack_size:"", is_controlled:false, notes:"" });
      onCreated?.();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Item name" value={form.name} onChange={e=>handle('name', e.target.value)} required />
        <input className="border rounded px-3 py-2" placeholder="SKU code" value={form.sku_code} onChange={e=>handle('sku_code', e.target.value)} required />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select className="border rounded px-3 py-2" value={form.type} onChange={e=>handle('type', e.target.value)}>
          <option value="drug">Drug</option>
          <option value="equipment">Equipment</option>
          <option value="supply">Supply</option>
          <option value="other">Other</option>
        </select>
        <input className="border rounded px-3 py-2" placeholder="Unit (pcs/ml/g)" value={form.unit} onChange={e=>handle('unit', e.target.value)} />
        <input className="border rounded px-3 py-2" type="number" min="0" placeholder="Low-stock threshold" value={form.low_stock_threshold} onChange={e=>handle('low_stock_threshold', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="border rounded px-3 py-2" type="number" min="0" step="0.001" placeholder="Default pack size (optional)" value={form.default_pack_size} onChange={e=>handle('default_pack_size', e.target.value)} />
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.is_controlled} onChange={e=>handle('is_controlled', e.target.checked)} />
          <span>Controlled item</span>
        </label>
      </div>
      <textarea className="border rounded px-3 py-2 w-full" rows={2} placeholder="Notes" value={form.notes} onChange={e=>handle('notes', e.target.value)} />
      <button disabled={saving} className="border rounded px-3 py-2">{saving ? "Saving..." : "Save Item"}</button>
    </form>
  );
}
