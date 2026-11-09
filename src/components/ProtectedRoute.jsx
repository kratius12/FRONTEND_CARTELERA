import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

// Exige sesión iniciada. Con `permission`, además exige ese módulo del panel.
// Sin sesión lleva al login y, al entrar, se vuelve a la página pedida.
export default function ProtectedRoute({ children, permission, fallback = null }) {
  const { token, isLoading, hasPermission } = useContext(AuthContext);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (isLoading) {
    return <div className="center-screen">Cargando acceso...</div>;
  }

  if (permission && !hasPermission(permission)) {
    return fallback ?? <Navigate to="/admin" replace />;
  }

  return children;
}
