import { useState, useContext } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Icon from "../admin/AdminIcons";
import { apiErrorCode, apiErrorMessage, readJson } from "../admin/adminApi";
import AuthLayout, { AuthField, AuthNotice, SubmitButton } from "./AuthLayout";

const API = import.meta.env.VITE_API_URL || "";

// Tono del aviso según el código de error del backend
const NOTICE_TONE = { account_pending: "info", account_locked: "warn", account_disabled: "warn" };

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [notice, setNotice] = useState(null); // { tone, text }
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = location.state?.from?.startsWith("/") ? location.state.from : "/admin";

  // Con la sesión ya iniciada no hace falta el formulario
  if (token && user) return <Navigate to={goTo} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      formData.append("remember", remember ? "true" : "false");

      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!res.ok) {
        const body = await readJson(res);
        const code = apiErrorCode(body);
        setNotice({ tone: NOTICE_TONE[code] || "error", text: apiErrorMessage(body, "Credenciales inválidas") });
        return;
      }

      const data = await res.json();
      login(data.access_token);

      // Vuelve a la página que se pidió antes de iniciar sesión (o al panel)
      navigate(goTo, { replace: true });
    } catch {
      setNotice({ tone: "error", text: "No se pudo conectar con el servidor. Inténtalo de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Acceso Cartelera"
      subtitle="Solo personal autorizado"
      footer={(
        <>
          <span>¿No tienes cuenta? <Link to="/registro">Solicitar acceso</Link></span>
          <a className="login-public" href="/" target="_blank" rel="noopener noreferrer">
            <Icon name="monitor" size={16} />
            Ver cartelera pública
          </a>
        </>
      )}
    >
      {location.state?.registered && !notice && (
        <AuthNotice tone="ok">Solicitud enviada. Podrás entrar cuando un administrador apruebe tu acceso.</AuthNotice>
      )}
      {location.state?.passwordReset && !notice && (
        <AuthNotice tone="ok">Contraseña actualizada. Ya puedes iniciar sesión.</AuthNotice>
      )}
      {notice && <AuthNotice tone={notice.tone}>{notice.text}</AuthNotice>}

      <form onSubmit={handleSubmit} className="login-form">
        <AuthField
          id="email"
          label="Correo Electrónico"
          icon="mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          autoComplete="username"
          placeholder="admin@ejemplo.com"
        />

        <AuthField
          id="password"
          label="Contraseña"
          icon="lock"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          reveal
          revealed={showPassword}
          onReveal={() => setShowPassword((v) => !v)}
        />

        <div className="login-row">
          <label className="login-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Recordarme 30 días</span>
          </label>
          <Link className="login-link" to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </div>

        <SubmitButton loading={loading} loadingText="Verificando...">Iniciar Sesión</SubmitButton>
      </form>
    </AuthLayout>
  );
}
