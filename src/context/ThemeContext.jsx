import { createContext, useState, useEffect } from "react";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Intentar leer el guardado en Storage
    const saved = localStorage.getItem("cartelera_theme");
    // Si no hay, usar preferencia del sistema del sistema operativo
    if (saved) return saved === "dark";
    if (window.matchMedia) return window.matchMedia("(prefers-color-scheme: dark)").matches;
    return false;
  });

  useEffect(() => {
    const rootEl = document.getElementById("root");
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      if (rootEl) rootEl.classList.add("dark");
      localStorage.setItem("cartelera_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      if (rootEl) rootEl.classList.remove("dark");
      localStorage.setItem("cartelera_theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
