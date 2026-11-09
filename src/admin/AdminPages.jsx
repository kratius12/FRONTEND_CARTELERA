// src/admin/AdminPages.jsx
// Páginas del panel: cada una tiene su propia ruta (ver AppRoutes.jsx) y exige su módulo.
import { useContext, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { EmptyState, ErrorNote, Loading } from "./AdminWidgets";
import { MODULES, firstAllowedPath } from "./adminNav";
import ProgramForm from "./ProgramForm";
import ProgramList from "./ProgramList";
import StagingList from "./StagingList";

const API = import.meta.env.VITE_API_URL || "";

// Muestra la página solo con el módulo indicado; si no, un aviso dentro del panel
export function RequirePermission({ perm, children }) {
    const { hasPermission } = useContext(AuthContext);
    if (hasPermission(perm)) return children;
    const module = MODULES.find((m) => m.key === perm);
    return (
        <EmptyState icon="lock" title="No tienes acceso a esta sección">
            Pide a un administrador que te habilite el módulo <strong>{module?.label || perm}</strong>.
        </EmptyState>
    );
}

// /admin: abre la primera sección permitida
export function AdminHome() {
    const { hasPermission } = useContext(AuthContext);
    const path = firstAllowedPath(hasPermission);
    if (path) return <Navigate to={path} replace />;
    return (
        <EmptyState icon="lock" title="Tu cuenta todavía no tiene secciones habilitadas">
            Un administrador debe asignarte los módulos que vas a usar.
        </EmptyState>
    );
}

export function AdminNotFound() {
    return (
        <EmptyState icon="search" title="Esta página del panel no existe">
            <Link to="/admin">Volver al panel</Link>
        </EmptyState>
    );
}

function useNotices() {
    return useOutletContext()?.refreshNotices || (() => {});
}

// /admin/programas
export function PublishedProgramsPage() {
    const navigate = useNavigate();
    return <ProgramList onEdit={(p) => navigate(`/admin/programas/${p.id}/editar`)} />;
}

// /admin/programas/temporales
export function StagingProgramsPage() {
    const navigate = useNavigate();
    const refreshNotices = useNotices();
    return (
        <StagingList
            onPublished={() => { refreshNotices(); navigate("/admin/programas"); }}
            onEdit={(p) => navigate(`/admin/programas/temporales/${p.id}/editar`)}
            onChanged={refreshNotices}
        />
    );
}

// /admin/programas/nuevo
export function NewProgramPage() {
    const navigate = useNavigate();
    const refreshNotices = useNotices();
    return <ProgramForm onSaved={() => { refreshNotices(); navigate("/admin/programas/temporales"); }} />;
}

// /admin/programas/:id/editar (publicado) y /admin/programas/temporales/:id/editar (temporal)
export function EditProgramPage({ source }) {
    const { id } = useParams();
    const { token, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const refreshNotices = useNotices();
    const [state, setState] = useState({ id: null, data: null, error: "" });

    useEffect(() => {
        let cancelled = false;
        const headers = { Authorization: `Bearer ${token}` };
        const load = async () => {
            if (source === "staging") {
                const r = await fetch(`${API}/api/admin/programs/staging/${id}`, { headers });
                if (r.status === 401) { logout(); throw new Error("Sesión expirada"); }
                if (!r.ok) throw new Error("No se encontró el programa temporal");
                const d = await r.json();
                return { id: d.id, week_start: d.week_start, week_end: d.week_end, payload: d.payload, source };
            }
            // Publicado: las fechas vienen del listado y el contenido del programa
            const [listRes, progRes] = await Promise.all([fetch(`${API}/api/programs`), fetch(`${API}/api/programs/${id}`)]);
            if (!listRes.ok || !progRes.ok) throw new Error("No se encontró el programa publicado");
            const item = (await listRes.json()).find((p) => String(p.id) === String(id));
            if (!item) throw new Error("No se encontró el programa publicado");
            return { id: item.id, week_start: item.week_start, week_end: item.week_end, payload: await progRes.json(), source };
        };
        load()
            .then((data) => { if (!cancelled) setState({ id, data, error: "" }); })
            .catch((err) => { if (!cancelled) setState({ id, data: null, error: err.message }); });
        return () => { cancelled = true; };
    }, [id, source, token, logout]);

    if (state.id !== id) return <Loading>Cargando programa para editar…</Loading>;
    if (state.error) return <ErrorNote>{state.error}</ErrorNote>;

    const back = source === "staging" ? "/admin/programas/temporales" : "/admin/programas";
    return (
        <ProgramForm
            key={`${source}-${id}`}
            initialData={state.data}
            editSource={source}
            onSaved={() => { refreshNotices(); navigate(back); }}
        />
    );
}
