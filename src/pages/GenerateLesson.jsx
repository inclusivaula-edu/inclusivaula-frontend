import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLesson } from "../contexts/LessonContext";
import { generateLesson } from "../services/mapiClient";
import icone from "../assets/icone.png";

const DEFICIENCIAS = [
  "TDAH", "Autismo", "Dislexia", "Baixa visão",
  "Deficiência auditiva", "Deficiência intelectual", "Geral"
];

const SERIES = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
  "1º EM", "2º EM", "3º EM"
];

export default function GenerateLesson() {
  const navigate = useNavigate();
  const { setJobId, setStatus, setError } = useLesson();

  const [form, setForm] = useState({
    tema: "",
    deficiencia: "Geral",
    serie: "1º ano",
    duracao: 50,
    objetivo: ""
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.tema.trim()) {
      setLocalError("Informe o tema da aula.");
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      const res = await generateLesson({
        tema: form.tema,
        deficiencia: form.deficiencia,
        serie: form.serie,
        duracao: Number(form.duracao),
        objetivo: form.objetivo
      });
      setJobId(res.jobId);
      setStatus("processing");
      navigate("/resultado");
    } catch (err) {
      setError(err.message);
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff",
        borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        gap: 16
      }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>
          ← Voltar
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
            Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
          Gerar aula com IA
        </h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Preencha os dados e o Nexus7 cria uma aula pedagógica adaptada
        </p>

        {localError && (
          <div style={{
            background: "#fcebeb",
            border: "0.5px solid #a32d2d",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#791f1f",
            marginBottom: 20
          }}>
            {localError}
          </div>
        )}

        <div style={{
          background: "#fff",
          border: "0.5px solid #d3d1c7",
          borderRadius: 12,
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
        }}>
          <div>
            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
              Tema da aula *
            </label>
            <input
              name="tema"
              value={form.tema}
              onChange={handleChange}
              placeholder="Ex: frações, fotossíntese, Segunda Guerra..."
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                Perfil do aluno
              </label>
              <select
                name="deficiencia"
                value={form.deficiencia}
                onChange={handleChange}
                style={{ width: "100%", boxSizing: "border-box" }}
              >
                {DEFICIENCIAS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                Série
              </label>
              <select
                name="serie"
                value={form.serie}
                onChange={handleChange}
                style={{ width: "100%", boxSizing: "border-box" }}
              >
                {SERIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
              Duração: {form.duracao} minutos
            </label>
            <input
              type="range"
              name="duracao"
              min="30"
              max="120"
              step="10"
              value={form.duracao}
              onChange={handleChange}
              style={{ width: "100%", accentColor: "#2B9EC3" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
              Objetivo da aula (opcional)
            </label>
            <textarea
              name="objetivo"
              value={form.objetivo}
              onChange={handleChange}
              placeholder="Ex: que o aluno compreenda o conceito de fração própria..."
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Enviando para o Nexus7..." : "🧠 Gerar aula"}
          </button>
        </div>
      </main>
    </div>
  );
}