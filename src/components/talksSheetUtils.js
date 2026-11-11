// src/components/talksSheetUtils.js
// Meses de Conferencias (los usan /imprimir y el panel).

export const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "2026-11" del mes de la fecha
export function monthKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// "2026-11" → "noviembre 2026"
export function monthLabel(key) {
    const [y, m] = key.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
}

// "2026-11" ± n meses
export function shiftMonth(key, n) {
    const [y, m] = key.split("-").map(Number);
    return monthKey(new Date(y, m - 1 + n, 1));
}

export function isMonthKey(value) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
}
