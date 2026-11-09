// src/admin/AdminAccount.jsx
// Cuenta propia: cambiar la contraseña desde el menú de usuario.
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Icon from "./AdminIcons";
import { Modal } from "./AdminWidgets";
import { apiErrorMessage, passwordProblem, readJson } from "./adminApi";

const API = import.meta.env.VITE_API_URL || "";

export function ChangePasswordModal({ onClose }) {
    const { token, replaceToken } = useContext(AuthContext);
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        const problem = passwordProblem(next);
        if (problem) return setError(problem);
        if (next !== confirm) return setError("La confirmación no coincide con la nueva contraseña.");

        setSaving(true);
        try {
            const res = await fetch(`${API}/api/auth/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ current_password: current, new_password: next }),
            });
            const body = await readJson(res);
            if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo cambiar la contraseña."));
            replaceToken(body.access_token);
            setDone(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (done) {
        return (
            <Modal
                title="Contraseña actualizada"
                icon="check"
                size="sm"
                onClose={onClose}
                footer={<button type="button" className="adm-btn adm-btn--primary" onClick={onClose}>Listo</button>}
            >
                <p>Tu contraseña cambió. Las sesiones abiertas en otros dispositivos se cerraron.</p>
            </Modal>
        );
    }

    return (
        <Modal title="Cambiar contraseña" icon="lock" size="sm" onClose={onClose} dismissOnBackdrop={false}>
            {error && <div className="adm-form-error" role="alert"><Icon name="alert" size={16} />{error}</div>}
            <form onSubmit={submit} className="adm-stack">
                <label className="adm-field">
                    <span className="adm-label">Contraseña actual</span>
                    <input className="adm-input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
                </label>
                <label className="adm-field">
                    <span className="adm-label">Nueva contraseña</span>
                    <input className="adm-input" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
                    <span className="adm-help">Mínimo 8 caracteres, con letras y números.</span>
                </label>
                <label className="adm-field">
                    <span className="adm-label">Confirmar nueva contraseña</span>
                    <input className="adm-input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </label>
                <div className="adm-modal-foot adm-modal-foot--inline">
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
                        {saving ? "Guardando…" : "Cambiar contraseña"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
