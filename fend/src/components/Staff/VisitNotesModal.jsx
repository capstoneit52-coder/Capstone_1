import { useState } from "react";
import api from "../../api/api";

export default function VisitNotesModal({ visit, onClose }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState(null);

  const handleViewNotes = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post(`/api/visits/${visit.id}/view-notes`, {
        password: password,
      });
      
      setNotes(response.data.notes);
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid password or failed to decrypt notes");
    } finally {
      setLoading(false);
    }
  };

  const formatNotes = (notesData) => {
    if (!notesData) return null;
    
    return (
      <div className="space-y-4">
        {notesData.dentist_notes && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Dentist Notes:</h4>
            <div className="bg-gray-50 p-3 rounded border">
              <p className="whitespace-pre-wrap">{notesData.dentist_notes}</p>
            </div>
          </div>
        )}
        
        {notesData.findings && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Findings:</h4>
            <div className="bg-gray-50 p-3 rounded border">
              <p className="whitespace-pre-wrap">{notesData.findings}</p>
            </div>
          </div>
        )}
        
        {notesData.treatment_plan && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Treatment Plan:</h4>
            <div className="bg-gray-50 p-3 rounded border">
              <p className="whitespace-pre-wrap">{notesData.treatment_plan}</p>
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-600 border-t pt-3">
          <p><strong>Completed by:</strong> Staff ID #{notesData.completed_by}</p>
          <p><strong>Completed at:</strong> {new Date(notesData.completed_at).toLocaleString()}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Visit Notes - {visit.patient?.first_name} {visit.patient?.last_name}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          {!notes ? (
            <form onSubmit={handleViewNotes}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Enter your password to view encrypted notes:
                </label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  This action will be logged for security purposes.
                </p>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !password.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "View Notes"}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {formatNotes(notes)}
              <div className="flex justify-end mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
