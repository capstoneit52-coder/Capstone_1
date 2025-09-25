import { Outlet, useNavigate, NavLink } from "react-router-dom";
import api from "../api/api";
import "./AdminLayout.css";
import NotificationsBell from "../components/NotificationBell";

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/logout");
      localStorage.removeItem("token");
      navigate("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <div
        className="bg-dark text-white p-3"
        style={{ width: "250px", minHeight: "100vh" }}
      >
        <div
          className="sidebar-header sticky-top bg-dark pb-2 mb-3 border-bottom border-secondary d-flex align-items-center justify-content-between"
          style={{ zIndex: 1 }}
        >
          <h4 className="m-0">Admin Panel</h4>
          <div className="ms-2">
            <NotificationsBell />
          </div>
        </div>
        <ul className="nav flex-column">
          <li className="nav-item">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              🏠 Dashboard
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/admin/device-approvals"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              🔑 Device Approvals
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/approved-devices"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              ✅ Approved Devices
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/admin/staff-register"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              👥 Create Staff Account
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/admin/schedule"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              📆 Clinic Schedule
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/dentists"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              🧑‍⚕️ Dentists
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/admin/appointments"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              📅 Appointments
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/admin/services"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              🦷 Manage Services
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/service-discounts"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              💸 Service Promos
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/promo-archive"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              📁 Promo Archive
            </NavLink>
          </li>

          {/* --- Inventory --- */}
          <li className="nav-item mt-2">
            <NavLink
              to="/admin/inventory"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              📦 Inventory
            </NavLink>
          </li>

          {/* --- Goals --- */}
          <li className="nav-item">
            <NavLink
              to="/admin/goals"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              🎯 Goals
            </NavLink>
          </li>

          {/* --- Reports --- */}
          <li className="nav-item">
            <NavLink
              to="/admin/monthly-report"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              📈 Monthly Visits
            </NavLink>
          </li>

          {/* --- Analytics --- */}
          <li className="nav-item">
            <NavLink
              to="/admin/analytics"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              📉 Analytics
            </NavLink>
          </li>
          
          {/* --- System Logs --- */}
          <li className="nav-item">
            <NavLink
              to="/admin/system-logs"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              📊 System Logs
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/admin/profile"
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " fw-bold" : "")
              }
            >
              👤 Account
            </NavLink>
          </li>

          <li className="nav-item mt-4">
            <button
              className="btn btn-outline-danger w-100"
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 p-4">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
