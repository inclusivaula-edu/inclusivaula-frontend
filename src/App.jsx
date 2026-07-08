import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LessonProvider } from "./contexts/LessonContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import GenerateLesson from "./pages/GenerateLesson";
import LessonResult from "./pages/LessonResult";
import History from "./pages/History";
import Students from "./pages/Students";
import SchoolAdmin from "./pages/SchoolAdmin";
import Exercises from "./pages/Exercises";
import Reports from "./pages/Reports";
import SavedReports from "./pages/SavedReports";
import Attendance from "./pages/Attendance";
import Assessments from "./pages/Assessments";
import Classes from "./pages/Classes";
import PEI from "./pages/PEI";
import AEE from "./pages/AEE";
import AEESessions from "./pages/AEESessions";
import RecoverPassword from "./pages/RecoverPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import SecurityMFA from "./pages/SecurityMFA";
import AuditLogs from "./pages/AuditLogs";
import Simulado from "./pages/Simulado";
import SchoolPanel from "./pages/SchoolPanel";
import CaseStudy from "./pages/CaseStudy";
import Agenda from "./pages/Agenda";
import InterventionBank from "./pages/InterventionBank";
import NetworkPanel from "./pages/NetworkPanel";
import SecurityAlerts from "./pages/SecurityAlerts";
import CookieBanner from "./components/CookieBanner";
import Toast from "./components/Toast";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" />;
}

function AppRoutes() {
  return (
    <>
      <Routes>
        {/* Públicas — autenticação */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/recuperar-senha" element={<RecoverPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />

        {/* Públicas — legais (acessíveis sem login) */}
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos" element={<TermsOfUse />} />

        {/* Privadas */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/gerar" element={<PrivateRoute><GenerateLesson /></PrivateRoute>} />
        <Route path="/resultado" element={<PrivateRoute><LessonResult /></PrivateRoute>} />
        <Route path="/historico" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/alunos" element={<PrivateRoute><Students /></PrivateRoute>} />
        <Route path="/escola" element={<PrivateRoute><SchoolAdmin /></PrivateRoute>} />
        <Route path="/exercicios" element={<PrivateRoute><Exercises /></PrivateRoute>} />
        <Route path="/relatorios" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/relatorios/salvos" element={<PrivateRoute><SavedReports /></PrivateRoute>} />
        <Route path="/frequencia" element={<PrivateRoute><Attendance /></PrivateRoute>} />
        <Route path="/avaliacoes" element={<PrivateRoute><Assessments /></PrivateRoute>} />
        <Route path="/turmas" element={<PrivateRoute><Classes /></PrivateRoute>} />
        <Route path="/pei" element={<PrivateRoute><PEI /></PrivateRoute>} />
        <Route path="/aee" element={<PrivateRoute><AEE /></PrivateRoute>} />
        <Route path="/aee-sessoes" element={<PrivateRoute><AEESessions /></PrivateRoute>} />
        <Route path="/simulado" element={<PrivateRoute><Simulado /></PrivateRoute>} />
        <Route path="/intervencoes" element={<PrivateRoute><InterventionBank /></PrivateRoute>} />
        <Route path="/agenda" element={<PrivateRoute><Agenda /></PrivateRoute>} />
        <Route path="/estudo-caso" element={<PrivateRoute><CaseStudy /></PrivateRoute>} />
        <Route path="/painel-escola" element={<PrivateRoute><SchoolPanel /></PrivateRoute>} />
        <Route path="/painel-rede" element={<PrivateRoute><NetworkPanel /></PrivateRoute>} />
        <Route path="/seguranca" element={<PrivateRoute><SecurityMFA /></PrivateRoute>} />
        <Route path="/auditoria" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
        <Route path="/seguranca/alertas" element={<PrivateRoute><SecurityAlerts /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <CookieBanner />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LessonProvider>
          <AppRoutes />
        </LessonProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
