import { Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import CurrentProgramRedirect from "./CurrentProgramRedirect";
import AdminPage from "./admin/AdminPage";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CurrentProgramRedirect />} />
      <Route path="/programs/:id" element={<App />} />
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
