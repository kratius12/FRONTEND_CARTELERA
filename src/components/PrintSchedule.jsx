import { useState, useEffect } from "react";
import "./PrintSchedule.css";

const API = import.meta.env.VITE_API_URL || "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekDate(dateStr) {
    if (!dateStr) return "";
    // Agregar hora para evitar off-by-one por timezone
    const raw = String(dateStr).includes("T") ? dateStr : dateStr + "T12:00:00";
    const s = new Date(raw);
    const day = s.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    s.setDate(s.getDate() + diff);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    const months = [
        "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
        "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];
    if (s.getMonth() === e.getMonth()) {
        return `${s.getDate()} - ${e.getDate()} DE ${months[s.getMonth()]}`;
    }
    return `${s.getDate()} DE ${months[s.getMonth()]} - ${e.getDate()} DE ${months[e.getMonth()]}`;
}

function downloadPDF(elementId, filename) {
    const element = document.getElementById(elementId);
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: "cm", format: "letter", orientation: "portrait" }
    };
    window.html2pdf().from(element).set(opt).save();
}

// ─── Menú principal ───────────────────────────────────────────────────────────

function MenuSelector({ onSelect }) {
    return (
        <div className="print-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "32px" }}>
            <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: "22px", fontWeight: "bold", color: "#111", marginBottom: "6px" }}>
                    CONGREGACIÓN ORIENTE
                </h1>
                <p style={{ color: "#555", fontSize: "15px" }}>Selecciona qué deseas imprimir</p>
            </div>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={() => onSelect("schedule")} className="menu-card">
                    <span style={{ fontSize: "36px" }}>📋</span>
                    <span className="menu-card-label">Acomodadores,<br />Micrófonos y Aseo</span>
                </button>
                <button onClick={() => onSelect("meeting")} className="menu-card">
                    <span style={{ fontSize: "36px" }}>📖</span>
                    <span className="menu-card-label">Programación de<br />Reuniones</span>
                </button>
            </div>
        </div>
    );
}

// ─── Vista 1: Acomodadores, Micrófonos y Aseo ────────────────────────────────

function ScheduleView({ onBack }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/api/programs/schedule`)
            .then(r => r.json())
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const groupAssignments = (list) => {
        if (!list || !Array.isArray(list)) return [];
        const grouped = {};
        list.forEach(item => {
            if (!item || !item.date) return;
            if (!grouped[item.date]) grouped[item.date] = [];
            grouped[item.date].push(item.student);
        });
        return Object.entries(grouped)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, students]) => ({ date, students }));
    };

    if (loading) return <div className="no-print" style={{ textAlign: "center", padding: "40px" }}>Cargando programación...</div>;
    if (!data) return <div className="no-print" style={{ textAlign: "center", padding: "40px" }}>Error al cargar datos.</div>;

    const microGroups = groupAssignments(data?.micros || []);
    const attendantGroups = groupAssignments(data?.attendants || []);
    const cleaningData = (data?.cleaning || []).sort((a, b) => new Date(a.week_start) - new Date(b.week_start));

    return (
        <div className="print-page">
            <div className="print-controls no-print">
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={onBack} className="print-btn" style={{ background: "#6b7280" }}>← Volver</button>
                    <button onClick={() => window.print()} className="print-btn">🖨️ Imprimir</button>
                    <button onClick={() => downloadPDF("printable-area-schedule", "programacion_oriente.pdf")} className="print-btn" style={{ background: "#10b981" }}>📥 Descargar PDF</button>
                </div>
                <p>Esta vista se ajusta automáticamente a una página.</p>
            </div>

            <div className="printable-content" id="printable-area-schedule">
                <div className="main-header">
                    <span className="header-text">ORIENTE - ENCARGADOS ACOMODADORES Y MICROFONOS</span>
                </div>

                <section className="schedule-section">
                    <div className="section-header yellow">ENCARGADOS ACOMODADORES</div>
                    <table className="schedule-table">
                        <thead><tr><th>FECHA</th><th>PUERTA</th><th>SALA PRINCIPAL</th></tr></thead>
                        <tbody>
                            {attendantGroups.map((g, idx) => (
                                <tr key={idx}>
                                    <td>{formatWeekDate(g.date)}</td>
                                    <td>{g.students[0] || "-"}</td>
                                    <td>{g.students[1] || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <section className="schedule-section">
                    <div className="section-header red">ENCARGADOS MICROFONOS</div>
                    <table className="schedule-table">
                        <thead><tr><th>FECHA</th><th colSpan="2">ENCARGADOS</th></tr></thead>
                        <tbody>
                            {microGroups.map((g, idx) => (
                                <tr key={idx}>
                                    <td>{formatWeekDate(g.date)}</td>
                                    <td>{g.students[0] || "-"}</td>
                                    <td>{g.students[1] || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <div className="main-header" style={{ marginTop: "5px" }}>
                    <span className="header-text">ORIENTE - PROGRAMACIÓN DE ASEO</span>
                </div>

                <section className="schedule-section">
                    <table className="schedule-table aseo-table">
                        <thead>
                            <tr className="yellow-header">
                                <th>FECHA</th><th>GRUPOS</th><th>ENCARGADO</th><th>SUPERVISOR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cleaningData.map((c, idx) => (
                                <tr key={idx}>
                                    <td>{formatWeekDate(c.week_start)}</td>
                                    <td className="bold">{c.grupo1} - {c.grupo2}</td>
                                    <td>{c.encargado}</td>
                                    <td>{c.supervisor}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
}

// ─── ProgramCard: diseño idéntico a MeetingFlipBook ──────────────────────────

const BAR_COLORS = { gray: "#4b4b4b", gold: "#b8860b", wine: "#7a0026" };

function ProgramCard({ payload, hideHeader = false }) {
    const meta  = payload?.meta  || {};
    const parts = Array.isArray(payload?.parts) ? payload.parts : [];
    const pageTitle = payload?.title || "Programa para la reunión de entre semana";

    // Dividir partes: pre / sections / post (idéntico a MeetingFlipBook)
    const firstIdx = parts.findIndex(p => p?.type === "section");
    const lastIdx  = (() => {
        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i]?.type === "section") return i;
        }
        return -1;
    })();

    const pre      = firstIdx === -1 ? parts : parts.slice(0, firstIdx);
    const sections = firstIdx === -1 ? [] :
        parts.slice(firstIdx, lastIdx + 1).filter(p => p?.type === "section");
    const post     = lastIdx === -1 ? [] : parts.slice(lastIdx + 1);

    const renderBullets = (items) => {
        const bullets = (items || []).filter(p => p && p.type !== "section");
        if (!bullets.length) return null;
        return (
            <ul className="fb-bullets">
                {bullets.map((p, i) => (
                    <li key={i}>
                        {p.type === "song" && !p.text?.toLowerCase().startsWith("canción")
                            ? `Canción ${p.text}` : p.text}
                        {p.minutes ? <span className="fb-muted"> ({p.minutes} min.)</span> : null}
                    </li>
                ))}
            </ul>
        );
    };

    const getSectionColumns = (section) => {
        if (Array.isArray(section?.columns) && section.columns.length === 2) return section.columns;
        const inferred = Array.isArray(section?.items) &&
            section.items.some(i => (i?.assigned?.length || 0) >= 2);
        return inferred ? ["Estudiante", "Ayudante"] : null;
    };

    let counter = 0;

    return (
        <div className="fb-card">
            {/* ── Cabecera (solo en el primer programa del par) ── */}
            {!hideHeader && (
                <>
                    <div className="fb-topline">
                        <div className="fb-oriente">ORIENTE</div>
                        <h1 className="fb-title">{pageTitle}</h1>
                        <div style={{ width: "70px" }} />
                    </div>
                    <div className="fb-rule" />
                </>
            )}

            <div className="fb-meta">
                <div>
                    <div className="fb-meta-left">
                        {(meta.rangeText || "").toUpperCase()}
                        {meta.readingText && (
                            <>&nbsp;&nbsp;|&nbsp;&nbsp;{(meta.readingText || "").toUpperCase()}</>
                        )}
                    </div>
                    {renderBullets(pre)}
                </div>
                <div className="fb-meta-right">
                    {meta.president    && <div><span className="fb-label">Presidente:</span> {meta.president}</div>}
                    {meta.openingPrayer && <div><span className="fb-label">Oración:</span> {meta.openingPrayer}</div>}
                </div>
            </div>

            {/* ── Secciones ── */}
            {sections.map((section, sIdx) => {
                const barColor = BAR_COLORS[section.style] || BAR_COLORS.gray;
                const columns  = getSectionColumns(section);
                const items    = Array.isArray(section.items) ? section.items : [];
                const songs    = items.filter(i => i?.type === "song");
                const rows     = items.filter(i => i?.type !== "song");

                return (
                    <div key={sIdx} className="fb-section">
                        <div className="fb-bar" style={{ background: barColor }}>
                            {(section.title || "Sección").toUpperCase()}
                        </div>

                        {songs.length > 0 && renderBullets(songs)}

                        {columns && (
                            <div className="fb-twohead">
                                <div />
                                <div className="fb-twohead-right">
                                    <div>{columns[0]}</div>
                                    <div>{columns[1]}</div>
                                </div>
                            </div>
                        )}

                        <div className="fb-rows">
                            {rows.map((item, i) => {
                                counter++;
                                const assigned = Array.isArray(item.assigned) ? item.assigned : [];

                                const right = columns ? (
                                    <div className="fb-right fb-twocol-right">
                                        <div>{assigned[0] || ""}</div>
                                        <div>{assigned[1] || ""}</div>
                                    </div>
                                ) : item.noteLabel ? (
                                    <div className="fb-right">
                                        <div className="fb-note-label">{item.noteLabel}</div>
                                        <div>{assigned.join(", ")}</div>
                                    </div>
                                ) : (
                                    <div className="fb-right">{assigned.join(", ")}</div>
                                );

                                return (
                                    <div key={i} className={`fb-row${columns ? " fb-twocol" : ""}`}>
                                        <div className="fb-left">
                                            {counter}. {item.text}
                                            {item.minutes && <span className="fb-muted"> ({item.minutes} mins.)</span>}
                                        </div>
                                        {right}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* ── Cierre ── */}
            {(post.length > 0 || meta.closingPrayer) && (
                <div className="fb-section">
                    {renderBullets(post)}
                    {meta.closingPrayer && (
                        <div className="fb-meta-right" style={{ marginTop: "4px" }}>
                            <div><span className="fb-label">Oración:</span> {meta.closingPrayer}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Vista 2: Programación de Reuniones ──────────────────────────────────────

function MeetingProgramsView({ onBack }) {
    const [programList, setProgramList] = useState([]);  // todos los programas disponibles
    const [loading,     setLoading]     = useState(true);
    const [startId,     setStartId]     = useState(null);
    const [step,        setStep]        = useState("select"); // "select" | "print"
    const [programs,    setPrograms]    = useState([]);
    const [fetching,    setFetching]    = useState(false);

    // Carga la lista una sola vez
    useEffect(() => {
        fetch(`${API}/api/programs`)
            .then(r => r.json())
            .then(list => {
                // Ordenar del más antiguo al más reciente para el selector
                const sorted = [...list].sort((a, b) => new Date(a.week_start) - new Date(b.week_start));
                setProgramList(sorted);
                if (sorted.length > 0) setStartId(sorted[0].id);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleGenerate = () => {
        const startIdx = programList.findIndex(p => p.id === startId);
        if (startIdx === -1) return;
        const toLoad = programList.slice(startIdx); // desde la semana elegida hasta el final

        setFetching(true);
        Promise.all(
            toLoad.map(p =>
                fetch(`${API}/api/programs/${p.id}`)
                    .then(r => r.json())
                    .then(payload => ({ meta: p, payload }))
            )
        )
            .then(result => {
                setPrograms(result);
                setStep("print");
            })
            .catch(() => {})
            .finally(() => setFetching(false));
    };

    if (loading) return (
        <div style={{ textAlign: "center", padding: "40px", color: "#555" }}>
            Cargando programas...
        </div>
    );

    // ── Paso 1: Selector ──────────────────────────────────────────────────────
    if (step === "select") {
        return (
            <div className="print-page meeting-selector">
                <div className="selector-box">
                    <div style={{ textAlign: "center", marginBottom: "22px" }}>
                        <div style={{ fontSize: "28px", marginBottom: "6px" }}>📖</div>
                        <h2 style={{ margin: "0 0 4px", fontSize: "17px", color: "#111" }}>
                            Programación de Reuniones
                        </h2>
                        <p style={{ margin: 0, color: "#666", fontSize: "13px" }}>
                            Selecciona el rango a imprimir
                        </p>
                    </div>

                    <div className="selector-field">
                        <label>Desde qué semana</label>
                        <select
                            value={startId ?? ""}
                            onChange={e => setStartId(Number(e.target.value))}
                        >
                            {programList.map(p => (
                                <option key={p.id} value={p.id}>
                                    {formatWeekDate(p.week_start)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                        <button onClick={onBack} className="selector-back-btn">← Volver</button>
                        <button
                            onClick={handleGenerate}
                            disabled={fetching || !startId}
                            className="selector-go-btn"
                        >
                            {fetching ? "Cargando..." : "Ver impresión →"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Paso 2: Impresión — 2 programas por página ────────────────────────────
    // Agrupar de a 2
    const pairs = [];
    for (let i = 0; i < programs.length; i += 2) {
        pairs.push(programs.slice(i, i + 2));
    }

    return (
        <div className="print-page">
            <div className="print-controls no-print">
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={() => setStep("select")} className="print-btn" style={{ background: "#6b7280" }}>
                        ← Cambiar selección
                    </button>
                    <button onClick={onBack} className="print-btn" style={{ background: "#6b7280" }}>
                        ✕ Salir
                    </button>
                    <button onClick={() => window.print()} className="print-btn">🖨️ Imprimir</button>
                    <button
                        onClick={() => downloadPDF("printable-area-meeting", "programas_reuniones.pdf")}
                        className="print-btn"
                        style={{ background: "#10b981" }}
                    >
                        📥 Descargar PDF
                    </button>
                </div>
                <p style={{ textAlign: "center", color: "#555", marginTop: "8px", fontSize: "13px" }}>
                    {programs.length} semana{programs.length !== 1 ? "s" : ""} · 2 por página
                </p>
            </div>

            <div id="printable-area-meeting">
                {pairs.map((pair, pairIdx) => (
                    <div
                        key={pairIdx}
                        className={`fb-pair${pairIdx < pairs.length - 1 ? " fb-page-break" : ""}`}
                    >
                        {pair.map(({ payload }, i) => (
                            <ProgramCard key={i} payload={payload} hideHeader={i > 0} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PrintSchedule() {
    const [view, setView] = useState(null);

    if (!view)               return <MenuSelector onSelect={setView} />;
    if (view === "schedule") return <ScheduleView onBack={() => setView(null)} />;
    if (view === "meeting")  return <MeetingProgramsView onBack={() => setView(null)} />;
    return null;
}
