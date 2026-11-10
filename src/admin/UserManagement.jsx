// src/admin/UserManagement.jsx
// /admin/usuarios: solicitudes de acceso, permisos por módulo, activar/desactivar y desbloquear.
import { useContext, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { ConfirmDialog, EmptyState, ErrorNote, Loading, Modal, PageHeader, Segmented, StatCard, StatGrid } from "./AdminWidgets";
import { MODULES, displayUser } from "./adminNav";
import { apiErrorMessage, passwordProblem, readJson } from "./adminApi";

const API = import.meta.env.VITE_API_URL || "";

const STATUS = {
  pending: { label: "Pendiente", badge: "adm-badge--warn" },
  active: { label: "Activo", badge: "adm-badge--ok" },
  disabled: { label: "Desactivado", badge: "adm-badge--muted" },
};

const FILTERS = { pendientes: "pending", activos: "active", desactivados: "disabled", todos: null };

function formatDate(value) {
  if (!value) return null;
  return new Date(value.endsWith?.("Z") ? value : `${value}Z`).toLocaleString("es-CO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function UserManagement() {
  const { token, logout, user: me } = useContext(AuthContext);
  const refreshNotices = useOutletContext()?.refreshNotices;
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [editor, setEditor] = useState(null);   // { mode: "create" | "edit" | "approve", user }
  const [confirm, setConfirm] = useState(null); // { kind: "delete" | "reject" | "disable", user }

  const filterKey = FILTERS[searchParams.get("estado")] !== undefined ? searchParams.get("estado") : "todos";
  const setFilter = (key) => setSearchParams(key === "todos" ? {} : { estado: key }, { replace: true });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Se recarga al montar y cada vez que cambia reloadKey (después de guardar algo)
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/users/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) return logout();
        const body = await readJson(res);
        if (!res.ok) throw new Error(apiErrorMessage(body, "Error al cargar los usuarios"));
        if (!cancelled) { setUsers(body); setError(""); }
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, logout, reloadKey]);

  const counts = useMemo(() => ({
    total: users.length,
    pending: users.filter((u) => u.status === "pending").length,
    active: users.filter((u) => u.status === "active").length,
    disabled: users.filter((u) => u.status === "disabled").length,
    locked: users.filter((u) => u.locked).length,
  }), [users]);

  const visible = users.filter((u) => {
    const status = FILTERS[filterKey];
    if (status && u.status !== status) return false;
    const term = search.trim().toLowerCase();
    return !term || `${u.full_name || ""} ${u.email}`.toLowerCase().includes(term);
  });

  // Llamada a la API de usuarios; devuelve true si salió bien
  const request = async (method, path, payload, okMessage) => {
    try {
      const res = await fetch(`${API}/api/users/${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (res.status === 401) { logout(); return false; }
      const body = res.status === 204 ? {} : await readJson(res);
      if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo guardar el cambio."));
      if (okMessage) showToast(okMessage);
      reload();
      refreshNotices?.();
      return true;
    } catch (err) {
      showToast(`❌ ${err.message}`);
      return false;
    }
  };

  const runConfirm = async () => {
    const { kind, user } = confirm;
    setConfirm(null);
    if (kind === "disable") await request("PUT", user.id, { status: "disabled" }, `Acceso de ${user.email} desactivado`);
    else await request("DELETE", user.id, null, kind === "reject" ? "Solicitud rechazada" : `${user.email} eliminado`);
  };

  if (loading) return <Loading>Cargando usuarios...</Loading>;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div>
      {toast && <div className="toast" role="status">{toast}</div>}

      <PageHeader
        icon="shieldCheck"
        title="Gestión de Usuarios"
        count={users.length}
        subtitle="Aprueba las solicitudes de acceso y elige qué secciones del panel puede usar cada persona."
      >
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditor({ mode: "create", user: null })}>
          <Icon name="plus" size={16} /> Crear usuario
        </button>
      </PageHeader>

      <StatGrid label="Resumen de usuarios">
        <StatCard icon="users" tone="teal" label="Usuarios" value={counts.total} hint="con cuenta en el panel" />
        <StatCard icon="userCheck" tone="cyan" label="Activos" value={counts.active} hint="pueden iniciar sesión" />
        <StatCard
          icon="clock"
          tone="blue"
          label="Pendientes"
          value={counts.pending}
          hint="solicitudes por revisar"
          trend={counts.pending ? { dir: "flat", text: "Revisar" } : undefined}
        />
        <StatCard
          icon="lock"
          tone="teal"
          label="Desactivados"
          value={counts.disabled}
          hint={counts.locked ? `${counts.locked} bloqueado${counts.locked === 1 ? "" : "s"} por intentos` : "sin acceso al panel"}
        />
      </StatGrid>

      <section className="adm-card">
        <div className="adm-toolbar">
          <Segmented
            label="Filtrar usuarios"
            value={filterKey}
            onChange={setFilter}
            options={[
              { key: "pendientes", label: "Pendientes", count: counts.pending },
              { key: "activos", label: "Activos", count: counts.active },
              { key: "desactivados", label: "Desactivados", count: counts.disabled },
              { key: "todos", label: "Todos", count: counts.total },
            ]}
          />
          <label className="adm-input-pill">
            <Icon name="search" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar usuario"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={filterKey === "pendientes" ? "check" : "users"} title={filterKey === "pendientes" ? "No hay solicitudes pendientes" : "No hay usuarios para mostrar"}>
            {filterKey === "pendientes" && "Las personas que se registren en /registro aparecerán aquí para que las apruebes."}
          </EmptyState>
        ) : (
          <div className="table-container">
            <table className="admin-table adm-users-table adm-table--cards-md">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Acceso</th>
                  <th>Actividad</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={me?.id === u.id}
                    actorIsSuper={!!me?.is_superadmin}
                    onApprove={() => setEditor({ mode: "approve", user: u })}
                    onEdit={() => setEditor({ mode: "edit", user: u })}
                    onReject={() => setConfirm({ kind: "reject", user: u })}
                    onDelete={() => setConfirm({ kind: "delete", user: u })}
                    onDisable={() => setConfirm({ kind: "disable", user: u })}
                    onEnable={() => request("PUT", u.id, { status: "active" }, `Acceso de ${u.email} reactivado`)}
                    onUnlock={() => request("PUT", u.id, { unlock: true }, `Cuenta de ${u.email} desbloqueada`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editor && (
        <UserEditor
          mode={editor.mode}
          user={editor.user}
          actor={me}
          onClose={() => setEditor(null)}
          onSubmit={async (payload) => {
            const ok = editor.mode === "create"
              ? await request("POST", "", payload, "Usuario creado")
              : editor.mode === "approve"
                ? await request("POST", `${editor.user.id}/approve`, payload, `Acceso aprobado para ${editor.user.email}`)
                : await request("PUT", editor.user.id, payload, "Cambios guardados");
            if (ok) setEditor(null);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "reject" ? "Rechazar solicitud" : confirm.kind === "disable" ? "Desactivar acceso" : "Eliminar usuario"}
          confirmLabel={confirm.kind === "reject" ? "Sí, rechazar" : confirm.kind === "disable" ? "Sí, desactivar" : "Sí, Eliminar"}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        >
          {confirm.kind === "reject" && <p>Se borrará la solicitud de <strong>{confirm.user.email}</strong>. Podrá volver a registrarse si lo necesita.</p>}
          {confirm.kind === "disable" && <p><strong>{confirm.user.email}</strong> no podrá entrar al panel y sus sesiones abiertas dejarán de funcionar. Puedes reactivarlo cuando quieras.</p>}
          {confirm.kind === "delete" && <p>¿Seguro que quieres eliminar a <strong>{confirm.user.email}</strong>? Esta acción no se puede deshacer.</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}

function UserRow({ user, isSelf, actorIsSuper, onApprove, onEdit, onReject, onDelete, onDisable, onEnable, onUnlock }) {
  const person = displayUser(user);
  const status = STATUS[user.status] || STATUS.disabled;
  const protectedSuper = user.is_superadmin && !actorIsSuper; // solo un superadmin toca a otro superadmin

  return (
    <tr className={user.status === "pending" ? "adm-row-pending" : user.status === "disabled" ? "row-old" : ""}>
      <td data-label="Usuario">
        <span className="adm-person">
          <span className="adm-avatar adm-avatar--sm" aria-hidden="true">{person.initials}</span>
          <span className="adm-person-text">
            <span className="adm-cell-strong">
              {person.name} {isSelf && <span className="adm-tag adm-tag--deep">Tú</span>}
            </span>
            <span className="adm-cell-sub">{user.email}</span>
          </span>
        </span>
      </td>
      <td data-label="Estado">
        <span className="adm-tags">
          <span className={`adm-badge ${status.badge}`}>{status.label}</span>
          {user.locked && <span className="adm-badge adm-badge--bad">Bloqueado</span>}
        </span>
      </td>
      <td data-label="Acceso">
        <AccessChips user={user} />
      </td>
      <td data-label="Actividad">
        {user.status === "pending" ? (
          <span className="adm-cell-sub">Solicitó el {formatDate(user.created_at) || "—"}</span>
        ) : (
          <span className="adm-cell-sub">{user.last_login_at ? `Último acceso: ${formatDate(user.last_login_at)}` : "Nunca ha iniciado sesión"}</span>
        )}
      </td>
      <td data-label="Acciones" className="actions-cell" style={{ textAlign: "right" }}>
        <div className="adm-actions">
          {user.status === "pending" ? (
            <>
              <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={onApprove}>
                <Icon name="check" size={15} /> Aprobar
              </button>
              <button type="button" className="adm-action adm-action--danger" onClick={onReject} title="Rechazar solicitud" aria-label={`Rechazar la solicitud de ${user.email}`}>
                <Icon name="x" size={17} />
              </button>
            </>
          ) : (
            <>
              {user.locked && (
                <button type="button" className="adm-action" onClick={onUnlock} title="Desbloquear" aria-label={`Desbloquear a ${user.email}`}>
                  <Icon name="lock" size={17} />
                </button>
              )}
              <button type="button" className="adm-action" onClick={onEdit} disabled={protectedSuper} title="Editar datos y permisos" aria-label={`Editar a ${user.email}`}>
                <Icon name="edit" size={17} />
              </button>
              {user.status === "active" ? (
                <button type="button" className="adm-action" onClick={onDisable} disabled={isSelf || protectedSuper} title="Desactivar acceso" aria-label={`Desactivar a ${user.email}`}>
                  <Icon name="userX" size={17} />
                </button>
              ) : (
                <button type="button" className="adm-action" onClick={onEnable} disabled={protectedSuper} title="Reactivar acceso" aria-label={`Reactivar a ${user.email}`}>
                  <Icon name="userCheck" size={17} />
                </button>
              )}
              <button type="button" className="adm-action adm-action--danger" onClick={onDelete} disabled={isSelf || protectedSuper} title="Eliminar" aria-label={`Eliminar a ${user.email}`}>
                <Icon name="trash" size={17} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function AccessChips({ user }) {
  if (user.status === "pending") return <span className="adm-muted">Por asignar</span>;
  if (user.is_superadmin) return <span className="adm-tag adm-tag--deep">Acceso total · superadmin</span>;
  if (!user.permissions?.length) return <span className="adm-muted">Sin secciones</span>;
  return (
    <span className="adm-tags">
      {MODULES.filter((m) => user.permissions.includes(m.key)).map((m) => (
        <span key={m.key} className={`adm-tag ${m.key === "users" ? "adm-tag--blue" : ""}`}>{m.label}</span>
      ))}
    </span>
  );
}

// Modal para crear, editar o aprobar: datos de la cuenta y módulos permitidos
function UserEditor({ mode, user, actor, onClose, onSubmit }) {
  const isCreate = mode === "create";
  const isApprove = mode === "approve";
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState(() => (user?.is_superadmin ? [] : user?.permissions || []));
  const [superadmin, setSuperadmin] = useState(!!user?.is_superadmin);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const actorIsSuper = !!actor?.is_superadmin;
  const actorPerms = actor?.permissions || [];
  const isSelf = actor?.id === user?.id;
  // Quien no es superadmin solo da módulos que tiene, y nunca "Usuarios"
  const canToggle = (key) => actorIsSuper || (key !== "users" && actorPerms.includes(key));

  const toggle = (key) => setPerms((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (isCreate || password) {
      const problem = passwordProblem(password);
      if (problem) return setError(`Contraseña: ${problem}`);
    }
    const payload = isApprove
      ? { permissions: perms, is_superadmin: superadmin }
      : {
        full_name: fullName.trim() || null,
        email,
        ...(password ? { password } : {}),
        permissions: perms,
        ...(actorIsSuper ? { is_superadmin: superadmin } : {}),
      };
    setSaving(true);
    await onSubmit(payload);
    setSaving(false);
  };

  const title = isCreate ? "Crear usuario" : isApprove ? "Aprobar acceso" : "Editar usuario";

  return (
    <Modal title={title} icon={isApprove ? "userCheck" : isCreate ? "user" : "edit"} size="lg" onClose={onClose} dismissOnBackdrop={false}>
      {error && <div className="adm-form-error" role="alert"><Icon name="alert" size={16} />{error}</div>}
      <form onSubmit={submit} className="adm-stack">
        {isApprove ? (
          <div className="adm-detail-grid">
            <div className="adm-detail"><span>Nombre</span><strong>{user.full_name || "—"}</strong></div>
            <div className="adm-detail"><span>Correo</span><strong>{user.email}</strong></div>
          </div>
        ) : (
          <div className="adm-form-grid">
            <label className="adm-field">
              <span className="adm-label">Nombre completo</span>
              <input className="adm-input" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} placeholder="Ej. María Gómez" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Correo electrónico</span>
              <input className="adm-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="adm-field adm-form-grid--full">
              <span className="adm-label">{isCreate ? "Contraseña" : "Nueva contraseña"}</span>
              <input
                className="adm-input"
                type="password"
                autoComplete="new-password"
                required={isCreate}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isCreate ? "Mínimo 8 caracteres, con letras y números" : "Déjala en blanco para no cambiarla"}
              />
              {!isCreate && <span className="adm-help">Si la cambias, se cerrarán las sesiones abiertas de esta persona.</span>}
            </label>
          </div>
        )}

        <div className="adm-subcard">
          <span className="adm-subcard-title">Secciones que puede usar</span>
          {actorIsSuper && (
            <label className={`adm-perm adm-perm--super ${superadmin ? "is-on" : ""}`}>
              <input
                type="checkbox"
                checked={superadmin}
                disabled={isSelf && superadmin}
                onChange={(e) => setSuperadmin(e.target.checked)}
              />
              <span className="adm-perm-text">
                <strong>Superadministrador</strong>
                <small>Acceso total, incluida la gestión de otros superadministradores.</small>
              </span>
            </label>
          )}
          <div className="adm-perm-grid">
            {MODULES.map((m) => {
              const checked = superadmin || perms.includes(m.key);
              const locked = superadmin || !canToggle(m.key);
              return (
                <label key={m.key} className={`adm-perm ${checked ? "is-on" : ""} ${locked ? "is-locked" : ""}`}>
                  <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(m.key)} />
                  <span className="adm-perm-text">
                    <strong>{m.label}</strong>
                    <small>{m.hint}</small>
                  </span>
                </label>
              );
            })}
          </div>
          {!actorIsSuper && (
            <span className="adm-help">Solo puedes dar las secciones que tú tienes. «Usuarios y permisos» lo asigna un superadministrador.</span>
          )}
        </div>

        <div className="adm-modal-foot adm-modal-foot--inline">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? "Guardando…" : isApprove ? <><Icon name="check" size={16} /> Aprobar acceso</> : isCreate ? "Crear usuario" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
