import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "";

export default function AssignmentManager({ type, title, icon }) {
    const { token, logout } = useContext(AuthContext);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");
    const [startDate, setStartDate] = useState("");
    const [nWeeks, setNWeeks] = useState(4);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const fetchHistory = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API}/api/admin/assignments/${type}/history`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                logout();
                throw new Error("Sesión expirada");
            }
            if (!res.ok) throw new Error(`No se pudo cargar el historial de ${title}`);
            const data = await res.json();
            setHistory(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [type]);

    const handleGenerate = async () => {
        setGenerating(true);
        setError("");
        setToast("");
        try {
            let url = `${API}/api/admin/assignments/${type}/generate?n_weeks=${nWeeks}`;
            if (history.length === 0 && startDate) {
                url += `&start_date=${startDate}`;
            }
            
            const res = await fetch(url, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                logout();
                throw new Error("Sesión expirada");
            }
            if (!res.ok) throw new Error(`Error al generar ${title}`);
            
            const nuevas = await res.json();
            const totalSemanas = nuevas.length / 2;
            setToast(`¡Se generaron turnos para ${totalSemanas} semanas exitosamente!`);
            fetchHistory();
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric', month: 'long', day: '2-digit'
        }).format(date);
    };

    return (
        <div className="tab-content fade-in">
            <div className="form-header">
                <h2>{icon} Gestión de {title}</h2>
            </div>
            
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
                Asignación automática basada en turnos. El sistema selecciona a quienes llevan más tiempo sin participar
                y excluye a quienes tienen asignado Aseo en la misma semana.
            </p>

            {error && <div className="error" style={{ marginBottom: "20px" }}>{error}</div>}
            {toast && <div className="toast" style={{ top: "80px", right: "20px" }}>{toast}</div>}

            <div className="card" style={{ marginBottom: "30px", padding: "20px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px", color: "var(--text-primary)" }}>⚙️ Generar Programación</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Semanas a generar</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="50" 
                            value={nWeeks} 
                            onChange={(e) => setNWeeks(Number(e.target.value))}
                            style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", width: "100px" }}
                        />
                    </div>
                    {history.length === 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Fecha Inicial (Opcional)</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                            />
                        </div>
                    )}
                    <button 
                        onClick={handleGenerate} 
                        disabled={generating}
                        className="submit-btn"
                        style={{ marginTop: "24px" }}
                    >
                        {generating ? "Generando..." : `✨ Asignar ${title}`}
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: "0", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
                    <h3 style={{ margin: 0, color: "var(--text-primary)" }}>📖 Historial de Asignaciones</h3>
                </div>
                
                {loading && <div style={{ padding: "20px", textAlign: "center" }}>Cargando...</div>}
                
                {!loading && history.length === 0 && (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                        No hay historial aún.
                    </div>
                )}
                
                {!loading && history.length > 0 && (() => {
                    // Group history by date
                    const grouped = {};
                    history.forEach(h => {
                        if (!grouped[h.date]) grouped[h.date] = [];
                        grouped[h.date].push(h.student_name);
                    });
                    const groupedHistory = Object.entries(grouped)
                        .map(([date, students]) => ({ date, students }))
                        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending order

                    const totalPages = Math.ceil(groupedHistory.length / itemsPerPage);
                    const currentHistory = groupedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                    
                    return (
                        <div className="table-responsive">
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr style={{ background: "var(--bg-tertiary)" }}>
                                        <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: "600" }}>Fecha</th>
                                        <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: "600" }}>{type === 'micro' ? 'Asignado 1' : 'Puerta'}</th>
                                        <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: "600" }}>{type === 'micro' ? 'Asignado 2' : 'Sala Principal'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentHistory.map((h, i) => (
                                        <tr key={h.date} style={{ borderBottom: i < currentHistory.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                                            <td style={{ padding: "14px 20px", fontWeight: "bold", color: "var(--text-primary)" }}>{formatDate(h.date)}</td>
                                            <td style={{ padding: "14px 20px", color: "var(--accent-color)" }}>{h.students[0] || "-"}</td>
                                            <td style={{ padding: "14px 20px", color: "#60a5fa" }}>{h.students[1] || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                                <button
                                    className="icon-btn"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    style={{ padding: '6px 12px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                >
                                    Anterior
                                </button>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    Página {currentPage} de {totalPages || 1}
                                </span>
                                <button
                                    className="icon-btn"
                                    disabled={currentPage >= totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    style={{ padding: '6px 12px', opacity: currentPage >= totalPages || totalPages === 0 ? 0.5 : 1, cursor: currentPage >= totalPages || totalPages === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
