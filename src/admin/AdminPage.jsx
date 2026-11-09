// src/admin/AdminPage.jsx
// Panel /admin: menú lateral y barra superior. Cada sección tiene su propia ruta
// (/admin/programas, /admin/estudiantes, …) y se dibuja en el <Outlet />.
import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import "./AdminPage.css";

export default function AdminPage() {
    // Las vistas avisan cuando cambian datos que muestran los avisos de la barra superior
    const [noticeKey, setNoticeKey] = useState(0);
    const refreshNotices = useCallback(() => setNoticeKey((k) => k + 1), []);

    return (
        <AdminLayout noticeKey={noticeKey}>
            <Outlet context={{ refreshNotices }} />
        </AdminLayout>
    );
}
