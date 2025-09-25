import { useState } from "react";
import ClinicCalendarManager from "./ClinicCalendarManager";
import WeeklyScheduleManager from "./WeeklyScheduleManager";
import CapacityPlanner from "./CapacityPlanner"; // NEW: 14-day capacity editor

function ScheduleManager() {
  // tabs: "calendar" | "weekly" | "capacity"
  const [activeTab, setActiveTab] = useState("calendar");

  const TabButton = ({ id, icon, label }) => (
    <button
      className={`btn btn-${activeTab === id ? "primary" : "outline-primary"}`}
      onClick={() => setActiveTab(id)}
      type="button"
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="container mt-4">
      <h2>🦷 Clinic Schedule Management</h2>

      <div className="btn-group my-3" role="group" aria-label="Schedule tabs">
        <TabButton id="calendar" icon="📅" label="Calendar Overrides" />
        <TabButton id="weekly" icon="🔁" label="Weekly Defaults" />
        <TabButton id="capacity" icon="📊" label="Capacity (14 days)" />
      </div>

      <div>
        {activeTab === "calendar" && <ClinicCalendarManager />}
        {activeTab === "weekly" && <WeeklyScheduleManager />}
        {activeTab === "capacity" && <CapacityPlanner />}
      </div>
    </div>
  );
}

export default ScheduleManager;
