// src/admin/AdminPage.jsx
import { useState, useContext } from "react";
import ProgramList from "./ProgramList";
import StagingList from "./StagingList";
import ProgramForm from "./ProgramForm";
import UserManagement from "./UserManagement";
import StudentList from "./StudentList";
import CleaningManager from "./CleaningManager";
import AssignmentManager from "./AssignmentManager";
import GroupBoard from "./GroupBoard";
import ScheduleGenerator from "./ScheduleGenerator";
import PreachingReports from "./PreachingReports";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AdminLayout from "./AdminLayout";
import { Loading } from "./AdminWidgets";
import { TAB_KEYS } from "./adminNav";
import "./AdminPage.css";

const API = import.meta.env.VITE_API_URL || "";

export default function AdminPage() {
    const { logout, token } = useContext(AuthContext);
    const location = useLocation();
    // 'published' | 'staging' | 'new' | 'edit' | … (las demás opciones del menú).
    // Desde /informes el menú vuelve aquí con la vista elegida en location.state.tab.
    const [tab, setTab] = useState(() => (TAB_KEYS.includes(location.state?.tab) ? location.state.tab : "published"));
    const [refreshKey, setRefreshKey] = useState(0);
    // Solo para el aviso de "temporales sin publicar" de la barra superior (no recarga la vista)
    const [noticeKey, setNoticeKey] = useState(0);

    // { id, week_start, week_end, payload, source: 'staging'|'published' }
    const [editingProgram, setEditingProgram] = useState(null);
    const [loadingEdit, setLoadingEdit] = useState(false);

    const refresh = () => setRefreshKey((k) => k + 1);

    // Mismo comportamiento que tenían las pestañas: "Nuevo" y "Usuarios"/"Estudiantes" cierran la edición
    const selectTab = (key) => {
        if (["new", "users", "students"].includes(key)) setEditingProgram(null);
        setTab(key);
    };

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

                const r = await fetch(url, {
                    headers: {
                      Authorization: `Bearer ${token}`
                    }
                });
                if (r.status === 401 || r.status === 403) {
                  logout();
                  throw new Error("Sesión expirada");
                }
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
        <AdminLayout
            activeKey={tab}
            onSelect={selectTab}
            editingLabel={tab === "edit" && editingProgram ? `Editando #${editingProgram.id}` : null}
            refreshKey={`${refreshKey}-${noticeKey}`}
        >
                {loadingEdit && (
                    <Loading>Cargando programa para editar…</Loading>
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
                        onChanged={() => setNoticeKey((k) => k + 1)}
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
                {!loadingEdit && tab === "users" && (
                    <UserManagement />
                )}
                
                {!loadingEdit && tab === "students" && (
                    <div className="tab-content fade-in">
                        <StudentList />
                    </div>
                )}
                {!loadingEdit && tab === "schedule" && (
                    <ScheduleGenerator />
                )}
                {(!loadingEdit && tab === "cleaning") && (
                    <CleaningManager />
                )}
                {!loadingEdit && tab === "micro" && (
                    <AssignmentManager type="micro" title="Micrófonos" icon="mic" />
                )}
                {!loadingEdit && tab === "attendant" && (
                    <AssignmentManager type="attendant" title="Acomodadores" icon="door" />
                )}
                {!loadingEdit && tab === "groups" && (
                    <GroupBoard />
                )}
                {!loadingEdit && tab === "reports" && (
                    <PreachingReports />
                )}
                {!loadingEdit && tab === "edit" && editingProgram && (
                    <ProgramForm
                        key={editingProgram.id}
                        initialData={editingProgram}
                        editSource={editingProgram.source}
                        onSaved={handleEditSaved}
                    />
                )}
        </AdminLayout>
    );
}
