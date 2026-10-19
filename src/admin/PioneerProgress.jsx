// src/admin/PioneerProgress.jsx
// Seguimiento de metas de un tipo de precursor: regulares (600 h al año), auxiliares
// indefinidos (30 h cada mes) y auxiliares de campaña (15 h en el mes de la campaña).
import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { MonthPicker } from "./PreachingReportsParts";
import { MONTHS, currentServiceYear, groupTitle, monthLabel } from "./preachingReportsUtils";
import { CATEGORIES, GOALS, currentCounts, evaluateCategory } from "./pioneerGoals";
import "./PreachingReports.css";
import "./PioneerProgress.css";

const API = import.meta.env.VITE_API_URL || "";

const shortMonth = (value) => MONTHS[Number(value.split("-")[1]) - 1].slice(0, 3);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function monthList(values) {
    const labels = values.map(monthLabel);
    return labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}

export default function PioneerProgress({ category, month, onMonthChange }) {
    const { token, logout } = useContext(AuthContext);
    const [result, setResult] = useState({ month: null, data: null, error: "" });
    const [filterState, setFilterState] = useState({ slug: category.slug, value: "todos" });

    useEffect(() => {
        let cancelled = false;
        fetch(`${API}/api/admin/preaching-reports/pioneers?month=${month}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (res.status === 401 || res.status === 403) {
                    logout();
                    throw new Error("Sesión expirada");
                }
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "No se pudo cargar el seguimiento");
                if (!cancelled) setResult({ month, data: body, error: "" });
            })
            .catch((err) => { if (!cancelled) setResult({ month, data: null, error: err.message }); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, token]);

    const loading = result.month !== month;
    const data = loading ? null : result.data;
    const summary = data ? evaluateCategory(data, category.status) : null;
    const counts = data ? currentCounts(data) : null;
    // Al cambiar de tipo, el filtro vuelve a "Todos"
    const filter = filterState.slug === category.slug ? filterState.value : "todos";
    const setFilter = (value) => setFilterState({ slug: category.slug, value });

    const isRegular = category.status === "regular";
    const goal = GOALS[category.status];
    const goalText = isRegular
        ? `Meta: ${goal.year} h en el año de servicio (${goal.month} h por cada mes como precursor regular).`
        : `Meta: ${goal.month} h cada mes como ${category.one}; se evalúa mes a mes.`;

    const filters = summary ? [
        { key: "todos", n: summary.rows.length, label: "en total" },
        { key: "mal", n: summary.mal, label: isRegular ? (summary.mal === 1 ? "va mal" : "van mal") : (summary.mal === 1 ? "no cumplió algún mes" : "no cumplieron algún mes") },
        { key: "pendiente", n: summary.pendiente, label: "con informe pendiente" },
        { key: "bien", n: summary.bien, label: isRegular ? (summary.bien === 1 ? "va bien" : "van bien") : (summary.bien === 1 ? "cumplió todo" : "cumplieron todo") },
    ] : [];
    const visible = summary ? summary.rows.filter((r) => filter === "todos" || r.ev.estado === filter) : [];

    return (
        <div className="pr-page pp-page fade-in">
            <div className="pr-header">
                <div>
                    <Link to={`/informes?mes=${month}`} className="pp-back">← Planilla de informes</Link>
                    <h2 className="pr-title">{category.title}</h2>
                    <p className="pr-subtitle">
                        Año de servicio {data?.service_year ?? currentServiceYear()}, calculado hasta <strong>{monthLabel(month)}</strong>.
                    </p>
                </div>
                <div className="pr-toolbar">
                    <MonthPicker month={month} onChange={onMonthChange} label="Calcular hasta el mes" />
                </div>
            </div>

            <nav className="pp-tabs" aria-label="Tipo de precursor">
                {CATEGORIES.map((c) => (
                    <Link
                        key={c.slug}
                        to={`/informes/precursores/${c.slug}?mes=${month}`}
                        className={`pp-tab pp-tab--${c.status} ${c.slug === category.slug ? "active" : ""}`}
                        aria-current={c.slug === category.slug ? "page" : undefined}
                    >
                        {c.short}
                        {counts && <span className="pp-tab-count">{counts[c.status]}</span>}
                    </Link>
                ))}
            </nav>

            <p className="pp-goal">
                {goalText} Se suman las horas de predicación y las de servicio sagrado.
            </p>

            {loading && <div className="admin-status">Cargando seguimiento…</div>}
            {!loading && result.error && <div className="admin-status error">{result.error}</div>}

            {summary && (
                <>
                    <p className="pp-overview">
                        <strong>{summary.current}</strong> {summary.current === 1 ? category.one : category.title.toLowerCase()} en {monthLabel(month)}
                        {summary.rows.length !== summary.current && <> · {summary.rows.length} en lo que va del año de servicio</>}
                        {!isRegular && <> · <strong>{plural(summary.mesesSinCumplir, "mes", "meses")}</strong> sin cumplir en total</>}
                    </p>

                    {summary.rows.length > 0 && (
                        <div className="pp-filters" role="group" aria-label="Filtrar">
                            {filters.map((f) => (
                                <button
                                    key={f.key}
                                    type="button"
                                    className={`pp-filter pp-filter--${f.key} ${filter === f.key ? "active" : ""}`}
                                    aria-pressed={filter === f.key}
                                    onClick={() => setFilter(f.key)}
                                    disabled={f.key !== "todos" && f.n === 0}
                                >
                                    <strong>{f.n}</strong> {f.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {summary.rows.length === 0 ? (
                        <div className="admin-status">
                            No hay {category.title.toLowerCase()} en el año de servicio hasta {monthLabel(month)}.
                        </div>
                    ) : (
                        <div className="pp-list">
                            {visible.map(({ person, ev }) => (
                                <PioneerCard key={person.student_id} person={person} ev={ev} category={category} until={month} />
                            ))}
                        </div>
                    )}

                    {summary.upcoming.length > 0 && (
                        <section className="pp-upcoming">
                            <h3 className="pr-summary-title">Asignados para más adelante</h3>
                            <ul>
                                {summary.upcoming.map(({ person, months }) => (
                                    <li key={person.student_id}>
                                        <strong>{person.name}</strong> · {groupTitle(person.group_name)} · {monthList(months)}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {summary.rows.length > 0 && <Legend category={category} />}
                </>
            )}
        </div>
    );
}

function badgeText(ev, isRegular) {
    if (ev.estado === "pendiente") return "Falta informe";
    if (isRegular) {
        if (ev.estado === "mal") return `Va mal · le faltan ${-ev.diferencia} h`;
        return ev.diferencia > 0 ? `Va bien · +${ev.diferencia} h` : "Va bien";
    }
    if (ev.estado === "mal") return `No cumplió ${plural(ev.noCumplidos.length, "mes", "meses")}`;
    return ev.evaluados === 1 ? "Cumplió" : "Cumplió todos los meses";
}

function PioneerCard({ person, ev, category, until }) {
    const isRegular = category.status === "regular";
    return (
        <article className={`pp-card pp-card--${ev.estado}`} aria-label={person.name}>
            <div className="pp-card-head">
                <div className="pp-who">
                    <h3 className="pp-name">{person.name}</h3>
                    <span className="pp-meta">
                        {groupTitle(person.group_name)}
                        {!ev.isCurrent && <> · <em>no es {category.one} en {monthLabel(until)}</em></>}
                    </span>
                </div>
                <span className={`pp-badge pp-badge--${ev.estado}`}>{badgeText(ev, isRegular)}</span>
            </div>

            {isRegular ? <RegularBody ev={ev} until={until} /> : <MonthlyBody ev={ev} />}

            <MonthStrip cells={ev.cells} category={category} />
        </article>
    );
}

function Fig({ label, value, tone, sub }) {
    return (
        <div className={`pp-fig ${tone ? `pp-fig--${tone}` : ""}`}>
            <dt>{label}</dt>
            <dd>{value}{sub && <span className="pp-fig-sub">{sub}</span>}</dd>
        </div>
    );
}

function RegularBody({ ev, until }) {
    const pct = (v) => (ev.metaAnual ? Math.min(100, (v / ev.metaAnual) * 100) : 0);
    return (
        <>
            <div className="pp-progress">
                <div
                    className="pp-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={ev.metaAnual}
                    aria-valuenow={ev.total}
                    aria-label={`${ev.total} de ${ev.metaAnual} horas`}
                >
                    <span className="pp-bar-fill" style={{ width: `${pct(ev.total)}%` }} />
                    <span className="pp-bar-mark" style={{ left: `${pct(ev.metaFecha)}%` }} title={`Meta a ${monthLabel(until)}: ${ev.metaFecha} h`} />
                </div>
                <div className="pp-bar-text">
                    <span><strong>{ev.total} h</strong> de {ev.metaAnual} h</span>
                    <span>Meta a {monthLabel(until)}: {ev.metaFecha} h</span>
                </div>
            </div>
            <dl className="pp-figures">
                <Fig label="Horas" value={`${ev.horas} h`} />
                <Fig label="Servicio sagrado" value={`${ev.sagrado} h`} />
                <Fig
                    label={ev.diferencia >= 0 ? "Adelantado" : "Para ir al día"}
                    value={`${Math.abs(ev.diferencia)} h`}
                    tone={ev.diferencia >= 0 ? "ok" : "bad"}
                />
                <Fig label={`Faltan para ${ev.metaAnual} h`} value={`${ev.faltanParaMeta} h`} />
                {ev.restantes > 0 && (
                    <Fig
                        label="Necesita al mes"
                        value={ev.porMes ? `${ev.porMes} h` : "—"}
                        sub={`en ${plural(ev.restantes, "mes", "meses")}`}
                    />
                )}
            </dl>
            {ev.metaAnual < GOALS.regular.year && (
                <p className="pp-note">Meta proporcional: {plural(ev.metaAnual / GOALS.regular.month, "mes", "meses")} como precursor regular.</p>
            )}
            {ev.pendientes.length > 0 && <p className="pp-note pp-note--warn">Falta el informe de {monthList(ev.pendientes)}.</p>}
        </>
    );
}

function MonthlyBody({ ev }) {
    return (
        <>
            <dl className="pp-figures">
                <Fig label="Meses con informe" value={ev.evaluados} />
                <Fig label="Cumplió" value={ev.cumplidos} tone={ev.cumplidos ? "ok" : undefined} />
                <Fig label="No cumplió" value={ev.noCumplidos.length} tone={ev.noCumplidos.length ? "bad" : undefined} />
                <Fig label="Total" value={`${ev.total} h`} />
                <Fig label="Promedio por mes" value={ev.promedio === null ? "—" : `${ev.promedio} h`} />
            </dl>
            {ev.noCumplidos.length > 0 && (
                <p className="pp-note pp-note--bad">
                    No cumplió en {ev.noCumplidos.map((c) => `${monthLabel(c.month)} (${c.total} h, faltaron ${c.short})`).join(", ")}.
                </p>
            )}
            {ev.pendientes.length > 0 && <p className="pp-note pp-note--warn">Falta el informe de {monthList(ev.pendientes)}.</p>}
            {ev.planned.length > 0 && <p className="pp-note">Asignado también para {monthList(ev.planned)}.</p>}
        </>
    );
}

function cellText(c, category) {
    const name = monthLabel(c.month);
    const goal = GOALS[category.status].month;
    const detail = `${c.hours || 0} h${c.sacred ? ` + ${c.sacred} h de servicio sagrado` : ""}`;
    switch (c.state) {
        case "off": return { label: "—", title: `${name}: no era ${category.one}` };
        case "future": return { label: "", title: `${name}: todavía no se cuenta` };
        case "planned": return { label: "asig.", title: `${name}: asignado` };
        case "missing": return { label: "falta", title: `${name}: falta el informe` };
        case "done": return { label: String(c.total), title: `${name}: ${detail}` };
        case "met": return { label: String(c.total), title: `${name}: ${detail} · meta ${goal} h, cumplió` };
        default: return { label: String(c.total), title: `${name}: ${detail} · meta ${goal} h, faltaron ${c.short} h` };
    }
}

function MonthStrip({ cells, category }) {
    return (
        <ol className="pp-months" aria-label="Mes a mes">
            {cells.map((c) => {
                const { label, title } = cellText(c, category);
                return (
                    <li key={c.month} className={`pp-m pp-m--${c.state}`} title={title}>
                        <span className="pp-m-name">{shortMonth(c.month)}</span>
                        <span className="pp-m-val">{label}</span>
                    </li>
                );
            })}
        </ol>
    );
}

function Legend({ category }) {
    const items = category.status === "regular"
        ? [["done", "Horas del mes (con servicio sagrado)"], ["missing", "Falta informe"], ["off", `No era ${category.one}`], ["future", "Meses que faltan"]]
        : [["met", `Cumplió (${GOALS[category.status].month} h o más)`], ["unmet", "No cumplió"], ["missing", "Falta informe"], ["off", `No era ${category.one}`]];
    return (
        <ul className="pp-legend" aria-label="Convenciones">
            {items.map(([state, label]) => (
                <li key={state}><span className={`pp-legend-swatch pp-m--${state}`} />{label}</li>
            ))}
        </ul>
    );
}
