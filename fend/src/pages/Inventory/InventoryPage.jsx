import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import InventoryItemForm from "./InventoryItemForm";
import ReceiveStockForm from "./ReceiveStockForm";
import ConsumeStockForm from "./ConsumeStockForm";
import AdjustStockForm from "./AdjustStockForm";
import Modal from "../../components/Modal";

/** Admin-only settings card (kept inline for brevity) */
function InventorySettingsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staff_can_receive: false,
    near_expiry_days: 30,
    low_stock_debounce_hours: 24,
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/inventory/settings");
      setForm(data);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/api/inventory/settings", form);
      alert("Settings saved.");
    } catch (e) {
      alert(e?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="border rounded-xl p-4">Loading settings…</div>;

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h2 className="font-medium">Inventory Settings</h2>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.staff_can_receive}
          onChange={e => setForm(s => ({ ...s, staff_can_receive: e.target.checked }))}
        />
        <span>Allow staff to receive stock</span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2">
          <span>Near-expiry days</span>
          <input
            className="border rounded px-2 py-1 w-24"
            type="number" min="1" max="365"
            value={form.near_expiry_days}
            onChange={e => setForm(s => ({ ...s, near_expiry_days: Number(e.target.value) }))}
          />
        </label>

        <label className="flex items-center gap-2">
          <span>Low-stock debounce (hours)</span>
          <input
            className="border rounded px-2 py-1 w-24"
            type="number" min="1" max="168"
            value={form.low_stock_debounce_hours}
            onChange={e => setForm(s => ({ ...s, low_stock_debounce_hours: Number(e.target.value) }))}
          />
        </label>
      </div>

      <button className="border rounded px-3 py-2" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // modal flags
  const [openAdd, setOpenAdd] = useState(false);
  const [openReceive, setOpenReceive] = useState(false);
  const [openConsume, setOpenConsume] = useState(false);
  const [openAdjust, setOpenAdjust] = useState(false);

  // item prefill when jumping from Adjust -> Receive
  const [prefillItemId, setPrefillItemId] = useState(null);
  const openReceiveForItem = (itemId) => {
    setPrefillItemId(itemId);
    setOpenAdjust(false);
    setOpenReceive(true);
  };

  const fetchItems = async (query = "") => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/inventory/items", { params: { q: query } });
      setItems(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const { data } = await api.get("/api/user");
      setUser(data);
    } catch (e) {
      console.error("Failed to load user", e);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchUser();
  }, []);

  const totalSkus = useMemo(() => items.length, [items]);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
      </div>

      {/* Search + actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search items..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="border rounded px-3 py-2" onClick={() => fetchItems(q)}>Search</button>

        <div className="ml-auto flex gap-2">
          <button className="border rounded px-3 py-2" onClick={() => setOpenAdd(true)}>
            + Add Item
          </button>
          <button className="border rounded px-3 py-2" onClick={() => setOpenReceive(true)}>
            ⇪ Receive Stock
          </button>
          <button className="border rounded px-3 py-2" onClick={() => setOpenConsume(true)}>
            − Consume
          </button>
          {user?.role === "admin" && (
            <button className="border rounded px-3 py-2" onClick={() => setOpenAdjust(true)}>
              ✎ Adjust
            </button>
          )}
        </div>
      </div>

      {/* Admin-only settings */}
      {user?.role === "admin" && (
        <div>
          <InventorySettingsCard />
        </div>
      )}

      {/* Items table */}
      <div className="border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Items ({totalSkus})</h2>
          {loading && <span className="text-sm">Loading…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">Threshold</th>
                <th className="py-2 pr-4">On Hand</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b">
                  <td className="py-2 pr-4">{it.name}</td>
                  <td className="py-2 pr-4">{it.sku_code}</td>
                  <td className="py-2 pr-4">{it.type}</td>
                  <td className="py-2 pr-4">{it.unit}</td>
                  <td className="py-2 pr-4">{it.low_stock_threshold ?? 0}</td>
                  <td className="py-2 pr-4">{Number(it.total_on_hand || 0)}</td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-gray-500">
                    No items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add Item">
        <InventoryItemForm
          onCreated={() => {
            setOpenAdd(false);
            fetchItems(q);
          }}
        />
      </Modal>

      <Modal
        open={openReceive}
        onClose={() => { setOpenReceive(false); setPrefillItemId(null); }}
        title="Receive Stock"
      >
        <ReceiveStockForm
          items={items}
          initialItemId={prefillItemId}
          onReceived={() => {
            setOpenReceive(false);
            setPrefillItemId(null);
            fetchItems(q);
          }}
        />
      </Modal>

      <Modal open={openConsume} onClose={() => setOpenConsume(false)} title="Consume Stock">
        <ConsumeStockForm
          items={items}
          user={user}
          onConsumed={() => {
            setOpenConsume(false);
            fetchItems(q);
          }}
        />
      </Modal>

      <Modal open={openAdjust} onClose={() => setOpenAdjust(false)} title="Adjust Stock (Admin)">
        <AdjustStockForm
          items={items}
          onAdjusted={() => {
            setOpenAdjust(false);
            fetchItems(q);
          }}
          onNeedReceive={openReceiveForItem}
        />
      </Modal>
    </div>
  );
}
