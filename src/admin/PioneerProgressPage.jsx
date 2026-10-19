// src/admin/PioneerProgressPage.jsx
// Página del seguimiento de precursores: /informes/precursores/:tipo?mes=YYYY-MM
// tipo: regulares | indefinidos | campana
import { useContext } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PioneerProgress from "./PioneerProgress";
import ThemeToggle from "../components/ThemeToggle";
import { AuthContext } from "../context/AuthContext";
import { categoryBySlug } from "./pioneerGoals";
import { defaultMonth, serviceYearMonths } from "./preachingReportsUtils";
import "./AdminPage.css";

export default function PioneerProgressPage() {
    const { logout } = useContext(AuthContext);
    const { tipo } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const requested = params.get("mes");
    const month = serviceYearMonths().includes(requested) ? requested : defaultMonth();
    const category = categoryBySlug(tipo);
    if (!category) return <Navigate to={`/informes/precursores/regulares?mes=${month}`} replace />;

    // Cambiar de mes no llena el historial: "atrás" vuelve a donde se venía
    const changeMonth = (next) => {
        if (next && next !== month) navigate(`/informes/precursores/${category.slug}?mes=${next}`, { replace: true });
    };

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
                <PioneerProgress category={category} month={month} onMonthChange={changeMonth} />
            </main>
        </div>
    );
}
