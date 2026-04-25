import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./AdminPage.css";

const API = import.meta.env.VITE_API_URL || "";

export default function GroupBoard() {
  const { token, logout } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [movingId, setMovingId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerms, setSearchTerms] = useState({});

  const handleSearchChange = (id, value) => {
    setSearchTerms(prev => ({ ...prev, [id]: value }));
  };

  const filterStudents = (students, term) => {
    if (!term) return students;
    return students.filter(s => 
      s.name.toLowerCase().includes(term.toLowerCase())
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, studentsRes] = await Promise.all([
        fetch(`${API}/api/groups/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/students`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (groupsRes.status === 401 || studentsRes.status === 401) {
        logout();
        return;
      }

      if (!groupsRes.ok || !studentsRes.ok) throw new Error("Error al cargar datos");

      const [groupsData, studentsData] = await Promise.all([
        groupsRes.json(),
        studentsRes.json(),
      ]);

      setGroups(groupsData);
      setAllStudents(studentsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch(`${API}/api/groups/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newGroupName }),
      });
      if (!res.ok) throw new Error("Error al crear grupo");
      setNewGroupName("");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDragStart = (e, studentId, sourceGroupId) => {
    e.dataTransfer.setData("studentId", studentId);
    e.dataTransfer.setData("sourceGroupId", sourceGroupId || "");
    setMovingId(studentId);
  };

  const handleDragEnd = () => {
    setMovingId(null);
  };

  const handleDrop = async (e, targetGroupId) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData("studentId");
    const sourceGroupId = e.dataTransfer.getData("sourceGroupId");

    if (sourceGroupId === targetGroupId) return;

    // Optimistic UI Update
    const student = allStudents.find(s => Number(s.id) === Number(studentId));
    if (!student) return;

    // Local update
    setGroups(prev => prev.map(g => {
      if (String(g.id) === String(sourceGroupId)) {
        return { ...g, students: g.students.filter(s => Number(s.id) !== Number(studentId)) };
      }
      if (String(g.id) === String(targetGroupId)) {
        return { ...g, students: [...g.students, student] };
      }
      return g;
    }));

    try {
      if (sourceGroupId && sourceGroupId !== "") {
        await fetch(`${API}/api/groups/${sourceGroupId}/students/${studentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (targetGroupId) {
        const res = await fetch(`${API}/api/groups/${targetGroupId}/students`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ student_id: Number(studentId) }),
        });
        if (!res.ok) throw new Error("Error al mover estudiante");
      }
      fetchData();
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSetRole = async (student, role) => {
    const group = groups.find(g => g.students.some(s => s.id === student.id));
    if (!group) return;
    
    try {
      const res = await fetch(`${API}/api/groups/${group.id}/students/${student.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ info_add: { role } }),
      });
      if (!res.ok) throw new Error("Error al asignar rol");
      fetchData();
      setSelectedStudent(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateStudent = async (studentId, data) => {
    try {
      const res = await fetch(`${API}/api/admin/students/${studentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al actualizar estudiante");
      // Update local state
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...data } : s));
    } catch (err) {
      alert(err.message);
    }
  };

  const assignedStudentIds = new Set();
  if (Array.isArray(groups)) {
    groups.forEach(g => {
      if (Array.isArray(g.students)) {
        g.students.forEach(s => assignedStudentIds.add(String(s.id)));
      }
    });
  }
  const unassignedStudents = allStudents.filter(s => !assignedStudentIds.has(String(s.id)));

  if (loading) return <div className="loading">Cargando tablero...</div>;

  return (
    <div className="group-board-container fade-in">
      <div className="board-header">
        <h2>Tablero de Grupos</h2>
        <form onSubmit={handleCreateGroup} className="create-group-form">
          <input
            type="text"
            placeholder="Nuevo grupo..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button type="submit">Crear</button>
        </form>
      </div>

      <div className="board-layout">
        <div
          className="kanban-column unassigned-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "")}
        >
          <div className="column-header">
            <h3 className="column-title">Sin Grupo ({unassignedStudents.length})</h3>
            <input
              type="text"
              className="column-search"
              placeholder="Buscar..."
              value={searchTerms["unassigned"] || ""}
              onChange={(e) => handleSearchChange("unassigned", e.target.value)}
            />
          </div>
          <div className="column-content">
            {filterStudents(unassignedStudents, searchTerms["unassigned"]).map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                onDragStart={(e) => handleDragStart(e, s.id, "")}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedStudent(s)}
                isMoving={String(movingId) === String(s.id)}
              />
            ))}
          </div>
        </div>

        <div className="groups-grid">
          {groups.map((group) => {
            const encargado = group.students.find(s => s.group_info?.role === "Encargado");
            const auxiliar = group.students.find(s => s.group_info?.role === "Auxiliar");
            const term = searchTerms[group.id] || "";
            const filteredStudents = filterStudents(group.students, term);

            return (
              <div
                key={group.id}
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, group.id)}
              >
                <div className="column-header">
                  <h3 className="column-title">
                    {group.name} ({group.students.length})
                    {(encargado || auxiliar) && (
                      <div className="group-leaders">
                        {encargado?.name || "---"} | {auxiliar?.name || "---"}
                      </div>
                    )}
                  </h3>
                  <input
                    type="text"
                    className="column-search"
                    placeholder="Buscar..."
                    value={term}
                    onChange={(e) => handleSearchChange(group.id, e.target.value)}
                  />
                </div>
                <div className="column-content">
                  {filteredStudents.map((s) => (
                    <StudentCard
                      key={s.id}
                      student={s}
                      onDragStart={(e) => handleDragStart(e, s.id, group.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedStudent(s)}
                      isMoving={String(movingId) === String(s.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedStudent && (
        <StudentModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          isInGroup={groups.some(g => g.students.some(s => s.id === selectedStudent.id))}
          onSetRole={handleSetRole}
          onUpdateStudent={handleUpdateStudent}
        />
      )}

      <style>{`
        .group-board-container { padding: 20px; height: 100%; display: flex; flex-direction: column; }
        .board-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .create-group-form { display: flex; gap: 8px; }
        .create-group-form input { padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: white; }
        
        .board-layout { display: flex; gap: 24px; flex: 1; align-items: flex-start; }
        .unassigned-column { min-width: 280px; max-width: 280px; border-style: dashed; }
        
        .groups-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 20px; 
          flex: 1; 
        }
        
        .kanban-column {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          max-height: 480px;
        }
        .column-header { padding: 12px; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.2); border-radius: 12px 12px 0 0; }
        .column-title { margin: 0; font-size: 0.9rem; margin-bottom: 8px; }
        .column-search { width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: white; font-size: 0.8rem; }
        
        .group-leaders { font-size: 0.7rem; color: var(--accent-color); margin-top: 4px; font-weight: normal; }
        .column-content { padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
        
        .student-card { background: var(--bg-secondary); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); cursor: grab; transition: all 0.2s; }
        .student-card:hover { border-color: var(--accent-color); transform: translateY(-2px); }
        .card-name { font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; justify-content: space-between; }
        .gender-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
        .gender-1 { background: #3b82f6; }
        .gender-0 { background: #ec4899; }
        
        .role-tag { font-size: 0.65rem; background: var(--accent-color); color: black; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
        
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: #1e1e1e; padding: 24px; border-radius: 12px; width: 400px;
          border: 1px solid var(--border-color); position: relative;
        }
        .modal-close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; }
        .modal-field { margin-bottom: 16px; }
        .modal-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px; }
        .modal-value { font-size: 1rem; color: white; }
        
        .modal-actions { display: flex; gap: 10px; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px; }
        .role-btn { flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--accent-color); background: none; color: var(--accent-color); cursor: pointer; font-size: 0.8rem; }
        .role-btn:hover { background: var(--accent-color); color: black; }
        .role-btn.active { background: var(--accent-color); color: black; }

        .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .permissions-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color); }
        .toggles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; }
        .toggle-btn { 
          padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); 
          background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-size: 0.75rem;
          transition: all 0.2s;
        }
        .toggle-btn.active { border-color: var(--accent-color); background: rgba(59, 130, 246, 0.1); }
        .toggle-btn:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}

function StudentCard({ student, onDragStart, onDragEnd, onClick, isMoving }) {
  const role = student.group_info?.role;
  return (
    <div
      className={`student-card ${isMoving ? "moving" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="card-name">
        <div style={{display: 'flex', alignItems: 'center'}}>
          <span className={`gender-dot gender-${student.gender}`}></span>
          {student.name}
        </div>
        {role && <span className="role-tag">{role === "Encargado" ? "ENC" : "AUX"}</span>}
      </div>
    </div>
  );
}

function StudentModal({ student, onClose, isInGroup, onSetRole, onUpdateStudent }) {
  const isEligible = student.infoadd?.toUpperCase().includes("SIERVO MINISTERIAL") || 
                     student.infoadd?.toUpperCase().includes("ANCIANO");
  const currentRole = student.group_info?.role;

  const [localData, setLocalData] = useState({
    aseo: student.aseo || false,
    acomodador: student.acomodador || false,
    microfonos: student.microfonos || false
  });

  const handleToggle = (field) => {
    const newData = { ...localData, [field]: !localData[field] };
    setLocalData(newData);
    // Auto-save
    onUpdateStudent(student.id, newData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3>Información del Estudiante</h3>
        
        <div className="modal-grid">
          <div className="modal-field">
            <span className="modal-label">Nombre</span>
            <span className="modal-value">{student.name}</span>
          </div>
          <div className="modal-field">
            <span className="modal-label">Teléfono</span>
            <span className="modal-value">{student.telefono || "N/A"}</span>
          </div>
        </div>

        <div className="modal-field">
          <span className="modal-label">Info Especial</span>
          <span className="modal-value" style={{color: isEligible ? 'var(--accent-color)' : 'white'}}>
            {student.infoadd || "N/A"}
          </span>
        </div>

        {student.gender === 1 && (
          <div className="permissions-section">
            <span className="modal-label">Privilegios / Asignaciones</span>
            <div className="toggles-grid">
              <button className={`toggle-btn ${localData.aseo ? 'active' : ''}`} onClick={() => handleToggle('aseo')}>
                Aseo {localData.aseo ? '✅' : '❌'}
              </button>
              <button className={`toggle-btn ${localData.acomodador ? 'active' : ''}`} onClick={() => handleToggle('acomodador')}>
                Acomodador {localData.acomodador ? '✅' : '❌'}
              </button>
              <button className={`toggle-btn ${localData.microfonos ? 'active' : ''}`} onClick={() => handleToggle('microfonos')}>
                Micrófonos {localData.microfonos ? '✅' : '❌'}
              </button>
            </div>
          </div>
        )}

        {isInGroup && isEligible && (
          <div className="modal-actions">
            <button className={`role-btn ${currentRole === "Encargado" ? "active" : ""}`} onClick={() => onSetRole(student, currentRole === "Encargado" ? null : "Encargado")}>{currentRole === "Encargado" ? "Quitar Encargado" : "Hacer Encargado"}</button>
            <button className={`role-btn ${currentRole === "Auxiliar" ? "active" : ""}`} onClick={() => onSetRole(student, currentRole === "Auxiliar" ? null : "Auxiliar")}>{currentRole === "Auxiliar" ? "Quitar Auxiliar" : "Hacer Auxiliar"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
