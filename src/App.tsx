import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AnalysePage } from "./pages/AnalysePage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { ExportsPage } from "./pages/ExportsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { InfoPage } from "./pages/InfoPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ResultPage } from "./pages/ResultPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsagePage } from "./pages/UsagePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analyse" element={<AnalysePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/upload" element={<Navigate to="/analyse" replace />} />
          <Route path="/documents/batch-upload" element={<Navigate to="/analyse" replace />} />
          <Route path="/documents/:id" element={<LegacyDocumentRedirect />} />
          <Route path="/documents/:id/review" element={<LegacyDocumentRedirect />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/database" element={<Navigate to="/documents" replace />} />
          <Route path="/search" element={<Navigate to="/documents" replace />} />
          <Route path="/exports" element={<ExportsPage />} />
          <Route path="/batch" element={<InfoPage kind="batch" />} />
          <Route path="/batch/:id" element={<InfoPage kind="batch" />} />
          <Route path="/projects/new" element={<InfoPage kind="workspace" />} />
          <Route path="/workspaces" element={<InfoPage kind="workspace" />} />
          <Route path="/workspaces/new" element={<InfoPage kind="workspace" />} />
          <Route path="/workspaces/:id" element={<InfoPage kind="workspace" />} />
          <Route path="/workspaces/:id/members" element={<InfoPage kind="workspace" />} />
          <Route path="/workspaces/invites/:inviteId/accept" element={<InfoPage kind="workspace" />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/ai" element={<Navigate to="/settings" replace />} />
          <Route path="/settings/api-keys" element={<Navigate to="/settings" replace />} />
          <Route path="/settings/webhooks" element={<Navigate to="/settings" replace />} />
          <Route path="/developers" element={<InfoPage kind="developers" />} />
          <Route path="/developers/logs" element={<InfoPage kind="developers" />} />
          <Route path="/developers/usage" element={<UsagePage />} />
          <Route path="/account" element={<InfoPage kind="account" />} />
          <Route path="/account/billing" element={<InfoPage kind="pricing" />} />
          <Route path="/account/billing/success" element={<InfoPage kind="pricing" />} />
          <Route path="/account/billing/cancel" element={<InfoPage kind="pricing" />} />
          <Route path="/features" element={<InfoPage kind="features" />} />
          <Route path="/demo" element={<InfoPage kind="demo" />} />
          <Route path="/use-cases" element={<InfoPage kind="use-cases" />} />
          <Route path="/security" element={<InfoPage kind="security" />} />
          <Route path="/docs" element={<InfoPage kind="docs" />} />
          <Route path="/docs/*" element={<InfoPage kind="docs" />} />
          <Route path="/contact" element={<InfoPage kind="contact" />} />
          <Route path="/pricing" element={<InfoPage kind="pricing" />} />
          <Route path="/login" element={<InfoPage kind="account" />} />
          <Route path="/register" element={<InfoPage kind="account" />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function LegacyDocumentRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/result/${id}` : "/documents"} replace />;
}
