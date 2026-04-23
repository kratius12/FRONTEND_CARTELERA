// src/admin/AdminPage.jsx
import { useState, useContext } from "react";
import ProgramList from "./ProgramList";
import StagingList from "./StagingList";
import ProgramForm from "./ProgramForm";
import UserManagement from "./UserManagement";
import StudentList from "./StudentList";
import CleaningManager from "./CleaningManager";
import ThemeToggle from "../components/ThemeToggle";
import { AuthContext } from "../context/AuthContext";
import "./AdminPage.css";

const API = import.meta.env.VITE_API_URL || "";

export default function AdminPage() {
    const { logout, token } = useContext(AuthContext);
    // 'published' | 'staging' | 'new' | 'edit'
    const [tab, setTab] = useState("published");
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <div className={`admin-app ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
            
            {/* Global Top Navbar */}
            <header className="top-navbar">
                <div className="navbar-left">
                    <button 
                        className="navbar-menu-btn"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        title={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
                    >
                        {isSidebarOpen ? "✕" : "☰"}
                    </button>
                    <div className="navbar-brand">
                        <span className="navbar-logo">📋</span>
                        <span className="navbar-title">Admin Panel</span>
                    </div>
                </div>
                
                <div className="navbar-right">
                    <ThemeToggle />
                    <button 
                        className="navbar-logout-btn" 
                        onClick={logout}
                        title="Cerrar Sesión"
                    >
                        🚪 <span className="logout-text">Salir</span>
                    </button>
                </div>
            </header>

            {/* Backdrop Overlay for Mobile Drawer */}
            {isSidebarOpen && (
                <div 
                    className="sidebar-overlay" 
                    onClick={() => setIsSidebarOpen(false)}
                    title="Cerrar menú"
                ></div>
            )}

            <div className="admin-body">
                <aside className={`admin-sidebar ${!isSidebarOpen ? "collapsed" : ""}`}>
                    <nav className="admin-sidebar__nav">
                        <button
                            className={`admin-tab ${tab === "published" ? "active" : ""}`}
                            onClick={() => { setTab("published"); if (window.innerWidth <= 768) setIsSidebarOpen(false); }}
                            title="📚 Publicados"
                        >
                            <span className="tab-icon">📚</span>
                            {isSidebarOpen && <span className="tab-text">Publicados</span>}
                        </button>
                        <button
                            className={`admin-tab ${tab === "staging" ? "active" : ""}`}
                            onClick={() => { setTab("staging"); if (window.innerWidth <= 768) setIsSidebarOpen(false); }}
                            title="⏳ Temporal"
                        >
                            <span className="tab-icon">⏳</span>
                            {isSidebarOpen && <span className="tab-text">Temporal</span>}
                        </button>
                        <button
                            className={`admin-tab ${tab === "new" ? "active" : ""}`}
                            onClick={() => { setEditingProgram(null); setTab("new"); if (window.innerWidth <= 768) setIsSidebarOpen(false); }}
                            title="➕ Nuevo Programa"
                        >
                            <span className="tab-icon">➕</span>
                            {isSidebarOpen && <span className="tab-text">Nuevo Programa</span>}
                        </button>
                        <button
                            className={`admin-tab ${tab === "users" ? "active" : ""}`}
                            onClick={() => { setEditingProgram(null); setTab("users"); if (window.innerWidth <= 768) setIsSidebarOpen(false); }}
                            title="👥 Gestión Usuarios"
                        >
                            <span className="tab-icon">👥</span>
                            {isSidebarOpen && <span className="tab-text">Gestión Usuarios</span>}
                        </button>
                        <button
                            className={`admin-tab ${tab === "students" ? "active" : ""}`}
                            onClick={() => { setEditingProgram(null); setTab("students"); if (window.innerWidth <= 768) setIsSidebarOpen(false); }}
                            title="👨‍🎓 Estudiantes"
                        >
                            <span className="tab-icon">👨‍🎓</span>
                            {isSidebarOpen && <span className="tab-text">Estudiantes</span>}
                        </button>
                        <button
                            className={`admin-tab ${tab === "cleaning" ? "active" : ""}`}
                            onClick={() => { setEditingProgram(null); setTab("cleaning"); if (window.innerWidth <= 768) setIsSidebarOpen(false); }}
                            title="🧹 Aseo"
                        >
                            <span className="tab-icon">🧹</span>
                            {isSidebarOpen && <span className="tab-text">Aseo</span>}
                        </button>

                        {tab === "edit" && editingProgram && (
                            <button className="admin-tab active" disabled title="✏️ Editando">
                                <span className="tab-icon">✏️</span>
                                {isSidebarOpen && <span className="tab-text">Editando #{editingProgram.id}</span>}
                            </button>
                        )}
                    </nav>
                </aside>

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
                {!loadingEdit && tab === "users" && (
                    <UserManagement />
                )}
                
                {!loadingEdit && tab === "students" && (
                    <div className="tab-content fade-in">
                        <StudentList />
                    </div>
                )}
                {!loadingEdit && tab === "cleaning" && (
                    <CleaningManager />
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
        </div>
    );
}
