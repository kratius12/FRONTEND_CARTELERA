// /recuperar: pide el enlace por correo · /restablecer?token=…: elige la contraseña nueva
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiErrorMessage, passwordProblem, readJson } from "../admin/adminApi";
import AuthLayout, { AuthField, AuthNotice, SubmitButton } from "./AuthLayout";

const API = import.meta.env.VITE_API_URL || "";

const NO_EMAIL_TEXT =
  "El envío de correos todavía no está configurado. Pide a un administrador que te asigne una contraseña nueva desde Gestión de usuarios.";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { tone, text }
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/auth/recover-password/status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setEmailEnabled(!!d.email_enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/auth/recover-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await readJson(res);
      if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo enviar el enlace."));
      if (body.email_enabled === false) {
        setEmailEnabled(false);
        setResult({ tone: "warn", text: NO_EMAIL_TEXT });
      } else {
        setResult({ tone: "ok", text: body.message });
      }
    } catch (err) {
      setResult({ tone: "error", text: err.message === "Failed to fetch" ? "No se pudo conectar con el servidor." : err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon="mail"
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para elegir una contraseña nueva."
      footer={<Link className="login-link" to="/login">Volver a iniciar sesión</Link>}
    >
      {!emailEnabled && !result && <AuthNotice tone="warn">{NO_EMAIL_TEXT}</AuthNotice>}
      {result && <AuthNotice tone={result.tone}>{result.text}</AuthNotice>}

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
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
        />
        <SubmitButton loading={loading} loadingText="Enviando...">Enviar enlace</SubmitButton>
      </form>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const problem = passwordProblem(password);
    if (problem) return setError(`Contraseña: ${problem}`);
    if (password !== confirm) return setError("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const body = await readJson(res);
      if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo cambiar la contraseña."));
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "No se pudo conectar con el servidor." : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon="lock"
      title="Nueva contraseña"
      subtitle="Elige la contraseña con la que vas a entrar al panel."
      footer={<Link className="login-link" to="/recuperar">Pedir otro enlace</Link>}
    >
      {!token ? (
        <AuthNotice tone="warn">El enlace está incompleto. Ábrelo de nuevo desde el correo o pide uno nuevo.</AuthNotice>
      ) : (
        <>
          {error && <AuthNotice tone="error">{error}</AuthNotice>}
          <form onSubmit={handleSubmit} className="login-form">
            <AuthField
              id="password"
              label="Nueva contraseña"
              icon="lock"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="new-password"
              hint="Al menos 8 caracteres, con letras y números."
              reveal
              revealed={showPassword}
              onReveal={() => setShowPassword((v) => !v)}
            />
            <AuthField
              id="confirm"
              label="Confirmar contraseña"
              icon="lock"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            <SubmitButton loading={loading} loadingText="Guardando...">Guardar contraseña</SubmitButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
