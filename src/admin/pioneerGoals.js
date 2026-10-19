// src/admin/pioneerGoals.js
// Metas de los precursores y cálculos del seguimiento (vista /informes/precursores/:tipo).
// En todas las metas se suman las horas de predicación y las de servicio sagrado.

export const GOALS = {
    regular: { year: 600, month: 50 }, // 600 h en el año de servicio (50 h por mes)
    aux_ind: { month: 30 },            // se evalúa cada mes
    aux_camp: { month: 15 },           // se evalúa en el mes de la campaña
};

export const CATEGORIES = [
    { slug: "regulares", status: "regular", title: "Precursores regulares", short: "Regulares", one: "precursor regular" },
    { slug: "indefinidos", status: "aux_ind", title: "Precursores auxiliares indefinidos", short: "Aux. indefinidos", one: "auxiliar indefinido" },
    { slug: "campana", status: "aux_camp", title: "Precursores auxiliares de campaña", short: "Aux. de campaña", one: "auxiliar de campaña" },
];

export const categoryBySlug = (slug) => CATEGORIES.find((c) => c.slug === slug);
export const slugForStatus = (status) => CATEGORIES.find((c) => c.status === status)?.slug;

const isSet = (v) => v !== null && v !== undefined;

// ¿Hay informe ese mes? (horas o servicio sagrado anotados)
export function hasMonthReport(m) {
    return isSet(m.hours) || isSet(m.sacred_service_hours);
}

export function monthTotal(m) {
    return (m.hours || 0) + (m.sacred_service_hours || 0);
}

// Casillas de los 12 meses para una categoría.
// state: off (no era de esta categoría) · future (después del mes elegido) · planned (asignado más adelante)
//        missing (sin informe) · done (regular con informe) · met / unmet (auxiliar cumplió / no cumplió)
function monthCells(person, status, untilIdx) {
    const goal = GOALS[status].month;
    return person.months.map((m, i) => {
        const inCategory = m.status === status;
        const cell = { month: m.month, inCategory, hours: m.hours, sacred: m.sacred_service_hours, total: monthTotal(m) };
        if (i > untilIdx) {
            cell.state = inCategory && m.saved ? "planned" : "future";
            return cell;
        }
        if (!inCategory) return { ...cell, state: "off" };
        if (!hasMonthReport(m)) return { ...cell, state: "missing" };
        if (status === "regular") return { ...cell, state: "done", reported: true };
        const met = cell.total >= goal;
        return { ...cell, state: met ? "met" : "unmet", reported: true, short: met ? 0 : goal - cell.total };
    });
}

// Precursor regular: meta anual de 600 h, al día si lleva 50 h por cada mes como regular
export function evaluateRegular(person, untilIdx) {
    const { month: perMonth } = GOALS.regular;
    const cells = monthCells(person, "regular", untilIdx);
    const counted = cells.filter((c) => c.inCategory && c.state !== "future" && c.state !== "planned");
    const reported = counted.filter((c) => c.reported);
    const horas = reported.reduce((s, c) => s + (c.hours || 0), 0);
    const sagrado = reported.reduce((s, c) => s + (c.sacred || 0), 0);
    const total = horas + sagrado;

    const isCurrent = person.months[untilIdx]?.status === "regular";
    const restantes = isCurrent ? person.months.length - 1 - untilIdx : 0;
    const metaFecha = perMonth * counted.length;
    const metaReportada = perMonth * reported.length;
    const metaAnual = perMonth * (counted.length + restantes);
    const diferencia = total - metaFecha;
    const faltanParaMeta = Math.max(0, metaAnual - total);
    const porMes = restantes > 0 && faltanParaMeta > 0 ? Math.ceil(faltanParaMeta / restantes) : null;
    const pendientes = counted.filter((c) => !c.reported).map((c) => c.month);

    // Va mal: ya está atrasado con los meses informados. Pendiente: solo le falta entregar informe.
    let estado = "bien";
    if (diferencia < 0) estado = total < metaReportada ? "mal" : "pendiente";

    return {
        cells, isCurrent, meses: counted.length, horas, sagrado, total,
        metaFecha, metaAnual, diferencia, faltanParaMeta, porMes, restantes, pendientes, estado,
        severidad: diferencia < 0 ? -diferencia : 0,
    };
}

// Auxiliar (indefinido o de campaña): se evalúa cada mes contra su meta mensual
export function evaluateMonthly(person, status, untilIdx) {
    const cells = monthCells(person, status, untilIdx);
    const counted = cells.filter((c) => c.inCategory && ["missing", "met", "unmet"].includes(c.state));
    const reported = counted.filter((c) => c.reported);
    const unmet = counted.filter((c) => c.state === "unmet");
    const pendientes = counted.filter((c) => c.state === "missing").map((c) => c.month);
    const total = reported.reduce((s, c) => s + c.total, 0);
    const planned = cells.filter((c) => c.state === "planned").map((c) => c.month);

    let estado = "bien";
    if (unmet.length) estado = "mal";
    else if (pendientes.length) estado = "pendiente";

    return {
        cells,
        isCurrent: person.months[untilIdx]?.status === status,
        meses: counted.length,
        evaluados: reported.length,
        cumplidos: reported.length - unmet.length,
        noCumplidos: unmet,
        pendientes,
        planned,
        total,
        promedio: reported.length ? Math.round(total / reported.length) : null,
        estado,
        severidad: unmet.length,
    };
}

const ORDER = { mal: 0, pendiente: 1, bien: 2 };

// Personas de una categoría con su evaluación, ordenadas: primero quienes van mal.
// upcoming: quienes solo tienen la categoría asignada para meses posteriores (campañas).
export function evaluateCategory(data, status) {
    const untilIdx = data.months.indexOf(data.until);
    const rows = [];
    const upcoming = [];
    data.people.forEach((person) => {
        const ev = status === "regular" ? evaluateRegular(person, untilIdx) : evaluateMonthly(person, status, untilIdx);
        if (ev.meses > 0) rows.push({ person, ev });
        else if (ev.planned?.length) upcoming.push({ person, months: ev.planned });
    });
    rows.sort((a, b) =>
        ORDER[a.ev.estado] - ORDER[b.ev.estado]
        || b.ev.severidad - a.ev.severidad
        || a.person.name.localeCompare(b.person.name, "es"),
    );
    const count = (e) => rows.filter((r) => r.ev.estado === e).length;
    return {
        rows,
        upcoming,
        current: rows.filter((r) => r.ev.isCurrent).length,
        bien: count("bien"),
        mal: count("mal"),
        pendiente: count("pendiente"),
        mesesSinCumplir: rows.reduce((s, r) => s + (r.ev.noCumplidos?.length || 0), 0),
    };
}

// Cuántos tienen cada precursorado en el mes elegido (como las tarjetas del resumen)
export function currentCounts(data) {
    const idx = data.months.indexOf(data.until);
    const counts = { regular: 0, aux_ind: 0, aux_camp: 0 };
    data.people.forEach((p) => {
        const s = p.months[idx]?.status;
        if (s) counts[s] += 1;
    });
    return counts;
}
