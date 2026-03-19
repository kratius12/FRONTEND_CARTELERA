import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div className="center-screen">Cargando acceso...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
