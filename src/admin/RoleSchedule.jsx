// src/admin/RoleSchedule.jsx
// Página común de los programas por sábado (Fin de semana, Sonido): una fila por
// sábado, una persona por rol. Vistas (?ver=): lista, hermanos habilitados y hoja.
// La configuración de cada programa está en WeekendSchedule.jsx y SoundSchedule.jsx.
import { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { ConfirmDialog, EmptyState, ErrorNote, Loading, Modal, PageHeader, Pager, PersonCell, Segmented, StatCard, StatGrid } from "./AdminWidgets";
import { apiErrorCode, apiErrorMessage, readJson } from "./adminApi";
import { normalize } from "./adminNav";
import { downloadSheetPDF, fromISO, isSaturdayISO, toISO, upcomingSaturdayISO } from "../components/weekendSheetUtils";

const API = import.meta.env.VITE_API_URL || "";
const PER_PAGE = 10;
const KEEP = "__keep"; // conservar el nombre importado sin vincular
const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const SHORT_DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// ─── Utilidades ──────────────────────────────────────────────────────────────

function shortDate(iso, withYear = false) {
  if (!iso) return "";
  const d = fromISO(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
}

function addDays(iso, days) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function weekRange(iso) {
  const d = fromISO(iso);
  const monday = addDays(iso, -((d.getDay() + 6) % 7));
  return `${shortDate(monday)} – ${shortDate(addDays(monday, 6))}`;
}

function dayName(iso) {
  const d = fromISO(iso);
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()}`;
}

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Textos según el sustantivo de la fila: "sábado" (masculino) o "semana" (femenino)
function words({ one, many, feminine }) {
  const o = feminine ? "a" : "o";
  return {
    one,
    many,
    the: `${feminine ? "la" : "el"} ${one}`,
    this: `${feminine ? "esta" : "este"} ${one}`,
    next: `Próxim${o} ${one}`,
    programmed: `${cap(many)} programad${o}s`,
    upcoming: `Próxim${o}s`,
    past: `Anteriores`,
    none: `No hay ${many} programad${o}s.`,
    nonePast: `No hay ${many} anteriores.`,
    exists: `ya está programad${o}`,
  };
}

async function api(path, token, { method = "GET", body } = {}, moduleName = "") {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await readJson(res);
  if (!res.ok) {
    const error = new Error(res.status === 403 ? `No tienes permiso para el módulo ${moduleName}.` : apiErrorMessage(data));
    error.status = res.status;
    error.code = apiErrorCode(data);
    throw error;
  }
  return data;
}

// Lo que falta o choca en una fila: conflictos, nombres sin vincular y roles vacíos
function rowNotes(row, roles) {
  const notes = [];
  roles.forEach(({ key, label }) => {
    const labels = row.conflicts.filter((c) => c.role === key).map((c) => c.label.toLowerCase());
    if (labels.length) notes.push({ tone: "bad", text: `${label}: ${labels.join(", ")}` });
  });
  roles.forEach(({ key, label }) => {
    const person = row[key];
    if (!person) notes.push({ tone: "warn", text: `Falta ${label.toLowerCase()}` });
    else if (!person.linked) notes.push({ tone: "warn", text: `${label} sin vincular` });
  });
  return notes;
}

function rowSubline(row, thisSaturday, w) {
  const year = fromISO(row.date).getFullYear();
  const now = row.date === thisSaturday ? `${cap(w.this)} · ` : "";
  if (row.midweek_date) return `${now}${year} · ${dayName(row.date)} y ${dayName(row.midweek_date)}`;
  return `${now}${year} · semana ${weekRange(row.date)}`;
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function RoleSchedule({ config }) {
  const { token, logout } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const w = words(config.unit);
  const views = { lista: cap(w.many), habilitados: "Hermanos habilitados", hoja: "Hoja para imprimir" };
  const view = views[params.get("ver")] ? params.get("ver") : "lista";
  const setView = (key) => setParams(key === "lista" ? {} : { ver: key }, { replace: true });
  const call = (path, options) => api(`${config.apiBase}${path}`, token, options, config.title);

  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  const [notice, setNotice] = useState(null); // { tone: "ok" | "error", text }
  const [editor, setEditor] = useState(null); // { row } | { row: null }
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api(config.apiBase, token), api(`${config.apiBase}/people`, token)])
      .then(([listRows, peopleRows]) => {
        if (cancelled) return;
        setRows(listRows);
        setPeople(peopleRows);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) logout();
        else if (err.status === 403) setError(`No tienes permiso para el módulo ${config.title}.`);
        else setError(err.message || `No se pudo cargar ${config.title}.`);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, logout, reloadKey, config.apiBase, config.title]);

  const thisSaturday = upcomingSaturdayISO();
  const upcoming = useMemo(() => rows.filter((r) => r.date >= thisSaturday), [rows, thisSaturday]);
  const past = useMemo(() => rows.filter((r) => r.date < thisSaturday).reverse(), [rows, thisSaturday]);
  const next = upcoming[0];
  const pendingReview = upcoming.filter((r) => rowNotes(r, config.roles).length > 0).length;
  const enabledBy = config.roles.map((r) => people.filter((p) => p[r.flag]).length);
  const enabledPeople = people.filter((p) => config.roles.some((r) => p[r.flag])).length;

  const firstFreeSaturday = () => {
    const taken = new Set(rows.map((r) => r.date));
    let d = thisSaturday;
    while (taken.has(d)) d = addDays(d, 7);
    return d;
  };

  const flash = (tone, text) => {
    setNotice({ tone, text });
    if (tone === "ok") setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 4000);
  };

  const confirmDelete = async () => {
    const row = toDelete;
    setToDelete(null);
    try {
      await call(`/${row.id}`, { method: "DELETE" });
      flash("ok", `Se quitó ${w.the} ${row.label.toLowerCase()}.`);
      reload();
    } catch (err) {
      if (err.status === 401) return logout();
      flash("error", err.message);
    }
  };

  return (
    <div className="tab-content fade-in">
      <PageHeader icon={config.icon} title={config.title} subtitle={config.subtitle}>
        <a
          className="adm-btn adm-btn--ghost"
          href={config.printUrl(next?.date || thisSaturday, config.sheetWeeks)}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="printer" size={16} /> Imprimir
        </a>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditor({ row: null })}>
          <Icon name="plus" size={16} /> Programar {w.one}
        </button>
      </PageHeader>

      {notice && (
        <div className={`adm-alert ${notice.tone === "ok" ? "adm-alert--ok" : "adm-alert--error"}`} role="status">
          <Icon name={notice.tone === "ok" ? "check" : "alert"} size={18} />
          <span>{notice.text}</span>
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}

      <StatGrid label={`Resumen de ${config.title}`}>
        <StatCard
          icon="calendar"
          tone="teal"
          textValue
          label={w.next}
          value={next ? next.label : "Sin programar"}
          hint={next ? config.roles.map((r) => next[r.key]?.name || `Sin ${r.label.toLowerCase()}`).join(" · ") : `Genera o programa ${w.many}`}
        />
        <StatCard
          icon="layers"
          tone="blue"
          label={w.programmed}
          value={upcoming.length}
          hint={upcoming.length ? `Hasta el ${shortDate(upcoming[upcoming.length - 1].date, true)}` : "Desde este sábado"}
        />
        <StatCard
          icon="users"
          tone="cyan"
          label="Habilitados"
          value={enabledBy.join(" · ")}
          textValue
          hint={config.roles.map((r) => r.label.toLowerCase()).join(" · ")}
        />
        <StatCard
          icon="alert"
          tone={pendingReview ? "blue" : "teal"}
          label="Por revisar"
          value={pendingReview}
          hint={pendingReview ? "Próximos con conflicto o datos faltantes" : "Todo en orden"}
        />
      </StatGrid>

      <div className="adm-wk-views">
        <Segmented
          label="Vista"
          value={view}
          onChange={setView}
          options={[
            { key: "lista", label: views.lista, count: rows.length },
            { key: "habilitados", label: views.habilitados, count: enabledPeople },
            { key: "hoja", label: views.hoja },
          ]}
        />
      </div>

      {loading ? (
        <Loading>Cargando {config.title.toLowerCase()}…</Loading>
      ) : (
        <>
          {view === "lista" && (
            <>
              <GeneratorCard config={config} words={w} call={call} logout={logout} onDone={reload} />
              <RowsCard
                config={config}
                words={w}
                upcoming={upcoming}
                past={past}
                all={rows}
                thisSaturday={thisSaturday}
                onEdit={(row) => setEditor({ row })}
                onDelete={setToDelete}
              />
            </>
          )}
          {view === "habilitados" && (
            <PeopleCard config={config} people={people} setPeople={setPeople} call={call} logout={logout} onChanged={reload} />
          )}
          {view === "hoja" && <SheetCard config={config} rows={rows} thisSaturday={thisSaturday} />}
        </>
      )}

      {editor && (
        <RowEditor
          config={config}
          words={w}
          call={call}
          token={token}
          logout={logout}
          row={editor.row}
          takenDates={rows.map((r) => r.date)}
          defaultDate={firstFreeSaturday()}
          onClose={() => setEditor(null)}
          onSaved={(saved, isNew) => {
            setEditor(null);
            flash("ok", `${isNew ? "Se programó" : "Se actualizó"} ${w.the} ${saved.label.toLowerCase()}.`);
            reload();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Quitar ${w.this}`}
          confirmLabel="Sí, quitar"
          onCancel={() => setToDelete(null)}
          onConfirm={confirmDelete}
        >
          <p>
            Se quitará la programación de {w.the} <strong>{toDelete.label.toLowerCase()}</strong>
            {config.roles.some((r) => toDelete[r.key])
              ? ` (${config.roles.map((r) => toDelete[r.key]?.name).filter(Boolean).join(", ")})`
              : ""}.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

// ─── Generador ───────────────────────────────────────────────────────────────

function GeneratorCard({ config, words: w, call, logout, onDone }) {
  const [weeks, setWeeks] = useState(8);
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const generate = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const body = { weeks: Math.min(26, Math.max(1, Number(weeks) || 1)) };
      if (start) body.start_date = start;
      const data = await call("/generate", { method: "POST", body });
      setResult(data);
      onDone();
    } catch (err) {
      if (err.status === 401) return logout();
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="adm-card">
      <div className="adm-card-head adm-card-head--line">
        <div>
          <h3 className="adm-card-title"><Icon name="sparkles" size={18} /> Generar {w.many}</h3>
          <p className="adm-card-sub">{config.generatorText}</p>
        </div>
      </div>
      <div className="adm-card-body">
        <div className="adm-param-row">
          <label className="adm-field">
            <span className="adm-label">{cap(w.many)} a generar</span>
            <input className="adm-input" type="number" min="1" max="26" value={weeks} onChange={(e) => setWeeks(e.target.value)} />
          </label>
          <label className="adm-field">
            <span className="adm-label">Desde <span className="adm-muted">(opcional)</span></span>
            <input className="adm-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <button type="button" className="adm-btn adm-btn--primary" onClick={generate} disabled={busy} style={{ height: "42px" }}>
            {busy
              ? <><span className="adm-spinner adm-spinner--sm" aria-hidden="true" /> Generando…</>
              : <><Icon name="sparkles" size={16} /> Generar</>}
          </button>
        </div>
        <p className="adm-help">
          Sin fecha, continúa después del último sábado programado. Cualquier día se ajusta al sábado de esa semana.
        </p>

        {error && <ErrorNote>{error}</ErrorNote>}
        {result && (
          <>
            <div className="adm-result">
              {[
                { label: "Programados", value: result.created },
                { label: "Desde", value: shortDate(result.start_date, true) },
                { label: "Ya existían", value: result.skipped.length },
              ].map(({ label, value }) => (
                <div key={label} className="adm-mini">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {result.warnings.length > 0 && (
              <div className="adm-alert adm-alert--warn" role="status">
                <Icon name="alert" size={18} />
                <div>
                  <strong>Quedaron partes sin asignar:</strong>
                  <ul className="adm-wk-list">{result.warnings.map((text) => <li key={text}>{text}</li>)}</ul>
                  <span>Habilita más hermanos o asígnalas a mano.</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ─── Lista ───────────────────────────────────────────────────────────────────

function RowsCard({ config, words: w, upcoming, past, all, thisSaturday, onEdit, onDelete }) {
  const [scope, setScope] = useState("proximos");
  const [page, setPage] = useState(1);
  const list = scope === "proximos" ? upcoming : scope === "anteriores" ? past : all;
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const current = list.slice((Math.min(page, pages) - 1) * PER_PAGE, Math.min(page, pages) * PER_PAGE);

  return (
    <section className="adm-card">
      <div className="adm-toolbar">
        <Segmented
          label={`Filtrar ${w.many}`}
          value={scope}
          onChange={(key) => { setScope(key); setPage(1); }}
          options={[
            { key: "proximos", label: w.upcoming, count: upcoming.length },
            { key: "anteriores", label: w.past, count: past.length },
            { key: "todos", label: "Todos", count: all.length },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState icon="calendar" title={scope === "anteriores" ? w.nonePast : w.none}>
          {scope !== "anteriores" && `Genera ${w.many} o programa uno a mano.`}
        </EmptyState>
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className={`adm-table adm-table--cards ${config.roles.length > 2 ? "adm-table--cards-md" : ""}`}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  {config.roles.map((r) => <th key={r.key}>{r.label}</th>)}
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {current.map((row) => {
                  const notes = rowNotes(row, config.roles);
                  const bad = notes.some((n) => n.tone === "bad");
                  return (
                    <tr key={row.id} className={notes.length ? "adm-row-pending" : undefined}>
                      <td data-label="Fecha">
                        <span className="adm-cell-strong">{row.label}</span>
                        <span className="adm-cell-sub">{rowSubline(row, thisSaturday, w)}</span>
                      </td>
                      {config.roles.map(({ key, label }) => (
                        <td key={key} data-label={label}>
                          <PersonCell name={row[key]?.name} fallback="Sin asignar" />
                          {row[key] && !row[key].linked && <span className="adm-cell-sub adm-wk-unlinked">Nombre importado · sin vincular</span>}
                        </td>
                      ))}
                      <td data-label="Estado">
                        {notes.length === 0 ? (
                          <span className="adm-badge adm-badge--ok">Listo</span>
                        ) : (
                          <div className="adm-wk-status">
                            <span className={`adm-badge ${bad ? "adm-badge--bad" : "adm-badge--warn"}`}>{bad ? "Conflicto" : "Por completar"}</span>
                            <ul className="adm-wk-notes">
                              {notes.map((n) => <li key={n.text} className={`adm-wk-note--${n.tone}`}>{n.text}</li>)}
                            </ul>
                          </div>
                        )}
                      </td>
                      <td data-label="Acciones" style={{ textAlign: "right" }}>
                        <div className="adm-actions">
                          <button type="button" className="adm-action" onClick={() => onEdit(row)} title={`Editar ${w.one}`} aria-label={`Editar ${row.label.toLowerCase()}`}>
                            <Icon name="edit" size={17} />
                          </button>
                          <button type="button" className="adm-action adm-action--danger" onClick={() => onDelete(row)} title={`Quitar ${w.one}`} aria-label={`Quitar ${row.label.toLowerCase()}`}>
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && <Pager page={Math.min(page, pages)} total={pages} onChange={setPage} />}
        </>
      )}
    </section>
  );
}

// ─── Editor de una fila ──────────────────────────────────────────────────────

function RowEditor({ config, words: w, call, token, logout, row, takenDates, defaultDate, onClose, onSaved }) {
  const isNew = !row;
  const initial = Object.fromEntries(config.roles.map(({ key }) => [
    key,
    row?.[key] ? (row[key].linked ? String(row[key].id) : KEEP) : "",
  ]));
  const [date, setDate] = useState(row?.date || defaultDate);
  const [midweek, setMidweek] = useState(row?.midweek_date || "");
  const [snapped, setSnapped] = useState(false);
  const [values, setValues] = useState(initial);
  const [cand, setCand] = useState(null); // { key, data } | { key, error }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const taken = isNew && takenDates.includes(date);
  const candKey = `${date}|${midweek}`;

  useEffect(() => {
    if (!isSaturdayISO(date)) return undefined;
    let cancelled = false;
    const query = new URLSearchParams({ date });
    if (row) query.set("exclude_id", row.id);
    if (config.hasMidweek && midweek) query.set("midweek", midweek);
    api(`${config.apiBase}/candidates?${query}`, token, {}, config.title)
      .then((data) => { if (!cancelled) setCand({ key: `${date}|${midweek}`, data }); })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) logout();
        else setCand({ key: `${date}|${midweek}`, error: err.message });
      });
    return () => { cancelled = true; };
  }, [date, midweek, row, token, logout, config.apiBase, config.hasMidweek, config.title]);

  const current = cand?.key === candKey ? cand : null;
  const shownMidweek = midweek || current?.data?.midweek_date || "";

  const pickDate = (value) => {
    if (!value) return;
    const saturday = upcomingSaturdayISO(fromISO(value));
    setSnapped(saturday !== value);
    setDate(saturday);
    setMidweek("");
    setError("");
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const toId = (v) => (v === "" || v === KEEP ? null : Number(v));
    let body;
    if (isNew) {
      body = { date };
      if (config.hasMidweek && midweek) body.midweek_date = midweek;
      config.roles.forEach(({ key }) => { body[`${key}_id`] = toId(values[key]); });
    } else {
      body = {};
      config.roles.forEach(({ key }) => {
        if (values[key] !== initial[key]) body[`${key}_id`] = toId(values[key]);
      });
      if (config.hasMidweek && midweek && midweek !== row.midweek_date) body.midweek_date = midweek;
      if (Object.keys(body).length === 0) return onClose();
    }
    setSaving(true);
    try {
      const saved = await call(isNew ? "" : `/${row.id}`, { method: isNew ? "POST" : "PUT", body });
      onSaved(saved, isNew);
    } catch (err) {
      if (err.status === 401) return logout();
      setError(err.message);
      setSaving(false);
    }
  };

  const unlinked = config.roles.filter(({ key }) => row?.[key] && !row[key].linked);
  const weeksChecked = current?.data?.meetings?.map((m) => `${shortDate(m.week_start)} – ${shortDate(m.week_end)}`) || [];

  return (
    <Modal
      title={isNew ? `Programar ${w.one}` : `${cap(w.one)} ${row.label.toLowerCase()}`}
      icon={config.icon}
      size="lg"
      onClose={onClose}
      dismissOnBackdrop={false}
    >
      <form onSubmit={save} className="adm-stack">
        <div className="adm-form-grid">
          {isNew ? (
            <label className="adm-field">
              <span className="adm-label">Sábado</span>
              <input className="adm-input" type="date" value={date} onChange={(e) => pickDate(e.target.value)} required />
              {snapped && <span className="adm-help">Se ajustó al sábado de esa semana.</span>}
              {taken && <span className="adm-form-error">{cap(w.the)} {w.exists}. Edítalo desde la lista.</span>}
            </label>
          ) : (
            <div className="adm-detail">
              <span>Fecha</span>
              <strong>{row.label}</strong>
            </div>
          )}
          {config.hasMidweek ? (
            <label className="adm-field">
              <span className="adm-label">Reunión de entre semana</span>
              <input
                className="adm-input"
                type="date"
                value={shownMidweek}
                min={addDays(date, 1)}
                max={addDays(date, 6)}
                onChange={(e) => setMidweek(e.target.value)}
              />
              <span className="adm-help">Cámbiala solo si esa semana la reunión cae otro día.</span>
            </label>
          ) : (
            <div className="adm-detail">
              <span>Semana que se revisa</span>
              <strong>{weekRange(date)}</strong>
            </div>
          )}
        </div>

        {config.hasMidweek && weeksChecked.length > 0 && (
          <p className="adm-help">
            Se revisan aseo, micrófonos y acomodadores de {weeksChecked.length > 1 ? "las semanas" : "la semana"} {weeksChecked.join(" y ")}
            {config.crossCheck ? `, y ${config.crossCheck} de ese sábado` : ""}.
          </p>
        )}

        {unlinked.length > 0 && (
          <div className="adm-alert adm-alert--warn" role="note">
            <Icon name="link" size={18} />
            <span>
              {unlinked.map(({ key, label }) => `${label}: «${row[key].name}»`).join(" · ")} — vino de la hoja anterior y no coincidió
              con ningún estudiante. Elige al estudiante para vincularlo.
            </span>
          </div>
        )}

        {current?.error && <ErrorNote>{current.error}</ErrorNote>}
        {!current && <Loading>Revisando quién está libre…</Loading>}
        {current?.data && (
          <div className={`adm-form-grid ${config.roles.length > 2 ? "adm-wk-grid3" : ""}`}>
            {config.roles.map((role) => (
              <CandidateSelect
                key={role.key}
                role={role}
                value={values[role.key]}
                onChange={(v) => setValues((prev) => ({ ...prev, [role.key]: v }))}
                candidates={current.data[role.key]}
                imported={row?.[role.key] && !row[role.key].linked ? row[role.key].name : null}
                currentName={row?.[role.key]?.linked ? row[role.key].name : null}
                keepId={initial[role.key]}
                otherValues={config.roles.filter((r) => r.key !== role.key).map((r) => values[r.key])}
              />
            ))}
          </div>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="adm-modal-foot adm-modal-foot--inline">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || taken || !current?.data}>
            {saving ? "Guardando…" : isNew ? "Programar" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CandidateSelect({ role, value, onChange, candidates, imported, currentName, keepId, otherValues }) {
  const id = `rs-${role.key}`;
  const free = candidates.filter((c) => c.available);
  const busy = candidates.filter((c) => !c.available);
  const selected = candidates.find((c) => String(c.id) === value);
  const missing = value && value !== KEEP && !selected; // ya asignado pero sin el permiso del rol
  const lastText = (c) => (c.last_date ? `última vez ${shortDate(c.last_date, true)}` : "nunca");

  return (
    <label className="adm-field" htmlFor={id}>
      <span className="adm-label">{role.label}</span>
      <select id={id} className="adm-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Sin asignar —</option>
        {imported && <option value={KEEP}>{imported} (importado, sin vincular)</option>}
        {missing && <option value={value}>{currentName || "Asignado actualmente"} (sin permiso de {role.noun})</option>}
        {free.length > 0 && (
          <optgroup label={`Libres (${free.length})`}>
            {free.map((c) => (
              <option key={c.id} value={String(c.id)} disabled={otherValues.includes(String(c.id))}>
                {c.name} · {lastText(c)}
              </option>
            ))}
          </optgroup>
        )}
        {busy.length > 0 && (
          <optgroup label={`Ocupados (${busy.length})`}>
            {busy.map((c) => (
              <option key={c.id} value={String(c.id)} disabled={String(c.id) !== keepId}>
                {c.name} — {c.reasons.map((r) => r.label.toLowerCase()).join(", ")}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {selected && !selected.available && (
        <span className="adm-form-error">
          Ya tiene {selected.reasons.map((r) => r.label.toLowerCase()).join(", ")}. Elige a otro hermano.
        </span>
      )}
      {candidates.length === 0 && (
        <span className="adm-help">Nadie tiene el permiso de {role.noun}. Actívalo en «Hermanos habilitados».</span>
      )}
      {candidates.length > 0 && free.length === 0 && (
        <span className="adm-help">Todos los habilitados tienen otra asignación.</span>
      )}
    </label>
  );
}

// ─── Hermanos habilitados ────────────────────────────────────────────────────

const PEOPLE_FILTERS = { todos: "Todos los varones", habilitados: "Habilitados", sin: "Sin permiso" };

function PeopleCard({ config, people, setPeople, call, logout, onChanged }) {
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(null); // `${id}:${flag}`
  const [error, setError] = useState("");

  const enabled = (p) => config.roles.some((r) => p[r.flag]);
  const counts = {
    todos: people.length,
    habilitados: people.filter(enabled).length,
    sin: people.filter((p) => !enabled(p)).length,
  };
  const term = normalize(search);
  const list = people.filter((p) => {
    if (filter === "habilitados" && !enabled(p)) return false;
    if (filter === "sin" && enabled(p)) return false;
    return !term || normalize(p.name).includes(term);
  });
  const perPage = 12;
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const current = list.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);

  const toggle = async (person, flag) => {
    const value = !person[flag];
    setError("");
    setSaving(`${person.id}:${flag}`);
    setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, [flag]: value } : p)));
    try {
      await call(`/people/${person.id}`, { method: "PUT", body: { [flag]: value } });
      onChanged();
    } catch (err) {
      if (err.status === 401) return logout();
      setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, [flag]: !value } : p)));
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const canEnable = (p) => p.gender === 1 && p.status === "Activo";

  return (
    <section className="adm-card">
      <div className="adm-card-head adm-card-head--line">
        <div>
          <h3 className="adm-card-title"><Icon name="userCheck" size={18} /> {config.peopleTitle}</h3>
          <p className="adm-card-sub">Solo varones activos. El permiso también se puede cambiar desde la ficha del estudiante.</p>
        </div>
      </div>
      <div className="adm-toolbar">
        <Segmented
          label="Filtrar hermanos"
          value={filter}
          onChange={(key) => { setFilter(key); setPage(1); }}
          options={Object.entries(PEOPLE_FILTERS).map(([key, label]) => ({ key, label, count: counts[key] }))}
        />
        <label className="adm-input-pill">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Buscar hermano..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Buscar hermano"
          />
        </label>
      </div>

      {error && <div style={{ padding: "0 18px" }}><ErrorNote>{error}</ErrorNote></div>}

      {list.length === 0 ? (
        <EmptyState icon="users" title="No hay hermanos que coincidan." />
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className={`adm-table adm-table--cards ${config.roles.length > 2 ? "adm-table--cards-md" : ""}`}>
              <thead>
                <tr>
                  <th>Hermano</th>
                  {config.roles.map((r) => <th key={r.key}>{r.label}</th>)}
                  <th>Veces</th>
                  <th>Última vez</th>
                </tr>
              </thead>
              <tbody>
                {current.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Hermano">
                      <PersonCell name={p.name} />
                      {!canEnable(p) && (
                        <span className="adm-cell-sub adm-wk-unlinked">
                          {p.status !== "Activo" ? "Inactivo" : "No registrado como varón"} · solo se puede quitar el permiso
                        </span>
                      )}
                    </td>
                    {config.roles.map(({ key, flag, label }) => (
                      <td key={key} data-label={label}>
                        <button
                          type="button"
                          className={`adm-toggle adm-wk-toggle ${p[flag] ? "is-on" : ""}`}
                          aria-pressed={p[flag]}
                          aria-label={`${label}: ${p.name}`}
                          disabled={saving === `${p.id}:${flag}` || (!p[flag] && !canEnable(p))}
                          onClick={() => toggle(p, flag)}
                        >
                          {p[flag] ? "Sí" : "No"}
                          <span className="adm-toggle-dot" aria-hidden="true" />
                        </button>
                      </td>
                    ))}
                    <td data-label="Veces">
                      <span className="adm-wk-times">
                        {config.roles.map((r) => (
                          <span key={r.key} title={`Veces en ${r.label.toLowerCase()}`}>{r.short} {p[`times_${r.key}`]}</span>
                        ))}
                      </span>
                    </td>
                    <td data-label="Última vez">
                      {config.roles.some((r) => p[`last_${r.key}`]) ? (
                        <span className="adm-wk-last">
                          {config.roles.filter((r) => p[`last_${r.key}`]).map((r) => (
                            <span key={r.key}>{r.past} {shortDate(p[`last_${r.key}`], true)}</span>
                          ))}
                        </span>
                      ) : (
                        <span className="adm-muted">Nunca</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && <Pager page={Math.min(page, pages)} total={pages} onChange={setPage} />}
        </>
      )}
    </section>
  );
}

// ─── Hoja para imprimir ──────────────────────────────────────────────────────

const SHEET_WEEKS = [4, 8, 9, 13, 14, 17, 26];

function SheetCard({ config, rows, thisSaturday }) {
  const startOptions = rows.map((r) => r.date);
  const defaultStart = startOptions.find((d) => d >= thisSaturday) || startOptions[startOptions.length - 1] || thisSaturday;
  const [start, setStart] = useState(defaultStart);
  const [weeks, setWeeks] = useState(config.sheetWeeks);
  const end = addDays(start, 7 * (weeks - 1));
  const sheetRows = rows
    .filter((r) => r.date >= start && r.date <= end)
    .map((r) => ({ date: r.date, label: r.label, ...Object.fromEntries(config.roles.map(({ key }) => [key, r[key]?.name])) }));
  const Sheet = config.Sheet;
  const sheetId = `${config.key}-sheet-panel`;

  return (
    <section className="adm-card">
      <div className="adm-card-head adm-card-head--line">
        <div>
          <h3 className="adm-card-title"><Icon name="printer" size={18} /> Hoja para imprimir</h3>
          <p className="adm-card-sub">La misma hoja que se publica en Ver Imprimible → {config.title}.</p>
        </div>
      </div>
      <div className="adm-card-body">
        <div className="adm-param-row">
          <label className="adm-field">
            <span className="adm-label">Desde</span>
            <select className="adm-input" value={start} onChange={(e) => setStart(e.target.value)} disabled={!startOptions.length}>
              {!startOptions.includes(start) && <option value={start}>{shortDate(start, true)}</option>}
              {rows.map((r) => <option key={r.date} value={r.date}>{r.label} {fromISO(r.date).getFullYear()}</option>)}
            </select>
          </label>
          <label className="adm-field">
            <span className="adm-label">Filas</span>
            <select className="adm-input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
              {SHEET_WEEKS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            style={{ height: "42px" }}
            disabled={!sheetRows.length}
            onClick={() => downloadSheetPDF(sheetId, config.pdfName)}
          >
            <Icon name="fileText" size={16} /> Descargar PDF
          </button>
          <a className="adm-btn adm-btn--primary" style={{ height: "42px" }} href={config.printUrl(start, weeks)} target="_blank" rel="noreferrer">
            <Icon name="printer" size={16} /> Abrir para imprimir
          </a>
        </div>

        {sheetRows.length === 0 ? (
          <EmptyState icon="printer" title="No hay filas en ese rango." />
        ) : (
          <div className="adm-wk-paper">
            <Sheet id={sheetId} rows={sheetRows} />
          </div>
        )}
      </div>
    </section>
  );
}
