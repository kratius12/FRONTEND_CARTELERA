import { useState, useEffect } from "react";
import "./PrintSchedule.css";

const API = import.meta.env.VITE_API_URL || "";

export default function PrintSchedule() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API}/api/programs/schedule`);
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatWeekDate = (dateInput) => {
        const s = new Date(dateInput);
        // Ajustar al lunes de esa semana
        const day = s.getDay();
        const diff = (day === 0 ? -6 : 1 - day);
        s.setDate(s.getDate() + diff);
        
        const e = new Date(s);
        e.setDate(s.getDate() + 6);

        const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        
        if (s.getMonth() === e.getMonth()) {
            return `${s.getDate()} - ${e.getDate()} DE ${months[s.getMonth()]}`;
        } else {
            return `${s.getDate()} DE ${months[s.getMonth()]} - ${e.getDate()} DE ${months[e.getMonth()]}`;
        }
    };

    const groupAssignments = (list) => {
        if (!list || !Array.isArray(list)) return [];
        const grouped = {};
        list.forEach(item => {
            if (!item || !item.date) return;
            if (!grouped[item.date]) grouped[item.date] = [];
            grouped[item.date].push(item.student);
        });
        // Sort by date
        return Object.entries(grouped)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, students]) => ({ date, students }));
    };

    if (loading) return <div className="no-print">Cargando programación...</div>;
    if (!data) return <div className="no-print">Error al cargar datos.</div>;

    const microGroups = groupAssignments(data?.micros || []);
    const attendantGroups = groupAssignments(data?.attendants || []);
    const cleaningData = (data?.cleaning || []).sort((a, b) => new Date(a.week_start) - new Date(b.week_start));

    const handleDownload = () => {
        const element = document.getElementById('printable-area');
        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5], // Arriba, derecha, abajo, izquierda
            filename: 'programacion_oriente.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 3, // Mayor resolución para que el texto sea nítido
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { unit: 'cm', format: 'letter', orientation: 'portrait' }
        };
        
        // Ejecutar descarga
        window.html2pdf().from(element).set(opt).save();
    };

    return (
        <div className="print-page">
            <div className="print-controls no-print">
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button onClick={() => window.print()} className="print-btn">🖨️ Imprimir</button>
                    <button onClick={handleDownload} className="print-btn" style={{ background: '#10b981' }}>📥 Descargar PDF</button>
                </div>
                <p>Esta vista se ajusta automáticamente a una página.</p>
            </div>

            <div className="printable-content" id="printable-area">
                {/* Header Compacto */}
                <div className="main-header">
                    <span className="header-text">ORIENTE - ENCARGADOS ACOMODADORES Y MICROFONOS</span>
                </div>

                {/* Table 1: Acomodadores */}
                <section className="schedule-section">
                    <div className="section-header yellow">ENCARGADOS ACOMODADORES</div>
                    <table className="schedule-table">
                        <thead>
                            <tr>
                                <th>FECHA</th>
                                <th>PUERTA</th>
                                <th>SALA PRINCIPAL</th>
                            </tr>
                        </thead>
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

                {/* Table 2: Microfonos */}
                <section className="schedule-section">
                    <div className="section-header red">ENCARGADOS MICROFONOS</div>
                    <table className="schedule-table">
                        <thead>
                            <tr>
                                <th>FECHA</th>
                                <th colSpan="2">ENCARGADOS</th>
                            </tr>
                        </thead>
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

                {/* Header Aseo Compacto */}
                <div className="main-header" style={{ marginTop: '5px' }}>
                    <span className="header-text">ORIENTE - PROGRAMACIÓN DE ASEO</span>
                </div>

                {/* Table 3: Aseo */}
                <section className="schedule-section">
                    <table className="schedule-table aseo-table">
                        <thead>
                            <tr className="yellow-header">
                                <th>FECHA</th>
                                <th>GRUPOS</th>
                                <th>ENCARGADO</th>
                                <th>SUPERVISOR</th>
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
