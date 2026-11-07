import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { EmptyState, ErrorNote, Loading, Modal, PageHeader, Pager, StatCard, StatGrid } from "./AdminWidgets";
import "./AdminPage.css"; // Usa los estilos base

const API = import.meta.env.VITE_API_URL || "";

// Precursorado fijo: regular o auxiliar indefinido (como mucho una marca).
// El auxiliar en campaña no queda fijo: se asigna por mes en Informes de predicación.
const PIONEER_OPTIONS = [
    { value: "", label: "No es precursor" },
    { value: "es_precursor_aux_ind", label: "Precursor auxiliar indefinido", tag: "P. Aux. indefinido" },
    { value: "es_precursor_reg", label: "Precursor regular", tag: "P. Regular" },
];
const PIONEER_FLAGS = ["es_precursor_aux_camp", "es_precursor_aux_ind", "es_precursor_reg"];
const pioneerOf = (s) => PIONEER_OPTIONS.find((o) => o.value && s && s[o.value])?.value || "";
const pioneerFlags = (value) => Object.fromEntries(PIONEER_FLAGS.map((f) => [f, f === value]));
const initialsOf = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

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
        gender: "",
        aseo: false,
        acomodador: false,
        microfonos: false,
        es_anciano: false,
        es_siervo: false,
        es_precursor_aux_camp: false,
        es_precursor_aux_ind: false,
        es_precursor_reg: false
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
                gender: student.gender !== null ? String(student.gender) : "",
                aseo: student.aseo || false,
                acomodador: student.acomodador || false,
                microfonos: student.microfonos || false,
                es_anciano: student.es_anciano || false,
                es_siervo: student.es_siervo || false,
                ...pioneerFlags(pioneerOf(student))
            });
        } else {
            setEditingId(null);
            setFormData({
                name: "",
                status: "Activo",
                telefono: "",
                infoadd: "",
                gender: "",
                aseo: false,
                acomodador: false,
                microfonos: false,
                es_anciano: false,
                es_siervo: false,
                es_precursor_aux_camp: false,
                es_precursor_aux_ind: false,
                es_precursor_reg: false
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
            (PIONEER_OPTIONS.find((o) => o.value && o.value === pioneerOf(s))?.label || "").toLowerCase().includes(term) ||
            (s.telefono || "").toLowerCase().includes(term) ||
            genderText.includes(term)
        );
    });

    const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
    const indexOfLastRecord = currentPage * rowsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
    const currentRecords = filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);

    if (loading) return <Loading>Cargando base de datos de estudiantes...</Loading>;
    if (error) return <ErrorNote>{error}</ErrorNote>;

    const activeCount = students.filter((st) => st.status === "Activo").length;
    const pioneerCount = students.filter((st) => pioneerOf(st)).length;
    const eldersCount = students.filter((st) => st.es_anciano || st.es_siervo).length;
    const pct = (n) => (students.length ? Math.round((n / students.length) * 100) : 0);

    return (
        <div className="list-wrapper">
            <PageHeader
                icon="users"
                title="Estudiantes"
                count={students.length}
                subtitle="Personas de la congregación, sus datos de contacto y privilegios."
            >
                <button type="button" className="adm-btn adm-btn--primary" onClick={() => handleOpenModal()}>
                    <Icon name="plus" size={16} /> Añadir Estudiante
                </button>
            </PageHeader>

            <StatGrid label="Resumen de estudiantes">
                <StatCard icon="users" tone="teal" label="Registrados" value={students.length} hint="en la base de datos" />
                <StatCard
                    icon="userCheck"
                    tone="cyan"
                    label="Activos"
                    value={activeCount}
                    hint={`${students.length - activeCount} inactivos`}
                    trend={{ dir: "flat", text: `${pct(activeCount)} %` }}
                />
                <StatCard icon="star" tone="blue" label="Precursores" value={pioneerCount} hint="regulares y auxiliares indefinidos" />
                <StatCard icon="award" tone="teal" label="Ancianos y siervos" value={eldersCount} hint="con privilegio asignado" />
            </StatGrid>

            <section className="adm-card">
                <div className="adm-toolbar">
                    <label className="adm-input-pill">
                        <Icon name="search" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar estudiante..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            aria-label="Buscar estudiante"
                        />
                    </label>
                    <span className="adm-muted" style={{ fontSize: "13px" }}>
                        {filteredStudents.length} {filteredStudents.length === 1 ? "resultado" : "resultados"}
                    </span>
                </div>

                {filteredStudents.length === 0 ? (
                    <EmptyState icon="search" title="No se encontraron estudiantes." />
                ) : (
                    <>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Info</th>
                                        <th>Teléfono</th>
                                        <th>Estado</th>
                                        <th style={{ textAlign: "right" }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRecords.map((student) => {
                                        const pioneer = PIONEER_OPTIONS.find((o) => o.value && o.value === pioneerOf(student));
                                        return (
                                            <tr key={student.id}>
                                                <td data-label="Nombre">
                                                    <span className="adm-person">
                                                        <span className="adm-avatar adm-avatar--sm" aria-hidden="true">{initialsOf(student.name)}</span>
                                                        <span className="adm-cell-strong">{student.name}</span>
                                                    </span>
                                                </td>
                                                <td data-label="Info">
                                                    <span className="adm-tags">
                                                        {student.es_anciano && <span title="Anciano" className="adm-tag adm-tag--deep">Anciano</span>}
                                                        {student.es_siervo && <span title="Siervo Ministerial" className="adm-tag adm-tag--blue">Siervo</span>}
                                                        {pioneer && (
                                                            <span title={pioneer.label} className="adm-tag">{pioneer.tag}</span>
                                                        )}
                                                        {student.infoadd && <span className="adm-muted" style={{ fontSize: "12px" }}>{student.infoadd}</span>}
                                                        {!student.es_anciano && !student.es_siervo && !pioneer && !student.infoadd && <span className="adm-muted">-</span>}
                                                    </span>
                                                </td>
                                                <td data-label="Teléfono">
                                                    {student.telefono || <span className="adm-muted">-</span>}
                                                </td>
                                                <td data-label="Estado">
                                                    <span className={`adm-badge ${student.status === "Activo" ? "adm-badge--ok" : "adm-badge--bad"}`}>
                                                        {student.status}
                                                    </span>
                                                </td>
                                                <td data-label="Acciones" className="actions-cell" style={{ textAlign: "right" }}>
                                                    <div className="adm-actions">
                                                        <button type="button" className="adm-action" onClick={() => handleOpenModal(student)} title="Editar" aria-label={`Editar a ${student.name}`}>
                                                            <Icon name="edit" size={17} />
                                                        </button>
                                                        <button type="button" className="adm-action adm-action--danger" onClick={() => handleDelete(student.id)} title="Eliminar" aria-label={`Eliminar a ${student.name}`}>
                                                            <Icon name="trash" size={17} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <Pager page={currentPage} total={totalPages} onChange={setCurrentPage}>
                            <label htmlFor="students-per-page">Mostrar:</label>
                            <select
                                id="students-per-page"
                                className="adm-input adm-input--sm"
                                value={rowsPerPage}
                                onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            >
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={500}>500</option>
                            </select>
                        </Pager>
                    </>
                )}
            </section>

            {/* Modal para Crear / Editar */}
            {showModal && (
                <Modal
                    title={editingId ? "Editar Estudiante" : "Nuevo Estudiante"}
                    icon={editingId ? "edit" : "user"}
                    onClose={handleCloseModal}
                    size="lg"
                >
                    <form onSubmit={handleSave} className="prog-form">
                        <div className="form-group">
                            <label htmlFor="st-name">Nombre Completo</label>
                            <input id="st-name" required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Juan Pérez" />
                        </div>

                        <div className="form-row form-row--2" style={{ marginTop: '16px' }}>
                            <div className="form-group">
                                <label htmlFor="st-gender">Género (Sexo)</label>
                                <select id="st-gender" required value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="" disabled>Seleccionar...</option>
                                    <option value="1">Hombre</option>
                                    <option value="0">Mujer</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="st-status">Estado</label>
                                <select id="st-status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                    <option value="Activo">Activo</option>
                                    <option value="Inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row form-row--2">
                            <div className="form-group">
                                <label htmlFor="st-phone">Teléfono (Opcional)</label>
                                <input id="st-phone" type="text" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} placeholder="+1 234 567" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="st-info">Nota / Info. Adicional</label>
                                <input id="st-info" type="text" value={formData.infoadd} onChange={e => setFormData({ ...formData, infoadd: e.target.value })} placeholder="Ej: Pionero, Visitante..." />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="st-pioneer">Precursorado</label>
                            <select
                                id="st-pioneer"
                                value={pioneerOf(formData)}
                                onChange={e => setFormData({ ...formData, ...pioneerFlags(e.target.value) })}
                            >
                                {PIONEER_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <small className="adm-help">
                                El auxiliar en campaña se asigna por mes en Informes de predicación.
                            </small>
                        </div>

                        {formData.gender === "1" && (
                            <div className="adm-subcard">
                                <span className="adm-subcard-title">Privilegios / Asignaciones</span>
                                <div className="adm-toggle-grid">
                                    {[
                                        { key: 'aseo', label: 'Aseo' },
                                        { key: 'acomodador', label: 'Acomodador' },
                                        { key: 'microfonos', label: 'Micrófonos' },
                                        { key: 'es_anciano', label: 'Anciano' },
                                        { key: 'es_siervo', label: 'Siervo Min.' },
                                    ].map(({ key, label }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            className={`adm-toggle ${formData[key] ? "is-on" : ""}`}
                                            aria-pressed={!!formData[key]}
                                            onClick={() => setFormData({ ...formData, [key]: !formData[key] })}
                                        >
                                            {label}
                                            <span className="adm-toggle-dot" aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="adm-modal-foot" style={{ padding: "22px 0 0" }}>
                            <button type="button" className="adm-btn adm-btn--ghost" onClick={handleCloseModal}>Cancelar</button>
                            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>{saving ? "Guardando..." : "Guardar Registro"}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
