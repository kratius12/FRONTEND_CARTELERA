import { Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import CurrentProgramRedirect from "./CurrentProgramRedirect";
import AdminPage from "./admin/AdminPage";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import StagingPreview from "./StagingPreview";
import CleaningSlide from "./CleaningSlide";
import PrintSchedule from "./components/PrintSchedule";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CurrentProgramRedirect />} />
      <Route path="/programs/:id" element={<App />} />
      <Route path="/staging/:id" element={<StagingPreview />} />
      <Route path="/aseo" element={<CleaningSlide />} />
      <Route path="/imprimir" element={<PrintSchedule />} />
      <Route path="/login" element={<Login />} />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
