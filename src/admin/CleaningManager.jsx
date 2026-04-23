import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "";

export default function CleaningManager() {
    const { token, logout } = useContext(AuthContext);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");
    const [nPairs, setNPairs] = useState(5);
    const [startDate, setStartDate] = useState("");

    const fetchHistory = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API}/api/admin/cleaning/history`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                logout();
                throw new Error("Sesión expirada");
            }
            if (!res.ok) throw new Error("No se pudo cargar el historial de aseo");
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
    }, []);

    const handleGenerate = async () => {
        if (nPairs < 1 || nPairs > 50) {
            alert("Por favor ingresa un número entre 1 y 50.");
            return;
        }

        setGenerating(true);
        setError("");
        setToast("");
        try {
            let url = `${API}/api/admin/cleaning/generate?n_parejas_a_generar=${nPairs}`;
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
            if (!res.ok) throw new Error("Error al generar las parejas de aseo");
            
            const nuevas = await res.json();
            setToast(`¡Se insertaron ${nuevas.length} nuevas combinaciones exitosamente!`);
            
            // Recargar el historial
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
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="tab-content fade-in">
            <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>🧹 Gestión de Aseo (Cíclico)</h2>
            </div>
            
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
                Genera las asignaciones de aseo automáticamente. El sistema sigue una secuencia estricta de 15 combinaciones
                y nunca repite ni se sale de ciclo.
            </p>

            {error && <div className="error" style={{ marginBottom: "20px" }}>{error}</div>}
            {toast && <div className="toast" style={{ top: "80px", right: "20px" }}>{toast}</div>}

            <div className="card" style={{ marginBottom: "30px", padding: "20px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px", color: "var(--text-primary)" }}>⚙️ Generador</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Cantidad a generar</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="50" 
                            value={nPairs} 
                            onChange={(e) => setNPairs(Number(e.target.value))}
                            style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", width: "120px" }}
                        />
                    </div>
                    {history.length === 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Fecha de inicio (opcional)</label>
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
                        {generating ? "Generando..." : "✨ Generar y Guardar Parejas"}
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: "0", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
                    <h3 style={{ margin: 0, color: "var(--text-primary)" }}>📖 Últimos Registros Generados</h3>
                </div>
                
                {loading && <div style={{ padding: "20px", textAlign: "center" }}>Cargando historial...</div>}
                
                {!loading && history.length === 0 && (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                        No hay historial de aseo. ¡Genera tus primeras parejas arriba!
                    </div>
                )}
                
                {!loading && history.length > 0 && (
                    <div className="table-responsive">
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "var(--bg-tertiary)" }}>
                                    <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "14px", borderBottom: "1px solid var(--border-color)" }}>ID</th>
                                    <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "14px", borderBottom: "1px solid var(--border-color)" }}>Grupo 1</th>
                                    <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "14px", borderBottom: "1px solid var(--border-color)" }}>Grupo 2</th>
                                    <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "14px", borderBottom: "1px solid var(--border-color)" }}>Semana (Inicio - Fin)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((h, i) => (
                                    <tr key={h.id} style={{ borderBottom: i < history.length - 1 ? "1px solid var(--border-color)" : "none", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: "14px 20px", color: "var(--text-secondary)" }}>#{h.id}</td>
                                        <td style={{ padding: "14px 20px", fontWeight: "bold", color: "var(--text-primary)" }}>Grupo {h.grupo1}</td>
                                        <td style={{ padding: "14px 20px", fontWeight: "bold", color: "var(--text-primary)" }}>Grupo {h.grupo2}</td>
                                        <td style={{ padding: "14px 20px", color: "var(--text-secondary)", fontSize: "14px" }}>
                                            {formatDate(h.week_start)} — {formatDate(h.week_end)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
