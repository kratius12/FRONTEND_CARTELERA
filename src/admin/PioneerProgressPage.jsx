// src/admin/PioneerProgressPage.jsx
// Página del seguimiento de precursores: /informes/precursores/:tipo?mes=YYYY-MM
// tipo: regulares | indefinidos | campana
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PioneerProgress from "./PioneerProgress";
import AdminLayout from "./AdminLayout";
import { categoryBySlug } from "./pioneerGoals";
import { defaultMonth, serviceYearMonths } from "./preachingReportsUtils";
import "./AdminPage.css";

export default function PioneerProgressPage() {
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

    // Las opciones del menú: "Informes" vuelve a la planilla; las demás abren /admin en esa vista
    const goTo = (key) => {
        if (key === "reports") navigate(`/informes?mes=${month}`);
        else navigate("/admin", { state: { tab: key } });
    };

    return (
        <AdminLayout activeKey="reports" onSelect={goTo}>
            <PioneerProgress category={category} month={month} onMonthChange={changeMonth} />
        </AdminLayout>
    );
}
