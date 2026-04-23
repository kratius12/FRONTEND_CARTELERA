import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MeetingFlipBook from "./MeetingFlipBook";
import ThemeToggle from "./components/ThemeToggle";
import { AuthContext } from "./context/AuthContext";

const API = import.meta.env.VITE_API_URL || "";

export default function StagingPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, logout } = useContext(AuthContext);
  const [program, setProgram] = useState(null);
  const [stagingList, setStagingList] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Cargar programa actual
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setProgram(null);
    setError("");

    fetch(`${API}/api/programs/staging/${id}`, { 
      signal: controller.signal
    })
      .then((res) => {
        if (res.status === 404) throw new Error(`No existe el borrador #${id}`);
        if (!res.ok) throw new Error("No se pudo cargar la vista previa");
        return res.json();
      })
      .then((data) => {
          setProgram(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id, token, logout]);

  // Cargar lista de borradores para la navegación
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/admin/programs/staging`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
        // Ordenar por semana desc (más reciente primero)
        const sorted = data.sort((a, b) => new Date(b.week_start) - new Date(a.week_start));
        setStagingList(sorted);
    })
    .catch(console.error);
  }, [token]);

  const currentIndex = stagingList.findIndex(p => p.id === Number(id));
  const nextDraft = currentIndex > 0 ? stagingList[currentIndex - 1] : null;
  const prevDraft = currentIndex < stagingList.length - 1 && currentIndex !== -1 ? stagingList[currentIndex + 1] : null;

  if (loading) return <div className="center-screen">Cargando vista previa…</div>;
  if (error) return <div className="center-screen error">{error}</div>;
  if (!program) return null;

  return (
    <>
      <div className="preview-badge no-print">
        VISTA PREVIA DE BORRADOR
      </div>
      <MeetingFlipBook
        program={program}
        programId={`Borrador-${id}`}
        onPrev={() => prevDraft && navigate(`/staging/${prevDraft.id}`)}
        onNext={() => nextDraft && navigate(`/staging/${nextDraft.id}`)}
        isLast={!nextDraft}
      />
      <div 
        className="floating-theme-toggle no-print" 
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          borderRadius: "50%"
        }}
      >
        <ThemeToggle />
      </div>

      <style>{`
        .preview-badge {
            position: fixed;
            top: 10px;
            right: 80px;
            background: #facc15;
            color: #854d0e;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
      `}</style>
    </>
  );
}
