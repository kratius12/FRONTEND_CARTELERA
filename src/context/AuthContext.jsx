import { createContext, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || "";
const STORAGE_KEY = "admin_token";

// Token guardado solo si no ha expirado (se lee el JWT sin librerías)
function readStoredToken() {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp * 1000 < Date.now()) throw new Error("expired");
    return token;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  // Usuario actual con sus permisos (GET /api/auth/me); null mientras carga o sin sesión
  const [user, setUser] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        setUser(await res.json());
        setLoadedFor(token);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        // Token vencido, cuenta desactivada o contraseña cambiada: se cierra la sesión
        clearSession();
        setLoadedFor(null);
      });
    return () => controller.abort();
  }, [token, clearSession]);

  const login = useCallback((newToken) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    setUser(null);
    setToken(newToken);
  }, []);

  // Reemplaza el token sin recargar el usuario (ej. tras cambiar la contraseña)
  const replaceToken = useCallback((newToken) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    setLoadedFor(newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    navigate("/login");
  }, [clearSession, navigate]);

  const hasPermission = useCallback(
    (module) => !!user && (user.is_superadmin || (user.permissions || []).includes(module)),
    [user],
  );

  // Cargando: hay token pero todavía no llegó el usuario de ese token
  const isLoading = !!token && (loadedFor !== token || !user);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, replaceToken, hasPermission, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
