import { Navigate, Route, Routes } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { WelcomePage } from "./pages/WelcomePage";

export default function App() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="page-main">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/browse" element={<PlaceholderPage kind="browse" />} />
          <Route path="/my-reports" element={<PlaceholderPage kind="reports" />} />
          <Route path="/about" element={<PlaceholderPage kind="about" />} />
          <Route path="/sign-in" element={<PlaceholderPage kind="signIn" />} />
          <Route path="/reports/lost" element={<PlaceholderPage kind="lost" />} />
          <Route path="/reports/found" element={<PlaceholderPage kind="found" />} />
          <Route path="/items/:id" element={<PlaceholderPage kind="item" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
