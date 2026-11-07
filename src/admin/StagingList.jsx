// src/admin/StagingList.jsx
// Tabla de programas en STAGING con botón para publicar.
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { ConfirmDialog, EmptyState, ErrorNote, Loading, PageHeader } from "./AdminWidgets";

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

export default function StagingList({ onPublished, onEdit, onChanged }) {
    const { token, logout } = useContext(AuthContext);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [publishing, setPublishing] = useState(null);
    const [toast, setToast] = useState("");
    const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [urlImport, setUrlImport] = useState("");
    const [importingUrl, setImportingUrl] = useState(false);

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
            onChanged?.();
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
                onChanged?.();
            }, 2500);
        } catch (err) {
            setToast(`❌ Error: ${err.message}`);
            setTimeout(() => setToast(""), 4000);
        } finally {
            setUploadingPdf(false);
            e.target.value = null;
        }
    };

    const handleUrlImport = async () => {
        if (!urlImport) return;
        setImportingUrl(true);
        try {
            setToast("⏳ Importando guía desde URL...");
            const r = await fetch(`${API}/api/admin/programs/import-url`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: urlImport.trim() }),
            });

            if (r.status === 401 || r.status === 403) {
                logout();
                throw new Error("Sesión expirada");
            }

            const data = await r.json();
            if (!r.ok) throw new Error(data.detail || "Error al importar URL");

            setToast(`✅ ¡Éxito! ${data.message}`);
            setUrlImport("");
            setTimeout(() => {
                setToast("");
                load();
                onChanged?.();
            }, 2500);
        } catch (err) {
            setToast(`❌ Error: ${err.message}`);
            setTimeout(() => setToast(""), 4000);
        } finally {
            setImportingUrl(false);
        }
    };

    if (loading) return <Loading>Cargando staging…</Loading>;
    if (error) return <ErrorNote>{error}</ErrorNote>;

    return (
        <div>
            {toast && <div className="toast" role="status">{toast}</div>}

            {confirmDeleteModal && (
                <ConfirmDialog
                    title="Eliminar Borrador"
                    onConfirm={executeDelete}
                    onCancel={() => setConfirmDeleteModal(null)}
                >
                    <p>
                        ¿Estás seguro de que deseas eliminar permanentemente el borrador <strong>"{confirmDeleteModal.title || formatDate(confirmDeleteModal.week_start)}"</strong>?
                    </p>
                </ConfirmDialog>
            )}

            <PageHeader
                icon="clock"
                title="Programas Temporales"
                count={programs.length}
                subtitle="Borradores que todavía no aparecen en la cartelera. Revísalos y publícalos cuando estén listos."
            >
                <button type="button" className="adm-btn adm-btn--ghost" onClick={load} title="Recargar">
                    <Icon name="refresh" size={16} /> Recargar
                </button>
            </PageHeader>

            <section className="adm-card adm-card-body" aria-label="Importar guía">
                <div className="adm-import">
                    <label className="adm-input-pill">
                        <Icon name="globe" size={18} />
                        <input
                            type="text"
                            value={urlImport}
                            onChange={(e) => setUrlImport(e.target.value)}
                            placeholder="Pega la URL de la guía JW.org"
                            disabled={importingUrl}
                            aria-label="URL de la guía JW.org"
                        />
                    </label>
                    <button
                        type="button"
                        className="adm-btn adm-btn--primary"
                        onClick={handleUrlImport}
                        disabled={!urlImport.trim() || importingUrl}
                    >
                        {importingUrl ? <><span className="adm-spinner adm-spinner--sm" aria-hidden="true" /> Importando...</> : <><Icon name="globe" size={16} /> Importar Guía (URL)</>}
                    </button>
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
                        className={`adm-btn adm-btn--ghost ${uploadingPdf ? "is-busy" : ""}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                    >
                        {uploadingPdf ? <><span className="adm-spinner adm-spinner--sm" aria-hidden="true" /> Subiendo...</> : <><Icon name="upload" size={16} /> Subir Guía (PDF)</>}
                    </label>
                </div>
            </section>

            <section className="adm-card">
                <div className="adm-card-head adm-card-head--line">
                    <div>
                        <h3 className="adm-card-title">Borradores</h3>
                        <p className="adm-card-sub">Ordenados de la semana más reciente a la más antigua.</p>
                    </div>
                </div>
                {programs.length === 0 ? (
                    <EmptyState icon="clock" title="No hay programas temporales.">
                        Crea uno nuevo desde <strong>Nuevo Programa</strong> o importa la guía.
                    </EmptyState>
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
                                                <span className="adm-cell-strong">{formatDate(p.week_start)}</span>
                                                <span className="adm-cell-sub">al {formatDate(p.week_end)}</span>
                                            </td>
                                            <td data-label="Título">
                                                {p.title ? <span className="adm-cell-strong">{p.title}</span> : <em className="adm-muted">Sin título</em>}
                                                <span className="adm-cell-sub"><span className="adm-badge adm-badge--warn">Sin publicar</span></span>
                                            </td>
                                            <td data-label="Acciones" className="actions-cell" style={{ textAlign: "right" }}>
                                                <div className="adm-actions">
                                                    <button
                                                        type="button"
                                                        className="adm-btn adm-btn--primary adm-btn--sm"
                                                        onClick={() => handlePublish(p.id, p.title)}
                                                        disabled={isPublishing}
                                                    >
                                                        {isPublishing ? "Publicando…" : <><Icon name="send" size={15} /> Publicar</>}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="adm-action"
                                                        onClick={() => window.open(`${window.location.origin}/staging/${p.id}`, "_blank")}
                                                        title="Ver vista previa"
                                                        aria-label="Ver vista previa"
                                                    >
                                                        <Icon name="eye" size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="adm-action"
                                                        onClick={() => onEdit?.(p)}
                                                        title="Editar"
                                                        aria-label="Editar"
                                                    >
                                                        <Icon name="edit" size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="adm-action adm-action--danger"
                                                        onClick={() => handleDelete(p)}
                                                        title="Eliminar"
                                                        aria-label="Eliminar"
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
