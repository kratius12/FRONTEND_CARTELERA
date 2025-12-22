import { Routes, Route, Navigate } from "react-router-dom";
import App from "./App";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/programs/:id" element={<App />} />
      <Route path="*" element={<Navigate to="/programs/1" replace />} />
    </Routes>
  );
}
