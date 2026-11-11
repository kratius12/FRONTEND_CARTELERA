import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import App from "./App";
import CurrentProgramRedirect from "./CurrentProgramRedirect";
import AdminPage from "./admin/AdminPage";
import Login from "./components/Login";
import Register from "./components/Register";
import { ForgotPassword, ResetPassword } from "./components/PasswordRecovery";
import ProtectedRoute from "./components/ProtectedRoute";
import StagingPreview from "./StagingPreview";
import CleaningSlide from "./CleaningSlide";
import PrintSchedule from "./components/PrintSchedule";
import PrintGroups from "./components/PrintGroups";
import PreachingReportsPage from "./admin/PreachingReportsPage";
import GroupReportPage from "./GroupReportPage";
import PioneerProgressPage from "./admin/PioneerProgressPage";
import {
  AdminHome,
  AdminNotFound,
  EditProgramPage,
  NewProgramPage,
  PublishedProgramsPage,
  RequirePermission,
  StagingProgramsPage,
} from "./admin/AdminPages";
import UserManagement from "./admin/UserManagement";
import StudentList from "./admin/StudentList";
import GroupBoard from "./admin/GroupBoard";
import ScheduleGenerator from "./admin/ScheduleGenerator";
import CleaningManager from "./admin/CleaningManager";
import AssignmentManager from "./admin/AssignmentManager";
import WeekendSchedule from "./admin/WeekendSchedule";
import SoundSchedule from "./admin/SoundSchedule";
import TalksPage from "./admin/TalksPage";

// Rutas anteriores del módulo de informes: llevan a las nuevas conservando ?mes=
function LegacyReportsRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/admin/informes${search}`} replace />;
}

function LegacyPioneersRedirect() {
  const { tipo } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/admin/informes/precursores/${tipo}${search}`} replace />;
}

// Página del panel que exige un módulo
const guard = (perm, element) => <RequirePermission perm={perm}>{element}</RequirePermission>;

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CurrentProgramRedirect />} />
      <Route path="/programs/:id" element={<App />} />
      <Route path="/staging/:id" element={<StagingPreview />} />
      <Route path="/aseo" element={<CleaningSlide />} />
      <Route path="/imprimir" element={<PrintSchedule />} />
      <Route path="/imprimir-grupos" element={
        <ProtectedRoute permission="groups">
          <PrintGroups />
        </ProtectedRoute>
      } />

      {/* Acceso */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/recuperar" element={<ForgotPassword />} />
      <Route path="/restablecer" element={<ResetPassword />} />

      {/* Panel de administración: una ruta por página, cada una con su módulo */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="programas" element={guard("programs", <PublishedProgramsPage />)} />
        <Route path="programas/temporales" element={guard("programs", <StagingProgramsPage />)} />
        <Route path="programas/nuevo" element={guard("programs", <NewProgramPage />)} />
        <Route path="programas/:id/editar" element={guard("programs", <EditProgramPage source="published" />)} />
        <Route path="programas/temporales/:id/editar" element={guard("programs", <EditProgramPage source="staging" />)} />
        <Route path="usuarios" element={guard("users", <UserManagement />)} />
        <Route path="estudiantes" element={guard("students", <div className="tab-content fade-in"><StudentList /></div>)} />
        <Route path="grupos" element={guard("groups", <GroupBoard />)} />
        <Route path="programacion" element={guard("assignments", <ScheduleGenerator />)} />
        <Route path="aseo" element={guard("assignments", <CleaningManager />)} />
        <Route path="microfonos" element={guard("assignments", <AssignmentManager type="micro" title="Micrófonos" icon="mic" />)} />
        <Route path="acomodadores" element={guard("assignments", <AssignmentManager type="attendant" title="Acomodadores" icon="door" />)} />
        <Route path="fin-de-semana" element={guard("weekend", <WeekendSchedule />)} />
        <Route path="sonido" element={guard("sound", <SoundSchedule />)} />
        <Route path="conferencias" element={guard("talks", <TalksPage />)} />
        <Route path="informes" element={guard("reports", <PreachingReportsPage />)} />
        <Route path="informes/precursores/:tipo" element={guard("reports", <PioneerProgressPage />)} />
        <Route path="*" element={<AdminNotFound />} />
      </Route>

      {/* Direcciones anteriores del módulo de informes */}
      <Route path="/informes" element={<LegacyReportsRedirect />} />
      <Route path="/informes/precursores/:tipo" element={<LegacyPioneersRedirect />} />

      {/* Link secreto de cada grupo: sin login */}
      <Route path="/informe-grupo/:token" element={<GroupReportPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
