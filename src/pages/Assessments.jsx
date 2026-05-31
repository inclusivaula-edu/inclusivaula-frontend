import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { generateExercises } from "../services/mapiClient";
import icone from "../assets/icone.png";

const PERIODOS = [
  "1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre",
  "1º Trimestre", "2º Trimestre", "3º Trimestre",
  "1º Semestre", "2º Semestre", "Anual"
];

const DISCIPLINAS = [
  "Matemática", "Língua Portuguesa", "Ciências", "História",
  "Geografia", "Artes", "Educação Física", "Inglês", "Outra"
];

export default function Assessments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [avaliacao, setAvaliacao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [notas, setNotas] = useState({});
  const [notasSalvas, setNotasSalvas] = useState({});

  const [form, setForm] = useState({
    alunoId: "",
    periodo: "1º Bimestre",
    disciplina: "Matemática",
    tema: "",
    quantidade: 5
  });

  useEffect(() => {
    async function carregar() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        const { data } = await supabase.from("students")
          .select("id, full_name, grade, disability_type, notes")
          .eq("school_id", profile.school_id).order("full_name");
        setAlunos(data || []);
      }
    }
    if (user) carregar();
  }, [user]);

  async function handleGerar() {
    if (!form.tema.trim()) { setError("Informe o tema da avaliação."); return; }
    setError(null);
    setLoading(true);
    try {
      const aluno = alunos.find(a => a.id === form.alunoId) || null;

      // Monta um pseudo-lesson para o gerador de exercícios
      const pseudoLesson = {
        id: null,
        result: {
          titulo: `${form.disciplina} — ${form.tema} (${form.periodo})`,
          explicacao: `Avaliação de ${form.disciplina} sobre ${form.tema} para o ${form.periodo}`,
          atividades: []
        },
        input: {
          tema: form.tema,
          deficiencia: aluno?.disability_type || "Geral",
          serie: aluno?.grade || "Não informada"
        }
      };

      const res = await generateExercises(null, form.alunoId || null, form.quantidade);
      setAvaliacao({ ...res.data, aluno, form });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarNota(alunoId) {
    const nota = notas[alunoId];
    if (nota === undefined || nota === "") { mostrarFeedback("Digite uma nota.", "erro"); return; }
    try {
      await supabase.from("evaluations").insert([{
        student_id: alunoId,
        school_id: schoolId,
        title: `${form.disciplina} — ${form.periodo}`,
        score: Number(nota),
        max_score: 10,
        periodo: form.periodo,
        evaluation_date: new Date().toISOString().split("T")[0]
      }]);
      setNotasSalvas(prev => ({ ...prev, [alunoId]: Number(nota) }));
      mostrarFeedback("✅ Nota registrada!");
    } catch (err) {
      mostrarFeedback("Erro ao salvar nota.", "erro");
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  const nivelColor = { basico: "#4CAF82", intermediario: "#BA7517", avancado: "#a32d2d" };
  const tipoLabel = { multipla_escolha: "Múltipla escolha", verdadeiro_falso: "V ou F", dissertativo: "Dissertativo" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex", alignItems: "center", gap: 16
      }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
            Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Avaliações por período</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Gere avaliações adaptadas por bimestre, trimestre ou semestre
        </p>

        {!avaliacao ? (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
            {error && (
              <div style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Aluno (opcional)</label>
                <select value={form.alunoId} onChange={e => setForm(p => ({ ...p, alunoId: e.target.value }))}
                  style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="">— Avaliação geral (sem aluno específico) —</option>
                  {alunos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}{a.grade ? ` · ${a.grade}` : ""}{a.disability_type ? ` · ${a.disability_type}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Período *</label>
                  <select value={form.periodo} onChange={e => setForm(p => ({ ...p, periodo: e.target.value }))}
                    style={{ width: "100%", boxSizing: "border-box" }}>
                    {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Disciplina *</label>
                  <select value={form.disciplina} onChange={e => setForm(p => ({ ...p, disciplina: e.target.value }))}
                    style={{ width: "100%", boxSizing: "border-box" }}>
                    {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Tema / Conteúdo *</label>
                <input value={form.tema} onChange={e => setForm(p => ({ ...p, tema: e.target.value }))}
                  placeholder="Ex: Números decimais, Revolução Industrial..."
                  style={{ width: "100%", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                  Quantidade de questões: {form.quantidade}
                </label>
                <input type="range" min="3" max="10" step="1"
                  value={form.quantidade} onChange={e => setForm(p => ({ ...p, quantidade: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#2B9EC3" }} />
              </div>

              <button onClick={handleGerar} disabled={loading} style={{
                width: "100%", padding: "12px",
                background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
              }}>
                {loading ? "Nexus7 gerando avaliação..." : "📝 Gerar avaliação"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => { setAvaliacao(null); setNotas({}); setNotasSalvas({}); }}
              style={{ fontSize: 13, marginBottom: 20, color: "#2B9EC3", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              ← Gerar outra avaliação
            </button>

            <div style={{ background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", borderRadius: 12, padding: "1.2rem 1.5rem", marginBottom: 20, color: "#fff" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{avaliacao.titulo}</h3>
              <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
                {form.disciplina} · {form.periodo}
                {avaliacao.aluno ? ` · ${avaliacao.aluno.full_name}` : " · Turma geral"}
              </p>
            </div>

            {avaliacao.instrucoes && (
              <div style={{ background: "#f1efe8", border: "0.5px solid #d3d1c7", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#5f5e5a" }}>
                📋 {avaliacao.instrucoes}
              </div>
            )}

            {avaliacao.exercicios?.map((ex, i) => (
              <div key={i} style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderLeft: "3px solid #534AB7", borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, padding: "2px 10px", background: "#EEEDFE", color: "#534AB7", borderRadius: 20, fontWeight: 500 }}>
                    Questão {ex.numero}
                  </span>
                  <span style={{ fontSize: 11, padding: "2px 10px", background: "#f1efe8", color: "#5f5e5a", borderRadius: 20 }}>
                    {tipoLabel[ex.tipo] || ex.tipo}
                  </span>
                  <span style={{ fontSize: 11, padding: "2px 10px", background: "#f1efe8", color: nivelColor[ex.nivel] || "#5f5e5a", borderRadius: 20 }}>
                    {ex.nivel}
                  </span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>{ex.enunciado}</p>
                {ex.opcoes?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {ex.opcoes.map((op, j) => (
                      <div key={j} style={{
                        padding: "8px 12px", borderRadius: 6, fontSize: 13,
                        background: op.startsWith(ex.resposta_correta) ? "#edfff6" : "#f5f9ff",
                        border: `0.5px solid ${op.startsWith(ex.resposta_correta) ? "#4CAF82" : "#d3d1c7"}`
                      }}>
                        {op} {op.startsWith(ex.resposta_correta) && <span style={{ color: "#4CAF82", fontSize: 11 }}>✓ correta</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: "#f5f9ff", border: "0.5px solid #d3d1c7", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#5f5e5a" }}>
                  <strong>Gabarito:</strong> {ex.resposta_correta} — {ex.justificativa}
                </div>
                {ex.adaptacao && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#1a6e8a", background: "#e8f7fd", borderRadius: 6, padding: "6px 10px" }}>
                    ♿ {ex.adaptacao}
                  </div>
                )}
              </div>
            ))}

            {/* Registro de notas por aluno */}
            <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", marginTop: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", marginBottom: 16 }}>📝 Registrar notas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {alunos.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: "#f5f9ff", border: "0.5px solid #d3d1c7", borderRadius: 8 }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{a.full_name}</p>
                      <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>{a.grade}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {notasSalvas[a.id] !== undefined ? (
                        <span style={{ fontSize: 13, padding: "4px 12px", background: "#edfff6", color: "#0F6E56", borderRadius: 20, fontWeight: 500 }}>
                          ✅ {notasSalvas[a.id]}/10
                        </span>
                      ) : (
                        <>
                          <input type="number" min="0" max="10" step="0.5" placeholder="nota"
                            value={notas[a.id] || ""}
                            onChange={e => setNotas(prev => ({ ...prev, [a.id]: e.target.value }))}
                            style={{ width: 70, textAlign: "center", fontSize: 14, padding: "6px 8px" }} />
                          <button onClick={() => handleSalvarNota(a.id)} style={{
                            fontSize: 12, padding: "6px 14px",
                            background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                            color: "#fff", border: "none", borderRadius: 6, cursor: "pointer"
                          }}>Salvar</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}