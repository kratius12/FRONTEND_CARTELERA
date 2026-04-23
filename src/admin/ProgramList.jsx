// src/admin/ProgramList.jsx
// Tabla de todos los programas PUBLICADOS, con resaltado de los actuales y filtro por mes.
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

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

    if (loading) return <div className="admin-status">Cargando programas…</div>;
    if (error) return <div className="admin-status error">{error}</div>;

    return (
        <div>
            {confirmDeleteModal && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ background: "var(--bg-primary)", padding: "24px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", maxWidth: "400px", width: "90%", color: "var(--text-primary)", textAlign: "center" }}>
                        <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#ef4444" }}>⚠️ Eliminar Programa</h3>
                        <p style={{ marginBottom: "24px" }}>
                            ¿Estás seguro de que deseas eliminar permanentemente el programa publicado <strong>"{confirmDeleteModal.title || formatDate(confirmDeleteModal.week_start)}"</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                            <button 
                                onClick={() => setConfirmDeleteModal(null)}
                                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontWeight: "bold" }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={executeDelete}
                                style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontWeight: "bold" }}
                            >
                                🗑️ Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="list-toolbar">
                <h2 className="list-title">
                    Programas publicados
                    <span className="list-badge">{programs.length}</span>
                </h2>
                <div className="filter-group">
                    <button
                        className={`filter-btn ${filter === "all" ? "active" : ""}`}
                        onClick={() => setFilter("all")}
                    >
                        Todos
                    </button>
                    <button
                        className={`filter-btn ${filter === "recent" ? "active" : ""}`}
                        onClick={() => setFilter("recent")}
                    >
                        Recientes
                    </button>
                    <button
                        className={`filter-btn ${filter === "old" ? "active" : ""}`}
                        onClick={() => setFilter("old")}
                    >
                        Anteriores ({oldCount})
                    </button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="admin-status">No hay programas para mostrar.</div>
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
                                        <td data-label="Título"><strong>{p.title || "Sin título"}</strong></td>
                                        <td data-label="Período">
                                            <div style={{ fontSize: "13px" }}>{formatDate(p.week_start)}</div>
                                            <div style={{ fontSize: "11px", opacity: 0.6 }}>al {formatDate(p.week_end)}</div>
                                        </td>
                                        <td data-label="Estado">
                                            {current ? (
                                                <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>Actual</span>
                                            ) : old ? (
                                                <span className="badge" style={{ background: "#f3f4f6", color: "#4b5563" }}>Antiguo</span>
                                            ) : (
                                                <span className="badge" style={{ background: "#dbeafe", color: "#1e40af" }}>Próximo</span>
                                            )}
                                        </td>
                                        <td data-label="Acciones" className="actions-cell" style={{ textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => window.open(`${window.location.origin}/programs/${p.id}`, "_blank")}
                                                    title="Ver cartelera pública"
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => onEdit?.(p)}
                                                    title="Editar programa"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="icon-btn danger"
                                                    onClick={() => handleDelete(p)}
                                                    title="Eliminar de la lista"
                                                >
                                                    🗑️
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
        </div>
    );
}
