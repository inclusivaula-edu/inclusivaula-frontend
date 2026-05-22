import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLesson } from "../contexts/LessonContext";
import { getLessonStatus, getLessonPDF } from "../services/mapiClient";

export default function LessonResult() {
  const navigate = useNavigate();
  const { jobId, lesson, setLesson, status, setStatus } = useLesson();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!jobId) {
      navigate("/gerar");
      return;
    }
    if (status === "done") return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await getLessonStatus(jobId);
        if (res.status === "completed" || res.data) {
          setLesson(res.data);
          setStatus("done");
          clearInterval(intervalRef.current);
        }
      } catch {
        clearInterval(intervalRef.current);
        setStatus("error");
      }
    }, 3000);

    return () => clearInterval(intervalRef.current);
  }, [jobId]);

  async function handlePDF() {
    try {
      const pdf = await getLessonPDF(jobId);
      const blob = new Blob([pdf], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aula-${jobId}.txt`;
      a.click();
    } catch {
      alert("Erro ao baixar PDF");
    }
  }

  if (status !== "done") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f3",
        gap: 16
      }}>
        <div style={{ fontSize: 48 }}>🧠</div>
        <p style={{ fontSize: 18, fontWeight: 500 }}>MAPI está gerando sua aula...</p>
        <p style={{ fontSize: 13, color: "#5f5e5a" }}>Isso pode levar alguns segundos</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3" }}>
      <header style={{
        background: "#fff",
        borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>
            ← Dashboard
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Aula gerada</h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => navigate("/gerar")} style={{ fontSize: 13 }}>
            Gerar nova
          </button>
          <button onClick={handlePDF} style={{ fontSize: 13 }}>
            Baixar PDF
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        {lesson?.titulo && (
          <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 24 }}>
            {lesson.titulo}
          </h2>
        )}

        {lesson?.estrategia && (
          <div style={{
            background: "#eeedfe",
            border: "0.5px solid #534ab7",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 14,
            color: "#3c3489",
            marginBottom: 20
          }}>
            {lesson.estrategia}
          </div>
        )}

        {lesson?.explicacao && (
          <Section title="Explicação" emoji="📖">
            <p style={{ fontSize: 15, lineHeight: 1.7 }}>{lesson.explicacao}</p>
          </Section>
        )}

        {lesson?.atividades?.length > 0 && (
          <Section title="Atividades" emoji="✏️">
            {lesson.atividades.map((a, i) => (
              <div key={i} style={{
                background: "#fff",
                border: "0.5px solid #d3d1c7",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 10,
                fontSize: 14
              }}>
                {typeof a === "string" ? a : a.descricao || JSON.stringify(a)}
              </div>
            ))}
          </Section>
        )}

        {lesson?.adaptacoes?.length > 0 && (
          <Section title="Adaptações" emoji="♿">
            {lesson.adaptacoes.map((a, i) => (
              <div key={i} style={{
                background: "#e1f5ee",
                border: "0.5px solid #0f6e56",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 10,
                fontSize: 14,
                color: "#085041"
              }}>
                {typeof a === "string" ? a : JSON.stringify(a)}
              </div>
            ))}
          </Section>
        )}

        {!lesson?.titulo && lesson && (
          <pre style={{
            background: "#fff",
            border: "0.5px solid #d3d1c7",
            borderRadius: 8,
            padding: 16,
            fontSize: 13,
            overflow: "auto"
          }}>
            {JSON.stringify(lesson, null, 2)}
          </pre>
        )}
      </main>
    </div>
  );
}

function Section({ title, emoji, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>
        {emoji} {title}
      </h3>
      {children}
    </div>
  );
}