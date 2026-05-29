import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import { generateLesson } from "../services/mapiClient";
import { supabase } from "../services/supabaseClient";
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
  const { user } = useAuth();
  const { setJobId, setStatus, setError } = useLesson();

  const [form, setForm] = useState({
    tema: "",
    deficiencia: "Geral",
    serie: "1º ano",
    duracao: 50,
    objetivo: ""
  });

  // Aluno selecionado — quando preenchido, substitui o dropdown
  // de perfil e série pelos dados reais do aluno cadastrado
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Carrega os alunos da escola do professor logado
  useEffect(() => {
    async function carregarAlunos() {
      setLoadingAlunos(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profile?.school_id) {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, grade, disability_type, notes")
          .eq("school_id", profile.school_id)
          .order("full_name");
        setAlunos(data || []);
      }
      setLoadingAlunos(false);
    }
    if (user) carregarAlunos();
  }, [user]);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Quando o professor seleciona um aluno, preenche automaticamente
  // o perfil e a série com os dados cadastrados — mas mantém editável
  // caso queira ajustar antes de gerar
  function handleSelecionarAluno(e) {
    const id = e.target.value;
    if (!id) {
      setAlunoSelecionado(null);
      setForm(prev => ({ ...prev, deficiencia: "Geral", serie: "1º ano" }));
      return;
    }
    const aluno = alunos.find(a => a.id === id);
    if (aluno) {
      setAlunoSelecionado(aluno);
      setForm(prev => ({
        ...prev,
        deficiencia: aluno.disability_type || "Geral",
        serie: aluno.grade || prev.serie
      }));
    }
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
        objetivo: form.objetivo,
        // Passa o ID e os dados completos do aluno quando vinculado —
        // o Nexus7 usa essas informações para personalizar o conteúdo
        student_id: alunoSelecionado?.id || null,
        student: alunoSelecionado || null
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

  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };
  const inputFull = { width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex", alignItems: "center", gap: 16
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
            background: "#fcebeb", border: "0.5px solid #a32d2d",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, color: "#791f1f", marginBottom: 20
          }}>
            {localError}
          </div>
        )}

        <div style={{
          background: "#fff", border: "0.5px solid #d3d1c7",
          borderRadius: 12, padding: "1.5rem",
          display: "flex", flexDirection: "column", gap: 20,
          boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
        }}>

          {/* Seleção de aluno — campo novo */}
          <div>
            <label style={labelStyle}>
              Aluno específico
              <span style={{ color: "#888", marginLeft: 6, fontWeight: 400 }}>
                (opcional — a IA usa o perfil cadastrado)
              </span>
            </label>
            <select
              onChange={handleSelecionarAluno}
              value={alunoSelecionado?.id || ""}
              disabled={loadingAlunos}
              style={inputFull}
            >
              <option value="">
                {loadingAlunos ? "Carregando alunos..." : "— Gerar para perfil geral —"}
              </option>
              {alunos.map(a => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                  {a.grade ? ` · ${a.grade}` : ""}
                  {a.disability_type ? ` · ${a.disability_type}` : ""}
                </option>
              ))}
            </select>

            {/* Card de confirmação do aluno selecionado */}
            {alunoSelecionado && (
              <div style={{
                marginTop: 10,
                background: "linear-gradient(135deg, #e8f7fd, #edfff6)",
                border: "0.5px solid #2B9EC3",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#1a6e8a"
              }}>
                <strong>{alunoSelecionado.full_name}</strong>
                {alunoSelecionado.grade && ` · ${alunoSelecionado.grade}`}
                {alunoSelecionado.disability_type && ` · ${alunoSelecionado.disability_type}`}
                {alunoSelecionado.notes && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#1a6e8a", opacity: 0.85 }}>
                    📝 {alunoSelecionado.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tema */}
          <div>
            <label style={labelStyle}>Tema da aula *</label>
            <input
              name="tema"
              value={form.tema}
              onChange={handleChange}
              placeholder="Ex: frações, fotossíntese, Segunda Guerra..."
              style={inputFull}
            />
          </div>

          {/* Perfil e série — preenchidos automaticamente quando há aluno */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>
                Perfil do aluno
                {alunoSelecionado && (
                  <span style={{ color: "#4CAF82", marginLeft: 6, fontSize: 11 }}>
                    ✓ do cadastro
                  </span>
                )}
              </label>
              <select
                name="deficiencia"
                value={form.deficiencia}
                onChange={handleChange}
                style={inputFull}
              >
                {DEFICIENCIAS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Série
                {alunoSelecionado && (
                  <span style={{ color: "#4CAF82", marginLeft: 6, fontSize: 11 }}>
                    ✓ do cadastro
                  </span>
                )}
              </label>
              <select
                name="serie"
                value={form.serie}
                onChange={handleChange}
                style={inputFull}
              >
                {SERIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duração */}
          <div>
            <label style={labelStyle}>Duração: {form.duracao} minutos</label>
            <input
              type="range"
              name="duracao"
              min="30" max="120" step="10"
              value={form.duracao}
              onChange={handleChange}
              style={{ width: "100%", accentColor: "#2B9EC3" }}
            />
          </div>

          {/* Objetivo */}
          <div>
            <label style={labelStyle}>Objetivo da aula (opcional)</label>
            <textarea
              name="objetivo"
              value={form.objetivo}
              onChange={handleChange}
              placeholder="Ex: que o aluno compreenda o conceito de fração própria..."
              rows={3}
              style={{ ...inputFull, resize: "vertical" }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "12px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading
              ? "Enviando para o Nexus7..."
              : alunoSelecionado
                ? `🧠 Gerar aula para ${alunoSelecionado.full_name.split(" ")[0]}`
                : "🧠 Gerar aula"}
          </button>
        </div>
      </main>
    </div>
  );
}