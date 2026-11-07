// src/admin/PreachingReportsPage.jsx
// Página propia del módulo "Informes de predicación" (ruta /informes).
import { useNavigate } from "react-router-dom";
import PreachingReports from "./PreachingReports";
import AdminLayout from "./AdminLayout";
import "./AdminPage.css";

export default function PreachingReportsPage() {
    const navigate = useNavigate();
    // Las demás opciones del menú abren el panel /admin en la vista elegida
    const goTo = (key) => {
        if (key !== "reports") navigate("/admin", { state: { tab: key } });
    };

    return (
        <AdminLayout activeKey="reports" onSelect={goTo}>
            <PreachingReports />
        </AdminLayout>
    );
}
