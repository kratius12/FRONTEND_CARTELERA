import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

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

  if (loading) return <div className="admin-status">Cargando usuarios...</div>;
  if (error) return <div className="admin-status error">{error}</div>;

  return (
    <div>
      <div className="list-toolbar">
        <h2 className="list-title">
          Gestión de Usuarios
          <span className="list-badge">{users.length}</span>
        </h2>
        <button className="publish-btn" onClick={() => openModal(null)}>
          + Crear Usuario Admin
        </button>
      </div>

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
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Correo Electrónico">{u.email}</td>
                <td data-label="Rol"><span className="badge badge--current">{u.role}</span></td>
                <td data-label="Acciones" className="actions-cell">
                  <button className="icon-btn small" onClick={() => openModal(u)} title="Editar o cambiar contraseña" style={{ marginRight: "8px" }}>
                    ✏️
                  </button>
                  <button className="icon-btn danger small" onClick={() => handleDelete(u)} title="Eliminar Admin">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan="3" style={{ textAlign: "center", padding: "20px" }}>No hay usuarios.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL SIMULADO SIN DEPENDENCIAS EXTERNAS */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex",
          placeItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--bg-primary)", padding: "24px", borderRadius: "12px",
            width: "100%", maxWidth: "400px", border: "1px solid var(--border-color)"
          }}>
            <h3 style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>
                {editingUser ? "Editar Usuario" : "Nuevo Usuario Admin"}
            </h3>
            {formError && <div style={{ color: "#ef4444", marginBottom: "16px", fontSize: "13px" }}>{formError}</div>}
            
            <form onSubmit={handleSubmit} className="form-group" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px" }}>Correo Electrónico</label>
                <input 
                  type="email" required 
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px" }}>Contraseña {editingUser && <span className="muted">(Opcional: Dejar en blanco para mantener actual)</span>}</label>
                <input 
                  type="password" 
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" onClick={closeModal} className="icon-btn">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="publish-btn" style={{ background: "var(--accent-color)", color: "#fff", borderColor: "var(--accent-color)" }}>
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
