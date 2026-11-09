// src/admin/PioneerProgressPage.jsx
// Página del seguimiento de precursores: /admin/informes/precursores/:tipo?mes=YYYY-MM
// tipo: regulares | indefinidos | campana
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PioneerProgress from "./PioneerProgress";
import { categoryBySlug } from "./pioneerGoals";
import { defaultMonth, serviceYearMonths } from "./preachingReportsUtils";

export default function PioneerProgressPage() {
    const { tipo } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const requested = params.get("mes");
    const month = serviceYearMonths().includes(requested) ? requested : defaultMonth();
    const category = categoryBySlug(tipo);
    if (!category) return <Navigate to={`/admin/informes/precursores/regulares?mes=${month}`} replace />;

    // Cambiar de mes no llena el historial: "atrás" vuelve a donde se venía
    const changeMonth = (next) => {
        if (next && next !== month) navigate(`/admin/informes/precursores/${category.slug}?mes=${next}`, { replace: true });
    };

    return (
        <PioneerProgress category={category} month={month} onMonthChange={changeMonth} />
    );
}
