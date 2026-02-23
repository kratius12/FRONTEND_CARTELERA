// src/admin/AdminPage.jsx
import { useState } from "react";
import ProgramList from "./ProgramList";
import StagingList from "./StagingList";
import ProgramForm from "./ProgramForm";
import "./AdminPage.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdminPage() {
    // 'published' | 'staging' | 'new' | 'edit'
    const [tab, setTab] = useState("published");
    const [refreshKey, setRefreshKey] = useState(0);

    // { id, week_start, week_end, payload, source: 'staging'|'published' }
    const [editingProgram, setEditingProgram] = useState(null);
    const [loadingEdit, setLoadingEdit] = useState(false);

    const refresh = () => setRefreshKey((k) => k + 1);

    // Carga el payload completo del programa y abre el formulario de edición
    const handleEdit = async (program, source) => {
        setLoadingEdit(true);
        try {
            let payload = program.payload;

            if (!payload) {
                let url;
                if (source === "staging") {
                    url = `${API}/api/admin/programs/staging/${program.id}`;
                } else {
                    url = `${API}/api/programs/${program.id}`;
                }

                const r = await fetch(url);
                if (!r.ok) throw new Error("No se pudo cargar el programa");
                const data = await r.json();

                // GET staging devuelve { id, week_start, week_end, payload }
                // GET publicado devuelve el payload directamente
                payload = source === "staging" ? data.payload : data;
            }

            setEditingProgram({
                id: program.id,
                week_start: program.week_start,
                week_end: program.week_end,
                payload,
                source,
            });
            setTab("edit");
        } catch (err) {
            alert(`❌ ${err.message}`);
        } finally {
            setLoadingEdit(false);
        }
    };

    const handleEditSaved = () => {
        const returnTab = editingProgram?.source === "staging" ? "staging" : "published";
        setEditingProgram(null);
        refresh();
        setTab(returnTab);
    };

    return (
        <div className="admin-layout">
            <header className="admin-header">
                <div className="admin-header__brand">
                    <span className="admin-header__logo">📋</span>
                    <span className="admin-header__title">Cartelera — Admin</span>
                </div>
                <nav className="admin-tabs">
                    <button
                        className={`admin-tab ${tab === "published" ? "active" : ""}`}
                        onClick={() => setTab("published")}
                    >
                        Publicados
                    </button>
                    <button
                        className={`admin-tab ${tab === "staging" ? "active" : ""}`}
                        onClick={() => setTab("staging")}
                    >
                        Temporal
                    </button>
                    <button
                        className={`admin-tab ${tab === "new" ? "active" : ""}`}
                        onClick={() => { setEditingProgram(null); setTab("new"); }}
                    >
                        + Nuevo programa
                    </button>
                    {tab === "edit" && editingProgram && (
                        <button className="admin-tab active" disabled>
                            ✏️ Editando #{editingProgram.id}
                        </button>
                    )}
                </nav>
            </header>

            <main className="admin-content">
                {loadingEdit && (
                    <div className="admin-status">Cargando programa para editar…</div>
                )}

                {!loadingEdit && tab === "published" && (
                    <ProgramList
                        key={refreshKey}
                        onEdit={(p) => handleEdit(p, "published")}
                    />
                )}
                {!loadingEdit && tab === "staging" && (
                    <StagingList
                        key={refreshKey}
                        onPublished={() => {
                            refresh();
                            setTab("published");
                        }}
                        onEdit={(p) => handleEdit(p, "staging")}
                    />
                )}
                {!loadingEdit && tab === "new" && (
                    <ProgramForm
                        onSaved={() => {
                            refresh();
                            setTab("staging");
                        }}
                    />
                )}
                {!loadingEdit && tab === "edit" && editingProgram && (
                    <ProgramForm
                        key={editingProgram.id}
                        initialData={editingProgram}
                        editSource={editingProgram.source}
                        onSaved={handleEditSaved}
                    />
                )}
            </main>
        </div>
    );
}
