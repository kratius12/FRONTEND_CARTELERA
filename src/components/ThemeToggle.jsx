import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      title="Cambiar Tema"
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.2rem",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        padding: 0
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
