// src/admin/studentPickerUtils.js
// Ayudas del selector de estudiantes (StudentPicker): comparar nombres y validar el campo.

export const normalizeName = (text) =>
    (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const allowedFor = (student, menOnly) => !menOnly || student.gender !== 0;

/** Estudiante con ese nombre (sin importar tildes ni mayúsculas), o null. */
export function findStudent(students, name) {
    const key = normalizeName(name);
    if (!key) return null;
    return students.find((s) => normalizeName(s.name) === key) || null;
}

/** Por qué el nombre no sirve para el campo, o "" si está bien (o vacío). */
export function pickerProblem(students, name, menOnly = false) {
    const text = (name || "").trim();
    if (!text) return "";
    if (text.includes("❌")) return "Sin asignar: elige un nombre de la lista.";
    const student = findStudent(students, text);
    if (!student) return `«${text}» no está en Estudiantes. Elige un nombre de la lista.`;
    if (!allowedFor(student, menOnly)) return `${student.name} es hermana; esta parte la tiene un hermano.`;
    return "";
}
