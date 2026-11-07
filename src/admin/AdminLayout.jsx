// src/admin/AdminLayout.jsx
// Estructura visual del panel Admin: menú lateral por categorías, barra superior
// (buscador de secciones, tema, avisos y usuario) y el panel de contenido.
// Lo usan /admin, /informes y /informes/precursores/:tipo.
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import Icon from "./AdminIcons";
import { NAV_SECTIONS, searchNav, userFromToken } from "./adminNav";
import "./AdminGlass.css";

const API = import.meta.env.VITE_API_URL || "";
const DRAWER_QUERY = "(max-width: 992px)";

const isDrawerViewport = () => window.matchMedia?.(DRAWER_QUERY).matches ?? window.innerWidth <= 992;

// Cierra un desplegable al hacer clic fuera o al pulsar Escape
function useDismiss(ref, open, onClose) {
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; });
    useEffect(() => {
        if (!open) return;
        const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) closeRef.current(); };
        const onKey = (e) => { if (e.key === "Escape") closeRef.current(); };
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [ref, open]);
}

export default function AdminLayout({
    activeKey,
    onSelect,
    editingLabel = null,
    refreshKey = 0,
    children,
}) {
    const { token, logout } = useContext(AuthContext);
    const [sidebarOpen, setSidebarOpen] = useState(() => !isDrawerViewport());
    const pending = usePendingStaging(token, refreshKey);
    const scrollRef = useRef(null);
    const viewKey = activeKey === "edit" ? `edit-${editingLabel}` : activeKey;

    // Cada vista empieza arriba
    useEffect(() => {
        scrollRef.current?.scrollTo?.({ top: 0 });
        if (isDrawerViewport()) window.scrollTo({ top: 0 });
    }, [viewKey]);

    // Escape cierra el menú en pantallas pequeñas
    useEffect(() => {
        if (!sidebarOpen) return;
        const onKey = (e) => { if (e.key === "Escape" && isDrawerViewport()) setSidebarOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [sidebarOpen]);

    const select = (key) => {
        onSelect?.(key);
        if (isDrawerViewport()) setSidebarOpen(false);
    };

    return (
        <div className={`adm-glass adm-shell ${sidebarOpen ? "adm-shell--open" : "adm-shell--collapsed"}`}>
            <aside className="adm-sidebar" aria-label="Menú del panel">
                <div className="adm-brand">
                    <span className="adm-brand-mark" aria-hidden="true">
                        <Icon name="layers" size={22} strokeWidth={2} />
                    </span>
                    <span className="adm-brand-text">
                        <strong>Cartelera</strong>
                        <small>Admin Panel</small>
                    </span>
                    <button
                        type="button"
                        className="adm-sidebar-close"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Cerrar menú"
                    >
                        <Icon name="x" size={18} />
                    </button>
                </div>

                <nav className="adm-nav">
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.title} className="adm-nav-section">
                            <span className="adm-nav-heading">{section.title}</span>
                            <ul>
                                {section.items.map((item) => (
                                    <li key={item.key}>
                                        <NavEntry
                                            item={item}
                                            active={activeKey === item.key}
                                            onSelect={select}
                                            count={item.key === "staging" ? pending?.length : 0}
                                        />
                                    </li>
                                ))}
                                {section.title === "Programas" && activeKey === "edit" && editingLabel && (
                                    <li>
                                        <span className="adm-nav-item active is-static" aria-current="page" title={editingLabel}>
                                            <Icon name="edit" className="adm-nav-icon" />
                                            <span className="adm-nav-label">{editingLabel}</span>
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="adm-sidebar-foot">
                    <a className="adm-side-card" href="/" target="_blank" rel="noopener noreferrer" title="Ver cartelera pública">
                        <span className="adm-side-card-icon" aria-hidden="true"><Icon name="monitor" size={18} /></span>
                        <span className="adm-side-card-text">
                            <strong>Cartelera pública</strong>
                            <small>Ver el programa actual</small>
                        </span>
                        <Icon name="external" size={14} className="adm-nav-ext" />
                    </a>
                </div>
            </aside>

            {sidebarOpen && (
                <div className="adm-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
            )}

            <div className="adm-main">
                <header className="adm-topbar">
                    <button
                        type="button"
                        className="adm-icon-btn adm-menu-btn"
                        onClick={() => setSidebarOpen((v) => !v)}
                        aria-label={sidebarOpen ? "Contraer menú" : "Abrir menú"}
                        aria-expanded={sidebarOpen}
                        title={sidebarOpen ? "Contraer menú" : "Abrir menú"}
                    >
                        <Icon name="menu" />
                    </button>

                    <AdminSearch onSelect={select} />

                    <div className="adm-topbar-actions">
                        <AdminThemeToggle />
                        <AdminNotifications pending={pending} onOpenStaging={() => select("staging")} />
                        <UserMenu token={token} onLogout={logout} />
                    </div>
                </header>

                <main className="adm-panel">
                    <div className="adm-panel-scroll" ref={scrollRef}>
                        <div className="adm-view" key={viewKey}>
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function NavEntry({ item, active, onSelect, count }) {
    const body = (
        <>
            <Icon name={item.icon} className="adm-nav-icon" />
            <span className="adm-nav-label">{item.label}</span>
            {item.type === "link" && <Icon name="external" size={14} className="adm-nav-ext" />}
            {count > 0 && <span className="adm-nav-count" aria-label={`${count} sin publicar`}>{count}</span>}
        </>
    );
    if (item.type === "link") {
        return (
            <a className="adm-nav-item" href={item.href} target="_blank" rel="noopener noreferrer" title={item.label}>
                {body}
            </a>
        );
    }
    return (
        <button
            type="button"
            className={`adm-nav-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(item.key)}
            title={item.label}
        >
            {body}
        </button>
    );
}

// Buscador de secciones del panel (Ctrl + K)
function AdminSearch({ onSelect }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(false); // móvil: el campo se despliega
    const [cursor, setCursor] = useState(0);
    const boxRef = useRef(null);
    const inputRef = useRef(null);
    const results = searchNav(query);

    const close = () => { setOpen(false); setExpanded(false); };
    useDismiss(boxRef, open || expanded, close);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setExpanded(true);
                inputRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const choose = (item) => {
        if (!item) return;
        if (item.type === "link") window.open(item.href, "_blank", "noopener,noreferrer");
        else onSelect(item.key);
        setQuery("");
        close();
        inputRef.current?.blur();
    };

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(c + 1, results.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); choose(results[cursor]); }
        else if (e.key === "Escape") { close(); inputRef.current?.blur(); }
    };

    return (
        <div className={`adm-search ${expanded ? "is-expanded" : ""}`} ref={boxRef}>
            <button
                type="button"
                className="adm-icon-btn adm-search-trigger"
                onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 0); }}
                aria-label="Buscar sección"
            >
                <Icon name="search" />
            </button>
            <label className="adm-search-field">
                <Icon name="search" size={18} className="adm-search-icon" />
                <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    placeholder="Buscar sección…"
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(0); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="adm-search-results"
                    aria-autocomplete="list"
                    aria-label="Buscar sección del panel"
                />
                <kbd className="adm-kbd" aria-hidden="true">Ctrl K</kbd>
            </label>
            {open && (
                <ul className="adm-dropdown adm-search-results" id="adm-search-results" role="listbox">
                    {results.length === 0 && <li className="adm-dropdown-empty">No hay secciones con “{query}”.</li>}
                    {results.map((item, i) => (
                        <li key={item.key} role="option" aria-selected={i === cursor}>
                            <button
                                type="button"
                                className={`adm-dropdown-item ${i === cursor ? "is-active" : ""}`}
                                onMouseEnter={() => setCursor(i)}
                                onClick={() => choose(item)}
                            >
                                <span className="adm-dropdown-icon"><Icon name={item.icon} size={18} /></span>
                                <span className="adm-dropdown-text">
                                    <strong>{item.label}</strong>
                                    <small>{item.section}{item.type === "link" ? " · se abre en otra pestaña" : ""}</small>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Programas temporales sin publicar (mismo endpoint de staging que ya usa el panel)
function usePendingStaging(token, refreshKey) {
    const [pending, setPending] = useState(null);
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        fetch(`${API}/api/admin/programs/staging`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled || !Array.isArray(data)) return;
                setPending([...data].sort((a, b) => new Date(a.week_start) - new Date(b.week_start)));
            })
            .catch(() => { /* el aviso es opcional: sin datos no se muestra el contador */ });
        return () => { cancelled = true; };
    }, [token, refreshKey]);
    return pending;
}

function AdminNotifications({ pending, onOpenStaging }) {
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);
    useDismiss(boxRef, open, () => setOpen(false));

    const count = pending?.length || 0;
    const fmt = (d) => new Date(`${String(d).split("T")[0]}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });

    return (
        <div className="adm-pop" ref={boxRef}>
            <button
                type="button"
                className={`adm-icon-btn ${count ? "is-lit" : ""}`}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={count ? `${count} programas temporales sin publicar` : "Avisos"}
                title="Avisos"
            >
                <Icon name="bell" />
                {count > 0 && <span className="adm-dot-badge">{count > 9 ? "9+" : count}</span>}
            </button>
            {open && (
                <div className="adm-dropdown adm-notif" role="dialog" aria-label="Avisos">
                    <div className="adm-dropdown-head">
                        <strong>Avisos</strong>
                        <span>{count ? `${count} pendiente${count === 1 ? "" : "s"}` : "Al día"}</span>
                    </div>
                    {count === 0 ? (
                        <p className="adm-dropdown-empty">No hay programas temporales esperando publicación.</p>
                    ) : (
                        <ul className="adm-notif-list">
                            {pending.slice(0, 5).map((p) => (
                                <li key={p.id}>
                                    <span className="adm-dropdown-icon"><Icon name="clock" size={16} /></span>
                                    <span className="adm-dropdown-text">
                                        <strong>{p.title || "Programa sin título"}</strong>
                                        <small>Semana del {fmt(p.week_start)} · sin publicar</small>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button type="button" className="adm-btn adm-btn--primary adm-btn--block" onClick={() => { setOpen(false); onOpenStaging(); }}>
                        Ir a Temporal
                    </button>
                </div>
            )}
        </div>
    );
}

// Cambio de tema propio del Admin (mismo ThemeContext que el resto de la app)
function AdminThemeToggle() {
    const { isDark, toggleTheme } = useContext(ThemeContext);
    return (
        <button
            type="button"
            className="adm-icon-btn"
            onClick={toggleTheme}
            aria-label={isDark ? "Usar tema claro" : "Usar tema oscuro"}
            title="Cambiar Tema"
        >
            <Icon name={isDark ? "sun" : "moon"} />
        </button>
    );
}

function UserMenu({ token, onLogout }) {
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);
    useDismiss(boxRef, open, () => setOpen(false));
    const user = userFromToken(token);

    return (
        <div className="adm-pop" ref={boxRef}>
            <button
                type="button"
                className="adm-user"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
            >
                <span className="adm-avatar" aria-hidden="true">{user.initials}</span>
                <span className="adm-user-text">
                    <strong>{user.name}</strong>
                    <small>{user.role}</small>
                </span>
                <Icon name="chevronDown" size={16} className="adm-user-caret" />
            </button>
            {open && (
                <div className="adm-dropdown adm-user-menu" role="menu">
                    <div className="adm-user-card">
                        <span className="adm-avatar adm-avatar--lg" aria-hidden="true">{user.initials}</span>
                        <span className="adm-dropdown-text">
                            <strong>{user.name}</strong>
                            <small>{user.email || user.role}</small>
                        </span>
                    </div>
                    <button type="button" className="adm-dropdown-item is-danger" role="menuitem" onClick={onLogout}>
                        <span className="adm-dropdown-icon"><Icon name="logout" size={18} /></span>
                        <span className="adm-dropdown-text"><strong>Cerrar sesión</strong></span>
                    </button>
                </div>
            )}
        </div>
    );
}
