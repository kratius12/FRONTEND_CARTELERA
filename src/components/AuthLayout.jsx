// Diseño común de las páginas de acceso (login, registro y recuperación):
// presentación a la izquierda y la tarjeta del formulario a la derecha.
import Icon from "../admin/AdminIcons";
import "../admin/AdminGlass.css";
import "./Login.css";

const FEATURES = [
  { icon: "book", title: "Programas", text: "Publicados y temporales" },
  { icon: "calendar", title: "Asignaciones", text: "Aseo, micrófonos y acomodadores" },
  { icon: "fileText", title: "Informes", text: "Por grupo y por precursor" },
];

export default function AuthLayout({ icon = "shieldCheck", title, subtitle, children, footer }) {
  return (
    <div className="adm-glass login-glass">
      <div className="login-shell">
        <section className="login-hero" aria-label="Cartelera">
          <div className="login-brand">
            <span className="adm-brand-mark" aria-hidden="true">
              <Icon name="layers" size={22} strokeWidth={2} />
            </span>
            <span className="adm-brand-text">
              <strong>Cartelera</strong>
              <small>Admin Panel</small>
            </span>
          </div>

          <h1 className="login-hero-title">El programa de la congregación, en un solo panel.</h1>
          <p className="login-hero-text">
            Prepara los programas de la reunión, organiza las asignaciones y revisa los informes de predicación.
          </p>

          <ul className="login-features">
            {FEATURES.map((f) => (
              <li key={f.title} className="login-feature">
                <span className="login-feature-icon" aria-hidden="true"><Icon name={f.icon} size={18} /></span>
                <span>
                  <strong>{f.title}</strong>
                  <small>{f.text}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <main className="login-box">
          <span className="login-badge" aria-hidden="true">
            <Icon name={icon} size={22} />
          </span>
          <h2 className="login-title">{title}</h2>
          {subtitle && <p className="login-subtitle">{subtitle}</p>}

          {children}

          {footer && <div className="login-footer">{footer}</div>}
        </main>
      </div>
    </div>
  );
}

// Aviso dentro de la tarjeta: error (rojo), info (turquesa), warn (ámbar), ok (verde)
export function AuthNotice({ tone = "error", icon, children }) {
  const icons = { error: "alert", info: "clock", warn: "lock", ok: "check" };
  return (
    <div className={`login-notice login-notice--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={icon || icons[tone]} size={18} />
      <span>{children}</span>
    </div>
  );
}

// Campo con icono; `reveal` agrega el botón para mostrar u ocultar la contraseña
export function AuthField({ id, label, icon, hint, reveal, revealed, onReveal, ...inputProps }) {
  return (
    <div className="login-field">
      <label htmlFor={id}>{label}</label>
      <div className="login-input">
        <Icon name={icon} size={18} />
        <input id={id} {...inputProps} />
        {reveal && (
          <button
            type="button"
            className="login-reveal"
            onClick={onReveal}
            aria-label={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={revealed}
            title={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Icon name={revealed ? "eyeOff" : "eye"} size={18} />
          </button>
        )}
      </div>
      {hint && <span className="login-hint">{hint}</span>}
    </div>
  );
}

export function SubmitButton({ loading, loadingText, children }) {
  return (
    <button type="submit" className="login-btn" disabled={loading}>
      {loading ? (
        <>
          <span className="adm-spinner adm-spinner--sm" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          <Icon name="arrowRight" size={18} />
        </>
      )}
    </button>
  );
}
