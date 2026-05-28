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
    <Routes>
      <Route path="/" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/escola" element={
        <PrivateRoute><SchoolAdmin /></PrivateRoute>
      } />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/dashboard" element={
        <PrivateRoute><Dashboard /></PrivateRoute>
      } />
      <Route path="/gerar" element={
        <PrivateRoute><GenerateLesson /></PrivateRoute>
      } />
      <Route path="/resultado" element={
        <PrivateRoute><LessonResult /></PrivateRoute>
      } />
      <Route path="/historico" element={
        <PrivateRoute><History /></PrivateRoute>
      } />
      <Route path="/alunos" element={
        <PrivateRoute><Students /></PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
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