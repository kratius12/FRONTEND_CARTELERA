// src/components/TalksSheet.jsx
// Hoja mensual de Conferencias: los que nos visitan y los que salen.
// La usan /imprimir (vista "Conferencias", sin teléfonos) y el panel (con teléfonos opcionales).
import "./TalksSheet.css";
import { sheetDate } from "./weekendSheetUtils";
import { monthLabel } from "./talksSheetUtils";

function Section({ title, rows, placeLabel, withPhone }) {
    const cols = withPhone ? 8 : 7;
    return (
        <table className="tk-sheet-table">
            <colgroup>
                <col className="tk-col-date" />
                <col className="tk-col-name" />
                <col className="tk-col-place" />
                <col className="tk-col-num" />
                <col className="tk-col-title" />
                <col className="tk-col-song" />
                <col className="tk-col-img" />
                {withPhone && <col className="tk-col-phone" />}
            </colgroup>
            <thead>
                <tr><th colSpan={cols} className="tk-sheet-section">{title}</th></tr>
                <tr className="tk-sheet-head">
                    <th scope="col">FECHA</th>
                    <th scope="col">CONFERENCIANTE</th>
                    <th scope="col">{placeLabel}</th>
                    <th scope="col">BOSQUEJO</th>
                    <th scope="col">TÍTULO DEL DISCURSO</th>
                    <th scope="col">CANCIÓN</th>
                    <th scope="col">IMÁGENES</th>
                    {withPhone && <th scope="col">TELÉFONO</th>}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr><td colSpan={cols} className="tk-sheet-empty">Sin conferencias este mes</td></tr>
                ) : rows.map((r) => (
                    <tr key={r.id}>
                        <td>{sheetDate(r.date)}</td>
                        <td className="tk-sheet-name">{r.speaker_name.toLocaleUpperCase("es")}</td>
                        <td>{r.congregation}</td>
                        <td>{r.outline_number}</td>
                        <td className="tk-sheet-title">{r.title}</td>
                        <td>{r.song || ""}</td>
                        <td>{r.has_images ? "SÍ" : "NO"}</td>
                        {withPhone && <td>{r.phone || ""}</td>}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// incoming / outgoing: [{ id, date, speaker_name, congregation, outline_number, title, song, has_images, phone? }]
export default function TalksSheet({ id, month, incoming, outgoing, withPhone = false, congregation = "ORIENTE" }) {
    return (
        <div className="tk-sheet" id={id}>
            <div className="tk-sheet-head-row">
                <span>{congregation}</span>
                <span className="tk-sheet-caption">Conferencias públicas · {monthLabel(month)}</span>
            </div>
            <div className="tk-sheet-rule" aria-hidden="true" />
            <Section title="CONFERENCIANTES QUE NOS VISITAN" rows={incoming} placeLabel="VIENE DE" withPhone={withPhone} />
            <Section title="CONFERENCIANTES QUE SALEN" rows={outgoing} placeLabel="VA A" withPhone={withPhone} />
        </div>
    );
}
