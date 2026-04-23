// src/admin/ProgramForm.jsx
// Formulario dinámico para crear o editar un programa en staging.
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "";

// Plantilla de sección vacía
const emptySection = () => ({
    type: "section",
    title: "",
    style: "gray",
    columns: null,
    items: [],
});

// Plantilla de ítem vacío
const emptyItem = () => ({
    type: "bullet",
    text: "",
    minutes: "",
    assigned: ["", ""],
    noteLabel: "",
});

// Extrae las partes iniciales (pre-secciones) del payload
function extractPreParts(parts = []) {
    const result = [];
    for (const p of parts) {
        if (p.type === "section") break;
        result.push(p);
    }
    return result.length ? result : [{ type: "song", text: "" }];
}

// Extrae las secciones del payload
function extractSections(parts = []) {
    const secs = parts.filter((p) => p.type === "section");
    return secs.length ? secs.map((s) => ({
        ...s,
        items: (s.items || []).map((it) => ({
            text: it.text || "",
            minutes: it.minutes ?? "",
            assigned: it.assigned?.length ? [...it.assigned, ""].slice(0, 2) : ["", ""],
            noteLabel: it.noteLabel || "",
        })),
    })) : [emptySection()];
}

// Extrae las partes finales (después de la última sección) del payload
function extractPostParts(parts = []) {
    let lastSectionIdx = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].type === "section") { lastSectionIdx = i; break; }
    }
    return lastSectionIdx >= 0 ? parts.slice(lastSectionIdx + 1) : [];
}

export default function ProgramForm({ onSaved, initialData, editSource }) {
    const { token, logout } = useContext(AuthContext);
    // editSource: 'staging' | 'published' | undefined (nuevo)
    const isEditing = !!initialData;

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState("");
    const [warnings, setWarnings] = useState([]);
    const [pendingPayload, setPendingPayload] = useState(null);

    const [weekStart, setWeekStart] = useState("");
    const [weekEnd, setWeekEnd] = useState("");
    const [title, setTitle] = useState("Programa para la reunión de entre semana");
    const [meta, setMeta] = useState({
        rangeText: "",
        readingText: "",
        president: "",
        openingPrayer: "",
        closingPrayer: "",
    });
    const [preParts, setPreParts] = useState([{ type: "song", text: "" }]);
    const [sections, setSections] = useState([emptySection()]);
    const [postParts, setPostParts] = useState([]);

    // Pre-poblar cuando initialData cambia (modo edición)
    useEffect(() => {
        if (!initialData) return;
        const d = initialData;
        const p = d.payload || {};

        // Extraer fecha solo (YYYY-MM-DD) por si llega como ISO timestamp
        const toDateOnly = (v) => (v ? String(v).split("T")[0] : "");

        setWeekStart(toDateOnly(d.week_start));
        setWeekEnd(toDateOnly(d.week_end));
        setTitle(p.title || "");
        setMeta({
            rangeText: p.meta?.rangeText || "",
            readingText: p.meta?.readingText || "",
            president: p.meta?.president || "",
            openingPrayer: p.meta?.openingPrayer || "",
            closingPrayer: p.meta?.closingPrayer || "",
        });
        setPreParts(extractPreParts(p.parts));
        setSections(extractSections(p.parts));
        setPostParts(extractPostParts(p.parts));
    }, [initialData]);

    // ─── Helpers para pre/post parts ───
    const updatePrePart = (i, field, val) => {
        setPreParts((prev) => prev.map((p, idx) => {
            if (idx !== i) return p;
            let updated = { ...p, [field]: val };
            if (updated.type === "song" && updated.text && /^\d+$/.test(updated.text)) {
                updated.text = `Canción ${updated.text}`;
            }
            return updated;
        }));
    };
    const addPrePart = () => setPreParts((p) => [...p, { type: "bullet", text: "", minutes: "" }]);
    const removePrePart = (i) => setPreParts((p) => p.filter((_, idx) => idx !== i));

    // ─── Helpers para post parts ───
    const updatePostPart = (i, field, val) => {
        setPostParts((prev) => prev.map((p, idx) => {
            if (idx !== i) return p;
            let updated = { ...p, [field]: val };
            if (updated.type === "song" && updated.text && /^\d+$/.test(updated.text)) {
                updated.text = `Canción ${updated.text}`;
            }
            return updated;
        }));
    };
    const addPostPart = () => setPostParts((p) => [...p, { type: "song", text: "", minutes: "" }]);
    const removePostPart = (i) => setPostParts((p) => p.filter((_, idx) => idx !== i));

    // ─── Helpers para secciones ───
    const updateSection = (si, field, val) => {
        setSections((prev) =>
            prev.map((s, idx) => (idx === si ? { ...s, [field]: val } : s))
        );
    };

    const addSection = () => setSections((p) => [...p, emptySection()]);
    const removeSection = (si) => setSections((p) => p.filter((_, i) => i !== si));

    const handleSectionTitleChange = (si, newTitle) => {
        let newStyle = "gray";
        if (newTitle === "Seamos mejores maestros") newStyle = "gold";
        if (newTitle === "Nuestra vida cristiana") newStyle = "wine";

        setSections((prev) =>
            prev.map((s, idx) => (idx === si ? { ...s, title: newTitle, style: newStyle } : s))
        );
    };

    // ─── Helpers para ítems dentro de sección ───
    const addItem = (si) => {
        setSections((prev) =>
            prev.map((s, idx) =>
                idx === si ? { ...s, items: [...s.items, emptyItem()] } : s
            )
        );
    };

    const removeItem = (si, ii) => {
        setSections((prev) =>
            prev.map((s, idx) =>
                idx === si ? { ...s, items: s.items.filter((_, i) => i !== ii) } : s
            )
        );
    };

    const updateItem = (si, ii, field, val) => {
        setSections((prev) =>
            prev.map((s, sIdx) => {
                if (sIdx !== si) return s;
                return {
                    ...s,
                    items: s.items.map((item, iIdx) => {
                        if (iIdx !== ii) return item;
                        let updated = { ...item, [field]: val };
                        if (updated.type === "song" && updated.text && /^\d+$/.test(updated.text)) {
                            updated.text = `Canción ${updated.text}`;
                        }
                        return updated;
                    }),
                };
            })
        );
    };

    const updateItemAssigned = (si, ii, aIdx, val) => {
        setSections((prev) =>
            prev.map((s, sIdx) =>
                sIdx === si
                    ? {
                        ...s,
                        items: s.items.map((item, iIdx) => {
                            if (iIdx !== ii) return item;
                            const assigned = [...(item.assigned || ["", ""])];
                            assigned[aIdx] = val;
                            return { ...item, assigned };
                        }),
                    }
                    : s
            )
        );
    };

    const toggleColumns = (si) => {
        setSections((prev) =>
            prev.map((s, idx) => {
                if (idx !== si) return s;
                return {
                    ...s,
                    columns: s.columns ? null : ["Estudiante", "Ayudante"],
                };
            })
        );
    };

    const updateColumnLabel = (si, colIdx, val) => {
        setSections((prev) =>
            prev.map((s, idx) => {
                if (idx !== si || !s.columns) return s;
                const columns = [...s.columns];
                columns[colIdx] = val;
                return { ...s, columns };
            })
        );
    };

    const handleGenerateProposal = async (si) => {
        const section = sections[si];
        if (!section || !section.items || section.items.length === 0) {
            setToast("⚠️ No hay puntos en esta sección para asignar.");
            setTimeout(() => setToast(""), 3000);
            return;
        }

        setSaving(true);
        setToast("Generando propuesta...");
        
        try {
            const r = await fetch(`${API}/api/admin/programs/generate-proposal`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({ items: section.items }),
            });
            
            if (r.status === 401 || r.status === 403) {
                logout();
                throw new Error("Sesión expirada");
            }
            
            const data = await r.json();
            if (!r.ok) throw new Error(data.message || data.detail || "Error en el autogenerador");

            // Overwrite section items with new items
            setSections((prev) =>
                prev.map((s, idx) => (idx === si ? { ...s, items: data.items } : s))
            );

            setToast("✅ Propuesta generada");
            setTimeout(() => setToast(""), 2000);
        } catch (err) {
            setToast(`❌ ${err.message}`);
            setTimeout(() => setToast(""), 3000);
        } finally {
            setSaving(false);
        }
    };

    // ─── SUBMIT ───
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!weekStart || !weekEnd) {
            setToast("⚠️ Debes ingresar las fechas de inicio y fin de semana.");
            setTimeout(() => setToast(""), 3000);
            return;
        }

        setSaving(true);

        const payload = {
            title,
            meta: {
                ...meta,
                rangeText: meta.rangeText,
                readingText: meta.readingText,
            },
            parts: [
                ...preParts.filter((p) => p.text),
                ...sections.map((s) => ({
                    ...s,
                    items: s.items
                        .filter((it) => it.text)
                        .map((it) => {
                            const isSong = it.type === "song";
                            return {
                                ...(it.type ? { type: it.type } : {}),
                                text: it.text,
                                ...((!isSong && it.minutes) ? { minutes: Number(it.minutes) } : {}),
                                ...(!isSong ? { assigned: it.assigned.filter(Boolean) } : {}),
                                ...((!isSong && it.noteLabel) ? { noteLabel: it.noteLabel } : {}),
                            };
                        }),
                })),
                ...postParts.filter((p) => p.text),
            ],
        };

        if (!pendingPayload) {
            setSaving(true);
            try {
                const prog_id = isEditing && editSource === "published" ? initialData.id : null;
                const r = await fetch(`${API}/api/admin/programs/validate`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}` 
                    },
                    body: JSON.stringify({ payload, prog_id }),
                });
                if (r.ok) {
                    const data = await r.json();
                    if (data.warnings && data.warnings.length > 0) {
                        setWarnings(data.warnings);
                        setPendingPayload(payload);
                        setSaving(false);
                        return; // Detener guardado para que decida el usuario
                    }
                }
            } catch (err) {
                console.error("Error al validar", err);
            }
        }

        // Si llegó aquí es porque no hay advertencias, o porque el usuario dio clic en "Ignorar y Guardar"
        const finalPayload = pendingPayload || payload;

        try {
            let url, method;

            if (isEditing && editSource === "staging") {
                url = `${API}/api/admin/programs/staging/${initialData.id}`;
                method = "PUT";
            } else if (isEditing && editSource === "published") {
                url = `${API}/api/admin/programs/${initialData.id}`;
                method = "PUT";
            } else {
                url = `${API}/api/admin/programs`;
                method = "POST";
            }

            const r = await fetch(url, {
                method,
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({ week_start: weekStart, week_end: weekEnd, payload: finalPayload }),
            });
            if (r.status === 401 || r.status === 403) {
                logout();
                throw new Error("Sesión expirada");
            }
            const data = await r.json();
            if (!r.ok) throw new Error(data.message);

            const successMsg = isEditing
                ? `✅ Programa #${data.id} actualizado`
                : `✅ Guardado en staging (ID ${data.id})`;

            setToast(successMsg);
            setTimeout(() => {
                setToast("");
                onSaved?.();
            }, 2000);
        } catch (err) {
            setToast(`❌ ${err.message}`);
            setTimeout(() => setToast(""), 4000);
        } finally {
            setSaving(false);
            setPendingPayload(null);
        }
    };

    return (
        <form className="prog-form" onSubmit={handleSubmit}>
            {toast && <div className="toast">{toast}</div>}

            <h2 className="form-section-title">
                {isEditing
                    ? `✏️ Editando programa #${initialData.id}${editSource === "published" ? " (publicado)" : " (staging)"}`
                    : "Nuevo programa"}
            </h2>

            {/* ── FECHAS ── */}
            <div className="form-row form-row--2">
                <div className="form-group">
                    <label>Inicio de semana</label>
                    <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Fin de semana</label>
                    <input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} required />
                </div>
            </div>

            {/* ── TÍTULO ── */}
            <div className="form-group">
                <label>Título</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Programa para la reunión de entre semana"
                />
            </div>

            {/* ── META ── */}
            <fieldset className="form-fieldset">
                <legend>Información general</legend>
                <div className="form-row form-row--2">
                    <div className="form-group">
                        <label>Rango de texto</label>
                        <input type="text" value={meta.rangeText} onChange={(e) => setMeta({ ...meta, rangeText: e.target.value })} placeholder="Ej: Lucas 10-12" />
                    </div>
                    <div className="form-group">
                        <label>Lectura</label>
                        <input type="text" value={meta.readingText} onChange={(e) => setMeta({ ...meta, readingText: e.target.value })} placeholder="Ej: w24.02 págs. 2-8" />
                    </div>
                    <div className="form-group">
                        <label>Presidente</label>
                        <input type="text" value={meta.president} onChange={(e) => setMeta({ ...meta, president: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Oración apertura</label>
                        <input type="text" value={meta.openingPrayer} onChange={(e) => setMeta({ ...meta, openingPrayer: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Oración cierre</label>
                        <input type="text" value={meta.closingPrayer} onChange={(e) => setMeta({ ...meta, closingPrayer: e.target.value })} />
                    </div>
                </div>
            </fieldset>

            {/* ── PRE-PARTS (canciones/intro antes de secciones) ── */}
            <fieldset className="form-fieldset">
                <legend>Partes iniciales (canciones, introducción)</legend>
                {preParts.map((p, i) => (
                    <div key={i} className="form-row form-row--inline">
                        <select value={p.type} onChange={(e) => updatePrePart(i, "type", e.target.value)}>
                            <option value="song">Canción</option>
                            <option value="bullet">Punto</option>
                        </select>
                        <input
                            type="text"
                            value={p.text}
                            onChange={(e) => updatePrePart(i, "text", e.target.value)}
                            placeholder="Texto"
                            className="flex-1"
                        />
                        {p.type !== "song" && (
                            <input
                                type="number"
                                value={p.minutes}
                                onChange={(e) => updatePrePart(i, "minutes", e.target.value)}
                                placeholder="Min"
                                style={{ width: 64 }}
                            />
                        )}
                        <button type="button" className="icon-btn danger" onClick={() => removePrePart(i)}>✕</button>
                    </div>
                ))}
                <button type="button" className="add-btn" onClick={addPrePart}>+ Agregar parte inicial</button>
            </fieldset>

            {/* ── SECCIONES ── */}
            {sections.map((sec, si) => (
                <fieldset key={si} className="form-fieldset section-block">
                    <legend>
                        Sección {si + 1}
                        <button type="button" className="icon-btn danger small" onClick={() => removeSection(si)} style={{ marginLeft: 12 }}>
                            Eliminar sección
                        </button>
                    </legend>

                    <div className="form-row form-row--2">
                        <div className="form-group">
                            <label>Sección del Programa</label>
                            <select 
                                value={sec.title} 
                                onChange={(e) => handleSectionTitleChange(si, e.target.value)}
                                required
                            >
                                <option value="" disabled>Seleccionar sección...</option>
                                <option value="Tesoros de la biblia">Tesoros de la biblia</option>
                                <option value="Seamos mejores maestros">Seamos mejores maestros</option>
                                <option value="Nuestra vida cristiana">Nuestra vida cristiana</option>
                                {/* Fallback temporal en caso de editar un documento con título diferente */}
                                {sec.title && !["Tesoros de la biblia", "Seamos mejores maestros", "Nuestra vida cristiana"].includes(sec.title) && (
                                    <option value={sec.title}>{sec.title} (Antiguo)</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group" style={{ justifyContent: "flex-end", alignItems: "center", flexDirection: "row", gap: "16px" }}>
                            {sec.title === "Seamos mejores maestros" && (
                                <button 
                                    type="button" 
                                    className="publish-btn" 
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                    onClick={() => handleGenerateProposal(si)}
                                    disabled={saving}
                                >
                                    ✨ Generar propuesta
                                </button>
                            )}
                            <label className="checkbox-label" style={{ marginBottom: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={!!sec.columns}
                                    onChange={() => toggleColumns(si)}
                                />
                                Dos columnas (Estudiante/Ayudante)
                            </label>
                        </div>
                    </div>

                    {sec.columns && (
                        <div className="form-row form-row--2">
                            <div className="form-group">
                                <label>Columna 1</label>
                                <input type="text" value={sec.columns[0]} onChange={(e) => updateColumnLabel(si, 0, e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Columna 2</label>
                                <input type="text" value={sec.columns[1]} onChange={(e) => updateColumnLabel(si, 1, e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div className="items-list">
                        {sec.items.map((item, ii) => {
                            const isSong = item.type === "song";
                            return (
                                <div key={ii} className="item-block">
                                    <div className="form-row form-row--inline">
                                        <select
                                            value={item.type || "bullet"}
                                            onChange={(e) => updateItem(si, ii, "type", e.target.value)}
                                            style={{ width: 96 }}
                                        >
                                            <option value="bullet">Punto</option>
                                            <option value="song">Canción</option>
                                        </select>
                                        {!isSong && <span className="item-num">{ii + 1}.</span>}
                                        <input
                                            type="text"
                                            value={item.text}
                                            onChange={(e) => updateItem(si, ii, "text", e.target.value)}
                                            placeholder={isSong ? "Ej: Canción 88" : "Descripción del punto"}
                                            className="flex-1"
                                        />
                                        {!isSong && (
                                            <input
                                                type="number"
                                                value={item.minutes}
                                                onChange={(e) => updateItem(si, ii, "minutes", e.target.value)}
                                                placeholder="Min"
                                                style={{ width: 64 }}
                                            />
                                        )}
                                        <button type="button" className="icon-btn danger small" onClick={() => removeItem(si, ii)}>✕</button>
                                    </div>

                                    {!isSong && (sec.columns ? (
                                        <div className="form-row form-row--2" style={{ paddingLeft: 28 }}>
                                            <div className="form-group">
                                                <label>{sec.columns[0]}</label>
                                                <input type="text" value={item.assigned?.[0] || ""} onChange={(e) => updateItemAssigned(si, ii, 0, e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label>{sec.columns[1]}</label>
                                                <input type="text" value={item.assigned?.[1] || ""} onChange={(e) => updateItemAssigned(si, ii, 1, e.target.value)} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="form-row form-row--2" style={{ paddingLeft: 28 }}>
                                            <div className="form-group">
                                                <label>Asignado</label>
                                                <input type="text" value={item.assigned?.[0] || ""} onChange={(e) => updateItemAssigned(si, ii, 0, e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label>Nota (opcional)</label>
                                                <input type="text" value={item.noteLabel || ""} onChange={(e) => updateItem(si, ii, "noteLabel", e.target.value)} placeholder="Ej: Discurso" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                    <button type="button" className="add-btn" onClick={() => addItem(si)}>+ Agregar punto</button>
                </fieldset>
            ))}

            <button type="button" className="add-section-btn" onClick={addSection}>+ Agregar sección</button>

            {/* ── POST-PARTS (canciones/conclusión después de secciones) ── */}
            <fieldset className="form-fieldset">
                <legend>Partes finales (canciones, conclusión)</legend>
                {postParts.map((p, i) => (
                    <div key={i} className="form-row form-row--inline">
                        <select value={p.type} onChange={(e) => updatePostPart(i, "type", e.target.value)}>
                            <option value="song">Canción</option>
                            <option value="bullet">Punto</option>
                            <option value="outro">Conclusión</option>
                        </select>
                        <input
                            type="text"
                            value={p.text}
                            onChange={(e) => updatePostPart(i, "text", e.target.value)}
                            placeholder="Texto"
                            className="flex-1"
                        />
                        {p.type !== "song" && (
                            <input
                                type="number"
                                value={p.minutes}
                                onChange={(e) => updatePostPart(i, "minutes", e.target.value)}
                                placeholder="Min"
                                style={{ width: 64 }}
                            />
                        )}
                        <button type="button" className="icon-btn danger" onClick={() => removePostPart(i)}>✕</button>
                    </div>
                ))}
                <button type="button" className="add-btn" onClick={addPostPart}>+ Agregar parte final</button>
            </fieldset>

            {/* ── SUBMIT ── */}
            <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={saving}>
                    {saving
                        ? (isEditing ? "Guardando cambios…" : "Guardando…")
                        : (isEditing ? "💾 Guardar cambios" : "💾 Guardar como Temporal")}
                </button>
            </div>

            {/* ── MODAL DE ADVERTENCIAS ── */}
            {warnings.length > 0 && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 500 }}>
                        <h3 style={{ color: "#d9534f", marginTop: 0 }}>⚠️ Advertencias de Reglas de Negocio</h3>
                        <p style={{ fontSize: "14px", color: "#555", marginBottom: 15 }}>
                            Se encontraron algunas reglas que no se están cumpliendo. ¿Deseas guardar de todos modos?
                        </p>
                        <ul style={{ fontSize: "14px", marginBottom: 20, paddingLeft: 20, color: "#333", textAlign: "left" }}>
                            {warnings.map((w, i) => (
                                <li key={i} style={{ marginBottom: 8 }}>{w}</li>
                            ))}
                        </ul>
                        <div className="form-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
                            <button type="button" className="icon-btn" onClick={() => { setWarnings([]); setPendingPayload(null); }}>
                                Volver a Corregir
                            </button>
                            <button type="button" className="submit-btn" onClick={handleSubmit} disabled={saving}>
                                Ignorar y Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
