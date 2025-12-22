// src/ProgramPage.jsx
export default function ProgramPage({ program }) {
  const { meta, parts = [], title } = program;

  // Helpers para header (primer canción + intro)
  const firstSong = parts.find((p) => p.type === "song")?.text || "";
  const intro = parts.find((p) => p.type === "intro");
  const introText = intro?.text || "Palabras de introducción";
  const introMinutes = intro?.minutes ?? 1;

  // Partimos el contenido en:
  // - secciones (type=section)
  // - canciones sueltas (song) / outro, etc.
  const sections = parts.filter((p) => p.type === "section");

  // Canciones sueltas para "Nuestra vida cristiana" (como en tu template)
  // (Si tú las manejas dentro de la sección, esto se puede simplificar)
  const song2 = parts.find((p) => p.type === "song" && p.text?.includes("2"))?.text || "Canción 2";
  const outro = parts.find((p) => p.type === "outro");

  return (
    <main className="page">
      <header>
        <div className="topline">
          <div className="oriente">ORIENTE</div>
          <h1 className="title">{title}</h1>
          <div style={{ width: 110 }}></div>
        </div>

        <div className="header-rule"></div>

        <div className="meta">
          <div>
            <div className="meta-left">
              {meta?.rangeText}&nbsp;&nbsp;|&nbsp;&nbsp;{meta?.readingText}
            </div>

            <ul className="clean">
              <li>{firstSong}</li>
              <li>
                {introText}&nbsp;&nbsp;<span className="muted">({introMinutes} min.)</span>
              </li>
            </ul>
          </div>

          <div className="meta-right">
            <div>
              <span className="label">Presidente:</span> {meta?.president}
            </div>
            <div>
              <span className="label">Oración:</span> {meta?.openingPrayer}
            </div>
          </div>
        </div>
      </header>

      {/* Render EXACTO por secciones */}
      {sections.map((sec, idx) => {
        const isTwoCol = Array.isArray(sec.columns) && sec.columns.length === 2;

        return (
          <section className="section" key={idx}>
            <div className={`bar ${sec.style}`}>{sec.title}</div>

            {/* Encabezado Estudiante/Ayudante si aplica */}
            {isTwoCol && (
              <div className="twohead">
                <div></div>
                <div className="right">
                  <div>{sec.columns[0]}</div>
                  <div>{sec.columns[1]}</div>
                </div>
              </div>
            )}

            <div className="rows">
              {(sec.items || []).map((it, i) => (
                <div className={`row ${isTwoCol ? "twocol" : ""}`} key={i}>
                  <div className="left">
                    {/* number viene del backend o lo calculamos después; por ahora soporta ambos */}
                    {it.number ? `${it.number}. ` : ""}
                    {it.text}{" "}
                    {typeof it.minutes === "number" ? (
                      <span className="muted">({it.minutes} mins.)</span>
                    ) : null}
                  </div>

                  {/* Right */}
                  {!isTwoCol ? (
                    <div className="right">
                      {it.noteLabel ? (
                        <>
                          <div>
                            <span className="muted" style={{ fontWeight: 700 }}>
                              {it.noteLabel}
                            </span>
                          </div>
                          <div>{it.assigned?.[0] || ""}</div>
                        </>
                      ) : (
                        it.assigned?.[0] || ""
                      )}
                    </div>
                  ) : (
                    <div className="right">
                      <div>{it.assigned?.[0] || ""}</div>
                      <div>{it.assigned?.[1] || ""}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bloquecitos extra solo para "Nuestra vida cristiana" si quieres igualito al template */}
            {sec.title?.toLowerCase().includes("nuestra vida cristiana") && (
              <>
                <ul className="clean" style={{ marginTop: 10 }}>
                  <li>{outro?.text ? `${outro.text} ` : "Palabras de conclusión "}
                    <span className="muted">({outro?.minutes ?? 3} min.)</span>
                  </li>
                  <li>{parts.find((p) => p.type === "song" && p.text?.includes("21"))?.text || "Canción 21"}</li>
                </ul>

                <div className="meta-right" style={{ marginTop: 8 }}>
                  <div>
                    <span className="label">Oración:</span> {meta?.closingPrayer}
                  </div>
                </div>
              </>
            )}
          </section>
        );
      })}
    </main>
  );
}
