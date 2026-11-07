// src/admin/AdminWidgets.jsx
// Piezas visuales reutilizadas por las vistas del Admin: encabezado de página,
// tarjetas de indicadores, diálogo modal, paginación y estados de carga/vacío.
import { useEffect, useRef } from "react";
import Icon from "./AdminIcons";

export function PageHeader({ icon, title, count, subtitle, children }) {
    return (
        <div className="adm-page-head">
            <div className="adm-page-head-main">
                {icon && <span className="adm-page-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>}
                <div>
                    <h2 className="adm-page-title">
                        {title}
                        {count !== undefined && <span className="adm-count">{count}</span>}
                    </h2>
                    {subtitle && <p className="adm-page-sub">{subtitle}</p>}
                </div>
            </div>
            {children && <div className="adm-page-actions">{children}</div>}
        </div>
    );
}

export function StatGrid({ children, label }) {
    return <div className="adm-stats" role="list" aria-label={label}>{children}</div>;
}

// Tarjeta de indicador: icono en círculo, cifra grande, etiqueta y detalle.
// trend: { dir: "up" | "down" | "flat", text } — solo cuando el dato existe.
export function StatCard({ icon, label, value, hint, tone = "teal", trend, textValue = false }) {
    return (
        <div className={`adm-stat adm-stat--${tone}`} role="listitem">
            <div className="adm-stat-top">
                <span className="adm-stat-icon" aria-hidden="true"><Icon name={icon} size={18} /></span>
                {trend && (
                    <span className={`adm-trend adm-trend--${trend.dir}`}>
                        {trend.dir !== "flat" && <Icon name="trendingUp" size={13} />}
                        {trend.text}
                    </span>
                )}
            </div>
            <strong className={`adm-stat-value ${textValue ? "adm-stat-value--text" : ""}`}>{value}</strong>
            <span className="adm-stat-label">{label}</span>
            {hint && <span className="adm-stat-hint">{hint}</span>}
        </div>
    );
}

// Control segmentado: options [{ key, label, count? }]
export function Segmented({ options, value, onChange, label }) {
    return (
        <div className="adm-segmented" role="group" aria-label={label}>
            {options.map((o) => (
                <button
                    key={o.key}
                    type="button"
                    className={value === o.key ? "active" : ""}
                    aria-pressed={value === o.key}
                    onClick={() => onChange(o.key)}
                >
                    {o.label}
                    {o.count !== undefined && <span className="adm-seg-count">{o.count}</span>}
                </button>
            ))}
        </div>
    );
}

// Diálogo modal: fondo desenfocado, Escape y clic fuera lo cierran (si se pasa onClose)
export function Modal({ title, icon, tone, onClose, children, footer, size = "md", labelledBy = "adm-modal-title", dismissOnBackdrop = true }) {
    const panelRef = useRef(null);
    const downOnBackdrop = useRef(false);
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; });

    useEffect(() => {
        const prev = document.activeElement;
        const first = panelRef.current?.querySelector("input, select, textarea, button:not(.adm-modal-x)");
        (first || panelRef.current)?.focus();
        const onKey = (e) => { if (e.key === "Escape") closeRef.current?.(); };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            prev?.focus?.();
        };
    }, []);

    return (
        <div
            className="adm-modal-backdrop"
            onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
            onClick={(e) => {
                if (dismissOnBackdrop && downOnBackdrop.current && e.target === e.currentTarget) onClose?.();
            }}
        >
            <div
                className={`adm-modal adm-modal--${size} ${tone ? `adm-modal--${tone}` : ""}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                ref={panelRef}
                tabIndex={-1}
            >
                <div className="adm-modal-head">
                    {icon && <span className="adm-modal-icon" aria-hidden="true"><Icon name={icon} size={20} /></span>}
                    <h3 id={labelledBy}>{title}</h3>
                    {onClose && (
                        <button type="button" className="adm-icon-btn adm-icon-btn--soft adm-modal-x" onClick={onClose} aria-label="Cerrar">
                            <Icon name="x" size={18} />
                        </button>
                    )}
                </div>
                <div className="adm-modal-body">{children}</div>
                {footer && <div className="adm-modal-foot">{footer}</div>}
            </div>
        </div>
    );
}

export function ConfirmDialog({ title, children, confirmLabel = "Sí, Eliminar", onConfirm, onCancel }) {
    return (
        <Modal
            title={title}
            icon="alert"
            tone="danger"
            size="sm"
            onClose={onCancel}
            footer={(
                <>
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel}>Cancelar</button>
                    <button type="button" className="adm-btn adm-btn--danger" onClick={onConfirm}>
                        <Icon name="trash" size={16} /> {confirmLabel}
                    </button>
                </>
            )}
        >
            {children}
        </Modal>
    );
}

export function Pager({ page, total, onChange, compact = false, children }) {
    const pages = total || 1;
    return (
        <div className={`adm-pager ${compact ? "adm-pager--compact" : ""}`}>
            {children && <div className="adm-pager-extra">{children}</div>}
            <div className="adm-pager-nav">
                <button
                    type="button"
                    className="adm-btn adm-btn--ghost adm-btn--sm"
                    disabled={page <= 1}
                    onClick={() => onChange(page - 1)}
                    aria-label="Página anterior"
                >
                    <Icon name="chevronLeft" size={16} />{!compact && " Anterior"}
                </button>
                <span className="adm-pager-info">{compact ? `${page} / ${pages}` : `Página ${page} de ${pages}`}</span>
                <button
                    type="button"
                    className="adm-btn adm-btn--ghost adm-btn--sm"
                    disabled={page >= pages}
                    onClick={() => onChange(page + 1)}
                    aria-label="Página siguiente"
                >
                    {!compact && "Siguiente "}<Icon name="chevronRight" size={16} />
                </button>
            </div>
        </div>
    );
}

export function Loading({ children = "Cargando…" }) {
    return (
        <div className="adm-loading" role="status">
            <span className="adm-spinner" aria-hidden="true" />
            <span>{children}</span>
        </div>
    );
}

export function EmptyState({ icon = "inbox", title, children }) {
    return (
        <div className="adm-empty">
            <span className="adm-empty-icon" aria-hidden="true"><Icon name={icon} size={26} /></span>
            {title && <strong>{title}</strong>}
            {children && <p>{children}</p>}
        </div>
    );
}

export function ErrorNote({ children }) {
    return (
        <div className="adm-alert adm-alert--error" role="alert">
            <Icon name="alert" size={18} />
            <span>{children}</span>
        </div>
    );
}

// Nombre con sus iniciales en un círculo (o un guion si no hay persona asignada)
export function PersonCell({ name, fallback = "-" }) {
    if (!name) return <span className="adm-muted">{fallback}</span>;
    const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
    return (
        <span className="adm-person">
            <span className="adm-avatar adm-avatar--sm" aria-hidden="true">{initials}</span>
            <span>{name}</span>
        </span>
    );
}
