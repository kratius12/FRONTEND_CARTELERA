// src/admin/TalksPage.jsx
// /admin/conferencias: conferenciantes que vienen y que van, mes por mes.
// Vistas (?ver=): vienen, van, conferenciantes (los de la congregación y sus bosquejos) y hoja.
import { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { ConfirmDialog, EmptyState, ErrorNote, Loading, Modal, PageHeader, PersonCell, Segmented, StatCard, StatGrid } from "./AdminWidgets";
import { apiErrorCode, apiErrorMessage, readJson } from "./adminApi";
import TalksSheet from "../components/TalksSheet";
import { isMonthKey, monthKey, monthLabel, shiftMonth } from "../components/talksSheetUtils";
import { downloadSheetPDF, fromISO, sheetDate, toISO, upcomingSaturdayISO } from "../components/weekendSheetUtils";

const API = import.meta.env.VITE_API_URL || "";
const BASE = "/api/admin/talks";
const VIEWS = { vienen: "Vienen", van: "Van", conferenciantes: "Conferenciantes", hoja: "Hoja para imprimir" };
const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const shortDate = (iso) => {
  if (!iso) return "";
  const d = fromISO(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

async function api(path, token, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await readJson(res);
  if (!res.ok) {
    const error = new Error(res.status === 403 ? "No tienes permiso para el módulo Conferencias." : apiErrorMessage(data));
    error.status = res.status;
    error.code = apiErrorCode(data);
    throw error;
  }
  return data;
}

// Primer sábado del mes que todavía no tiene conferencia que viene (o el primero del mes)
function suggestedDate(month, talks, direction) {
  const [y, m] = month.split("-").map(Number);
  let d = upcomingSaturdayISO(new Date(y, m - 1, 1));
  const taken = new Set(talks.filter((t) => t.direction === direction).map((t) => t.date));
  while (direction === "incoming" && taken.has(d) && d.startsWith(month)) {
    const next = fromISO(d);
    next.setDate(next.getDate() + 7);
    d = toISO(next);
  }
  return d.startsWith(month) ? d : `${month}-01`;
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function TalksPage() {
  const { token, logout } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const month = isMonthKey(params.get("mes")) ? params.get("mes") : monthKey();
  const view = VIEWS[params.get("ver")] ? params.get("ver") : "vienen";
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const [talks, setTalks] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [notice, setNotice] = useState(null);
  const [editor, setEditor] = useState(null); // { talk } | { direction }
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api(`?month=${month}`, token),
      api("/speakers", token),
      api("/outlines", token),
      api("/visitors", token),
    ])
      .then(([t, s, c, v]) => {
        if (cancelled) return;
        setTalks(t); setSpeakers(s); setCatalog(c); setVisitors(v); setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) logout();
        else setError(err.message || "No se pudieron cargar las conferencias.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, logout, month, reloadKey]);

  const incoming = useMemo(() => talks.filter((t) => t.direction === "incoming"), [talks]);
  const outgoing = useMemo(() => talks.filter((t) => t.direction === "outgoing"), [talks]);
  const today = toISO(new Date());
  const nextVisit = incoming.find((t) => t.date >= today) || null;
  const outlinesCount = speakers.reduce((n, s) => n + s.outlines.length, 0);

  const flash = (tone, text) => {
    setNotice({ tone, text });
    if (tone === "ok") setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 4000);
  };

  const confirmDelete = async () => {
    const talk = toDelete;
    setToDelete(null);
    try {
      await api(`/${talk.id}`, token, { method: "DELETE" });
      flash("ok", `Se quitó la conferencia de ${talk.speaker_name} del ${sheetDate(talk.date).toLowerCase()}.`);
      reload();
    } catch (err) {
      if (err.status === 401) return logout();
      flash("error", err.message);
    }
  };

  const newDirection = view === "van" ? "outgoing" : "incoming";

  return (
    <div className="tab-content fade-in">
      <PageHeader
        icon="megaphone"
        title="Conferencias"
        subtitle="Conferenciantes que nos visitan y hermanos de la congregación que salen a dar la conferencia pública, mes por mes."
      >
        <a className="adm-btn adm-btn--ghost" href={`/imprimir?vista=conferencias&mes=${month}`} target="_blank" rel="noreferrer">
          <Icon name="printer" size={16} /> Imprimir
        </a>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditor({ direction: newDirection })}>
          <Icon name="plus" size={16} /> Agregar conferencia
        </button>
      </PageHeader>

      <div className="adm-tk-month" role="group" aria-label="Mes">
        <button type="button" className="adm-icon-btn" onClick={() => setParam("mes", shiftMonth(month, -1))} aria-label="Mes anterior">
          <Icon name="chevronLeft" size={18} />
        </button>
        <strong>{cap(monthLabel(month))}</strong>
        <button type="button" className="adm-icon-btn" onClick={() => setParam("mes", shiftMonth(month, 1))} aria-label="Mes siguiente">
          <Icon name="chevronRight" size={18} />
        </button>
        {month !== monthKey() && (
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setParam("mes", null)}>Este mes</button>
        )}
      </div>

      {notice && (
        <div className={`adm-alert ${notice.tone === "ok" ? "adm-alert--ok" : "adm-alert--error"}`} role="status">
          <Icon name={notice.tone === "ok" ? "check" : "alert"} size={18} />
          <span>{notice.text}</span>
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}

      <StatGrid label="Resumen de conferencias">
        <StatCard icon="users" tone="teal" label="Vienen" value={incoming.length} hint={`en ${monthLabel(month)}`} />
        <StatCard icon="arrowRight" tone="blue" label="Van" value={outgoing.length} hint={`en ${monthLabel(month)}`} />
        <StatCard
          icon="calendar"
          tone="cyan"
          textValue
          label="Próxima visita"
          value={nextVisit ? sheetDate(nextVisit.date) : "Sin programar"}
          hint={nextVisit ? `${nextVisit.speaker_name} · ${nextVisit.congregation}` : "en este mes"}
        />
        <StatCard icon="userCheck" tone="teal" label="Conferenciantes" value={speakers.length} hint={`${outlinesCount} bosquejos de la congregación`} />
      </StatGrid>

      <div className="adm-wk-views">
        <Segmented
          label="Vista"
          value={view}
          onChange={(key) => setParam("ver", key === "vienen" ? null : key)}
          options={[
            { key: "vienen", label: VIEWS.vienen, count: incoming.length },
            { key: "van", label: VIEWS.van, count: outgoing.length },
            { key: "conferenciantes", label: VIEWS.conferenciantes, count: speakers.length },
            { key: "hoja", label: VIEWS.hoja },
          ]}
        />
      </div>

      {loading ? (
        <Loading>Cargando conferencias…</Loading>
      ) : (
        <>
          {view === "vienen" && (
            <TalksTable
              rows={incoming}
              placeLabel="Viene de"
              empty="No hay conferenciantes que vengan este mes."
              onAdd={() => setEditor({ direction: "incoming" })}
              onEdit={(talk) => setEditor({ talk })}
              onDelete={setToDelete}
            />
          )}
          {view === "van" && (
            <TalksTable
              rows={outgoing}
              placeLabel="Va a"
              empty="Ningún hermano sale a dar conferencia este mes."
              onAdd={() => setEditor({ direction: "outgoing" })}
              onEdit={(talk) => setEditor({ talk })}
              onDelete={setToDelete}
            />
          )}
          {view === "conferenciantes" && (
            <SpeakersCard speakers={speakers} setSpeakers={setSpeakers} catalog={catalog} token={token} logout={logout} onChanged={reload} />
          )}
          {view === "hoja" && <SheetCard month={month} incoming={incoming} outgoing={outgoing} />}
        </>
      )}

      {editor && (
        <TalkEditor
          token={token}
          logout={logout}
          talk={editor.talk || null}
          initialDirection={editor.talk?.direction || editor.direction}
          defaultDate={suggestedDate(month, talks, editor.direction || "incoming")}
          speakers={speakers}
          catalog={catalog}
          visitors={visitors}
          congregations={[...new Set(talks.map((t) => t.congregation).concat(visitors.map((v) => v.congregation)))].filter(Boolean).sort()}
          onClose={() => setEditor(null)}
          onSaved={(saved, isNew) => {
            setEditor(null);
            flash("ok", `${isNew ? "Se agregó" : "Se actualizó"} la conferencia de ${saved.speaker_name} (${sheetDate(saved.date).toLowerCase()}).`);
            if (!saved.date.startsWith(month)) setParam("mes", saved.date.slice(0, 7));
            reload();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog title="Quitar conferencia" confirmLabel="Sí, quitar" onCancel={() => setToDelete(null)} onConfirm={confirmDelete}>
          <p>
            Se quitará la conferencia de <strong>{toDelete.speaker_name}</strong> del {sheetDate(toDelete.date).toLowerCase()} (
            {toDelete.direction === "incoming" ? `viene de ${toDelete.congregation}` : `va a ${toDelete.congregation}`}).
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

// ─── Tabla de conferencias del mes ───────────────────────────────────────────

function TalksTable({ rows, placeLabel, empty, onAdd, onEdit, onDelete }) {
  return (
    <section className="adm-card">
      {rows.length === 0 ? (
        <EmptyState icon="megaphone" title={empty}>
          <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={onAdd} style={{ marginTop: 10 }}>
            <Icon name="plus" size={15} /> Agregar conferencia
          </button>
        </EmptyState>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table adm-table--cards adm-table--cards-md">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Conferenciante</th>
                <th>{placeLabel}</th>
                <th>Bosquejo</th>
                <th>Canción</th>
                <th>Imágenes</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td data-label="Fecha">
                    <span className="adm-cell-strong">{sheetDate(t.date)}</span>
                    <span className="adm-cell-sub">{cap(fromISO(t.date).toLocaleDateString("es", { weekday: "long" }))}</span>
                  </td>
                  <td data-label="Conferenciante">
                    <div className="adm-tk-person">
                      <PersonCell name={t.speaker_name} />
                      {t.phone ? (
                        <a className="adm-cell-sub adm-tk-phone" href={`tel:${t.phone.replace(/[^0-9+]/g, "")}`}>
                          <Icon name="phone" size={13} /> {t.phone}
                        </a>
                      ) : (
                        <span className="adm-cell-sub">Sin teléfono</span>
                      )}
                    </div>
                  </td>
                  <td data-label={placeLabel}><span>{t.congregation}</span></td>
                  <td data-label="Bosquejo">
                    <div className="adm-tk-outline">
                      <span className="adm-tk-num">{t.outline_number}</span>
                      <span>{t.title}</span>
                    </div>
                  </td>
                  <td data-label="Canción">
                    {t.song ? (
                      <span className="adm-tk-song"><Icon name="music" size={14} /> {t.song}</span>
                    ) : (
                      <span className="adm-cell-sub">Sin canción</span>
                    )}
                  </td>
                  <td data-label="Imágenes">
                    <span className={`adm-badge ${t.has_images ? "adm-badge--ok" : "adm-badge--muted"}`}>{t.has_images ? "Sí" : "No"}</span>
                  </td>
                  <td data-label="Acciones" style={{ textAlign: "right" }}>
                    <div className="adm-actions">
                      <button type="button" className="adm-action" onClick={() => onEdit(t)} title="Editar" aria-label={`Editar conferencia de ${t.speaker_name}`}>
                        <Icon name="edit" size={17} />
                      </button>
                      <button type="button" className="adm-action adm-action--danger" onClick={() => onDelete(t)} title="Quitar" aria-label={`Quitar conferencia de ${t.speaker_name}`}>
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Formulario de una conferencia ───────────────────────────────────────────

function YesNo({ value, onChange, label, disabled }) {
  return (
    <div className="adm-field">
      <span className="adm-label">{label}</span>
      <div className="adm-tk-yesno" role="radiogroup" aria-label={label}>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            disabled={disabled}
            className={`adm-tk-choice ${value === v ? "is-on" : ""}`}
            onClick={() => onChange(v)}
          >
            {v ? "Sí" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function SongField({ value, onChange, id = "tk-song" }) {
  return (
    <label className="adm-field" htmlFor={id}>
      <span className="adm-label">Canción (número)</span>
      <input
        id={id}
        className="adm-input"
        type="number"
        inputMode="numeric"
        min="1"
        max="999"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej. 42"
      />
    </label>
  );
}

function TalkEditor({ token, logout, talk, initialDirection, defaultDate, speakers, catalog, visitors, congregations, onClose, onSaved }) {
  const isNew = !talk;
  const [direction, setDirection] = useState(initialDirection);
  const [date, setDate] = useState(talk?.date || defaultDate);
  const [congregation, setCongregation] = useState(talk?.congregation || "");
  const [phone, setPhone] = useState(talk?.phone || "");
  // Vienen
  const [name, setName] = useState(talk?.direction === "incoming" ? talk.speaker_name : "");
  const [number, setNumber] = useState(talk?.direction === "incoming" ? String(talk.outline_number) : "");
  const [title, setTitle] = useState(talk?.direction === "incoming" ? talk.title : "");
  const [hasImages, setHasImages] = useState(talk?.direction === "incoming" ? talk.has_images : null);
  const [song, setSong] = useState(talk?.direction === "incoming" && talk.song ? String(talk.song) : "");
  // Van
  const [studentId, setStudentId] = useState(talk?.direction === "outgoing" && talk.student_id ? String(talk.student_id) : "");
  const speaker = speakers.find((s) => String(s.student_id) === studentId) || null;
  const initialOutline = talk?.direction === "outgoing" && speaker ? speaker.outlines.find((o) => o.number === talk.outline_number) : null;
  const [outlineId, setOutlineId] = useState(initialOutline ? String(initialOutline.id) : "");
  const outline = speaker?.outlines.find((o) => String(o.id) === outlineId) || null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickVisitor = (value) => {
    setName(value);
    const known = visitors.find((v) => v.name.toLowerCase() === value.trim().toLowerCase());
    if (known) {
      if (!phone && known.phone) setPhone(known.phone);
      if (!congregation && known.congregation) setCongregation(known.congregation);
    }
  };

  const pickNumber = (value) => {
    setNumber(value);
    const known = catalog.find((o) => String(o.number) === value.trim());
    if (known && (!title || catalog.some((o) => o.title === title))) setTitle(known.title);
  };

  const pickSpeaker = (value) => {
    setStudentId(value);
    setOutlineId("");
    const s = speakers.find((x) => String(x.student_id) === value);
    setPhone(s?.phone || "");
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    if (direction === "incoming" && hasImages === null) {
      setError("Indica si el discurso tiene imágenes.");
      return;
    }
    const body = { direction, date, congregation, phone: phone || null };
    if (direction === "incoming") {
      Object.assign(body, { speaker_name: name, outline_number: Number(number), title, has_images: hasImages, song: song ? Number(song) : null });
    } else {
      Object.assign(body, { student_id: Number(studentId) || null, outline_id: Number(outlineId) || null });
    }
    setSaving(true);
    try {
      const saved = await api(isNew ? "" : `/${talk.id}`, token, { method: isNew ? "POST" : "PUT", body });
      onSaved(saved, isNew);
    } catch (err) {
      if (err.status === 401) return logout();
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isNew ? "Agregar conferencia" : `Conferencia de ${talk.speaker_name}`} icon="megaphone" size="lg" onClose={onClose} dismissOnBackdrop={false}>
      <form onSubmit={save} className="adm-stack">
        {isNew && (
          <Segmented
            label="Tipo de conferencia"
            value={direction}
            onChange={setDirection}
            options={[
              { key: "incoming", label: "Viene a la congregación" },
              { key: "outgoing", label: "Va a otra congregación" },
            ]}
          />
        )}

        <div className="adm-form-grid">
          <label className="adm-field">
            <span className="adm-label">Fecha</span>
            <input className="adm-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="adm-field">
            <span className="adm-label">{direction === "incoming" ? "Congregación de donde viene" : "Congregación a donde va"}</span>
            <input className="adm-input" list="tk-congregations" value={congregation} onChange={(e) => setCongregation(e.target.value)} placeholder="Ej. Bello Norte" required maxLength={120} />
            <datalist id="tk-congregations">{congregations.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
        </div>

        {direction === "incoming" ? (
          <>
            <div className="adm-form-grid">
              <label className="adm-field">
                <span className="adm-label">Nombre del conferenciante</span>
                <input className="adm-input" list="tk-visitors" value={name} onChange={(e) => pickVisitor(e.target.value)} placeholder="Nombre y apellido" required maxLength={150} />
                <datalist id="tk-visitors">{visitors.map((v) => <option key={v.name} value={v.name}>{v.congregation}</option>)}</datalist>
              </label>
              <label className="adm-field">
                <span className="adm-label">Teléfono</span>
                <input className="adm-input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 300 123 4567" maxLength={30} />
              </label>
            </div>
            <div className="adm-form-grid adm-tk-outline-grid">
              <label className="adm-field">
                <span className="adm-label">Bosquejo (número)</span>
                <input className="adm-input" type="number" min="1" max="9999" list="tk-catalog" value={number} onChange={(e) => pickNumber(e.target.value)} placeholder="Ej. 15" required />
                <datalist id="tk-catalog">{catalog.map((o) => <option key={o.number} value={o.number}>{o.title}</option>)}</datalist>
              </label>
              <label className="adm-field">
                <span className="adm-label">Título del discurso</span>
                <input className="adm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del bosquejo" required maxLength={200} />
              </label>
            </div>
            <div className="adm-form-grid adm-tk-outline-grid">
              <SongField value={song} onChange={setSong} />
              <YesNo label="¿Tiene imágenes?" value={hasImages} onChange={setHasImages} />
            </div>
          </>
        ) : (
          <>
            {speakers.length === 0 ? (
              <div className="adm-alert adm-alert--warn" role="note">
                <Icon name="alert" size={18} />
                <span>Primero agrega a los ancianos y siervos ministeriales que dan conferencias, con sus bosquejos, en la pestaña «Conferenciantes».</span>
              </div>
            ) : (
              <>
                <div className="adm-form-grid">
                  <label className="adm-field">
                    <span className="adm-label">Conferenciante de la congregación</span>
                    <select className="adm-input" value={studentId} onChange={(e) => pickSpeaker(e.target.value)} required>
                      <option value="">— Elige al hermano —</option>
                      {speakers.map((s) => (
                        <option key={s.student_id} value={s.student_id} disabled={!s.eligible || s.outlines.length === 0}>
                          {s.name}
                          {!s.eligible ? " (ya no es anciano ni siervo)" : s.outlines.length === 0 ? " (sin bosquejos)" : ` · ${s.outlines.length} bosquejo${s.outlines.length === 1 ? "" : "s"}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="adm-field">
                    <span className="adm-label">Teléfono</span>
                    <input className="adm-input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 300 123 4567" maxLength={30} />
                    <span className="adm-help">Sale de su perfil; puedes cambiarlo solo para esta conferencia.</span>
                  </label>
                </div>
                <label className="adm-field">
                  <span className="adm-label">Bosquejo</span>
                  <select className="adm-input" value={outlineId} onChange={(e) => setOutlineId(e.target.value)} required disabled={!speaker}>
                    <option value="">{speaker ? "— Elige uno de sus bosquejos —" : "Primero elige al hermano"}</option>
                    {speaker?.outlines.map((o) => (
                      <option key={o.id} value={o.id}>{o.number} · {o.title}{o.has_images ? " (con imágenes)" : ""}</option>
                    ))}
                  </select>
                  {talk && !initialOutline && !outlineId && (
                    <span className="adm-help">El bosquejo {talk.outline_number} ya no está en su lista; elige otro para guardar cambios.</span>
                  )}
                </label>
                {outline && (
                  <p className="adm-help">
                    Título: <strong>{outline.title}</strong> · Imágenes: <strong>{outline.has_images ? "sí" : "no"}</strong> · Canción:{" "}
                    {outline.song ? <strong>{outline.song}</strong> : <>sin canción (agrégala en el bosquejo, pestaña «Conferenciantes»)</>}
                  </p>
                )}
              </>
            )}
          </>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="adm-modal-foot adm-modal-foot--inline">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || (direction === "outgoing" && speakers.length === 0)}>
            {saving ? "Guardando…" : isNew ? "Agregar" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Conferenciantes de la congregación ──────────────────────────────────────

function SpeakersCard({ speakers, setSpeakers, catalog, token, logout, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [phoneFor, setPhoneFor] = useState(null);   // speaker
  const [outlineFor, setOutlineFor] = useState(null); // { speaker, outline? }
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");

  const replace = (updated) => setSpeakers((prev) => prev.map((s) => (s.student_id === updated.student_id ? updated : s)));

  const removeOutline = async (speaker, outline) => {
    setError("");
    try {
      replace(await api(`/speakers/${speaker.student_id}/outlines/${outline.id}`, token, { method: "DELETE" }));
    } catch (err) {
      if (err.status === 401) return logout();
      setError(err.message);
    }
  };

  const removeSpeaker = async () => {
    const speaker = removing;
    setRemoving(null);
    try {
      await api(`/speakers/${speaker.student_id}`, token, { method: "DELETE" });
      onChanged();
    } catch (err) {
      if (err.status === 401) return logout();
      setError(err.message);
    }
  };

  return (
    <section className="adm-card">
      <div className="adm-card-head adm-card-head--line">
        <div>
          <h3 className="adm-card-title"><Icon name="userCheck" size={18} /> Conferenciantes de la congregación</h3>
          <p className="adm-card-sub">Solo ancianos y siervos ministeriales. Cada uno con su teléfono y los bosquejos que puede presentar.</p>
        </div>
        <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={() => setAdding(true)}>
          <Icon name="plus" size={15} /> Agregar conferenciante
        </button>
      </div>
      <div className="adm-card-body">
        {error && <ErrorNote>{error}</ErrorNote>}
        {speakers.length === 0 ? (
          <EmptyState icon="users" title="Todavía no hay conferenciantes.">Agrega a los ancianos y siervos ministeriales que dan conferencias y sus bosquejos.</EmptyState>
        ) : (
          <div className="adm-tk-speakers">
            {speakers.map((s) => (
              <article key={s.student_id} className={`adm-tk-speaker ${s.eligible ? "" : "adm-tk-speaker--off"}`}>
                <header className="adm-tk-speaker-head">
                  <span className="adm-tk-speaker-name">
                    <PersonCell name={s.name} />
                    {s.privilege && <span className="adm-tag adm-tag--deep">{s.privilege}</span>}
                  </span>
                  <div className="adm-actions">
                    <button type="button" className="adm-action" onClick={() => setPhoneFor(s)} title="Editar teléfono" aria-label={`Editar teléfono de ${s.name}`}>
                      <Icon name="phone" size={16} />
                    </button>
                    <button type="button" className="adm-action adm-action--danger" onClick={() => setRemoving(s)} title="Quitar de la lista" aria-label={`Quitar a ${s.name}`}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </header>
                {!s.eligible && (
                  <p className="adm-tk-speaker-warn">
                    <Icon name="alert" size={14} /> {s.problem} No se le pueden programar salidas; actualízalo en Estudiantes o quítalo de la lista.
                  </p>
                )}
                <div className="adm-tk-speaker-meta">
                  {s.phone ? (
                    <a className="adm-tk-phone" href={`tel:${s.phone.replace(/[^0-9+]/g, "")}`}><Icon name="phone" size={13} /> {s.phone}</a>
                  ) : (
                    <span className="adm-muted">Sin teléfono</span>
                  )}
                  <span className="adm-muted">
                    {s.talks_count ? `${s.talks_count} salida${s.talks_count === 1 ? "" : "s"} · última ${shortDate(s.last_talk)}` : "Sin salidas registradas"}
                  </span>
                </div>
                {s.outlines.length === 0 ? (
                  <p className="adm-help">Sin bosquejos. Agrega al menos uno para poder programarlo.</p>
                ) : (
                  <ul className="adm-tk-outlines">
                    {s.outlines.map((o) => (
                      <li key={o.id}>
                        <span className="adm-tk-num">{o.number}</span>
                        <span className="adm-tk-outline-title">{o.title}</span>
                        <span className="adm-tk-tags">
                          {o.song ? (
                            <span className="adm-tag adm-tag--blue"><Icon name="music" size={12} /> Canción {o.song}</span>
                          ) : (
                            <span className="adm-tag adm-tag--muted">Sin canción</span>
                          )}
                          {o.has_images && <span className="adm-tag adm-tag--ok">Imágenes</span>}
                        </span>
                        <span className="adm-actions">
                          <button type="button" className="adm-action" onClick={() => setOutlineFor({ speaker: s, outline: o })} aria-label={`Editar bosquejo ${o.number}`}>
                            <Icon name="edit" size={15} />
                          </button>
                          <button type="button" className="adm-action adm-action--danger" onClick={() => removeOutline(s, o)} aria-label={`Quitar bosquejo ${o.number}`}>
                            <Icon name="x" size={15} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-tk-add" onClick={() => setOutlineFor({ speaker: s })}>
                  <Icon name="plus" size={14} /> Agregar bosquejo
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {adding && <AddSpeakerModal token={token} logout={logout} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); onChanged(); }} />}
      {phoneFor && (
        <PhoneModal
          speaker={phoneFor}
          token={token}
          logout={logout}
          onClose={() => setPhoneFor(null)}
          onSaved={(updated) => { replace(updated); setPhoneFor(null); }}
        />
      )}
      {outlineFor && (
        <OutlineModal
          {...outlineFor}
          catalog={catalog}
          token={token}
          logout={logout}
          onClose={() => setOutlineFor(null)}
          onSaved={(updated) => { replace(updated); setOutlineFor(null); onChanged(); }}
        />
      )}
      {removing && (
        <ConfirmDialog title="Quitar conferenciante" confirmLabel="Sí, quitar" onCancel={() => setRemoving(null)} onConfirm={removeSpeaker}>
          <p>Se quitará a <strong>{removing.name}</strong> y sus bosquejos de la lista. Las conferencias ya programadas no cambian.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}

function AddSpeakerModal({ token, logout, onClose, onSaved }) {
  const [options, setOptions] = useState(null);
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api("/speakers/eligible", token)
      .then((data) => { if (!cancelled) setOptions(data); })
      .catch((err) => { if (cancelled) return; if (err.status === 401) logout(); else setError(err.message); });
    return () => { cancelled = true; };
  }, [token, logout]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/speakers", token, { method: "POST", body: { student_id: Number(studentId), phone: phone || null } });
      onSaved();
    } catch (err) {
      if (err.status === 401) return logout();
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Agregar conferenciante" icon="userCheck" onClose={onClose} dismissOnBackdrop={false}>
      <form onSubmit={save} className="adm-stack">
        {!options && !error && <Loading>Cargando hermanos…</Loading>}
        {options && (
          <>
            <label className="adm-field">
              <span className="adm-label">Hermano</span>
              <select className="adm-input" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                <option value="">— Elige al hermano —</option>
                {options.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.privilege}</option>)}
              </select>
              <span className="adm-help">
                {options.length
                  ? "Ancianos y siervos ministeriales activos que todavía no están en la lista."
                  : "No hay más ancianos ni siervos ministeriales para agregar. Revisa en Estudiantes que tengan marcado Anciano o Siervo."}
              </span>
            </label>
            <label className="adm-field">
              <span className="adm-label">Teléfono</span>
              <input className="adm-input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 300 123 4567" maxLength={30} />
            </label>
          </>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="adm-modal-foot adm-modal-foot--inline">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || !studentId}>{saving ? "Guardando…" : "Agregar"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PhoneModal({ speaker, token, logout, onClose, onSaved }) {
  const [phone, setPhone] = useState(speaker.phone || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved(await api(`/speakers/${speaker.student_id}`, token, { method: "PUT", body: { phone: phone || null } }));
    } catch (err) {
      if (err.status === 401) return logout();
      setError(err.message);
      setSaving(false);
    }
  };
  return (
    <Modal title={`Teléfono de ${speaker.name}`} icon="phone" onClose={onClose}>
      <form onSubmit={save} className="adm-stack">
        <label className="adm-field">
          <span className="adm-label">Teléfono</span>
          <input className="adm-input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 300 123 4567" maxLength={30} autoFocus />
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="adm-modal-foot adm-modal-foot--inline">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Modal>
  );
}

function OutlineModal({ speaker, outline, catalog, token, logout, onClose, onSaved }) {
  const [number, setNumber] = useState(outline ? String(outline.number) : "");
  const [title, setTitle] = useState(outline?.title || "");
  const [hasImages, setHasImages] = useState(outline ? outline.has_images : null);
  const [song, setSong] = useState(outline?.song ? String(outline.song) : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const pickNumber = (value) => {
    setNumber(value);
    const known = catalog.find((o) => String(o.number) === value.trim());
    if (known && (!title || catalog.some((o) => o.title === title))) setTitle(known.title);
  };

  const save = async (e) => {
    e.preventDefault();
    if (hasImages === null) {
      setError("Indica si el discurso tiene imágenes.");
      return;
    }
    setSaving(true);
    setError("");
    const body = { number: Number(number), title, has_images: hasImages, song: song ? Number(song) : null };
    const path = outline ? `/speakers/${speaker.student_id}/outlines/${outline.id}` : `/speakers/${speaker.student_id}/outlines`;
    try {
      onSaved(await api(path, token, { method: outline ? "PUT" : "POST", body }));
    } catch (err) {
      if (err.status === 401) return logout();
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={`${outline ? "Editar" : "Agregar"} bosquejo · ${speaker.name}`} icon="fileText" onClose={onClose} dismissOnBackdrop={false}>
      <form onSubmit={save} className="adm-stack">
        <div className="adm-form-grid adm-tk-outline-grid">
          <label className="adm-field">
            <span className="adm-label">Bosquejo (número)</span>
            <input className="adm-input" type="number" min="1" max="9999" list="tk-catalog-sp" value={number} onChange={(e) => pickNumber(e.target.value)} placeholder="Ej. 15" required autoFocus />
            <datalist id="tk-catalog-sp">{catalog.map((o) => <option key={o.number} value={o.number}>{o.title}</option>)}</datalist>
          </label>
          <label className="adm-field">
            <span className="adm-label">Título del discurso</span>
            <input className="adm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del bosquejo" required maxLength={200} />
          </label>
        </div>
        <div className="adm-form-grid adm-tk-outline-grid">
          <SongField id="tk-song-sp" value={song} onChange={setSong} />
          <YesNo label="¿Tiene imágenes?" value={hasImages} onChange={setHasImages} />
        </div>
        {outline && <p className="adm-help">Las salidas ya programadas desde hoy con este bosquejo también se actualizan.</p>}
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="adm-modal-foot adm-modal-foot--inline">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>{saving ? "Guardando…" : outline ? "Guardar" : "Agregar"}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Hoja para imprimir ──────────────────────────────────────────────────────

function SheetCard({ month, incoming, outgoing }) {
  const [withPhone, setWithPhone] = useState(false);
  return (
    <section className="adm-card">
      <div className="adm-card-head adm-card-head--line">
        <div>
          <h3 className="adm-card-title"><Icon name="printer" size={18} /> Hoja de {monthLabel(month)}</h3>
          <p className="adm-card-sub">La hoja pública de Ver Imprimible no muestra teléfonos; aquí puedes agregarlos para tu copia.</p>
        </div>
      </div>
      <div className="adm-card-body">
        <div className="adm-param-row">
          <button
            type="button"
            className={`adm-toggle ${withPhone ? "is-on" : ""}`}
            aria-pressed={withPhone}
            onClick={() => setWithPhone((v) => !v)}
            style={{ height: "42px" }}
          >
            Mostrar teléfonos
            <span className="adm-toggle-dot" aria-hidden="true" />
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" style={{ height: "42px" }} onClick={() => downloadSheetPDF("tk-sheet-panel", `conferencias_${month}.pdf`)}>
            <Icon name="fileText" size={16} /> Descargar PDF
          </button>
          <a className="adm-btn adm-btn--primary" style={{ height: "42px" }} href={`/imprimir?vista=conferencias&mes=${month}`} target="_blank" rel="noreferrer">
            <Icon name="printer" size={16} /> Abrir para imprimir
          </a>
        </div>
        <div className="adm-wk-paper">
          <TalksSheet id="tk-sheet-panel" month={month} incoming={incoming} outgoing={outgoing} withPhone={withPhone} />
        </div>
      </div>
    </section>
  );
}
