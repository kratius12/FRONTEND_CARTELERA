import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MeetingFlipBook from "./MeetingFlipBook";

export default function App() {
  const { id } = useParams();
  const navigate = useNavigate();

  const programId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n >= 1 ? n : 1;
  }, [id]);

  const [program, setProgram] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 👇 null = todavía no sé, true = existe, false = no existe
  const [nextExists, setNextExists] = useState(null);

  const goTo = (newId) => {
    const n = Number(newId);
    if (!Number.isFinite(n) || n < 1) return;
    navigate(`/programs/${n}`);
  };

  // Cargar programa actual
  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setProgram(null);
    setError("");

    fetch(`https://backendcartelera-production.up.railway.app/api/programs/${programId}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) throw new Error(`No existe el programa #${programId}`);
        if (!res.ok) throw new Error("No se pudo cargar la cartelera");
        return res.json();
      })
      .then(setProgram)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [programId]);

  // Verificar si existe el siguiente
  useEffect(() => {
    const controller = new AbortController();

    // 👇 IMPORTANTE: al cambiar programId, vuelve a "desconocido"
    setNextExists(null);

    fetch(`http://localhost:3001/api/programs/${programId + 1}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) return setNextExists(false);
        if (!res.ok) return setNextExists(false);
        setNextExists(true);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setNextExists(false);
      });

    return () => controller.abort();
  }, [programId]);

  if (loading) return <div className="center-screen">Cargando…</div>;
  if (error) return <div className="center-screen error">{error}</div>;
  if (!program) return null;

  return (
    <MeetingFlipBook
      program={program}
      programId={programId}
      onPrev={() => goTo(programId - 1)}
      onNext={() => goTo(programId + 1)}
      // 👇 isLast solo cuando nextExists ya se sabe
      isLast={nextExists === false}
      // opcional: para mostrar “verificando…”
      checkingNext={nextExists === null}
    />
  );
}
