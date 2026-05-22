import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLesson } from "../contexts/LessonContext";
import { getLessonStatus, getLessonPDF } from "../services/mapiClient";
import icone from "../assets/icone.png";

export default function LessonResult() {
  const navigate = useNavigate();
  const { jobId, lesson, setLesson, status, setStatus } = useLesson();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!jobId) { navigate("/gerar"); return; }
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
      a.download = `aula-inclusivaula-${jobId}.txt`;
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
        background: "linear-gradient(135deg, #f0f9ff 0%, #f0fff8 100%)",
        gap: 16
      }}>
        <img src={icone} alt="InclusivAula" style={{ height: 64, marginBottom: 8 }} />
        <p style={{ fontSize: 18, fontWeight: 500, color: "#2B9EC3" }}>
          Nexus7 está gerando sua aula...
        </p>
        <p style={{ fontSize: 13, color: "#5f5e5a" }}>
          Aplicando pedagogia adaptada com IA
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => navigate("/gerar")} style={{ fontSize: 13 }}>
            Nova aula
          </button>
          <button
            onClick={handlePDF}
            style={{
              fontSize: 13,
              background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer"
            }}
          >
            Baixar PDF
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        {lesson?.titulo && (
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: "#2B9EC3" }}>
            {lesson.titulo}
          </h2>
        )}

        {lesson?.estrategia && (
          <div style={{
            background: "linear-gradient(135deg, #e8f7fd, #edfff6)",
            border: "0.5px solid #2B9EC3",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 14,
            color: "#1a6e8a",
            marginBottom: 24
          }}>
            {lesson.estrategia}
          </div>
        )}

        {lesson?.explicacao && (
          <Section title="Explicação" emoji="📖" color="#2B9EC3">
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#2c2c2a" }}>
              {lesson.explicacao}
            </p>
          </Section>
        )}

        {lesson?.atividades?.length > 0 && (
          <Section title="Atividades" emoji="✏️" color="#4CAF82">
            {lesson.atividades.map((a, i) => (
              <div key={i} style={{
                background: "#fff",
                border: "0.5px solid #d3d1c7",
                borderLeft: "3px solid #4CAF82",
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
          <Section title="Adaptações" emoji="♿" color="#2B9EC3">
            {lesson.adaptacoes.map((a, i) => (
              <div key={i} style={{
                background: "#e8f7fd",
                border: "0.5px solid #2B9EC3",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 10,
                fontSize: 14,
                color: "#1a6e8a"
              }}>
                {typeof a === "string" ? a : JSON.stringify(a)}
              </div>
            ))}
          </Section>
        )}

        {lesson?.recursos?.length > 0 && (
          <Section title="Recursos" emoji="🎯" color="#4CAF82">
            {lesson.recursos.map((r, i) => (
              <div key={i} style={{
                background: "#edfff6",
                border: "0.5px solid #4CAF82",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 10,
                fontSize: 14,
                color: "#2a7a55"
              }}>
                {typeof r === "string" ? r : JSON.stringify(r)}
              </div>
            ))}
          </Section>
        )}

        {lesson?.avaliacao && (
          <Section title="Avaliação" emoji="📊" color="#2B9EC3">
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#2c2c2a" }}>
              {lesson.avaliacao}
            </p>
          </Section>
        )}
      </main>
    </div>
  );
}

function Section({ title, emoji, color, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, color }}>
        {emoji} {title}
      </h3>
      {children}
    </div>
  );
}