// src/admin/adminNav.js
// Menú del panel Admin: cada opción tiene su propia ruta y el módulo que exige.
// type "page": ruta del panel · type "link": abre otra página en una pestaña nueva.
// perm: módulo necesario (ver app/core/permissions.py en el backend); sin perm, la ve cualquiera.

export const MODULES = [
    { key: "programs", label: "Programas", hint: "Publicados, temporales y nuevo programa" },
    { key: "students", label: "Estudiantes", hint: "Datos, privilegios y precursorado" },
    { key: "groups", label: "Grupos", hint: "Tablero de grupos e impresión de grupos" },
    { key: "assignments", label: "Asignaciones", hint: "Programación, aseo, micrófonos y acomodadores" },
    { key: "weekend", label: "Fin de semana", hint: "Presidente y lector del estudio de La Atalaya" },
    { key: "sound", label: "Sonido", hint: "Audio y video, micrófonos y Zoom" },
    { key: "reports", label: "Informes de predicación", hint: "Planilla mensual y seguimiento de precursores" },
    { key: "users", label: "Usuarios y permisos", hint: "Aprobar solicitudes y asignar accesos" },
];

export const NAV_SECTIONS = [
    {
        title: "Programas",
        items: [
            { key: "published", label: "Publicados", icon: "book", type: "page", path: "/admin/programas", perm: "programs" },
            { key: "staging", label: "Temporal", icon: "clock", type: "page", path: "/admin/programas/temporales", perm: "programs" },
            { key: "new", label: "Nuevo Programa", icon: "plusSquare", type: "page", path: "/admin/programas/nuevo", perm: "programs" },
        ],
    },
    {
        title: "Personas",
        items: [
            { key: "users", label: "Gestión Usuarios", icon: "shieldCheck", type: "page", path: "/admin/usuarios", perm: "users" },
            { key: "students", label: "Estudiantes", icon: "users", type: "page", path: "/admin/estudiantes", perm: "students" },
            { key: "groups", label: "Grupos", icon: "grid", type: "page", path: "/admin/grupos", perm: "groups" },
        ],
    },
    {
        title: "Asignaciones",
        items: [
            { key: "schedule", label: "Programación", icon: "calendar", type: "page", path: "/admin/programacion", perm: "assignments" },
            { key: "cleaning", label: "Aseo", icon: "sparkles", type: "page", path: "/admin/aseo", perm: "assignments" },
            { key: "micro", label: "Micrófonos", icon: "mic", type: "page", path: "/admin/microfonos", perm: "assignments" },
            { key: "attendant", label: "Acomodadores", icon: "door", type: "page", path: "/admin/acomodadores", perm: "assignments" },
            { key: "weekend", label: "Fin de semana", icon: "bookOpen", type: "page", path: "/admin/fin-de-semana", perm: "weekend" },
            { key: "sound", label: "Sonido", icon: "headphones", type: "page", path: "/admin/sonido", perm: "sound" },
        ],
    },
    {
        title: "Informes",
        items: [
            { key: "reports", label: "Informes de predicación", icon: "fileText", type: "page", path: "/admin/informes", perm: "reports" },
        ],
    },
    {
        title: "Impresión",
        items: [
            { key: "print", label: "Ver Imprimible", icon: "printer", type: "link", href: "/imprimir" },
            { key: "print-groups", label: "Imprimir Grupos", icon: "files", type: "link", href: "/imprimir-grupos", perm: "groups" },
        ],
    },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items.map((item) => ({ ...item, section: s.title })));

const PAGES_BY_DEPTH = NAV_ITEMS.filter((i) => i.type === "page").sort((a, b) => b.path.length - a.path.length);

// Opción del menú que corresponde a una ruta (la más específica: /admin/programas/temporales antes que /admin/programas)
export function navKeyForPath(pathname) {
    if (/^\/admin\/programas\/temporales\/[^/]+\/editar/.test(pathname)) return "staging";
    if (/^\/admin\/programas\/[^/]+\/editar/.test(pathname)) return "published";
    const exact = PAGES_BY_DEPTH.find((i) => pathname === i.path);
    if (exact) return exact.key;
    return PAGES_BY_DEPTH.find((i) => pathname.startsWith(`${i.path}/`))?.key || null;
}

// Secciones y opciones que el usuario puede ver según sus permisos
export function visibleSections(hasPermission) {
    return NAV_SECTIONS
        .map((s) => ({ ...s, items: s.items.filter((i) => !i.perm || hasPermission(i.perm)) }))
        .filter((s) => s.items.length > 0);
}

// Primera página del panel a la que el usuario tiene acceso (para /admin)
export function firstAllowedPath(hasPermission) {
    return NAV_ITEMS.find((i) => i.type === "page" && hasPermission(i.perm))?.path || null;
}

// Búsqueda sin tildes ni mayúsculas: "programacion" encuentra "Programación"
export function normalize(text) {
    return (text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function searchNav(query, hasPermission) {
    const q = normalize(query);
    const items = NAV_ITEMS.filter((i) => !i.perm || hasPermission(i.perm));
    if (!q) return items;
    return items.filter((i) => normalize(`${i.label} ${i.section}`).includes(q));
}

// Nombre visible e iniciales a partir del correo ("ana.gomez@…" → "Ana Gomez", "AG")
export function personFromEmail(email = "") {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    return {
        name: local ? local.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : (email || "Administrador"),
        initials: (local || email || "A").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(""),
    };
}

// Nombre, iniciales y rol para mostrar a un usuario (usa su nombre si lo tiene)
export function displayUser(user) {
    if (!user) return { name: "", initials: "", email: "", role: "" };
    const fromEmail = personFromEmail(user.email);
    const name = user.full_name || fromEmail.name;
    const initials = user.full_name
        ? user.full_name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
        : fromEmail.initials;
    return { name, initials, email: user.email, role: user.is_superadmin ? "Superadministrador" : "Administrador" };
}
