import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

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
        <div style={{ flex: 1, minWidth: "280px" }}>
            <h4 style={{ margin: "0 0 8px", color: "var(--text-primary)", fontSize: "14px" }}>
                {icon} {title}
            </h4>
            {rows.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Sin registros aún.</p>
            ) : (
                <>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "var(--bg-tertiary)" }}>
                                {columns.map(c => (
                                    <th key={c} style={{ padding: "6px 10px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-color)" }}>
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((row, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    {row.map((cell, j) => (
                                        <td key={j} style={{ padding: "6px 10px", color: "var(--text-primary)" }}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {total > 1 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                style={{ padding: "3px 10px", fontSize: "12px", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1, border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
                                ‹
                            </button>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{page} / {total}</span>
                            <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page === total}
                                style={{ padding: "3px 10px", fontSize: "12px", cursor: page === total ? "not-allowed" : "pointer", opacity: page === total ? 0.5 : 1, border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
                                ›
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
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
            <h2 style={{ marginBottom: "4px" }}>📅 Generador de Programación</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "14px" }}>
                Genera aseo, micrófonos y acomodadores para el mismo rango de semanas en un solo paso.
            </p>

            {/* Toast */}
            {toast && (
                <div style={{
                    marginBottom: "16px", padding: "12px 16px", borderRadius: "8px",
                    background: toast.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${toast.type === "success" ? "#10b981" : "#ef4444"}`,
                    color: toast.type === "success" ? "#10b981" : "#ef4444",
                    fontSize: "14px"
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Formulario */}
            <div style={{ padding: "20px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "28px" }}>
                <h3 style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>⚙️ Parámetros</h3>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Semanas a generar</label>
                        <input
                            type="number" min="1" max="50" value={nWeeks}
                            onChange={e => setNWeeks(Number(e.target.value))}
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", width: "110px" }}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                            Semana inicial <span style={{ opacity: 0.6 }}>(opcional — continúa automáticamente)</span>
                        </label>
                        <input
                            type="date" value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="submit-btn"
                        style={{ height: "38px", minWidth: "200px" }}
                    >
                        {generating ? "Generando..." : "✨ Generar los 3 módulos"}
                    </button>
                </div>

                {/* Resumen del último resultado */}
                {lastResult && (
                    <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                        {[
                            { label: "Semanas generadas", value: lastResult.n_weeks },
                            { label: "Inicio", value: formatDate(lastResult.start_date) },
                            { label: "Aseo", value: `${lastResult.cleaning_weeks} sem.` },
                            { label: "Micrófonos", value: `${lastResult.micro_weeks} sem.` },
                            { label: "Acomodadores", value: `${lastResult.attendant_weeks} sem.` },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "2px" }}>{label}</div>
                                <div style={{ fontWeight: "bold", color: "var(--accent-color)", fontSize: "15px" }}>{value}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Historiales */}
            <h3 style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>📖 Historial actual</h3>
            {loadingHistory ? (
                <p style={{ color: "var(--text-secondary)" }}>Cargando...</p>
            ) : (
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
                    <HistorySection
                        title="Aseo" icon="🧹"
                        rows={cleaningRows}
                        columns={["Semana", "Grupos", "Encargado", "Supervisor"]}
                    />
                    <HistorySection
                        title="Micrófonos" icon="🎤"
                        rows={microRows}
                        columns={["Fecha", "Asignado 1", "Asignado 2"]}
                    />
                    <HistorySection
                        title="Acomodadores" icon="🛡️"
                        rows={attendantRows}
                        columns={["Fecha", "Puerta", "Sala Principal"]}
                    />
                </div>
            )}
        </div>
    );
}
