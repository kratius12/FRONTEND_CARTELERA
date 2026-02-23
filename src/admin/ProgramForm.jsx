// src/admin/ProgramForm.jsx
// Formulario dinámico para crear o editar un programa en staging.
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
    // editSource: 'staging' | 'published' | undefined (nuevo)
    const isEditing = !!initialData;

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState("");

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
        setPreParts((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
    };
    const addPrePart = () => setPreParts((p) => [...p, { type: "bullet", text: "", minutes: "" }]);
    const removePrePart = (i) => setPreParts((p) => p.filter((_, idx) => idx !== i));

    // ─── Helpers para post parts ───
    const updatePostPart = (i, field, val) => {
        setPostParts((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
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
            prev.map((s, sIdx) =>
                sIdx === si
                    ? {
                        ...s,
                        items: s.items.map((item, iIdx) =>
                            iIdx === ii ? { ...item, [field]: val } : item
                        ),
                    }
                    : s
            )
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ week_start: weekStart, week_end: weekEnd, payload }),
            });
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

                    <div className="form-row form-row--3">
                        <div className="form-group">
                            <label>Título de sección</label>
                            <input type="text" value={sec.title} onChange={(e) => updateSection(si, "title", e.target.value)} placeholder="Ej: Tesoros de la Biblia" />
                        </div>
                        <div className="form-group">
                            <label>Color de barra</label>
                            <select value={sec.style} onChange={(e) => updateSection(si, "style", e.target.value)}>
                                <option value="gray">Gris</option>
                                <option value="gold">Dorado</option>
                                <option value="wine">Vinotinto</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ justifyContent: "flex-end", alignItems: "flex-end" }}>
                            <label className="checkbox-label">
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
        </form>
    );
}
