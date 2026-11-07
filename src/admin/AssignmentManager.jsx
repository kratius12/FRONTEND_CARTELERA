import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { EmptyState, ErrorNote, Loading, PageHeader, Pager, PersonCell } from "./AdminWidgets";

const API = import.meta.env.VITE_API_URL || "";

export default function AssignmentManager({ type, title, icon }) {
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
            const res = await fetch(`${API}/api/admin/assignments/${type}/history`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) { logout(); throw new Error("Sesión expirada"); }
            if (!res.ok) throw new Error(`No se pudo cargar el historial de ${title}`);
            setHistory(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, [type]);

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Intl.DateTimeFormat("es-ES", { year: "numeric", month: "long", day: "2-digit" }).format(new Date(dateString));
    };

    // Agrupar por fecha
    const grouped = {};
    history.forEach(h => {
        if (!grouped[h.date]) grouped[h.date] = [];
        grouped[h.date].push(h.student_name);
    });
    const groupedHistory = Object.entries(grouped)
        .map(([date, students]) => ({ date, students }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalPages = Math.ceil(groupedHistory.length / itemsPerPage);
    const current = groupedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const firstCol = type === "micro" ? "Asignado 1" : "Puerta";
    const secondCol = type === "micro" ? "Asignado 2" : "Sala Principal";

    return (
        <div className="tab-content fade-in">
            <PageHeader
                icon={icon}
                title={title}
                count={groupedHistory.length}
                subtitle={<>Historial de asignaciones. Para generar nuevas semanas usa la sección <strong>Programación</strong>.</>}
            />

            {error && <ErrorNote>{error}</ErrorNote>}

            <section className="adm-card">
                <div className="adm-card-head adm-card-head--line">
                    <h3 className="adm-card-title"><Icon name="history" size={18} /> Registros</h3>
                </div>

                {loading && <Loading>Cargando...</Loading>}

                {!loading && groupedHistory.length === 0 && (
                    <EmptyState icon="calendar" title="No hay registros.">
                        Genera semanas desde la sección Programación.
                    </EmptyState>
                )}

                {!loading && groupedHistory.length > 0 && (
                    <>
                        <div className="adm-table-wrap">
                            <table className="adm-table adm-table--cards">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>{firstCol}</th>
                                        <th>{secondCol}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {current.map((h) => (
                                        <tr key={h.date}>
                                            <td data-label="Fecha"><span className="adm-cell-strong">{formatDate(h.date)}</span></td>
                                            <td data-label={firstCol}><PersonCell name={h.students[0]} /></td>
                                            <td data-label={secondCol}><PersonCell name={h.students[1]} /></td>
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
