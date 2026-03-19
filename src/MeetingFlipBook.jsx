import { useEffect, useMemo, useState } from "react";
import "./MeetingFlipBook.css";

export default function MeetingFlipBook({
  program,
  programId,
  onPrev,
  onNext,
  isLast,
  checkingNext = false,
  onGoTo,
}) {
  const meta = program?.meta || {};
  const parts = Array.isArray(program?.parts) ? program.parts : [];
  const pageTitle = program?.title || "Programa para la reunión de entre semana";

  /* =========================
     DIVISIÓN DE PARTES
  ========================== */
  const firstSectionIdx = parts.findIndex((p) => p?.type === "section");
  const lastSectionIdx = (() => {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i]?.type === "section") return i;
    }
    return -1;
  })();

  const pre = firstSectionIdx === -1 ? parts : parts.slice(0, firstSectionIdx);

  const sections =
    firstSectionIdx === -1
      ? []
      : parts
          .slice(firstSectionIdx, lastSectionIdx + 1)
          .filter((p) => p?.type === "section");

  const post = lastSectionIdx === -1 ? [] : parts.slice(lastSectionIdx + 1);

  /* =========================
     HELPERS
  ========================== */
  const barClassByStyle = (style) => {
    if (style === "gray") return "gray";
    if (style === "gold") return "gold";
    if (style === "wine") return "wine";
    return "gray";
  };

  const renderBullets = (items) => {
    const bullets = (items || []).filter((p) => p && p.type !== "section");
    if (bullets.length === 0) return null;

    return (
      <ul className="clean">
        {bullets.map((p, i) => (
          <li key={i}>
            {p.type === "song" && !p.text?.toLowerCase().startsWith("canción") ? `Canción ${p.text}` : p.text}
            {p.minutes ? (
              <span className="muted">&nbsp;&nbsp;({p.minutes} min.)</span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  };

  const getSectionColumns = (section) => {
    if (Array.isArray(section?.columns) && section.columns.length === 2)
      return section.columns;

    const inferred =
      Array.isArray(section?.items) &&
      section.items.some((i) => (i?.assigned?.length || 0) >= 2);

    return inferred ? ["Estudiante", "Ayudante"] : null;
  };

  /* =========================
     CONTADOR GLOBAL
  ========================== */
  let globalCounter = 0;

  /* =========================
     PAGINADOR (UI)
  ========================== */
  const [jump, setJump] = useState(String(programId));

  useEffect(() => setJump(String(programId)), [programId]);

  const canGo = useMemo(() => /^\d+$/.test(jump) && Number(jump) >= 1, [jump]);

  const handleGo = () => {
    if (!onGoTo) return;
    if (!canGo) return;
    onGoTo(Number(jump));
  };

  /* =========================
     RENDER
  ========================== */
  return (
    <div className="flipbook-container">
    <main className="page">
      {/* ===== PAGINADOR BONITO ===== */}
      <div className="pager">
        <button
          className="pager__btn"
          onClick={onPrev}
          disabled={programId <= 1}
          title="Ir al programa anterior"
        >
          <span aria-hidden>←</span> Anterior
        </button>


        <button
          className="pager__btn"
          onClick={onNext}
          // si estás verificando, NO bloquees; bloquea solo cuando ya sabes que es el último
          disabled={!checkingNext && isLast}
          title="Ir al siguiente programa"
        >
          Siguiente <span aria-hidden>→</span>
        </button>

        <div className="pager__spacer" />

        {/* Ir a... (solo si pasas onGoTo) */}
        {onGoTo && (
          <div className="pager__goto">
            <span className="pager__hint">Ir a:</span>
            <input
              className="pager__input"
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              inputMode="numeric"
              placeholder="Ej: 12"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGo();
              }}
            />
            <button className="pager__go" disabled={!canGo} onClick={handleGo}>
              GO
            </button>
          </div>
        )}

        {checkingNext ? (
          <span className="pager__hint">verificando…</span>
        ) : isLast ? (
          <span className="pager__hint">último</span>
        ) : null}
      </div>

      {/* ===== HEADER ===== */}
      <header>
        <div className="topline">
          <div className="oriente">ORIENTE</div>
          <h1 className="title">{pageTitle}</h1>
          <div style={{ width: 110 }} />
        </div>

        <div className="header-rule" />

        <div className="meta">
          <div>
            <div className="meta-left">
              {(meta.rangeText || "").toUpperCase()}
              {meta.readingText && (
                <>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  {(meta.readingText || "").toUpperCase()}
                </>
              )}
            </div>

            {/* Canción + introducción */}
            {renderBullets(pre)}
          </div>

          <div className="meta-right">
            {meta.president && (
              <div>
                <span className="label">Presidente:</span> {meta.president}
              </div>
            )}
            {meta.openingPrayer && (
              <div>
                <span className="label">Oración:</span> {meta.openingPrayer}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== SECCIONES ===== */}
      {sections.map((section, sIdx) => {
        const barColor = barClassByStyle(section.style);
        const columns = getSectionColumns(section);

        const items = Array.isArray(section.items) ? section.items : [];
        const sectionSongs = items.filter((i) => i?.type === "song");
        const rows = items.filter((i) => i?.type !== "song");

        return (
          <section className="section" key={sIdx}>
            <div className={`bar ${barColor}`}>
              {(section.title || "Sección").toUpperCase()}
            </div>

            {/* Canciones dentro de sección */}
            {sectionSongs.length > 0 && renderBullets(sectionSongs)}

            {/* Header columnas */}
            {columns && (
              <div className="twohead">
                <div />
                <div className="right">
                  <div>{columns[0]}</div>
                  <div>{columns[1]}</div>
                </div>
              </div>
            )}

            <div className="rows">
              {rows.map((item, i) => {
                globalCounter += 1;

                const assigned = Array.isArray(item.assigned) ? item.assigned : [];

                const rightContent = columns ? (
                  <div className="right">
                    <div>{assigned[0] || ""}</div>
                    <div>{assigned[1] || ""}</div>
                  </div>
                ) : item.noteLabel ? (
                  <div className="right">
                    <div className="muted" style={{ fontWeight: 700 }}>
                      {item.noteLabel}
                    </div>
                    <div>{assigned.join(", ")}</div>
                  </div>
                ) : (
                  <div className="right">{assigned.join(", ")}</div>
                );

                return (
                  <div key={i} className={`row ${columns ? "twocol" : ""}`}>
                    <div className="left">
                      {globalCounter}. {item.text}{" "}
                      {item.minutes && (
                        <span className="muted">({item.minutes} mins.)</span>
                      )}
                    </div>
                    {rightContent}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ===== FINAL ===== */}
      {(post.length > 0 || meta.closingPrayer) && (
        <section className="section">
          {renderBullets(post)}

          {meta.closingPrayer && (
            <div className="meta-right" style={{ marginTop: 8 }}>
              <div>
                <span className="label">Oración:</span> {meta.closingPrayer}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
    </div>
  );
}
