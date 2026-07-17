import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./PrintGroups.css";

const API = import.meta.env.VITE_API_URL || "";

function getLeaderLine(students) {
  const encargado = students.find((s) => s.group_info?.role === "Encargado");
  const auxiliar = students.find((s) => s.group_info?.role === "Auxiliar");
  if (encargado && auxiliar) return `${encargado.name} y ${auxiliar.name}`;
  if (encargado) return encargado.name;
  if (auxiliar) return auxiliar.name;
  return "";
}

function getGroupNumber(name) {
  const match = name.match(/\d+/);
  return match ? match[0] : name;
}

function downloadPDF() {
  const element = document.getElementById("pg-printable");
  const opt = {
    margin: [0.3, 0.3, 0.3, 0.3],
    filename: "grupos_de_servicio.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 3, useCORS: true, logging: false },
    jsPDF: { unit: "cm", format: "letter", orientation: "portrait" },
  };
  window.html2pdf().from(element).set(opt).save();
}

export default function PrintGroups() {
  const { token, logout } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      if (!token) {
        setError("Necesitas iniciar sesión para ver esta página.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/groups/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) { logout(); return; }
        if (!res.ok) throw new Error("No se pudo cargar la información de grupos.");
        const data = await res.json();
        const assignedGroups = Array.isArray(data)
          ? data.filter((g) => Array.isArray(g.students) && g.students.length > 0)
          : [];
        setGroups(assignedGroups);
      } catch (err) {
        setError(err.message || "Error desconocido al cargar grupos.");
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [token, logout]);

  if (loading) return <div className="pg-page">Cargando grupos...</div>;
  if (error) return <div className="pg-page pg-error">{error}</div>;

  return (
    <div className="pg-page">
      <div className="pg-toolbar no-print">
        <button className="pg-btn-back" onClick={() => window.location.href = "/imprimir"}>
          ← Volver
        </button>
        <button className="pg-btn-pdf" onClick={downloadPDF}>
          📥 Descargar PDF
        </button>
        <button className="pg-btn-print" onClick={() => window.print()}>
          🖨️ Imprimir
        </button>
      </div>

      <div className="pg-content" id="pg-printable">
        <header className="pg-header">
          <div className="pg-header-title">GRUPOS DE SERVICIO</div>
          <div className="pg-header-sub">CONGREGACIÓN ORIENTE</div>
        </header>

        {groups.length === 0 ? (
          <div className="pg-empty">No hay grupos con estudiantes asignados.</div>
        ) : (
          <div className="pg-grid">
            {groups.map((group, i) => {
              const leaderLine = getLeaderLine(group.students);
              const groupNum = getGroupNumber(group.name);
              const colorClass = i <= 2 ? "pg-card--teal" : "pg-card--salmon";
              return (
                <section key={group.id} className={`pg-card ${colorClass}`}>
                  <div className="pg-card-leaders-bar">{leaderLine || " "}</div>
                  <div className="pg-card-num-bar">GRUPO {groupNum}</div>
                  <ol className="pg-list">
                    {[...group.students]
                      .sort((a, b) => a.name.localeCompare(b.name, "es"))
                      .map((student, idx) => (
                        <li key={`${group.id}-${student.id}`} className="pg-item">
                          <span className="pg-item-num">{idx + 1}.</span>
                          <span className="pg-item-name">{student.name}</span>
                        </li>
                      ))}
                  </ol>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
