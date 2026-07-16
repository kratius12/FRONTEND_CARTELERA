import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./PrintGroups.css";

const API = import.meta.env.VITE_API_URL || "";

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

        if (res.status === 401 || res.status === 403) {
          logout();
          return;
        }

        if (!res.ok) throw new Error("No se pudo cargar la información de grupos.");
        const data = await res.json();
        const assignedGroups = Array.isArray(data)
          ? data.filter((group) => Array.isArray(group.students) && group.students.length > 0)
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

  if (loading) {
    return <div className="print-groups-page">Cargando grupos...</div>;
  }

  if (error) {
    return <div className="print-groups-page error-message">{error}</div>;
  }

  return (
    <div className="print-groups-page">
      <div className="print-controls no-print">
        <div className="print-controls-inner">
          <button className="print-btn" onClick={() => window.print()}>
            🖨️ Imprimir
          </button>
          <span className="print-help">Se omiten los estudiantes sin grupo asignado.</span>
        </div>
      </div>

      <div className="print-groups-content" id="printable-groups-area">
        <header className="print-title-block">
          <div className="print-header-top">
            <span>GRUPOS DE SERVICIO</span>
            <strong>CONGREGACIÓN ORIENTE</strong>
          </div>
          <h1>Grupos con estudiantes asignados</h1>
          <p>Solo se muestran los grupos que tienen estudiantes asignados.</p>
        </header>

        {groups.length === 0 ? (
          <div className="no-groups">No hay grupos con estudiantes asignados.</div>
        ) : (
          <div className="print-groups-grid">
            {groups.map((group) => (
              <section key={group.id} className="group-card">
                <div className="group-card-title">
                  <div className="group-card-meta">{group.name.toUpperCase()}</div>
                  <div className="group-card-name">Grupo {group.name.replace(/[^0-9]/g, '') || group.name}</div>
                </div>
                <ol className="group-list">
                  {group.students.map((student, index) => (
                    <li key={`${group.id}-${student.id}`} className="group-item">
                      <span className="group-item-index">{index + 1}</span>
                      <span className="group-item-name">{student.name}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
