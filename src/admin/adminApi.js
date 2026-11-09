// src/admin/adminApi.js
// Utilidades para leer las respuestas de la API de acceso y usuarios.

// Mensaje legible de un error de la API:
// - detail: "texto"                   → ese texto
// - detail: { code, message }         → message (errores de login, registro, etc.)
// - detail: [{ msg, loc }] (422)      → el primer error de validación, sin "Value error, "
export function apiErrorMessage(body, fallback = "Ocurrió un error. Inténtalo de nuevo.") {
    const detail = body?.detail;
    if (!detail) return fallback;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
        const first = detail[0];
        const msg = (first?.msg || "").replace(/^Value error, /, "");
        if (first?.loc?.includes("email")) return "Escribe un correo electrónico válido.";
        return msg || fallback;
    }
    return detail.message || fallback;
}

export function apiErrorCode(body) {
    const detail = body?.detail;
    return detail && typeof detail === "object" && !Array.isArray(detail) ? detail.code : null;
}

export async function readJson(res) {
    try {
        return await res.json();
    } catch {
        return {};
    }
}

// Reglas de contraseña (las mismas que valida el backend)
export function passwordProblem(password) {
    if (password.length < 8) return "Usa al menos 8 caracteres.";
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) || !/\d/.test(password)) return "Combina letras y números.";
    return null;
}
