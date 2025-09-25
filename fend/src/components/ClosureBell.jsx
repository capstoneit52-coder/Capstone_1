import { useState } from "react";
import useClosureAlerts from "../hooks/useClosureAlerts";

export default function ClosureBell({ withinDays = 7 }) {
  const { closures, loading, dismissed, dismissForToday } = useClosureAlerts(withinDays);
  const [open, setOpen] = useState(false);

  const hasAlerts = !loading && closures.length > 0 && !dismissed;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100"
        aria-label="Notifications"
        title="Notifications"
      >
        <span role="img" aria-label="bell">🔔</span>
        {hasAlerts && (
          <span
            className="absolute -top-0.5 -right-0.5 inline-flex h-3 w-3 rounded-full bg-red-500"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl bg-white border z-50">
          <div className="px-4 py-3 border-b">
            <div className="font-semibold">Notifications</div>
            <div className="text-xs text-gray-500">Upcoming clinic closures</div>
          </div>

          <div className="max-h-72 overflow-auto">
            {loading && (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            )}

            {!loading && closures.length === 0 && (
              <div className="p-4 text-sm text-gray-500">
                No closures in the next {withinDays} days.
              </div>
            )}

            {!loading && closures.length > 0 && (
              <ul className="divide-y">
                {closures.map((c, idx) => (
                  <li key={idx} className="p-3 text-sm">
                    <div className="font-medium">{c.date}</div>
                    <div className="text-gray-600">
                      {c.closure_message || "Clinic closed"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {closures.length > 0 && (
            <div className="px-4 py-2 border-t flex justify-end">
              <button
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => { dismissForToday(); setOpen(false); }}
              >
                Dismiss for today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
