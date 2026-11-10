import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { EmptyState, Loading, PageHeader, Pager } from "./AdminWidgets";

const API = import.meta.env.VITE_API_URL || "";

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function formatWeekRange(start, end) {
    if (!start || !end) return "-";
    const s = new Date(start + "T12:00:00");
    const e = new Date(end + "T12:00:00");
    const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
    if (s.getMonth() === e.getMonth()) {
        return `${s.getDate()} - ${e.getDate()} ${months[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${months[s.getMonth()]} - ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
}

// ─── Tabla de historial reutilizable ──────────────────────────────────────────

function HistorySection({ title, icon, rows, columns }) {
    const [page, setPage] = useState(1);
    const perPage = 6;
    const total = Math.ceil(rows.length / perPage);
    const visible = rows.slice((page - 1) * perPage, page * perPage);

    return (
        <section className="adm-card">
            <div className="adm-card-head adm-card-head--line">
                <h4 className="adm-card-title"><Icon name={icon} size={18} /> {title}</h4>
                <span className="adm-count">{rows.length}</span>
            </div>
            {rows.length === 0 ? (
                <EmptyState icon={icon} title="Sin registros aún." />
            ) : (
                <>
                    <div className="adm-table-wrap">
                        <table className="adm-table adm-table--cards">
                            <thead>
                                <tr>
                                    {columns.map(c => <th key={c}>{c}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((row, i) => (
                                    <tr key={i}>
                                        {row.map((cell, j) => (
                                            <td key={j} data-label={columns[j]} className={j === 0 ? "adm-cell-strong" : undefined}><span>{cell}</span></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {total > 1 && <Pager compact page={page} total={total} onChange={setPage} />}
                </>
            )}
        </section>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ScheduleGenerator() {
    const { token, logout } = useContext(AuthContext);

    const [nWeeks, setNWeeks]       = useState(4);
    const [startDate, setStartDate] = useState("");
    const [generating, setGenerating] = useState(false);
    const [toast, setToast]         = useState(null); // { type: 'success'|'error', msg }
    const [lastResult, setLastResult] = useState(null);

    // Historiales
    const [cleaning,   setCleaning]   = useState([]);
    const [micros,     setMicros]     = useState([]);
    const [attendants, setAttendants] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const authHeaders = { Authorization: `Bearer ${token}` };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const [cRes, mRes, aRes] = await Promise.all([
                fetch(`${API}/api/admin/cleaning/history?limit=50`,          { headers: authHeaders }),
                fetch(`${API}/api/admin/assignments/micro/history?limit=50`,  { headers: authHeaders }),
                fetch(`${API}/api/admin/assignments/attendant/history?limit=50`, { headers: authHeaders }),
            ]);

            if ([cRes, mRes, aRes].some(r => r.status === 401 || r.status === 403)) {
                logout(); return;
            }

            const [c, m, a] = await Promise.all([cRes.json(), mRes.json(), aRes.json()]);
            setCleaning(c);
            setMicros(m);
            setAttendants(a);
        } catch {
            // silencioso
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        setToast(null);
        try {
            let url = `${API}/api/admin/schedule/generate-all?n_weeks=${nWeeks}`;
            if (startDate) url += `&start_date=${startDate}`;

            const res = await fetch(url, { method: "POST", headers: authHeaders });
            if (res.status === 401 || res.status === 403) { logout(); return; }
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Error al generar");
            }

            const data = await res.json();
            setLastResult(data);
            setToast({ type: "success", msg: `✅ Generadas ${data.n_weeks} semanas desde ${formatDate(data.start_date)}` });
            await fetchHistory();
        } catch (err) {
            setToast({ type: "error", msg: `❌ ${err.message}` });
        } finally {
            setGenerating(false);
        }
    };

    // Transformar historiales en filas de tabla
    const cleaningRows = cleaning.map(c => [
        formatWeekRange(c.week_start, c.week_end),
        `${c.grupo1} - ${c.grupo2}`,
        c.encargado || "N/A",
        c.supervisor || "N/A",
    ]);

    // Agrupar micros y attendants por fecha
    const groupByDate = (list) => {
        const map = {};
        list.forEach(r => {
            if (!map[r.date]) map[r.date] = [];
            map[r.date].push(r.student_name);
        });
        return Object.entries(map)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([date, students]) => [formatDate(date), students[0] || "-", students[1] || "-"]);
    };

    const microRows     = groupByDate(micros);
    const attendantRows = groupByDate(attendants);

    return (
        <div className="tab-content fade-in">
            <PageHeader
                icon="calendar"
                title="Generador de Programación"
                subtitle="Genera aseo, micrófonos y acomodadores para el mismo rango de semanas en un solo paso."
            />

            {/* Toast */}
            {toast && (
                <div className={`adm-alert ${toast.type === "success" ? "adm-alert--ok" : "adm-alert--error"}`} role="status">
                    <Icon name={toast.type === "success" ? "check" : "alert"} size={18} />
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* Formulario */}
            <section className="adm-card">
                <div className="adm-card-head adm-card-head--line">
                    <div>
                        <h3 className="adm-card-title"><Icon name="sliders" size={18} /> Parámetros</h3>
                        <p className="adm-card-sub">Si no eliges semana inicial, continúa después de la última generada.</p>
                    </div>
                </div>
                <div className="adm-card-body">
                    <div className="adm-param-row">
                        <label className="adm-field">
                            <span className="adm-label">Semanas a generar</span>
                            <input
                                className="adm-input"
                                type="number" min="1" max="50" value={nWeeks}
                                onChange={e => setNWeeks(Number(e.target.value))}
                            />
                        </label>
                        <label className="adm-field">
                            <span className="adm-label">Semana inicial <span className="adm-muted">(opcional)</span></span>
                            <input
                                className="adm-input"
                                type="date" value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={generating}
                            className="adm-btn adm-btn--primary"
                            style={{ height: "42px" }}
                        >
                            {generating
                                ? <><span className="adm-spinner adm-spinner--sm" aria-hidden="true" /> Generando...</>
                                : <><Icon name="sparkles" size={16} /> Generar los 3 módulos</>}
                        </button>
                    </div>

                    {/* Resumen del último resultado */}
                    {lastResult && (
                        <div className="adm-result">
                            {[
                                { label: "Semanas generadas", value: lastResult.n_weeks },
                                { label: "Inicio", value: formatDate(lastResult.start_date) },
                                { label: "Aseo", value: `${lastResult.cleaning_weeks} sem.` },
                                { label: "Micrófonos", value: `${lastResult.micro_weeks} sem.` },
                                { label: "Acomodadores", value: `${lastResult.attendant_weeks} sem.` },
                            ].map(({ label, value }) => (
                                <div key={label} className="adm-mini">
                                    <span>{label}</span>
                                    <strong>{value}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Historiales */}
            <h3 className="adm-section-title"><Icon name="history" size={18} /> Historial actual</h3>
            {loadingHistory ? (
                <Loading>Cargando...</Loading>
            ) : (
                <div className="adm-history-grid">
                    <HistorySection
                        title="Aseo" icon="sparkles"
                        rows={cleaningRows}
                        columns={["Semana", "Grupos", "Encargado", "Supervisor"]}
                    />
                    <HistorySection
                        title="Micrófonos" icon="mic"
                        rows={microRows}
                        columns={["Fecha", "Asignado 1", "Asignado 2"]}
                    />
                    <HistorySection
                        title="Acomodadores" icon="door"
                        rows={attendantRows}
                        columns={["Fecha", "Puerta", "Sala Principal"]}
                    />
                </div>
            )}
        </div>
    );
}
