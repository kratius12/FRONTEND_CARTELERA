// src/admin/StagingList.jsx
// Tabla de programas en STAGING con botón para publicar.
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

export default function StagingList({ onPublished, onEdit }) {
    const { token, logout } = useContext(AuthContext);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [publishing, setPublishing] = useState(null);
    const [toast, setToast] = useState("");
    const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);
    const [uploadingPdf, setUploadingPdf] = useState(false);

    const load = () => {
        setLoading(true);
        fetch(`${API}/api/admin/programs/staging`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then((r) => {
                if (r.status === 401 || r.status === 403) {
                    logout();
                    throw new Error("Sesión expirada");
                }
                if (!r.ok) throw new Error("Error cargando staging");
                return r.json();
            })
            .then(data => {
                const sorted = data.sort((a, b) => new Date(b.week_start) - new Date(a.week_start));
                setPrograms(sorted);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (token) {
            load();
        }
    }, [token]);

    const handlePublish = async (id, title) => {
        if (!confirm(`¿Publicar "${title || `Programa #${id}`}"?\n\nSe moverá de staging a la cartelera principal.`)) return;

        setPublishing(id);
        try {
            const r = await fetch(`${API}/api/admin/programs/${id}/publish`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (r.status === 401 || r.status === 403) {
                logout();
                throw new Error("Sesión expirada");
            }
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

    const handleDelete = (p) => {
        setConfirmDeleteModal(p);
    };

    const executeDelete = async () => {
        if (!confirmDeleteModal) return;
        const { id } = confirmDeleteModal;
        setConfirmDeleteModal(null);

        try {
            const r = await fetch(`${API}/api/admin/programs/staging/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (r.status === 401 || r.status === 403) {
                logout();
                throw new Error("Sesión expirada o permisos insuficientes");
            }
            if (!r.ok) throw new Error("No se pudo eliminar el borrador");
            setToast(`🗑️ Borrador de "${confirmDeleteModal.title || formatDate(confirmDeleteModal.week_start)}" eliminado`);
            setTimeout(() => setToast(""), 3000);
            load();
        } catch (e) {
            alert(`❌ Error al eliminar: ${e.message}`);
        }
    };

    const handlePdfUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPdf(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            setToast("⏳ Procesando PDF y extrayendo programas...");
            const r = await fetch(`${API}/api/admin/programs/upload-pdf`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (r.status === 401 || r.status === 403) {
                logout();
                throw new Error("Sesión expirada");
            }

            const data = await r.json();
            if (!r.ok) throw new Error(data.detail || "Error al subir PDF");

            setToast(`✅ ¡Éxito! ${data.message}`);
            setTimeout(() => {
                setToast("");
                load();
            }, 2500);
        } catch (err) {
            setToast(`❌ Error: ${err.message}`);
            setTimeout(() => setToast(""), 4000);
        } finally {
            setUploadingPdf(false);
            e.target.value = null;
        }
    };

    if (loading) return <div className="admin-status">Cargando staging…</div>;
    if (error) return <div className="admin-status error">{error}</div>;

    return (
        <div>
            {toast && <div className="toast">{toast}</div>}

            {confirmDeleteModal && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ background: "var(--bg-primary)", padding: "24px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", maxWidth: "400px", width: "90%", color: "var(--text-primary)", textAlign: "center" }}>
                        <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#ef4444" }}>⚠️ Eliminar Borrador</h3>
                        <p style={{ marginBottom: "24px" }}>
                            ¿Estás seguro de que deseas eliminar permanentemente el borrador <strong>"{confirmDeleteModal.title || formatDate(confirmDeleteModal.week_start)}"</strong>?
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
                    Programas Temporales
                    <span className="list-badge">{programs.length}</span>
                </h2>
                
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input 
                        type="file" 
                        accept="application/pdf"
                        id="pdf-upload-staging"
                        style={{ display: "none" }}
                        onChange={handlePdfUpload}
                        disabled={uploadingPdf}
                    />
                    <label 
                        htmlFor="pdf-upload-staging" 
                        className="publish-btn" 
                        style={{ display: "inline-block", cursor: uploadingPdf ? "wait" : "pointer", opacity: uploadingPdf ? 0.7 : 1, margin: 0 }}
                    >
                        {uploadingPdf ? "⏳ Subiendo..." : "📥 Subir Guía (PDF)"}
                    </label>

                    <button className="icon-btn" onClick={load} title="Recargar">
                        🔄 Recargar
                    </button>
                </div>
            </div>

            {programs.length === 0 ? (
                <div className="admin-status">
                    No hay programas temporales. Crea uno nuevo desde la pestaña <strong>+ Nuevo programa</strong>.
                </div>
            ) : (
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Título</th>
                                <th style={{ textAlign: "right" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {programs.map((p) => {
                                const isPublishing = publishing === p.id;
                                return (
                                    <tr key={p.id}>
                                        <td data-label="Fecha">
                                            <div style={{ fontWeight: 600 }}>{formatDate(p.week_start)}</div>
                                            <div style={{ fontSize: "12px", opacity: 0.7 }}>al {formatDate(p.week_end)}</div>
                                        </td>
                                        <td data-label="Título" style={{ fontWeight: 500 }}>
                                            {p.title || <em className="muted">Sin título</em>}
                                        </td>
                                        <td data-label="Acciones" className="actions-cell" style={{ textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                                <button
                                                    className="publish-btn"
                                                    onClick={() => handlePublish(p.id, p.title)}
                                                    disabled={isPublishing}
                                                >
                                                    {isPublishing ? "⏳..." : "🚀 Publicar"}
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    style={{ borderColor: "var(--accent-color)", color: "var(--accent-color)" }}
                                                    onClick={() => window.open(`${window.location.origin}/staging/${p.id}`, "_blank")}
                                                    title="Ver vista previa"
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => onEdit?.(p)}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="icon-btn danger"
                                                    onClick={() => handleDelete(p)}
                                                    title="Eliminar"
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
