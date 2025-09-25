import { useState, useEffect } from "react";
import api from "../../api/api";

export default function VisitCompletionModal({ visit, onClose, onComplete }) {
  const [step, setStep] = useState(1); // 1: Stock, 2: Notes, 3: Payment
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 2: Notes
  const [dentistNotes, setDentistNotes] = useState("");
  const [findings, setFindings] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");

  // Step 3: Payment
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [onsitePaymentAmount, setOnsitePaymentAmount] = useState("");
  const [paymentMethodChange, setPaymentMethodChange] = useState("");

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    try {
      const res = await api.get("/api/inventory/items");
      setInventoryItems(res.data.data || []);
    } catch (err) {
      console.error("Failed to load inventory items", err);
    }
  };

  const addStockItem = () => {
    setStockItems([...stockItems, { item_id: "", quantity: "", notes: "" }]);
  };

  const updateStockItem = (index, field, value) => {
    const updated = [...stockItems];
    updated[index][field] = value;
    setStockItems(updated);
  };

  const removeStockItem = (index) => {
    setStockItems(stockItems.filter((_, i) => i !== index));
  };

  const calculatePaymentStatus = () => {
    const totalPaid = visit.payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    const servicePrice = visit.service?.price || 0;
    
    if (totalPaid >= servicePrice) return "paid";
    if (totalPaid > 0) return "partial";
    return "unpaid";
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const payload = {
        stock_items: stockItems.filter(item => item.item_id && item.quantity),
        dentist_notes: dentistNotes,
        findings: findings,
        treatment_plan: treatmentPlan,
        payment_status: paymentStatus,
        onsite_payment_amount: onsitePaymentAmount ? Number(onsitePaymentAmount) : null,
        payment_method_change: paymentMethodChange || null,
      };

      await api.post(`/api/visits/${visit.id}/complete-with-details`, payload);
      onComplete();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to complete visit");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPaid = visit.payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
  const servicePrice = visit.service?.price || 0;
  const balance = servicePrice - totalPaid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Complete Visit</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex mb-6">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNum}
                </div>
                <span className="ml-2 text-sm">
                  {stepNum === 1 && "Stock Consumption"}
                  {stepNum === 2 && "Visit Notes"}
                  {stepNum === 3 && "Payment Verification"}
                </span>
                {stepNum < 3 && <div className="w-8 h-0.5 bg-gray-200 ml-4" />}
              </div>
            ))}
          </div>

          {/* Step 1: Stock Consumption */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Consume Stock Items</h3>
              <div className="space-y-4">
                {stockItems.map((item, index) => (
                  <div key={index} className="flex gap-4 items-end p-4 border rounded">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Item</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={item.item_id}
                        onChange={(e) => updateStockItem(index, "item_id", e.target.value)}
                      >
                        <option value="">Select item</option>
                        {inventoryItems.map((invItem) => (
                          <option key={invItem.id} value={invItem.id}>
                            {invItem.name} (Stock: {invItem.total_on_hand || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium mb-1">Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full border rounded px-3 py-2"
                        value={item.quantity}
                        onChange={(e) => updateStockItem(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <input
                        type="text"
                        className="w-full border rounded px-3 py-2"
                        value={item.notes}
                        onChange={(e) => updateStockItem(index, "notes", e.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                    <button
                      onClick={() => removeStockItem(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={addStockItem}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Add Item
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Visit Notes */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Visit Documentation</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Dentist Notes</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 h-24"
                    value={dentistNotes}
                    onChange={(e) => setDentistNotes(e.target.value)}
                    placeholder="Enter dentist's notes about the visit..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Findings</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 h-24"
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Document any findings or observations..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Treatment Plan</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 h-24"
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    placeholder="Outline the treatment plan or follow-up instructions..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment Verification */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Payment Verification</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Payment Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div>Service: {visit.service?.name || "N/A"}</div>
                    <div>Service Price: ₱{servicePrice.toLocaleString()}</div>
                    <div>Total Paid: ₱{totalPaid.toLocaleString()}</div>
                    <div className="font-medium">
                      Balance: ₱{balance.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Status</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="paid">Fully Paid</option>
                    <option value="hmo_fully_covered">HMO Fully Covered</option>
                    <option value="partial">Partially Paid (HMO didn't cover all)</option>
                    <option value="unpaid">Unpaid (Maya failed)</option>
                  </select>
                </div>

                {paymentStatus === "partial" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      On-site Payment Amount (₱)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={balance}
                      className="w-full border rounded px-3 py-2"
                      value={onsitePaymentAmount}
                      onChange={(e) => setOnsitePaymentAmount(e.target.value)}
                      placeholder={`Maximum: ${balance.toLocaleString()}`}
                    />
                  </div>
                )}

                {paymentStatus === "unpaid" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Method Change</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={paymentMethodChange}
                      onChange={(e) => setPaymentMethodChange(e.target.value)}
                    >
                      <option value="">Select change</option>
                      <option value="maya_to_cash">Change Maya to Cash Payment</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <div>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Previous
                </button>
              )}
            </div>
            <div>
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {submitting ? "Completing..." : "Complete Visit"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
