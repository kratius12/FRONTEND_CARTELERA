// src/admin/preachingReportsUtils.js
// Constantes y cálculos compartidos por el módulo de informes y la página de cada grupo.

// Opciones de la columna Tipo en la planilla del admin: el precursorado de la persona en el mes.
// Regular, indefinido y publicador también se cambian en Estudiantes; la campaña vale solo para ese mes.
export const STATUS_OPTIONS = [
    { value: "", label: "Publicador" },
    { value: "aux_camp", label: "Precursor auxiliar (campaña)" },
    { value: "aux_ind", label: "Precursor auxiliar (indefinido)" },
    { value: "regular", label: "Precursor regular" },
];

// Tipo del informe según el precursorado
export function typeFromStatus(status) {
    if (status === "regular") return "regular";
    if (status === "aux_camp" || status === "aux_ind") return "auxiliar";
    return "publicador";
}

// Precursorado que se muestra en el selector para una fila
export function rowStatus(row) {
    if (row.publisher_type === "regular") return "regular";
    if (row.publisher_type === "auxiliar") {
        return row.pioneer_status === "aux_ind" || row.pioneer_status === "aux_camp" ? row.pioneer_status : "aux_camp";
    }
    return "";
}

// Etiqueta del tipo; para auxiliares dice si es en campaña o indefinido (en ese mes)
export function typeLabel(publisherType, pioneerStatus) {
    if (publisherType === "regular") return "Precursor regular";
    if (publisherType === "auxiliar") {
        if (pioneerStatus === "aux_camp") return "Precursor auxiliar (campaña)";
        if (pioneerStatus === "aux_ind") return "Precursor auxiliar (indefinido)";
        return "Precursor auxiliar";
    }
    return "Publicador";
}

export const MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Por defecto se trabaja el mes anterior (los informes se entregan a inicio de mes)
export function defaultMonth() {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Año de servicio: de septiembre a agosto (el 2027 va de septiembre 2026 a agosto 2027).
// Solo está disponible el año de servicio del mes cuyos informes se recogen (el mes anterior),
// así en septiembre todavía se pueden terminar los informes de agosto.
export function currentServiceYear() {
    const [y, m] = defaultMonth().split("-").map(Number);
    return m >= 9 ? y + 1 : y;
}

// Los 12 meses del año de servicio, de septiembre a agosto ("YYYY-MM")
export function serviceYearMonths(serviceYear = currentServiceYear()) {
    const months = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(serviceYear - 1, 8 + i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return months;
}

export function monthLabel(value) {
    const [y, m] = value.split("-").map(Number);
    return `${MONTHS[m - 1]} ${y}`;
}

export function groupTitle(name) {
    const match = (name || "").match(/\d+/);
    return match ? `GRUPO # ${match[0]}` : (name || "").toUpperCase();
}

export function toInt(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : Math.max(0, n);
}

// Convierte la fila editada al formato que espera la API
export function toPayload(row) {
    const isPublisher = row.publisher_type === "publicador";
    const hours = isPublisher ? null : toInt(row.hours);
    return {
        student_id: row.student_id,
        publisher_type: row.publisher_type,
        participated: isPublisher ? row.participated ?? null : hours === null ? null : hours > 0,
        hours,
        bible_studies: toInt(row.bible_studies),
        sacred_service_hours: toInt(row.sacred_service_hours),
        observations: (row.observations || "").trim() || null,
        // Solo si se cambió el tipo en la planilla del admin: actualiza Estudiantes
        ...(row._statusChanged ? { pioneer_status: row.pioneer_status || null } : {}),
    };
}

// ¿La persona ya entregó informe este mes?
export function hasReported(row) {
    return row.publisher_type === "publicador"
        ? row.participated !== null && row.participated !== undefined
        : toInt(row.hours) !== null;
}

// Totales del mes: informes, horas y estudios por tipo de publicador.
// Publicadores: cuentan los que participaron (SP). Precursores: los que tienen horas.
// precursores: cuántas personas son regulares, auxiliares indefinidos y de campaña ese mes.
export function computeTotals(rows) {
    const t = {
        publicador: { informes: 0, horas: 0, estudios: 0 },
        auxiliar: { informes: 0, horas: 0, estudios: 0 },
        regular: { informes: 0, horas: 0, estudios: 0 },
        precursores: {
            regular: { personas: 0, informaron: 0 },
            aux_ind: { personas: 0, informaron: 0 },
            aux_camp: { personas: 0, informaron: 0 },
        },
        servicioSagrado: 0,
        noParticiparon: 0,
        sinInforme: 0,
        personas: rows.length,
    };
    rows.forEach((r) => {
        const status = rowStatus(r);
        if (status) {
            t.precursores[status].personas += 1;
            if (hasReported(r)) t.precursores[status].informaron += 1;
        }
        const studies = toInt(r.bible_studies) || 0;
        if (r.publisher_type === "publicador") {
            if (r.participated === true) {
                t.publicador.informes += 1;
                t.publicador.estudios += studies;
            } else if (r.participated === false) {
                t.noParticiparon += 1;
            } else {
                t.sinInforme += 1;
            }
            return;
        }
        const hours = toInt(r.hours);
        const bucket = t[r.publisher_type];
        if (!bucket || hours === null) {
            t.sinInforme += 1;
            return;
        }
        bucket.informes += 1;
        bucket.horas += hours;
        bucket.estudios += studies;
        t.servicioSagrado += toInt(r.sacred_service_hours) || 0;
    });
    t.total = {
        informes: t.publicador.informes + t.auxiliar.informes + t.regular.informes,
        horas: t.auxiliar.horas + t.regular.horas,
        estudios: t.publicador.estudios + t.auxiliar.estudios + t.regular.estudios,
    };
    return t;
}
