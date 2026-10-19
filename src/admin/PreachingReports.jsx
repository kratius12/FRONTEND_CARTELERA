// src/admin/PreachingReports.jsx
// Módulo "Informes de predicación": una tabla por grupo, con el informe mensual de cada persona.
import { useState, useEffect, useContext } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { GroupReportTable, MonthPicker, SaveBar } from "./PreachingReportsParts";
import { computeTotals, currentServiceYear, defaultMonth, groupTitle, monthLabel, serviceYearMonths, toPayload } from "./preachingReportsUtils";
import { slugForStatus } from "./pioneerGoals";
import { usePreachingReportEdits } from "./usePreachingReportEdits";
import "./PreachingReports.css";

const API = import.meta.env.VITE_API_URL || "";

export default function PreachingReports() {
    const { token, logout } = useContext(AuthContext);
    const [searchParams] = useSearchParams();
    // Se puede abrir en un mes con ?mes=YYYY-MM (ej. al volver del seguimiento de precursores)
    const [month, setMonth] = useState(() => {
        const requested = searchParams.get("mes");
        return serviceYearMonths().includes(requested) ? requested : defaultMonth();
    });
    const [data, setData] = useState(null);
    const [groupFilter, setGroupFilter] = useState("all");
    const [showLinks, setShowLinks] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");

    const groups = data?.groups || [];
    const { edits, pendingCount, getRow, updateRow, changeType, clearEdits } = usePreachingReportEdits(groups);

    const showToast = (msg, ms = 2500) => {
        setToast(msg);
        setTimeout(() => setToast(""), ms);
    };

    const handleAuthError = (res) => {
        if (res.status === 401 || res.status === 403) {
            logout();
            throw new Error("Sesión expirada");
        }
    };

    // Cargar el mes seleccionado (si se cambia de mes rápido, se ignora la respuesta vieja)
    useEffect(() => {
        let cancelled = false;
        fetch(`${API}/api/admin/preaching-reports?month=${month}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                handleAuthError(res);
                if (!res.ok) throw new Error("No se pudieron cargar los informes");
                const body = await res.json();
                if (cancelled) return;
                setData(body);
                clearEdits();
                setError("");
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, token]);

    const changeMonth = (next) => {
        if (!next || next === month) return;
        if (pendingCount && !window.confirm("Tienes cambios sin guardar. ¿Cambiar de mes y descartarlos?")) return;
        setLoading(true);
        setMonth(next);
    };

    const handleSave = async () => {
        if (!pendingCount) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/preaching-reports`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ month, reports: Object.values(edits).map(toPayload) }),
            });
            handleAuthError(res);
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "No se pudieron guardar los informes");
            setData(body);
            clearEdits();
            showToast("✅ Informes guardados");
        } catch (err) {
            showToast(`❌ ${err.message}`, 4000);
        } finally {
            setSaving(false);
        }
    };

    const visibleGroups = groupFilter === "all" ? groups : groups.filter((g) => g.id === groupFilter);
    const totals = computeTotals(groups.flatMap((g) => g.rows.map(getRow)));
    const summaryRows = [
        { key: "publicador", label: "Publicadores", ...totals.publicador, horas: null },
        { key: "auxiliar", label: "Precursores auxiliares", ...totals.auxiliar },
        { key: "regular", label: "Precursores regulares", ...totals.regular },
    ];
    const pioneerStats = [
        { key: "regular", one: "Precursor regular", many: "Precursores regulares" },
        { key: "aux_ind", one: "Auxiliar indefinido", many: "Auxiliares indefinidos" },
        { key: "aux_camp", one: "Auxiliar de campaña", many: "Auxiliares de campaña" },
    ].map((s) => ({ ...s, ...totals.precursores[s.key] }));

    // Al abrir el seguimiento se sale de la planilla: avisar si hay cambios sin guardar
    const confirmLeave = (e) => {
        if (pendingCount && !window.confirm("Tienes cambios sin guardar. ¿Salir de la planilla y descartarlos?")) e.preventDefault();
    };

    return (
        <div className="pr-page fade-in">
            {toast && <div className="toast">{toast}</div>}

            <div className="pr-header">
                <div>
                    <h2 className="pr-title">📝 Informes de predicación</h2>
                    <p className="pr-subtitle">
                        Informe de <strong>{monthLabel(month)}</strong> · año de servicio {currentServiceYear()}, por grupo de servicio.
                    </p>
                </div>

                <div className="pr-toolbar">
                    <MonthPicker month={month} onChange={changeMonth} />

                    {groups.length > 1 && (
                        <select
                            className="pr-group-filter"
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                            aria-label="Filtrar por grupo"
                        >
                            <option value="all">Todos los grupos</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>{groupTitle(g.name)}</option>
                            ))}
                        </select>
                    )}

                    <button
                        type="button"
                        className={`pr-links-toggle ${showLinks ? "active" : ""}`}
                        onClick={() => setShowLinks((v) => !v)}
                        aria-expanded={showLinks}
                    >
                        🔗 Links por grupo
                    </button>
                </div>
            </div>

            {showLinks && <GroupLinksPanel token={token} onAuthError={handleAuthError} showToast={showToast} />}

            {loading && <div className="admin-status">Cargando informes…</div>}
            {!loading && error && <div className="admin-status error">{error}</div>}
            {!loading && !error && groups.length === 0 && (
                <div className="admin-status">
                    No hay grupos con integrantes. Asigna personas a los grupos en la pestaña <strong>🗂️ Grupos</strong>.
                </div>
            )}

            {!loading && !error && groups.length > 0 && (
                <section className="pr-summary" aria-label="Totales del mes">
                    <div className="pr-summary-head">
                        <h3 className="pr-summary-title">Totales de {monthLabel(month)} · toda la congregación</h3>
                        {pendingCount > 0 && <span className="pr-summary-note">Incluye cambios sin guardar</span>}
                    </div>
                    <div className="pr-summary-body">
                        <div className="pr-pioneers">
                            <ul className="pr-pioneer-stats" aria-label={`Precursores de ${monthLabel(month)}`}>
                                {pioneerStats.map((s) => (
                                    <li key={s.key}>
                                        <Link
                                            to={`/informes/precursores/${slugForStatus(s.key)}?mes=${month}`}
                                            className={`pr-pioneer-stat pr-pioneer-stat--${s.key}`}
                                            onClick={confirmLeave}
                                            title="Ver el seguimiento de sus metas"
                                        >
                                            <strong className="pr-pioneer-num">{s.personas}</strong>
                                            <span className="pr-pioneer-label">{s.personas === 1 ? s.one : s.many}</span>
                                            <span className="pr-pioneer-sub">
                                                {s.personas ? `${s.informaron} con informe` : " "}
                                            </span>
                                            <span className="pr-pioneer-go" aria-hidden="true">Ver metas ›</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <p className="pr-pioneer-note">
                                La campaña se asigna en la columna <strong>Tipo</strong> y vale solo para el mes elegido.
                                Haz clic en una tarjeta para ver cómo va cada precursor con su meta.
                            </p>
                        </div>
                        <table className="pr-summary-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Informes</th>
                                    <th>Horas</th>
                                    <th>Estudios</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryRows.map((r) => (
                                    <tr key={r.key}>
                                        <td>{r.label}</td>
                                        <td>{r.informes}</td>
                                        <td>{r.horas === null ? "—" : r.horas}</td>
                                        <td>{r.estudios}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td>Total</td>
                                    <td>{totals.total.informes}</td>
                                    <td>{totals.total.horas}</td>
                                    <td>{totals.total.estudios}</td>
                                </tr>
                            </tfoot>
                        </table>
                        <ul className="pr-summary-facts">
                            <li><strong>{totals.total.informes + totals.noParticiparon}</strong> de {totals.personas} personas entregaron informe</li>
                            <li><strong>{totals.noParticiparon}</strong> no participaron (NP)</li>
                            <li><strong>{totals.sinInforme}</strong> todavía sin informe</li>
                            {totals.servicioSagrado > 0 && (
                                <li><strong>{totals.servicioSagrado}</strong> h de servicio sagrado (precursores)</li>
                            )}
                        </ul>
                    </div>
                </section>
            )}

            {!loading && !error && visibleGroups.map((group) => (
                <GroupReportTable
                    key={group.id}
                    group={group}
                    getRow={getRow}
                    edits={edits}
                    onUpdate={updateRow}
                    onTypeChange={changeType}
                />
            ))}

            <SaveBar count={pendingCount} saving={saving} onSave={handleSave} onDiscard={clearEdits} />
        </div>
    );
}

// Panel con el link secreto de cada grupo, para compartir con su encargado
function GroupLinksPanel({ token, onAuthError, showToast }) {
    const [links, setLinks] = useState(null);
    const [error, setError] = useState("");
    const [copiedId, setCopiedId] = useState(null);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`${API}/api/admin/preaching-reports/links`, { headers: { Authorization: `Bearer ${token}` } })
            .then(async (res) => {
                onAuthError(res);
                if (!res.ok) throw new Error("No se pudieron cargar los links");
                const body = await res.json();
                if (!cancelled) setLinks(body);
            })
            .catch((err) => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const urlFor = (link) => `${window.location.origin}/informe-grupo/${link.token}`;

    const copy = async (link, inputEl) => {
        const url = urlFor(link);
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // Sin acceso al portapapeles: se selecciona el texto para copiarlo a mano
            inputEl?.select();
            showToast("Selecciona y copia el link (Ctrl+C)", 3000);
            return;
        }
        setCopiedId(link.group_id);
        setTimeout(() => setCopiedId((id) => (id === link.group_id ? null : id)), 2000);
    };

    const regenerate = async (link) => {
        if (!window.confirm(`¿Cambiar el link de ${groupTitle(link.name)}?\n\nEl link anterior dejará de funcionar y tendrás que enviarle el nuevo al encargado.`)) return;
        setBusyId(link.group_id);
        try {
            const res = await fetch(`${API}/api/admin/preaching-reports/links/${link.group_id}/regenerate`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            onAuthError(res);
            if (!res.ok) throw new Error("No se pudo cambiar el link");
            const updated = await res.json();
            setLinks((prev) => prev.map((l) => (l.group_id === updated.group_id ? updated : l)));
            showToast("🔗 Link cambiado; el anterior ya no funciona");
        } catch (err) {
            showToast(`❌ ${err.message}`, 4000);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section className="pr-links" aria-label="Links por grupo">
            <div className="pr-links-head">
                <h3 className="pr-summary-title">Links para los encargados de grupo</h3>
                <p className="pr-links-help">
                    Cada link abre solo la planilla de ese grupo, sin usuario ni contraseña: quien lo tenga puede ver y
                    llenar los informes del grupo. Compártelo solo con el encargado. Si se comparte por error, usa
                    <strong> Cambiar link</strong> y el anterior deja de funcionar.
                </p>
            </div>
            {error && <div className="admin-status error">{error}</div>}
            {!error && !links && <div className="admin-status">Cargando links…</div>}
            {links && (
                <ul className="pr-links-list">
                    {links.map((link) => (
                        <li key={link.group_id} className="pr-link-item">
                            <div className="pr-link-name">
                                <strong>{groupTitle(link.name)}</strong>
                                <span>{link.members} {link.members === 1 ? "persona" : "personas"}</span>
                            </div>
                            <input
                                className="pr-input pr-link-url"
                                readOnly
                                value={urlFor(link)}
                                onFocus={(e) => e.target.select()}
                                aria-label={`Link de ${groupTitle(link.name)}`}
                            />
                            <div className="pr-link-actions">
                                <button
                                    type="button"
                                    className="pr-link-btn primary"
                                    onClick={(e) => copy(link, e.currentTarget.closest("li")?.querySelector("input"))}
                                >
                                    {copiedId === link.group_id ? "✓ Copiado" : "Copiar"}
                                </button>
                                <a className="pr-link-btn" href={urlFor(link)} target="_blank" rel="noopener noreferrer">
                                    Abrir
                                </a>
                                <button
                                    type="button"
                                    className="pr-link-btn"
                                    onClick={() => regenerate(link)}
                                    disabled={busyId === link.group_id}
                                >
                                    Cambiar link
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
