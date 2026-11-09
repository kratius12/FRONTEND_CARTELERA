// src/components/SoundSheet.jsx
// Hoja impresa de Sonido: misma disposición que la hoja de cálculo que se usaba
// (título con los meses, encabezado dorado, una fila por semana).
// La usan /imprimir (vista "Sonido") y el panel (/admin/sonido).
import "./SoundSheet.css";
import { fromISO } from "./weekendSheetUtils";

const MONTHS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

// "PROGRAMACION DE SONIDO SEPTIEMBRE - OCTUBRE", según los sábados de la hoja
function sheetTitle(rows) {
    if (!rows.length) return "PROGRAMACION DE SONIDO";
    const first = MONTHS[fromISO(rows[0].date).getMonth()];
    const last = MONTHS[fromISO(rows[rows.length - 1].date).getMonth()];
    return `PROGRAMACION DE SONIDO ${first === last ? first : `${first} - ${last}`}`;
}

// rows: [{ date: "YYYY-MM-DD", label: "5 - 8 DE SEPTIEMBRE", audio, micro, zoom }]
export default function SoundSheet({ rows, id }) {
    const upper = (name) => (name || "").toLocaleUpperCase("es");
    return (
        <div className="snd-sheet" id={id}>
            <table className="snd-sheet-table">
                <colgroup>
                    <col className="snd-col-date" />
                    <col className="snd-col-name" />
                    <col className="snd-col-name" />
                    <col className="snd-col-name" />
                </colgroup>
                <thead>
                    <tr>
                        <th colSpan={4} className="snd-sheet-title">{sheetTitle(rows)}</th>
                    </tr>
                    <tr className="snd-sheet-head">
                        <th scope="col">FECHA</th>
                        <th scope="col">AUDIO Y VIDEO</th>
                        <th scope="col">MICROFONOS</th>
                        <th scope="col">ZOOM</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.date}>
                            <td className="snd-sheet-date">{r.label}</td>
                            <td>{upper(r.audio)}</td>
                            <td>{upper(r.micro)}</td>
                            <td>{upper(r.zoom)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
