import { supabase } from "./supabaseClient.js";

const BASE_URL = import.meta.env.VITE_API_URL;

async function request(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

// ── AULAS ────────────────────────────────────────────────────────

export async function generateLesson(payload) {
  return request("/api/generate-lesson", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getLessonStatus(jobId) {
  return request(`/api/lesson-status/${jobId}`);
}

export async function getLessonPDF(jobId) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}/api/lesson-pdf/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF");
  return res.blob();
}

// ── EXERCÍCIOS ───────────────────────────────────────────────────

export async function generateExercises(lessonId, studentId = null, quantidade = 5) {
  return request("/api/exercises/generate", {
    method: "POST",
    body: JSON.stringify({ lessonId, studentId, quantidade })
  });
}

export async function getExercisesByLesson(lessonId) {
  return request(`/api/exercises/lesson/${lessonId}`);
}

export async function registerGrade(activityId, studentId, score, feedback = "") {
  return request("/api/exercises/grade", {
    method: "POST",
    body: JSON.stringify({ activityId, studentId, score, feedback })
  });
}

// ── RELATÓRIOS ───────────────────────────────────────────────────

export async function generateReport(studentId, tipo = "semestral", periodo = null) {
  return request("/api/reports/generate", {
    method: "POST",
    body: JSON.stringify({ studentId, tipo, periodo })
  });
}

export async function getReportsByStudent(studentId) {
  return request(`/api/reports/student/${studentId}`);
}

export async function getReportPDF(reportId) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}/api/reports/${reportId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF do relatório");
  return res.blob();
}

// ── USO E PLANO ──────────────────────────────────────────────────

export async function getUsage() {
  return request("/api/usage");
}