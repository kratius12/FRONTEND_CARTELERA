// src/components/weekendSheetUtils.js
// Fechas y PDF de la hoja del Fin de semana (la usan /imprimir y el panel).

export const WEEKEND_TITLE = "Programación para el estudio de la atalaya";

const MONTHS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

export function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "2026-08-15" → Date local (sin desfase por zona horaria)
export function fromISO(iso) {
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
}

// Sábado de la semana de la fecha (el domingo pasa al sábado siguiente)
export function upcomingSaturdayISO(from = new Date()) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    return toISO(d);
}

export function isSaturdayISO(iso) {
    return Boolean(iso) && fromISO(iso).getDay() === 6;
}

// "15 DE AGOSTO", como en la hoja
export function sheetDate(iso) {
    const d = fromISO(iso);
    return `${d.getDate()} DE ${MONTHS[d.getMonth()]}`;
}

export function downloadSheetPDF(elementId, filename) {
    const element = document.getElementById(elementId);
    if (!element || !window.html2pdf) return false;
    window.html2pdf().from(element).set({
        margin: [0.8, 0.8, 0.8, 0.8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: "cm", format: "letter", orientation: "portrait" },
    }).save();
    return true;
}
