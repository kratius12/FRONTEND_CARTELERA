import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { EmptyState, ErrorNote, Loading, PageHeader, Pager, PersonCell } from "./AdminWidgets";

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
            <PageHeader
                icon="sparkles"
                title="Aseo"
                count={history.length}
                subtitle={<>Historial de asignaciones de aseo. Para generar nuevas semanas usa la sección <strong>Programación</strong>.</>}
            />

            {error && <ErrorNote>{error}</ErrorNote>}

            <section className="adm-card">
                <div className="adm-card-head adm-card-head--line">
                    <h3 className="adm-card-title"><Icon name="history" size={18} /> Registros</h3>
                </div>

                {loading && <Loading>Cargando...</Loading>}

                {!loading && history.length === 0 && (
                    <EmptyState icon="sparkles" title="No hay registros.">
                        Genera semanas desde la sección Programación.
                    </EmptyState>
                )}

                {!loading && history.length > 0 && (
                    <>
                        <div className="adm-table-wrap">
                            <table className="adm-table adm-table--cards">
                                <thead>
                                    <tr>
                                        {["Semana", "Grupos", "Encargado", "Supervisor"].map(h => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentHistory.map((h) => (
                                        <tr key={h.id}>
                                            <td data-label="Semana">
                                                <span className="adm-cell-strong">{formatDate(h.week_start)}</span>
                                                <span className="adm-cell-sub">al {formatDate(h.week_end)}</span>
                                            </td>
                                            <td data-label="Grupos">
                                                <span className="adm-badge">Grupos {h.grupo1} - {h.grupo2}</span>
                                            </td>
                                            <td data-label="Encargado"><PersonCell name={h.encargado} fallback="N/A" /></td>
                                            <td data-label="Supervisor"><PersonCell name={h.supervisor} fallback="N/A" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager page={currentPage} total={totalPages} onChange={setCurrentPage} />
                    </>
                )}
            </section>
        </div>
    );
}
