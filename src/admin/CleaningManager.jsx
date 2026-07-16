import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "";

export default function CleaningManager() {
    const { token, logout } = useContext(AuthContext);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const fetchHistory = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API}/api/admin/cleaning/history`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) { logout(); throw new Error("Sesión expirada"); }
            if (!res.ok) throw new Error("No se pudo cargar el historial de aseo");
            setHistory(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Intl.DateTimeFormat("es-ES", {
            year: "numeric", month: "short", day: "2-digit"
        }).format(new Date(dateString));
    };

    const totalPages = Math.ceil(history.length / itemsPerPage);
    const currentHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="tab-content fade-in">
            <h2 style={{ marginBottom: "4px" }}>🧹 Aseo</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "14px" }}>
                Historial de asignaciones de aseo. Para generar nuevas semanas usa la pestaña <strong>📅 Programación</strong>.
            </p>

            {error && <div className="error" style={{ marginBottom: "20px" }}>{error}</div>}

            <div className="card" style={{ padding: "0", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
                    <h3 style={{ margin: 0, color: "var(--text-primary)" }}>📖 Registros</h3>
                </div>

                {loading && <div style={{ padding: "20px", textAlign: "center" }}>Cargando...</div>}

                {!loading && history.length === 0 && (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                        No hay registros. Genera semanas desde la pestaña 📅 Programación.
                    </div>
                )}

                {!loading && history.length > 0 && (
                    <div className="table-responsive">
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "var(--bg-tertiary)" }}>
                                    {["Semana", "Grupos", "Encargado", "Supervisor"].map(h => (
                                        <th key={h} style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: 600, fontSize: "14px", borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {currentHistory.map((h, i) => (
                                    <tr key={h.id}
                                        style={{ borderBottom: i < currentHistory.length - 1 ? "1px solid var(--border-color)" : "none" }}
                                        onMouseOver={e => e.currentTarget.style.background = "var(--bg-tertiary)"}
                                        onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <td style={{ padding: "14px 20px", color: "var(--text-secondary)", fontSize: "14px" }}>
                                            {formatDate(h.week_start)} — {formatDate(h.week_end)}
                                        </td>
                                        <td style={{ padding: "14px 20px", fontWeight: "bold", color: "var(--text-primary)" }}>
                                            {h.grupo1} - {h.grupo2}
                                        </td>
                                        <td style={{ padding: "14px 20px", color: "var(--accent-color)", fontWeight: 500 }}>{h.encargado || "N/A"}</td>
                                        <td style={{ padding: "14px 20px", color: "#60a5fa", fontWeight: 500 }}>{h.supervisor || "N/A"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--border-color)", background: "var(--bg-tertiary)" }}>
                            <button className="icon-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                                style={{ padding: "6px 12px", opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "14px", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
                                Anterior
                            </button>
                            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Página {currentPage} de {totalPages || 1}</span>
                            <button className="icon-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
                                style={{ padding: "6px 12px", opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? "not-allowed" : "pointer", fontSize: "14px", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
