// src/admin/AdminCharts.jsx
// Gráficos ligeros en SVG/CSS para el Admin (sin librerías). Colores en AdminGlass.css:
// --adm-ring y --adm-series-1 (azul/turquesa, validados en claro y oscuro).

const SIZE = 120;
const R = 50;
const STROKE = 11;
const C = 2 * Math.PI * R;

// Anillo de avance de un solo color, con cifras de detalle debajo.
// tiles: [{ label, value }]
export function RingChart({ value, total, centerLabel, tiles = [], ariaLabel }) {
    const ratio = total ? Math.min(1, value / total) : 0;
    const pct = Math.round(ratio * 100);
    const dash = ratio * C;
    return (
        <div className="adm-ring">
            <div className="adm-ring-figure">
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel || `${pct} % ${centerLabel}`}>
                    <circle className="adm-ring-track" cx={SIZE / 2} cy={SIZE / 2} r={R} strokeWidth={STROKE} fill="none" />
                    {ratio > 0 && (
                        <circle
                            className="adm-ring-value"
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={R}
                            fill="none"
                            strokeWidth={STROKE}
                            strokeLinecap="round"
                            strokeDasharray={`${dash} ${C}`}
                            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                        >
                            <title>{`${value} de ${total} (${pct} %)`}</title>
                        </circle>
                    )}
                </svg>
                <div className="adm-ring-center" aria-hidden="true">
                    <strong>{pct}%</strong>
                    <span>{centerLabel}</span>
                </div>
            </div>
            {tiles.length > 0 && (
                <div className="adm-ring-tiles">
                    {tiles.map((t) => (
                        <div key={t.label} className="adm-ring-tile">
                            <strong>{t.value}</strong>
                            <span>{t.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Columnas verticales de una sola serie en porcentaje (0–100 %).
// columns: [{ key, label, value (0..1), display, tip }]
export function ColumnChart({ columns, ariaLabel }) {
    const ticks = [1, 0.5, 0];
    return (
        <div className="adm-columns" role="group" aria-label={ariaLabel}>
            <div className="adm-columns-axis" aria-hidden="true">
                {ticks.map((t) => (
                    <span key={t} style={{ bottom: `${t * 100}%` }}>{Math.round(t * 100)}%</span>
                ))}
            </div>
            <div className="adm-columns-plot">
                <div className="adm-columns-grid" aria-hidden="true">
                    {ticks.map((t) => <i key={t} style={{ bottom: `${t * 100}%` }} />)}
                </div>
                {columns.map((c) => (
                    <div key={c.key} className="adm-col" tabIndex={0} aria-label={c.tip} style={{ "--adm-col": Math.max(0, Math.min(1, c.value)) }}>
                        <span className="adm-col-tip" aria-hidden="true">{c.tip}</span>
                        <span className="adm-col-value" aria-hidden="true">{c.display}</span>
                        <span className="adm-col-bar" />
                        <span className="adm-col-label" aria-hidden="true">{c.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
