// src/admin/StagingList.jsx
// Tabla de programas en STAGING con botón para publicar.
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

export default function StagingList({ onPublished, onEdit }) {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [publishing, setPublishing] = useState(null);
    const [toast, setToast] = useState("");

    const load = () => {
        setLoading(true);
        fetch(`${API}/api/admin/programs/staging`)
            .then((r) => r.json())
            .then(setPrograms)
            .catch(() => setError("No se pudo cargar el staging"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handlePublish = async (id, title) => {
        if (!confirm(`¿Publicar "${title || `Programa #${id}`}"?\n\nSe moverá de staging a la cartelera principal.`)) return;

        setPublishing(id);
        try {
            const r = await fetch(`${API}/api/admin/programs/${id}/publish`, { method: "POST" });
            const data = await r.json();
            if (!r.ok) throw new Error(data.message);
            setToast(`✅ Publicado como programa #${data.id}`);
            setTimeout(() => {
                setToast("");
                onPublished?.();
            }, 2000);
        } catch (e) {
            setToast(`❌ Error: ${e.message}`);
            setTimeout(() => setToast(""), 3000);
            setPublishing(null);
        }
    };

    if (loading) return <div className="admin-status">Cargando staging…</div>;
    if (error) return <div className="admin-status error">{error}</div>;

    return (
        <div>
            {toast && <div className="toast">{toast}</div>}

            <div className="list-toolbar">
                <h2 className="list-title">
                    Programas Temporales
                    <span className="list-badge">{programs.length}</span>
                </h2>
                <button className="icon-btn" onClick={load} title="Recargar">
                    🔄 Recargar
                </button>
            </div>

            {programs.length === 0 ? (
                <div className="admin-status">
                    No hay programas temporales. Crea uno nuevo desde la pestaña <strong>+ Nuevo programa</strong>.
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Título</th>
                            <th>Inicio semana</th>
                            <th>Fin semana</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {programs.map((p) => (
                            <tr key={p.id}>
                                <td>{p.id}</td>
                                <td>{p.title || <em className="muted">Sin título</em>}</td>
                                <td>{formatDate(p.week_start)}</td>
                                <td>{formatDate(p.week_end)}</td>
                                <td style={{ display: "flex", gap: 8 }}>
                                    <button
                                        className="icon-btn"
                                        onClick={() => onEdit?.(p)}
                                        title="Editar"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        className="publish-btn"
                                        disabled={publishing === p.id}
                                        onClick={() => handlePublish(p.id, p.title)}
                                    >
                                        {publishing === p.id ? "Publicando…" : "📤 Publicar"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
