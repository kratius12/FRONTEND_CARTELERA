import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { ErrorNote, Loading, Modal, PageHeader, StatCard, StatGrid } from "./AdminWidgets";
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
  const [overId, setOverId] = useState(null);

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
    setOverId(null);
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

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (overId !== id) setOverId(id);
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

  if (loading) return <Loading>Cargando tablero...</Loading>;

  const assignedCount = allStudents.length - unassignedStudents.length;

  // Resalta la columna sobre la que se está arrastrando
  const columnProps = (id) => ({
    className: `kanban-column ${id === "" ? "unassigned-column" : ""} ${overId === id ? "is-over" : ""}`,
    onDragOver: (e) => handleDragOver(e, id),
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverId(null); },
    onDrop: (e) => { setOverId(null); handleDrop(e, id); },
  });

  return (
    <div className="group-board-container fade-in">
      <PageHeader
        icon="grid"
        title="Tablero de Grupos"
        count={groups.length}
        subtitle="Arrastra a cada persona al grupo que le corresponde. Haz clic en una tarjeta para ver sus datos."
      >
        <form onSubmit={handleCreateGroup} className="create-group-form">
          <input
            type="text"
            placeholder="Nuevo grupo..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            aria-label="Nombre del nuevo grupo"
          />
          <button type="submit" className="adm-btn adm-btn--primary"><Icon name="plus" size={16} /> Crear</button>
        </form>
      </PageHeader>

      {error && <ErrorNote>{error}</ErrorNote>}

      <StatGrid label="Resumen de grupos">
        <StatCard icon="grid" tone="teal" label="Grupos" value={groups.length} hint="grupos de servicio" />
        <StatCard
          icon="userCheck"
          tone="cyan"
          label="Con grupo"
          value={assignedCount}
          hint={`de ${allStudents.length} personas`}
          trend={allStudents.length ? { dir: "flat", text: `${Math.round((assignedCount / allStudents.length) * 100)} %` } : undefined}
        />
        <StatCard icon="userX" tone="blue" label="Sin grupo" value={unassignedStudents.length} hint="pendientes de asignar" />
      </StatGrid>

      <div className="adm-board-legend" style={{ marginBottom: "14px" }}>
        <span><span className="gender-dot gender-1" aria-hidden="true" /> Hombre</span>
        <span><span className="gender-dot gender-0" aria-hidden="true" /> Mujer</span>
        <span><span className="role-tag">ENC</span> Encargado</span>
        <span><span className="role-tag">AUX</span> Auxiliar</span>
      </div>

      <div className="board-layout">
        <div {...columnProps("")}>
          <div className="column-header">
            <h3 className="column-title">Sin Grupo <span className="adm-count">{unassignedStudents.length}</span></h3>
            <input
              type="text"
              className="column-search"
              placeholder="Buscar..."
              value={searchTerms["unassigned"] || ""}
              onChange={(e) => handleSearchChange("unassigned", e.target.value)}
              aria-label="Buscar entre las personas sin grupo"
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
              <div key={group.id} {...columnProps(group.id)}>
                <div className="column-header">
                  <h3 className="column-title">
                    {group.name}
                    <span className="adm-count">{group.students.length}</span>
                  </h3>
                  {(encargado || auxiliar) && (
                    <div className="group-leaders">
                      <strong>{encargado?.name || "---"}</strong> | <strong>{auxiliar?.name || "---"}</strong>
                    </div>
                  )}
                  <input
                    type="text"
                    className="column-search"
                    placeholder="Buscar..."
                    value={term}
                    onChange={(e) => handleSearchChange(group.id, e.target.value)}
                    aria-label={`Buscar en ${group.name}`}
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
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      aria-label={`${student.name}${role ? `, ${role}` : ""}`}
    >
      <span className="card-name">
        <span className={`gender-dot gender-${student.gender}`} aria-hidden="true"></span>
        {student.name}
      </span>
      {role && <span className="role-tag">{role === "Encargado" ? "ENC" : "AUX"}</span>}
    </div>
  );
}

function StudentModal({ student, onClose, isInGroup, onSetRole, onUpdateStudent }) {
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
    <Modal
      title="Información del Estudiante"
      icon="user"
      onClose={onClose}
      footer={isInGroup ? (
        <div className="adm-role-actions">
          <button
            type="button"
            className={`adm-btn ${currentRole === "Encargado" ? "adm-btn--primary" : "adm-btn--ghost"}`}
            onClick={() => onSetRole(student, currentRole === "Encargado" ? null : "Encargado")}
          >
            {currentRole === "Encargado" ? "Quitar Encargado" : "Hacer Encargado"}
          </button>
          <button
            type="button"
            className={`adm-btn ${currentRole === "Auxiliar" ? "adm-btn--primary" : "adm-btn--ghost"}`}
            onClick={() => onSetRole(student, currentRole === "Auxiliar" ? null : "Auxiliar")}
          >
            {currentRole === "Auxiliar" ? "Quitar Auxiliar" : "Hacer Auxiliar"}
          </button>
        </div>
      ) : null}
    >
      <div className="adm-detail-grid">
        <div className="adm-detail">
          <span>Nombre</span>
          <strong>{student.name}</strong>
        </div>
        <div className="adm-detail">
          <span>Teléfono</span>
          <strong>{student.telefono || "N/A"}</strong>
        </div>
        <div className="adm-detail adm-detail--full">
          <span>Info Especial</span>
          <strong style={{ color: (student.es_anciano || student.es_siervo) ? "var(--adm-accent-text)" : undefined }}>
            {student.infoadd || "N/A"}
          </strong>
        </div>
      </div>

      {student.gender === 1 && (
        <div className="adm-subcard">
          <span className="adm-subcard-title">Privilegios / Asignaciones</span>
          <div className="adm-toggle-grid">
            {[
              { key: "aseo", label: "Aseo" },
              { key: "acomodador", label: "Acomodador" },
              { key: "microfonos", label: "Micrófonos" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`adm-toggle ${localData[key] ? "is-on" : ""}`}
                aria-pressed={localData[key]}
                onClick={() => handleToggle(key)}
              >
                {label}
                <span className="adm-toggle-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
