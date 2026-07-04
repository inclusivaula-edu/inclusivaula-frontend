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
  if (!res.ok) {
    const msg = data.error || "Erro na requisição";
    if (res.status === 403 && msg.toLowerCase().includes("limite")) {
      window.dispatchEvent(new CustomEvent("inclusivaula:toast", { detail: { message: msg, type: "warning" } }));
    }
    throw new Error(msg);
  }
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

export async function deleteAvaliacao(id) {
  return request(`/api/exercises/${id}`, { method: "DELETE" });
}

export async function getAvaliacaoPDFBlob(id, tipo = "aluno") {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}/api/exercises/${id}/pdf?tipo=${tipo}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF da avaliação");
  return res.blob();
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

// ── RUBRICA ─────────────────────────────────────────────────────

export async function generateRubrica(lessonId, studentId = null) {
  return request("/api/exercises/rubrica", {
    method: "POST",
    body: JSON.stringify({ lessonId, studentId })
  });
}

// ── PEI (Plano Educacional Individualizado) ─────────────────────

export async function generatePEI(student_id, periodo, escola = "") {
  return request("/api/pei/generate", {
    method: "POST",
    body: JSON.stringify({ student_id, periodo, escola })
  });
}

export async function getPEIStatus(jobId) {
  return request(`/api/pei/${jobId}/status`);
}

export async function listPEIs(student_id = null) {
  const qs = student_id ? `?student_id=${student_id}` : "";
  return request(`/api/pei${qs}`);
}

// ── AEE (Atendimento Educacional Especializado) ─────────────────

export async function generateAEE(student_id, periodo, escola = "") {
  return request("/api/aee/generate", {
    method: "POST",
    body: JSON.stringify({ student_id, periodo, escola })
  });
}

export async function getAEEStatus(jobId) {
  return request(`/api/aee/${jobId}/status`);
}

export async function listAEEs(student_id = null) {
  const qs = student_id ? `?student_id=${student_id}` : "";
  return request(`/api/aee${qs}`);
}

// ── USO E PLANO ──────────────────────────────────────────────────

export async function getUsage() {
  return request("/api/usage");
}

export async function indexApprovedLesson(lessonId) {
  return request(`/api/lessons/${lessonId}/index-approved`, { method: "POST" });
}

export async function approvePEI(id) {
  return request(`/api/pei/${id}/approve`, { method: "POST" });
}

export async function approveAEE(id) {
  return request(`/api/aee/${id}/approve`, { method: "POST" });
}

export async function getPEIPDFBlob(id) {
  const { data: { session } } = await (await import("./supabaseClient.js")).supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pei/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF");
  return res.blob();
}

// ── SESSÕES AEE (Frequência — FUNDEB) ───────────────────────────

export async function listAEESessions(studentId) {
  const qs = studentId ? `?student_id=${studentId}` : "";
  return request(`/api/aee-sessions${qs}`);
}

export async function createAEESession(data) {
  return request("/api/aee-sessions", { method: "POST", body: JSON.stringify(data) });
}

export async function updateAEESession(id, data) {
  return request(`/api/aee-sessions/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteAEESession(id) {
  return request(`/api/aee-sessions/${id}`, { method: "DELETE" });
}

export async function getAEEFrequencyPDF(studentId, periodo) {
  const { data: { session } } = await (await import("./supabaseClient.js")).supabase.auth.getSession();
  const token = session?.access_token;
  const qs = new URLSearchParams({ student_id: studentId, ...(periodo ? { periodo } : {}) }).toString();
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/aee-sessions/frequency-pdf?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF de frequência");
  return res.blob();
}

// ── BILLING ──────────────────────────────────────────────────────

export async function getBillingPlan() {
  return request("/api/billing/plan");
}

export async function subscribePlan(plan, cycle = "mensal") {
  return request("/api/billing/subscribe", {
    method: "POST",
    body: JSON.stringify({ plan, cycle })
  });
}

export async function cancelBillingPlan() {
  return request("/api/billing/cancel", { method: "DELETE" });
}

export async function getAEEPDFBlob(id) {
  const { data: { session } } = await (await import("./supabaseClient.js")).supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/aee/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF");
  return res.blob();
}

// ── SIMULADOS ───────────────────────────────────────────────────

export async function generateSimulado(payload) {
  return request("/api/simulado/generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getSimuladoStatus(id) {
  return request(`/api/simulado/${id}/status`);
}

export async function listSimulados() {
  return request("/api/simulados");
}

export async function deleteSimulado(id) {
  return request(`/api/simulado/${id}`, { method: "DELETE" });
}

export async function getSimuladoPDFBlob(id, tipo = "aluno") {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}/api/simulado/${id}/pdf?tipo=${tipo}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF do simulado");
  return res.blob();
}