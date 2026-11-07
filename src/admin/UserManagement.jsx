import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { EmptyState, ErrorNote, Loading, Modal, PageHeader } from "./AdminWidgets";
import { personFromEmail } from "./adminNav";

const API = import.meta.env.VITE_API_URL || "";

export default function UserManagement() {
  const { token, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) return logout();
      if (!res.ok) throw new Error("Error al cargar los usuarios");
      const data = await res.json();
      const sorted = data.sort((a, b) => a.email.localeCompare(b.email));
      setUsers(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openModal = (user = null) => {
    setFormError("");
    setEditingUser(user);
    setEmail(user ? user.email : "");
    setPassword(""); // Nunca la mostramos por seguridad, solo permitir sobreescribir.
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const payload = { email };
    if (password) payload.password = password; // Only send password if editing or creating
    
    const isNew = !editingUser;
    
    if (isNew && !password) {
        setIsSubmitting(false);
        setFormError("La contraseña es obligatoria para nuevos usuarios.");
        return;
    }

    const url = isNew ? `${API}/api/users/` : `${API}/api/users/${editingUser.id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) return logout();
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail || "Error guardando el usuario");

      await fetchUsers();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${u.email} de los administradores?`)) return;
    const { id } = u;

    try {
      const res = await fetch(`${API}/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401 || res.status === 403) return logout();
      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "No se pudo eliminar al usuario.");
      }

      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <Loading>Cargando usuarios...</Loading>;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div>
      <PageHeader
        icon="shieldCheck"
        title="Gestión de Usuarios"
        count={users.length}
        subtitle="Personas con acceso al panel de administración."
      >
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => openModal(null)}>
          <Icon name="plus" size={16} /> Crear Usuario Admin
        </button>
      </PageHeader>

      <section className="adm-card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th style={{ width: "120px", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const person = personFromEmail(u.email);
                return (
                  <tr key={u.id}>
                    <td data-label="Correo Electrónico">
                      <span className="adm-person">
                        <span className="adm-avatar adm-avatar--sm" aria-hidden="true">{person.initials}</span>
                        <span className="adm-person-text">
                          <span className="adm-cell-strong">{person.name}</span>
                          <span className="adm-cell-sub">{u.email}</span>
                        </span>
                      </span>
                    </td>
                    <td data-label="Rol"><span className="adm-badge">{u.role}</span></td>
                    <td data-label="Acciones" className="actions-cell" style={{ textAlign: "right" }}>
                      <div className="adm-actions">
                        <button type="button" className="adm-action" onClick={() => openModal(u)} title="Editar o cambiar contraseña" aria-label="Editar o cambiar contraseña">
                          <Icon name="edit" size={17} />
                        </button>
                        <button type="button" className="adm-action adm-action--danger" onClick={() => handleDelete(u)} title="Eliminar Admin" aria-label="Eliminar Admin">
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <EmptyState icon="users" title="No hay usuarios." />}
        </div>
      </section>

      {showModal && (
        <Modal
          title={editingUser ? "Editar Usuario" : "Nuevo Usuario Admin"}
          icon={editingUser ? "edit" : "user"}
          onClose={closeModal}
          dismissOnBackdrop={false}
          size="sm"
        >
          {formError && <div className="adm-form-error" role="alert"><Icon name="alert" size={16} />{formError}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <label className="adm-field">
              <span className="adm-label">Correo Electrónico</span>
              <input
                className="adm-input"
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="adm-field">
              <span className="adm-label">Contraseña</span>
              <input
                className="adm-input"
                type="password"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              {editingUser && <span className="adm-help">Opcional: déjala en blanco para mantener la actual.</span>}
            </label>
            <div className="adm-modal-foot" style={{ padding: "6px 0 0" }}>
              <button type="button" onClick={closeModal} className="adm-btn adm-btn--ghost">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="adm-btn adm-btn--primary">
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
