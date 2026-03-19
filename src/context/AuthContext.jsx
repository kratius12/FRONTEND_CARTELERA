import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("admin_token"));
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Validate the existing token against basic expiry or format
  useEffect(() => {
    if (token) {
        try {
            // Attempt to decode a JWT without external libraries
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            
            if(isExpired){
                logout();
            } else {
                localStorage.setItem("admin_token", token);
            }
        } catch (e) {
            logout();
        }
    } else {
      localStorage.removeItem("admin_token");
    }
    setIsLoading(false);
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("admin_token");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
