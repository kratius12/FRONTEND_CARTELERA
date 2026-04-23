import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./AdminPage.css"; // Usa los estilos base

const API = import.meta.env.VITE_API_URL || "";

export default function StudentList() {
    const { token, logout } = useContext(AuthContext);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(30);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        status: "Activo",
        telefono: "",
        infoadd: "",
        gender: ""
    });

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/admin/students`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }
            if (!res.ok) throw new Error("Error al cargar estudiantes");
            const data = await res.json();
            setStudents(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [token]);

    const handleOpenModal = (student = null) => {
        if (student) {
            setEditingId(student.id);
            setFormData({
                name: student.name,
                status: student.status,
                telefono: student.telefono || "",
                infoadd: student.infoadd || "",
                gender: student.gender !== null ? String(student.gender) : ""
            });
        } else {
            setEditingId(null);
            setFormData({
                name: "",
                status: "Activo",
                telefono: "",
                infoadd: "",
                gender: ""
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            ...formData,
            gender: formData.gender !== "" ? parseInt(formData.gender) : null
        };

        const url = editingId ? `${API}/api/admin/students/${editingId}` : `${API}/api/admin/students`;
        const method = editingId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Error al guardar estudiante");
            }

            await fetchStudents();
            handleCloseModal();
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este estudiante? Esta acción no se puede deshacer.")) return;

        try {
            const res = await fetch(`${API}/api/admin/students/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Error al eliminar");
            fetchStudents();
        } catch (err) {
            alert(err.message);
        }
    };

    const filteredStudents = students.filter(s => {
        const term = searchTerm.toLowerCase();
        const genderText = s.gender === 1 ? "hombre" : s.gender === 0 ? "mujer" : "n/e";
        return (
            (s.name || "").toLowerCase().includes(term) ||
            (s.status || "").toLowerCase().includes(term) ||
            (s.infoadd || "").toLowerCase().includes(term) ||
            (s.telefono || "").toLowerCase().includes(term) ||
            genderText.includes(term)
        );
    });

    const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
    const indexOfLastRecord = currentPage * rowsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
    const currentRecords = filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);

    if (loading) return <div className="loading">Cargando base de datos de estudiantes...</div>;
    if (error) return <div className="error-box">{error}</div>;

    return (
        <div className="list-wrapper">
            <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Buscar estudiante..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%', maxWidth: '300px' }}
                />
                <button className="add-btn" onClick={() => handleOpenModal()} style={{ margin: 0 }}>
                    + Añadir Estudiante
                </button>
            </div>

            {filteredStudents.length === 0 ? (
                <div className="empty-state">No se encontraron estudiantes.</div>
            ) : (
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Info</th>
                                <th>Teléfono</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecords.map((student) => (
                                <tr key={student.id}>
                                    <td data-label="Nombre">
                                        <strong>{student.name}</strong>
                                    </td>
                                    <td data-label="Info">
                                        {student.infoadd || "-"}
                                    </td>
                                    <td data-label="Teléfono">
                                        {student.telefono || "-"}
                                    </td>
                                    <td data-label="Estado">
                                        <span className={`badge ${student.status === 'Activo' ? 'Activo' : 'Inactivo'}`} style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            backgroundColor: student.status === 'Activo' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                                            color: student.status === 'Activo' ? '#27ae60' : '#e74c3c'
                                        }}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td data-label="Acciones">
                                        <div className="action-buttons">
                                            <button className="icon-btn edit" onClick={() => handleOpenModal(student)} title="Editar">✏️</button>
                                            <button className="icon-btn danger" onClick={() => handleDelete(student.id)} title="Eliminar">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Controles de Paginación */}
                    <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem', padding: '0 8px' }}>
                        <div>
                            <label style={{ color: 'var(--text-secondary)', marginRight: '8px', fontSize: '14px' }}>Mostrar:</label>
                            <select
                                value={rowsPerPage}
                                onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                            >
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={500}>500</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button
                                className="icon-btn"
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                style={{ padding: '6px 12px', opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                            >
                                Anterior
                            </button>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                Página {currentPage} de {totalPages || 1}
                            </span>
                            <button
                                className="icon-btn"
                                disabled={currentPage >= totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                style={{ padding: '6px 12px', opacity: currentPage >= totalPages || totalPages === 0 ? 0.5 : 1, cursor: currentPage >= totalPages || totalPages === 0 ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Crear / Editar */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        backgroundColor: '#121212', padding: '24px', borderRadius: '12px',
                        width: '100%', maxWidth: '500px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', border: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{editingId ? "Editar Estudiante" : "Nuevo Estudiante"}</h3>
                            <button className="icon-btn danger" onClick={handleCloseModal}>✕</button>
                        </div>
                        <form onSubmit={handleSave} className="prog-form">
                            <div className="form-group">
                                <label>Nombre Completo</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Juan Pérez" />
                            </div>

                            <div className="form-row form-row--2" style={{ marginTop: '16px' }}>
                                <div className="form-group">
                                    <label>Género (Sexo)</label>
                                    <select required value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                        <option value="" disabled>Seleccionar...</option>
                                        <option value="1">Hombre</option>
                                        <option value="0">Mujer</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row form-row--2" style={{ marginTop: '16px' }}>
                                <div className="form-group">
                                    <label>Teléfono (Opcional)</label>
                                    <input type="text" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} placeholder="+1 234 567" />
                                </div>
                                <div className="form-group">
                                    <label>Nota / Info. Adicional</label>
                                    <input type="text" value={formData.infoadd} onChange={e => setFormData({ ...formData, infoadd: e.target.value })} placeholder="Ej: Ayudante, Siervo" />
                                </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: '24px' }}>
                                <button type="button" className="discard-btn" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="submit-btn" disabled={saving}>{saving ? "Guardando..." : "Guardar Registro"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
