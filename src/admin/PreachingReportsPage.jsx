// src/admin/PreachingReportsPage.jsx
// Página propia del módulo "Informes de predicación" (ruta /informes).
import { useContext } from "react";
import { Link } from "react-router-dom";
import PreachingReports from "./PreachingReports";
import ThemeToggle from "../components/ThemeToggle";
import { AuthContext } from "../context/AuthContext";
import "./AdminPage.css";

export default function PreachingReportsPage() {
    const { logout } = useContext(AuthContext);

    return (
        <div className="admin-app">
            <header className="top-navbar pr-standalone-nav">
                <div className="navbar-left">
                    <Link to="/admin" className="pr-back-link" title="Volver al panel de administración">
                        ← Panel
                    </Link>
                    <div className="navbar-brand">
                        <span className="navbar-logo">📋</span>
                        <span className="navbar-title">Admin Panel</span>
                    </div>
                </div>
                <div className="navbar-right">
                    <ThemeToggle />
                    <button className="navbar-logout-btn" onClick={logout} title="Cerrar Sesión">
                        🚪 <span className="logout-text">Salir</span>
                    </button>
                </div>
            </header>

            <main className="admin-content pr-standalone">
                <PreachingReports />
            </main>
        </div>
    );
}
