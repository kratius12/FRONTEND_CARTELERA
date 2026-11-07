// src/admin/adminNav.js
// Opciones del menú lateral del panel Admin, agrupadas por categoría.
// Son las mismas opciones que ya tenía el panel; solo se ordenan en grupos.
// type "tab": cambia la vista dentro de /admin · type "link": abre otra página en una pestaña nueva.

export const NAV_SECTIONS = [
    {
        title: "Programas",
        items: [
            { key: "published", label: "Publicados", icon: "book", type: "tab" },
            { key: "staging", label: "Temporal", icon: "clock", type: "tab" },
            { key: "new", label: "Nuevo Programa", icon: "plusSquare", type: "tab" },
        ],
    },
    {
        title: "Personas",
        items: [
            { key: "users", label: "Gestión Usuarios", icon: "shieldCheck", type: "tab" },
            { key: "students", label: "Estudiantes", icon: "users", type: "tab" },
            { key: "groups", label: "Grupos", icon: "grid", type: "tab" },
        ],
    },
    {
        title: "Asignaciones",
        items: [
            { key: "schedule", label: "Programación", icon: "calendar", type: "tab" },
            { key: "cleaning", label: "Aseo", icon: "sparkles", type: "tab" },
            { key: "micro", label: "Micrófonos", icon: "mic", type: "tab" },
            { key: "attendant", label: "Acomodadores", icon: "door", type: "tab" },
        ],
    },
    {
        title: "Informes",
        items: [
            { key: "reports", label: "Informes de predicación", icon: "fileText", type: "tab" },
        ],
    },
    {
        title: "Impresión",
        items: [
            { key: "print", label: "Ver Imprimible", icon: "printer", type: "link", href: "/imprimir" },
            { key: "print-groups", label: "Imprimir Grupos", icon: "files", type: "link", href: "/imprimir-grupos" },
        ],
    },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items.map((item) => ({ ...item, section: s.title })));

export const TAB_KEYS = NAV_ITEMS.filter((i) => i.type === "tab").map((i) => i.key);

export function findNavItem(key) {
    return NAV_ITEMS.find((i) => i.key === key) || null;
}

// Búsqueda sin tildes ni mayúsculas: "programacion" encuentra "Programación"
export function normalize(text) {
    return (text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function searchNav(query) {
    const q = normalize(query);
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter((i) => normalize(`${i.label} ${i.section}`).includes(q));
}

// Nombre visible e iniciales a partir del correo ("ana.gomez@…" → "Ana Gomez", "AG")
export function personFromEmail(email = "") {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    return {
        name: local ? local.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : (email || "Administrador"),
        initials: (local || email || "A").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(""),
    };
}

// Datos del usuario autenticado leídos del token (el backend guarda sub = correo y role)
export function userFromToken(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        const email = payload.sub || "";
        return {
            email,
            ...personFromEmail(email),
            role: payload.role === "admin" ? "Administrador" : (payload.role || "Administrador"),
        };
    } catch {
        return { email: "", name: "Administrador", role: "Administrador", initials: "A" };
    }
}
