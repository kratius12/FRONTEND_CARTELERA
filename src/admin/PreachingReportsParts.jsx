// src/admin/PreachingReportsParts.jsx
// Piezas de la planilla de informes: selector de mes, tabla de un grupo y barra de guardar.
import {
    STATUS_OPTIONS,
    computeTotals,
    groupTitle,
    hasReported,
    monthLabel,
    rowStatus,
    serviceYearMonths,
    typeLabel,
} from "./preachingReportsUtils";

// Selector de mes: solo los 12 meses del año de servicio disponible (septiembre a agosto)
export function MonthPicker({ month, onChange, label = "Mes del informe" }) {
    const months = serviceYearMonths();
    const idx = months.indexOf(month);
    return (
        <div className="pr-month">
            <button
                type="button"
                className="pr-month-btn"
                onClick={() => onChange(months[idx - 1])}
                disabled={idx <= 0}
                title="Mes anterior"
                aria-label="Mes anterior"
            >‹</button>
            <select
                className="pr-month-select"
                value={month}
                onChange={(e) => onChange(e.target.value)}
                aria-label={label}
            >
                {months.map((m) => {
                    const label = monthLabel(m);
                    return <option key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                })}
            </select>
            <button
                type="button"
                className="pr-month-btn"
                onClick={() => onChange(months[idx + 1])}
                disabled={idx === -1 || idx >= months.length - 1}
                title="Mes siguiente"
                aria-label="Mes siguiente"
            >›</button>
        </div>
    );
}

// Tabla de un grupo con el formato de la planilla y una fila de totales.
// typeEditable=false (link del encargado): el tipo se ve pero no se cambia.
export function GroupReportTable({ group, getRow, edits, onUpdate, onTypeChange, typeEditable = true }) {
    const rows = group.rows.map(getRow);
    const reported = rows.filter(hasReported).length;
    const gt = computeTotals(rows);

    return (
        <section className="pr-group">
            <div className="pr-group-bar">
                <span className="pr-group-name">{groupTitle(group.name)}</span>
                <span className="pr-group-count">{reported} de {rows.length} con informe</span>
            </div>
            {rows.length === 0 ? (
                <div className="pr-group-empty">Este grupo todavía no tiene personas asignadas.</div>
            ) : (
                <div className="pr-table-wrap">
                    <table className="pr-table">
                        <thead>
                            <tr>
                                <th className="pr-col-num">#</th>
                                <th className="pr-col-name">Nombre</th>
                                <th className="pr-col-small">Horas</th>
                                <th className="pr-col-small">Estudios</th>
                                <th className="pr-col-small">Servicio sagrado</th>
                                <th
                                    className="pr-col-type"
                                    title={typeEditable
                                        ? "Precursorado en este mes. Regular e indefinido también se cambian en Estudiantes (corregir un mes anterior solo cambia ese mes). La campaña vale solo para este mes."
                                        : "Lo administra el secretario"}
                                >Tipo</th>
                                <th className="pr-col-obs">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const isPublisher = row.publisher_type === "publicador";
                                const dirty = !!edits[row.student_id];
                                return (
                                    <tr key={row.student_id} className={dirty ? "pr-row--dirty" : ""}>
                                        <td className="pr-col-num">{idx + 1}</td>
                                        <td className="pr-col-name">{row.name}</td>
                                        <td className="pr-col-small">
                                            {isPublisher ? (
                                                <select
                                                    className="pr-input pr-input--center"
                                                    value={row.participated === true ? "SP" : row.participated === false ? "NP" : ""}
                                                    onChange={(e) => onUpdate(row.student_id, {
                                                        participated: e.target.value === "" ? null : e.target.value === "SP",
                                                    })}
                                                    aria-label={`Participación de ${row.name}`}
                                                >
                                                    <option value="">—</option>
                                                    <option value="SP">SP</option>
                                                    <option value="NP">NP</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    className="pr-input pr-input--center"
                                                    value={row.hours ?? ""}
                                                    onChange={(e) => onUpdate(row.student_id, { hours: e.target.value })}
                                                    aria-label={`Horas de ${row.name}`}
                                                />
                                            )}
                                        </td>
                                        <td className="pr-col-small">
                                            <input
                                                type="number"
                                                min="0"
                                                inputMode="numeric"
                                                className="pr-input pr-input--center"
                                                value={row.bible_studies ?? ""}
                                                onChange={(e) => onUpdate(row.student_id, { bible_studies: e.target.value })}
                                                aria-label={`Estudios de ${row.name}`}
                                            />
                                        </td>
                                        <td className="pr-col-small">
                                            <input
                                                type="number"
                                                min="0"
                                                inputMode="numeric"
                                                className="pr-input pr-input--center"
                                                value={row.sacred_service_hours ?? ""}
                                                onChange={(e) => onUpdate(row.student_id, { sacred_service_hours: e.target.value })}
                                                aria-label={`Servicio sagrado de ${row.name}`}
                                            />
                                        </td>
                                        <td className="pr-col-type">
                                            {typeEditable ? (
                                                <select
                                                    className={`pr-input pr-type pr-type--${row.publisher_type}`}
                                                    value={rowStatus(row)}
                                                    onChange={(e) => onTypeChange(row, e.target.value)}
                                                    aria-label={`Tipo de ${row.name}`}
                                                >
                                                    {STATUS_OPTIONS.map((o) => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span
                                                    className={`pr-type-badge pr-type--${row.publisher_type}`}
                                                    aria-label={`Tipo de ${row.name}`}
                                                >
                                                    {typeLabel(row.publisher_type, row.pioneer_status)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="pr-col-obs">
                                            <input
                                                type="text"
                                                maxLength={255}
                                                className="pr-input"
                                                value={row.observations ?? ""}
                                                onChange={(e) => onUpdate(row.student_id, { observations: e.target.value })}
                                                aria-label={`Observaciones de ${row.name}`}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="pr-group-total">
                                <td className="pr-col-num"></td>
                                <td className="pr-col-name">Totales del grupo</td>
                                <td className="pr-col-small" title="Horas de precursores">{gt.total.horas}</td>
                                <td className="pr-col-small">{gt.total.estudios}</td>
                                <td className="pr-col-small">{gt.servicioSagrado}</td>
                                <td className="pr-col-type" title="Informes por tipo: publicadores (SP), auxiliares, regulares">
                                    P {gt.publicador.informes} · A {gt.auxiliar.informes} · R {gt.regular.informes}
                                </td>
                                <td className="pr-col-obs">
                                    NP {gt.noParticiparon} · Sin informe {gt.sinInforme}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}

export function SaveBar({ count, saving, onSave, onDiscard }) {
    if (!count) return null;
    return (
        <div className="pr-savebar" role="status">
            <span>
                {count === 1 ? "1 persona con cambios sin guardar" : `${count} personas con cambios sin guardar`}
            </span>
            <div className="pr-savebar-actions">
                <button type="button" className="pr-btn-ghost" onClick={onDiscard} disabled={saving}>
                    Descartar
                </button>
                <button type="button" className="submit-btn" onClick={onSave} disabled={saving}>
                    {saving ? "Guardando…" : "💾 Guardar informes"}
                </button>
            </div>
        </div>
    );
}
