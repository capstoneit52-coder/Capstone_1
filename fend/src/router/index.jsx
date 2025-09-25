import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthRedirector from "../components/AuthRedirector";
import { lazy, Suspense } from "react";

import LandingPage from "../pages/LandingPage";

import InventoryPage from "../pages/Inventory/InventoryPage";
import {
  Gate,
  isAdmin,
  canStaffReceive,
  canConsumeForFinishedVisit,
} from "../components/RouteGuards";

// Auth pages
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import VerifyEmail from "../pages/VerifyEmail";
import VerifySuccess from "../pages/VerifySuccess";

// Admin layout and pages
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/Admin/Dashboard";
import AdminDeviceApprovals from "../pages/Admin/DeviceApprovals";
import AdminApprovedDevices from "../pages/Admin/ApprovedDevices";
import AdminStaffRegister from "../pages/Admin/StaffRegister";
import AdminProfile from "../pages/Admin/AdminProfile";
import AdminServices from "../pages/Admin/ServiceManager";
import ServiceDiscountManager from "../pages/Admin/ServiceDiscountManager";
import PromoArchive from "../pages/Admin/PromoArchive";
import ScheduleManager from "../pages/Admin/ScheduleManager";
import ClinicCalendarManager from "../pages/Admin/ClinicCalendarManager";
import AdminMonthlyReport from "../pages/Admin/AdminMonthlyReport";
import AdminGoalsPage from "../pages/Admin/AdminGoalsPage";
import SystemLogsPage from "../pages/Admin/SystemLogsPage";
import AdminAnalyticsDashboard from "../pages/Admin/AdminAnalyticsDashboard";
const DentistScheduleManager = lazy(() =>
  import("../pages/Admin/DentistScheduleManager")
); // Lazy load dentist schedule manager

// Staff layout and pages
import StaffLayout from "../layouts/StaffLayout";
import StaffDashboard from "../pages/Staff/StaffDashboard";
import StaffProfile from "../pages/Staff/StaffProfile";
import StaffAppointmentManager from "../pages/Staff/StaffAppointmentManager"; // Appointment management
import AppointmentReminders from "../pages/Staff/AppointmentReminders";
import ConsumeStockPage from "../pages/Staff/ConsumeStockPage";

// Patient layout and pages
import PatientLayout from "../layouts/PatientLayout";
import BookAppointment from "../pages/Patient/BookAppointment";
import PatientProfile from "../pages/Patient/PatientProfile";
import PatientAppointments from "../pages/Patient/PatientAppointments";

//
import NotificationsPage from "../pages/NotificationsPage";
import PaySuccess from "../pages/payments/PaySuccess";
import PayFailure from "../pages/payments/PayFailure";
import PayCancel from "../pages/payments/PayCancel";
//


// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';

export default function AppRouter() {
  return (
    <BrowserRouter basename="/app">
      <AuthRedirector /> {/* Redirects based on auth state */}
      <Routes>
        {/* Public / Auth Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/password-reset/:token" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-success" element={<VerifySuccess />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="device-approvals" element={<AdminDeviceApprovals />} />
          <Route path="approved-devices" element={<AdminApprovedDevices />} />
          <Route path="staff-register" element={<AdminStaffRegister />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="services" element={<AdminServices />} />
          <Route
            path="service-discounts"
            element={<ServiceDiscountManager />}
          />
          <Route path="promo-archive" element={<PromoArchive />} />
          <Route path="schedule" element={<ScheduleManager />} />

          <Route path="clinic-calendar" element={<ClinicCalendarManager />} />
          <Route path="monthly-report" element={<AdminMonthlyReport />} />
          <Route path="analytics" element={<AdminAnalyticsDashboard />} />
          <Route path="goals" element={<AdminGoalsPage />} />
          <Route
            path="dentists"
            element={
              <Suspense fallback={<div>Loading…</div>}>
                <DentistScheduleManager />
              </Suspense>
            }
          />
          <Route
            path="inventory"
            element={
              <Gate allow={({ user }) => user?.role === "admin"} to="/admin">
                <InventoryPage />
              </Gate>
            }
          />
          {/* Mirror Staff Appointments under Admin */}
          <Route path="appointments" element={<StaffAppointmentManager />} />
          {/* System Logs */}
          <Route path="system-logs" element={<SystemLogsPage />} />
          {/* Add more admin routes as needed */}
        </Route>

        {/* Staff Routes */}
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<StaffDashboard />} />
          <Route path="profile" element={<StaffProfile />} />
          <Route path="appointments" element={<StaffAppointmentManager />} />
          <Route
            path="appointment-reminders"
            element={<AppointmentReminders />}
          />
          <Route
            path="inventory"
            element={
              <Gate allow={canStaffReceive} to="/staff">
                <InventoryPage />
              </Gate>
            }
          />
          <Route //// inside onFinish handler navigate(`/staff/visits/${visit.id}/consume`, { state: { visitFinished: true } });
            path="visits/:id/consume"
            element={
              <Gate
                allow={({ user, settings }) =>
                  canConsumeForFinishedVisit({
                    user,
                    settings,
                    visitFinished: true,
                  })
                }
                to="/staff"
              >
                <ConsumeStockPage />
              </Gate>
            }
          />
          {/* Add more staff routes as needed */}
        </Route>

        {/* Patient Routes */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route path="appointment" element={<BookAppointment />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="appointments" element={<PatientAppointments />} />
        </Route>
        {/* Payment Result Routes */}
        <Route path="/pay/success" element={<PaySuccess />} />
        <Route path="/pay/failure" element={<PayFailure />} />
        <Route path="/pay/cancel" element={<PayCancel />} />
        {/* Catch-all for 404 */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
