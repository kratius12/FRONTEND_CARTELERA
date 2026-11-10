// src/admin/ProgramList.jsx
// Tabla de todos los programas PUBLICADOS, con resaltado de los actuales y filtro por mes.
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { ConfirmDialog, EmptyState, ErrorNote, Loading, PageHeader, Segmented, StatCard, StatGrid } from "./AdminWidgets";

const API = import.meta.env.VITE_API_URL || "";

// Extrae sólo la parte YYYY-MM-DD de un string o ISO timestamp
function toDateOnly(d) {
    if (!d) return null;
    return typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0];
}

function formatDate(d) {
    const dateStr = toDateOnly(d);
    if (!dateStr) return "—";
    return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function isOlderThanOneMonth(weekEnd) {
    const dateStr = toDateOnly(weekEnd);
    if (!dateStr) return false;
    const end = new Date(dateStr + "T12:00:00");
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return end < oneMonthAgo;
}

function isCurrentWeek(weekStart, weekEnd) {
    const today = new Date();
    const start = new Date((toDateOnly(weekStart) || weekStart) + "T00:00:00");
    const end = new Date((toDateOnly(weekEnd) || weekEnd) + "T23:59:59");
    return today >= start && today <= end;
}

export default function ProgramList({ onEdit }) {
    const { token, logout } = useContext(AuthContext);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all"); // 'all' | 'recent' | 'old'
    const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);

    const fetchPrograms = () => {
        setLoading(true);
        fetch(`${API}/api/programs`)
            .then((r) => r.json())
            .then(data => {
                const sorted = data.sort((a, b) => new Date(b.week_start) - new Date(a.week_start));
                setPrograms(sorted);
            })
            .catch(() => setError("No se pudieron cargar los programas"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const handleDelete = (p) => {
        setConfirmDeleteModal(p);
    };

    const executeDelete = async () => {
        if (!confirmDeleteModal) return;
        const { id: progId } = confirmDeleteModal;
        setConfirmDeleteModal(null);

        try {
            const res = await fetch(`${API}/api/admin/programs/${progId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.status === 401 || res.status === 403) {
                logout();
                throw new Error("Sesión expirada o sin permisos");
            }

            if (!res.ok) throw new Error("No se pudo eliminar el programa");
            
            // Recargar tabla
            fetchPrograms();
        } catch (err) {
            alert(`❌ Error al eliminar: ${err.message}`);
        }
    };

    const filtered = programs.filter((p) => {
        if (filter === "old") return isOlderThanOneMonth(p.week_end);
        if (filter === "recent") return !isOlderThanOneMonth(p.week_end);
        return true;
    });

    const oldCount = programs.filter((p) => isOlderThanOneMonth(p.week_end)).length;

    if (loading) return <Loading>Cargando programas…</Loading>;
    if (error) return <ErrorNote>{error}</ErrorNote>;

    const currentProgram = programs.find((p) => isCurrentWeek(p.week_start, p.week_end));
    const upcomingCount = programs.filter((p) => !isCurrentWeek(p.week_start, p.week_end) && new Date(`${toDateOnly(p.week_start)}T00:00:00`) > new Date()).length;
    const today = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

    return (
        <div>
            {confirmDeleteModal && (
                <ConfirmDialog
                    title="Eliminar Programa"
                    onConfirm={executeDelete}
                    onCancel={() => setConfirmDeleteModal(null)}
                >
                    <p>
                        ¿Estás seguro de que deseas eliminar permanentemente el programa publicado <strong>"{confirmDeleteModal.title || formatDate(confirmDeleteModal.week_start)}"</strong>? Esta acción no se puede deshacer.
                    </p>
                </ConfirmDialog>
            )}

            <PageHeader
                icon="book"
                title="Programas publicados"
                count={programs.length}
                subtitle={`Hoy es ${today} · la cartelera pública muestra estos programas.`}
            />

            <StatGrid label="Resumen de programas">
                <StatCard icon="book" tone="teal" label="Publicados" value={programs.length} hint="en la cartelera" />
                <StatCard
                    icon="calendar"
                    tone="cyan"
                    label="Semana actual"
                    value={currentProgram ? formatDate(currentProgram.week_start) : "Sin programa"}
                    textValue
                    hint={currentProgram ? `al ${formatDate(currentProgram.week_end)}` : "no hay programa para esta semana"}
                    trend={currentProgram ? { dir: "flat", text: "Actual" } : undefined}
                />
                <StatCard icon="clock" tone="blue" label="Próximos" value={upcomingCount} hint="semanas ya preparadas" />
                <StatCard icon="history" tone="teal" label="Anteriores" value={oldCount} hint="de hace más de un mes" />
            </StatGrid>

            <section className="adm-card">
                <div className="adm-card-head adm-card-head--line">
                    <div>
                        <h3 className="adm-card-title">Listado de programas</h3>
                        <p className="adm-card-sub">El programa de la semana actual aparece resaltado.</p>
                    </div>
                    <Segmented
                        label="Filtrar programas"
                        value={filter}
                        onChange={setFilter}
                        options={[
                            { key: "all", label: "Todos", count: programs.length },
                            { key: "recent", label: "Recientes", count: programs.length - oldCount },
                            { key: "old", label: "Anteriores", count: oldCount },
                        ]}
                    />
                </div>

                {filtered.length === 0 ? (
                    <EmptyState icon="book" title="No hay programas para mostrar." />
                ) : (
                    <div className="table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Título</th>
                                    <th>Período</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: "right" }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p) => {
                                    const old = isOlderThanOneMonth(p.week_end);
                                    const current = isCurrentWeek(p.week_start, p.week_end);
                                    return (
                                        <tr key={p.id} className={current ? "row-current" : old ? "row-old" : ""}>
                                            <td data-label="Título">
                                                <span className="adm-cell-strong">{p.title || "Sin título"}</span>
                                                <span className="adm-cell-sub">Programa #{p.id}</span>
                                            </td>
                                            <td data-label="Período">
                                                <span className="adm-cell-strong">{formatDate(p.week_start)}</span>
                                                <span className="adm-cell-sub">al {formatDate(p.week_end)}</span>
                                            </td>
                                            <td data-label="Estado">
                                                {current ? (
                                                    <span className="adm-badge adm-badge--ok">Actual</span>
                                                ) : old ? (
                                                    <span className="adm-badge adm-badge--muted">Antiguo</span>
                                                ) : new Date(`${toDateOnly(p.week_start)}T00:00:00`) > new Date() ? (
                                                    <span className="adm-badge">Próximo</span>
                                                ) : (
                                                    <span className="adm-badge adm-badge--muted">Reciente</span>
                                                )}
                                            </td>
                                            <td data-label="Acciones" className="actions-cell" style={{ textAlign: "right" }}>
                                                <div className="adm-actions">
                                                    <button
                                                        type="button"
                                                        className="adm-action"
                                                        onClick={() => window.open(`${window.location.origin}/programs/${p.id}`, "_blank")}
                                                        title="Ver cartelera pública"
                                                        aria-label="Ver cartelera pública"
                                                    >
                                                        <Icon name="eye" size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="adm-action"
                                                        onClick={() => onEdit?.(p)}
                                                        title="Editar programa"
                                                        aria-label="Editar programa"
                                                    >
                                                        <Icon name="edit" size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="adm-action adm-action--danger"
                                                        onClick={() => handleDelete(p)}
                                                        title="Eliminar de la lista"
                                                        aria-label="Eliminar de la lista"
                                                    >
                                                        <Icon name="trash" size={17} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
