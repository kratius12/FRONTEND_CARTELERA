// src/GroupReportPage.jsx
// Página pública de un grupo (/informe-grupo/:token): el encargado ve y llena los informes de su grupo sin iniciar sesión.
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle";
import { GroupReportTable, MonthPicker, SaveBar } from "./admin/PreachingReportsParts";
import { currentServiceYear, defaultMonth, groupTitle, monthLabel, toPayload } from "./admin/preachingReportsUtils";
import { usePreachingReportEdits } from "./admin/usePreachingReportEdits";
import "./admin/AdminPage.css";
import "./admin/PreachingReports.css";

const API = import.meta.env.VITE_API_URL || "";
const INVALID_LINK = "Este link no es válido o fue cambiado. Pídele el link nuevo al secretario.";

async function readError(res, fallback) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 404 || res.status === 422) return INVALID_LINK;
    return typeof body.detail === "string" ? body.detail : fallback;
}

export default function GroupReportPage() {
    const { token } = useParams();
    const [month, setMonth] = useState(defaultMonth);
    const [data, setData] = useState(null); // { month, group }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");

    const group = data?.group || null;
    const { edits, pendingCount, getRow, updateRow, changeType, clearEdits } = usePreachingReportEdits(group ? [group] : []);

    const showToast = (msg, ms = 2500) => {
        setToast(msg);
        setTimeout(() => setToast(""), ms);
    };

    useEffect(() => {
        let cancelled = false;
        fetch(`${API}/api/group-reports/${encodeURIComponent(token)}?month=${month}`)
            .then(async (res) => {
                if (!res.ok) throw new Error(await readError(res, "No se pudieron cargar los informes"));
                const body = await res.json();
                if (cancelled) return;
                setData(body);
                clearEdits();
                setError("");
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, token]);

    const changeMonth = (next) => {
        if (!next || next === month) return;
        if (pendingCount && !window.confirm("Tienes cambios sin guardar. ¿Cambiar de mes y descartarlos?")) return;
        setLoading(true);
        setMonth(next);
    };

    const handleSave = async () => {
        if (!pendingCount) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/group-reports/${encodeURIComponent(token)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, reports: Object.values(edits).map(toPayload) }),
            });
            if (!res.ok) throw new Error(await readError(res, "No se pudieron guardar los informes"));
            setData(await res.json());
            clearEdits();
            showToast("✅ Informes guardados");
        } catch (err) {
            showToast(`❌ ${err.message}`, 5000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-app">
            {toast && <div className="toast">{toast}</div>}

            <header className="top-navbar">
                <div className="navbar-left">
                    <div className="navbar-brand">
                        <span className="navbar-logo">📝</span>
                        <span className="navbar-title">Informes de predicación</span>
                    </div>
                </div>
                <div className="navbar-right">
                    <ThemeToggle />
                </div>
            </header>

            <main className="admin-content pr-standalone">
                <div className="pr-page">
                    <div className="pr-header">
                        <div>
                            <h2 className="pr-title">{group ? groupTitle(group.name) : "Informe del grupo"}</h2>
                            <p className="pr-subtitle">
                                Informe de <strong>{monthLabel(month)}</strong> · año de servicio {currentServiceYear()}. Llena los datos de cada persona y guarda al final.
                            </p>
                        </div>
                        {!(error && !group) && (
                            <div className="pr-toolbar">
                                <MonthPicker month={month} onChange={changeMonth} />
                            </div>
                        )}
                    </div>

                    {loading && <div className="admin-status">Cargando informes…</div>}
                    {!loading && error && <div className="pr-public-error">{error}</div>}
                    {!loading && !error && group && (
                        <GroupReportTable
                            group={group}
                            getRow={getRow}
                            edits={edits}
                            onUpdate={updateRow}
                            onTypeChange={changeType}
                            typeEditable={false}
                        />
                    )}
                    {!loading && !error && group && (
                        <p className="pr-public-help">
                            <strong>Horas:</strong> para publicadores elige SP (participó) o NP (no participó); para precursores
                            escribe las horas. Quién es precursor lo administra el secretario. Los cambios no se guardan hasta que
                            presiones <strong>Guardar informes</strong>.
                        </p>
                    )}

                    <SaveBar count={pendingCount} saving={saving} onSave={handleSave} onDiscard={clearEdits} />
                </div>
            </main>
        </div>
    );
}
