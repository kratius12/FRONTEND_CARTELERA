import { Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import CurrentProgramRedirect from "./CurrentProgramRedirect";
import AdminPage from "./admin/AdminPage";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import StagingPreview from "./StagingPreview";
import CleaningSlide from "./CleaningSlide";
import PrintSchedule from "./components/PrintSchedule";
import PrintGroups from "./components/PrintGroups";
import PreachingReportsPage from "./admin/PreachingReportsPage";
import GroupReportPage from "./GroupReportPage";
import PioneerProgressPage from "./admin/PioneerProgressPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CurrentProgramRedirect />} />
      <Route path="/programs/:id" element={<App />} />
      <Route path="/staging/:id" element={<StagingPreview />} />
      <Route path="/aseo" element={<CleaningSlide />} />
      <Route path="/imprimir" element={<PrintSchedule />} />
      <Route path="/imprimir-grupos" element={
        <ProtectedRoute>
          <PrintGroups />
        </ProtectedRoute>
      } />
      <Route path="/login" element={<Login />} />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/informes" element={
        <ProtectedRoute>
          <PreachingReportsPage />
        </ProtectedRoute>
      } />
      <Route path="/informes/precursores/:tipo" element={
        <ProtectedRoute>
          <PioneerProgressPage />
        </ProtectedRoute>
      } />
      {/* Link secreto de cada grupo: sin login */}
      <Route path="/informe-grupo/:token" element={<GroupReportPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
