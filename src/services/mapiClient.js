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
    if (res.status === 403 && data.code === "MFA_REQUIRED") {
      window.dispatchEvent(new CustomEvent("inclusivaula:toast", {
        detail: { message: "Esta ação exige autenticação de 2 fatores. Redirecionando para configuração...", type: "warning" }
      }));
      setTimeout(() => { window.location.href = "/seguranca"; }, 2500);
    } else if (res.status === 403 && msg.toLowerCase().includes("limite")) {
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

export async function generateExercises(lessonId, studentId = null, quantidade = 5, pontuacao = 10) {
  return request("/api/exercises/generate", {
    method: "POST",
    body: JSON.stringify({ lessonId, studentId, quantidade, pontuacao })
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

// ── PDI (Plano de Desenvolvimento Individual) ───────────────────

export async function generatePDI(student_id, periodo, escola = "") {
  return request("/api/pdi/generate", {
    method: "POST",
    body: JSON.stringify({ student_id, periodo, escola })
  });
}

// ── ESTUDO DE CASO (Portaria MEC 421/2026) ──────────────────────

export async function generateCaseStudy(student_id, periodo = "", escola = "") {
  return request("/api/estudo-caso/generate", {
    method: "POST",
    body: JSON.stringify({ student_id, periodo, escola })
  });
}

export async function getCaseStudyStatus(jobId) {
  return request(`/api/estudo-caso/${jobId}/status`);
}

export async function listCaseStudies(student_id = null) {
  const qs = student_id ? `?student_id=${student_id}` : "";
  return request(`/api/estudo-caso${qs}`);
}

export async function getCaseStudyPDFBlob(id, formato = "pdf") {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}/api/estudo-caso/${id}/pdf?formato=${formato}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF do estudo de caso");
  return res.blob();
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

export async function getPEIPDFBlob(id, formato = "pdf") {
  const { data: { session } } = await (await import("./supabaseClient.js")).supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pei/${id}/pdf?formato=${formato}`, {
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

export async function generateAEEEvolutionReport(studentId, periodo) {
  return request("/api/aee-sessions/evolution-report", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, periodo })
  });
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

// ── GESTÃO (painéis por nível hierárquico) ──────────────────────

export async function getSchoolPanel() {
  return request("/api/management/school");
}

export async function getNetworkPanel() {
  return request("/api/management/network");
}

export async function getGlobalPanel() {
  return request("/api/management/global");
}

// ── LGPD (direitos do titular) ──────────────────────────────────

export async function exportMyData() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}/api/lgpd/export`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erro ao exportar dados");
  return res.blob();
}

export async function deleteMyAccount() {
  return request("/api/lgpd/account", { method: "DELETE" });
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

export async function getAEEPDFBlob(id, formato = "pdf") {
  const { data: { session } } = await (await import("./supabaseClient.js")).supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/aee/${id}/pdf?formato=${formato}`, {
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