// src/components/WeekendSheet.jsx
// Hoja impresa del Fin de semana: presidente y lector del estudio de La Atalaya.
// La usan /imprimir (vista "Fin de semana") y el panel (/admin/fin-de-semana).
import "./WeekendSheet.css";
import { WEEKEND_TITLE, sheetDate } from "./weekendSheetUtils";

// rows: [{ date: "YYYY-MM-DD", president: "Nombre" | null, reader: "Nombre" | null }]
export default function WeekendSheet({ rows, id, congregation = "ORIENTE" }) {
    return (
        <div className="wk-sheet" id={id}>
            <div className="wk-sheet-head">
                <span className="wk-sheet-congregation">{congregation}</span>
                <span className="wk-sheet-title">{WEEKEND_TITLE}</span>
            </div>
            <div className="wk-sheet-rule" aria-hidden="true" />
            <table className="wk-sheet-table">
                <colgroup>
                    <col className="wk-col-date" />
                    <col className="wk-col-name" />
                    <col className="wk-col-name" />
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col">FECHA</th>
                        <th scope="col">PRESIDENTE</th>
                        <th scope="col">LECTOR</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.date}>
                            <td>{sheetDate(r.date)}</td>
                            <td>{(r.president || "").toLocaleUpperCase("es")}</td>
                            <td>{(r.reader || "").toLocaleUpperCase("es")}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
