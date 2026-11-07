// src/admin/AdminIcons.jsx
// Iconos de línea del panel Admin (SVG propios, sin dependencias). Uso: <Icon name="users" />
const PATHS = {
    menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
    x: ["M6 6l12 12", "M18 6L6 18"],
    search: ["M20 20l-4.2-4.2", { circle: [11, 11, 7] }],
    bell: ["M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z", "M10 20.5a2.2 2.2 0 0 0 4 0"],
    sun: [{ circle: [12, 12, 4] }, "M12 2.5v2", "M12 19.5v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2.5 12h2", "M19.5 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"],
    moon: ["M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"],
    logout: ["M9 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H9", "M15.5 16l4-4-4-4", "M19.5 12H9"],
    book: ["M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z", "M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3", "M9 7.5h6"],
    clock: [{ circle: [12, 12, 9] }, "M12 7.5V12l3 2"],
    plusSquare: [{ rect: [3.5, 3.5, 17, 17, 4] }, "M12 8.5v7", "M8.5 12h7"],
    plus: ["M12 5v14", "M5 12h14"],
    edit: ["M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z", "M13.5 6.5l4 4"],
    shieldCheck: ["M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6z", "M9 12l2 2 4-4"],
    users: [{ circle: [9, 8, 3.5] }, "M3 20a6 6 0 0 1 12 0", "M16 4.6a3.5 3.5 0 0 1 0 6.8", "M17.5 14.4A5.5 5.5 0 0 1 21 20"],
    user: [{ circle: [12, 8, 4] }, "M4 21a8 8 0 0 1 16 0"],
    userCheck: [{ circle: [9, 8, 4] }, "M2 21a7 7 0 0 1 14 0", "M16 11l2 2 4-4"],
    userX: [{ circle: [9, 8, 4] }, "M2 21a7 7 0 0 1 14 0", "M17 8.5l4 4", "M21 8.5l-4 4"],
    grid: [{ rect: [3.5, 3.5, 7, 7, 2] }, { rect: [13.5, 3.5, 7, 7, 2] }, { rect: [3.5, 13.5, 7, 7, 2] }, { rect: [13.5, 13.5, 7, 7, 2] }],
    calendar: [{ rect: [3.5, 5, 17, 15.5, 3] }, "M3.5 10h17", "M8 3v4", "M16 3v4"],
    sparkles: ["M11 3.5l1.7 4.8 4.8 1.7-4.8 1.7L11 16.5l-1.7-4.8L4.5 10l4.8-1.7z", "M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"],
    mic: [{ rect: [9, 3, 6, 11, 3] }, "M5.5 11a6.5 6.5 0 0 0 13 0", "M12 17.5V21"],
    door: ["M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21", "M3.5 21h17", "M14.5 12h.01"],
    fileText: ["M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8z", "M14 3v5h5", "M9 13h6", "M9 17h4"],
    printer: ["M7 9V3.5h10V9", "M6.5 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1.5", { rect: [7, 14, 10, 7, 1.5] }],
    files: ["M8 7V5.5A2.5 2.5 0 0 1 10.5 3H16l4 4v9.5a2.5 2.5 0 0 1-2.5 2.5H16", "M4 9.5A2.5 2.5 0 0 1 6.5 7H12l4 4v7.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 18.5z"],
    external: ["M14 4h6v6", "M20 4l-9 9", "M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"],
    eye: ["M2.5 12S6 5 12 5s9.5 7 9.5 7S18 19 12 19 2.5 12 2.5 12z", { circle: [12, 12, 3] }],
    trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"],
    upload: ["M12 15V4", "M7 9l5-5 5 5", "M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"],
    globe: [{ circle: [12, 12, 9] }, "M3 12h18", "M12 3a14 14 0 0 1 0 18", "M12 3a14 14 0 0 0 0 18"],
    refresh: ["M20 11a8 8 0 0 0-14.7-4.3L4 8", "M4 4v4h4", "M4 13a8 8 0 0 0 14.7 4.3L20 16", "M20 20v-4h-4"],
    send: ["M21 3L10 14", "M21 3l-7 18-4-7-7-4z"],
    check: ["M5 12.5l4.5 4.5L19 7.5"],
    alert: ["M10.3 4.2L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z", "M12 9.5v4", "M12 17h.01"],
    chevronDown: ["M6 9l6 6 6-6"],
    chevronLeft: ["M15 6l-6 6 6 6"],
    chevronRight: ["M9 6l6 6-6 6"],
    monitor: [{ rect: [3, 4, 18, 12.5, 2.5] }, "M8 20.5h8", "M12 16.5v4"],
    layers: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5", "M3 17.5l9 5 9-5"],
    trendingUp: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
    link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
    star: ["M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"],
    award: [{ circle: [12, 9, 5.5] }, "M8.7 13.4L7.5 21l4.5-2.6 4.5 2.6-1.2-7.6"],
    inbox: ["M3 13h5l1.5 3h5l1.5-3h5", "M5.5 5h13l2.5 8v5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V13z"],
    sliders: ["M4 6h9", "M17 6h3", "M4 12h3", "M11 12h9", "M4 18h11", "M19 18h1", { circle: [15, 6, 2] }, { circle: [9, 12, 2] }, { circle: [17, 18, 2] }],
    history: ["M3.5 12a8.5 8.5 0 1 0 2.5-6", "M3.5 4v4h4", "M12 8v4.5l3 1.8"],
    keyboard: [{ rect: [2.5, 6, 19, 12, 2.5] }, "M6.5 10h.01", "M10 10h.01", "M13.5 10h.01", "M17 10h.01", "M7.5 14h9"],
};

function renderPart(part, i) {
    if (typeof part === "string") return <path key={i} d={part} />;
    if (part.circle) {
        const [cx, cy, r] = part.circle;
        return <circle key={i} cx={cx} cy={cy} r={r} />;
    }
    const [x, y, width, height, rx] = part.rect;
    return <rect key={i} x={x} y={y} width={width} height={height} rx={rx} />;
}

export default function Icon({ name, size = 20, strokeWidth = 1.8, className = "", title }) {
    const parts = PATHS[name];
    if (!parts) return null;
    return (
        <svg
            className={`adm-icon ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={title ? undefined : true}
            role={title ? "img" : undefined}
            focusable="false"
        >
            {title && <title>{title}</title>}
            {parts.map(renderPart)}
        </svg>
    );
}
