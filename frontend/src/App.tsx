import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireStaff } from "./auth/RequireStaff";
import { SiteHeader } from "./components/SiteHeader";
import { DashboardShell } from "./components/dashboard/DashboardShell";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RegisterPage } from "./pages/RegisterPage";
import { WelcomePage } from "./pages/WelcomePage";
import { BrowseItemsPage } from "./pages/dashboard/BrowseItemsPage";
import { DashboardHome } from "./pages/dashboard/DashboardHome";
import { HelpSupportPage } from "./pages/dashboard/HelpSupportPage";
import { ItemDetailPage } from "./pages/dashboard/ItemDetailPage";
import { MyAccountPage } from "./pages/dashboard/MyAccountPage";
import { MyReportsPage } from "./pages/dashboard/MyReportsPage";
import { NotificationsPage } from "./pages/dashboard/NotificationsPage";
import { ReportItemPage } from "./pages/dashboard/ReportItemPage";
import { StaffClaimPage } from "./pages/dashboard/StaffClaimPage";
import { StaffQueuePage } from "./pages/dashboard/StaffQueuePage";

function PublicShell() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="page-main">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/about" element={<PlaceholderPage kind="about" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ProtectedApp() {
  return (
    <RequireAuth>
      <DashboardShell />
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedApp />}>
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/browse" element={<BrowseItemsPage />} />
        <Route path="/report" element={<ReportItemPage />} />
        <Route path="/my-reports" element={<MyReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/account" element={<MyAccountPage />} />
        <Route path="/help" element={<HelpSupportPage />} />
        <Route path="/items/:type/:id" element={<ItemDetailPage />} />
        <Route
          path="/staff"
          element={
            <RequireStaff>
              <StaffQueuePage />
            </RequireStaff>
          }
        />
        <Route
          path="/staff/claims/:claimId"
          element={
            <RequireStaff>
              <StaffClaimPage />
            </RequireStaff>
          }
        />
      </Route>

      {/* Legacy placeholder paths from welcome CTAs */}
      <Route path="/reports/lost" element={<Navigate to="/report?type=lost" replace />} />
      <Route path="/reports/found" element={<Navigate to="/report?type=found" replace />} />

      <Route path="/*" element={<PublicShell />} />
    </Routes>
  );
}
