// /registro: solicitud de acceso al panel. La cuenta queda pendiente hasta que
// un administrador la apruebe y le asigne los módulos.
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiErrorMessage, passwordProblem, readJson } from "../admin/adminApi";
import AuthLayout, { AuthField, AuthNotice, SubmitButton } from "./AuthLayout";

const API = import.meta.env.VITE_API_URL || "";

export default function Register() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const problem = passwordProblem(form.password);
    if (problem) return setError(`Contraseña: ${problem}`);
    if (form.password !== form.confirm) return setError("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: form.full_name, email: form.email, password: form.password }),
      });
      const body = await readJson(res);
      if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo enviar la solicitud."));
      setSent(true);
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "No se pudo conectar con el servidor." : err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        icon="check"
        title="Solicitud enviada"
        subtitle={`Registramos tu solicitud con el correo ${form.email}.`}
        footer={<Link className="login-link" to="/login" state={{ registered: true }}>Volver a iniciar sesión</Link>}
      >
        <ol className="login-steps">
          <li><strong>Un administrador revisa tu solicitud</strong><span>La verá en Gestión de usuarios.</span></li>
          <li><strong>Te asigna las secciones</strong><span>Solo verás las páginas que te habilite.</span></li>
          <li><strong>Inicias sesión</strong><span>Con el correo y la contraseña que elegiste.</span></li>
        </ol>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon="user"
      title="Solicitar acceso"
      subtitle="Un administrador debe aprobar tu cuenta antes de que puedas entrar."
      footer={<span>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></span>}
    >
      {error && <AuthNotice tone="error">{error}</AuthNotice>}

      <form onSubmit={handleSubmit} className="login-form">
        <AuthField
          id="full_name"
          label="Nombre completo"
          icon="user"
          type="text"
          value={form.full_name}
          onChange={set("full_name")}
          required
          minLength={2}
          maxLength={120}
          autoFocus
          autoComplete="name"
          placeholder="Ej. María Gómez"
        />
        <AuthField
          id="email"
          label="Correo Electrónico"
          icon="mail"
          type="email"
          value={form.email}
          onChange={set("email")}
          required
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
        />
        <AuthField
          id="password"
          label="Contraseña"
          icon="lock"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={set("password")}
          required
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
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
          value={form.confirm}
          onChange={set("confirm")}
          required
          autoComplete="new-password"
          placeholder="Repite la contraseña"
        />

        <SubmitButton loading={loading} loadingText="Enviando...">Enviar solicitud</SubmitButton>
      </form>
    </AuthLayout>
  );
}
