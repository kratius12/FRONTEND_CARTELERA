// src/admin/ProgramList.jsx
// Tabla de todos los programas PUBLICADOS, con resaltado de los actuales y filtro por mes.
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all"); // 'all' | 'recent' | 'old'

    useEffect(() => {
        fetch(`${API}/api/programs`)
            .then((r) => r.json())
            .then(setPrograms)
            .catch(() => setError("No se pudieron cargar los programas"))
            .finally(() => setLoading(false));
    }, []);

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
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Título</th>
                            <th>Inicio semana</th>
                            <th>Fin semana</th>
                            <th>Estado</th>
                            <th>Editar</th>
                            <th>Ver</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => {
                            const old = isOlderThanOneMonth(p.week_end);
                            const current = isCurrentWeek(p.week_start, p.week_end);
                            return (
                                <tr key={p.id} className={current ? "row-current" : old ? "row-old" : ""}>
                                    <td>{p.id}</td>
                                    <td>{p.title || <em className="muted">Sin título</em>}</td>
                                    <td>{formatDate(p.week_start)}</td>
                                    <td>{formatDate(p.week_end)}</td>
                                    <td>
                                        {current ? (
                                            <span className="badge badge--current">Activo</span>
                                        ) : old ? (
                                            <span className="badge badge--old">Anterior</span>
                                        ) : (
                                            <span className="badge badge--future">Próximo</span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="icon-btn"
                                            onClick={() => onEdit?.(p)}
                                            title="Editar publicado"
                                        >
                                            ✏️ Editar
                                        </button>
                                    </td>
                                    <td>
                                        <a
                                            href={`/programs/${p.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="link-btn"
                                        >
                                            Ver →
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
