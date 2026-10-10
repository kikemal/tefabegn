import { Navigate, Route, Routes } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RegisterPage } from "./pages/RegisterPage";
import { WelcomePage } from "./pages/WelcomePage";

function MainShell() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="page-main">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/browse" element={<PlaceholderPage kind="browse" />} />
          <Route path="/my-reports" element={<PlaceholderPage kind="reports" />} />
          <Route path="/about" element={<PlaceholderPage kind="about" />} />
          <Route path="/reports/lost" element={<PlaceholderPage kind="lost" />} />
          <Route path="/reports/found" element={<PlaceholderPage kind="found" />} />
          <Route path="/items/:id" element={<PlaceholderPage kind="item" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/*" element={<MainShell />} />
    </Routes>
  );
}
