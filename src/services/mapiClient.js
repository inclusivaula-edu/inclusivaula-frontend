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
  return request(`/api/lesson-pdf/${jobId}`);
}