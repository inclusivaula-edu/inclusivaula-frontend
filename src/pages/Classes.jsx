import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import { supabase } from "../services/supabaseClient";
import { generateLesson } from "../services/mapiClient";
import icone from "../assets/icone.png";

const SERIES = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
  "1º EM", "2º EM", "3º EM"
];

const DISCIPLINAS = [
  "Matemática", "Língua Portuguesa", "Ciências", "História",
  "Geografia", "Artes", "Educação Física", "Inglês", "Outra"
];

const PERIODOS = [
  "1º Bimestre 2026", "2º Bimestre 2026", "3º Bimestre 2026", "4º Bimestre 2026",
  "1º Trimestre 2026", "2º Trimestre 2026", "3º Trimestre 2026",
  "1º Semestre 2026", "2º Semestre 2026", "Ano letivo 2026"
];

export default function Classes() {
  const { user } = useAuth();
  const { setJobId, setStatus, setError: setLessonError } = useLesson();
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Estados de UI
  const [abaAtiva, setAbaAtiva] = useState("turmas"); // turmas | criar | detalhe
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [alunosDaTurma, setAlunosDaTurma] = useState([]);

  // Formulário de nova turma
  const [formTurma, setFormTurma] = useState({
    name: "", grade: "1º ano", turma: "", disciplina: "Ciências",
    periodo: "1º Bimestre 2026", year: "2026"
  });
  const [salvandoTurma, setSalvandoTurma] = useState(false);

  // Formulário de gerar aula para turma
  const [formAula, setFormAula] = useState({ tema: "", objetivo: "", duracao: 50 });
  const [gerandoAula, setGerandoAula] = useState(false);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();

      if (profile?.school_id) {
        setSchoolId(profile.school_id);

        const { data: turmasData } = await supabase
          .from("classes").select("*")
          .eq("school_id", profile.school_id)
          .order("created_at", { ascending: false });
        setTurmas(turmasData || []);

        const { data: alunosData } = await supabase
          .from("students").select("id, full_name, grade, disability_type, turma")
          .eq("school_id", profile.school_id)
          .order("full_name");
        setAlunos(alunosData || []);
      }
      setLoading(false);
    }
    if (user) carregar();
  }, [user]);

  async function handleCriarTurma() {
    if (!formTurma.name.trim()) { mostrarFeedback("Informe o nome da turma.", "erro"); return; }
    setSalvandoTurma(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .insert([{
          school_id: schoolId,
          teacher_id: user.id,
          name: formTurma.name,
          grade: formTurma.grade,
          turma: formTurma.turma || null,
          disciplina: formTurma.disciplina,
          periodo: formTurma.periodo,
          year: formTurma.year
        }])
        .select().single();

      if (error) throw new Error(error.message);
      setTurmas(prev => [data, ...prev]);
      setFormTurma({ name: "", grade: "1º ano", turma: "", disciplina: "Ciências", periodo: "1º Bimestre 2026", year: "2026" });
      setAbaAtiva("turmas");
      mostrarFeedback("✅ Turma criada com sucesso!");
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setSalvandoTurma(false);
    }
  }

  async function handleAbrirTurma(turma) {
    setTurmaSelecionada(turma);
    setAlunosSelecionados([]);

    // Busca alunos matriculados
    const { data: enrollments } = await supabase
      .from("enrollments").select("student_id")
      .eq("class_id", turma.id);

    const ids = (enrollments || []).map(e => e.student_id);
    const matriculados = alunos.filter(a => ids.includes(a.id));
    setAlunosDaTurma(matriculados);
    setAlunosSelecionados(matriculados.map(a => a.id));
    setAbaAtiva("detalhe");
  }

  async function handleMatricular(alunoId) {
    const jaMatriculado = alunosDaTurma.find(a => a.id === alunoId);
    if (jaMatriculado) {
      // Desmatricula
      await supabase.from("enrollments")
        .delete().eq("class_id", turmaSelecionada.id).eq("student_id", alunoId);
      setAlunosDaTurma(prev => prev.filter(a => a.id !== alunoId));
      setAlunosSelecionados(prev => prev.filter(id => id !== alunoId));
    } else {
      // Matricula
      await supabase.from("enrollments")
        .insert([{ class_id: turmaSelecionada.id, student_id: alunoId }]);
      const aluno = alunos.find(a => a.id === alunoId);
      setAlunosDaTurma(prev => [...prev, aluno]);
      setAlunosSelecionados(prev => [...prev, alunoId]);
    }
  }

  async function handleExcluirTurma(turmaId) {
    if (!window.confirm("Excluir esta turma? As matrículas também serão removidas.")) return;
    await supabase.from("enrollments").delete().eq("class_id", turmaId);
    await supabase.from("classes").delete().eq("id", turmaId);
    setTurmas(prev => prev.filter(t => t.id !== turmaId));
    setAbaAtiva("turmas");
    mostrarFeedback("Turma excluída.");
  }

  // Gera uma aula para cada aluno selecionado da turma
  async function handleGerarAulaTurma() {
    if (!formAula.tema.trim()) { mostrarFeedback("Informe o tema da aula.", "erro"); return; }
    if (alunosSelecionados.length === 0) { mostrarFeedback("Selecione pelo menos um aluno.", "erro"); return; }

    setGerandoAula(true);
    try {
      // Gera uma aula por aluno selecionado
      const promises = alunosSelecionados.map(alunoId => {
        const aluno = alunos.find(a => a.id === alunoId);
        return generateLesson({
          tema: formAula.tema,
          disciplina: turmaSelecionada.disciplina,
          deficiencia: aluno?.disability_type || "Geral",
          serie: aluno?.grade || turmaSelecionada.grade,
          duracao: Number(formAula.duracao),
          objetivo: formAula.objetivo,
          periodo: turmaSelecionada.periodo,
          student_id: alunoId,
          student: aluno || null
        });
      });

      await Promise.all(promises);
      mostrarFeedback(`✅ ${alunosSelecionados.length} aula(s) gerada(s) para a turma! Acesse o Histórico para ver.`);
      setFormAula({ tema: "", objetivo: "", duracao: 50 });
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setGerandoAula(false);
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 4000);
  }

  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };
  const inputFull = { width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxWidth: "90vw", textAlign: "center"
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => abaAtiva === "detalhe" ? setAbaAtiva("turmas") : navigate("/dashboard")}
            style={{ fontSize: 13 }}>
            ← {abaAtiva === "detalhe" ? "Turmas" : "Voltar"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        {abaAtiva === "turmas" && (
          <button onClick={() => setAbaAtiva("criar")} style={{
            fontSize: 13, padding: "8px 16px",
            background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
            color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
          }}>+ Nova turma</button>
        )}
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* ABA: LISTA DE TURMAS */}
        {abaAtiva === "turmas" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Turmas</h2>
            <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
              {turmas.length} turma{turmas.length !== 1 ? "s" : ""} cadastrada{turmas.length !== 1 ? "s" : ""}
            </p>

            {loading ? <p style={{ color: "#5f5e5a", fontSize: 14 }}>Carregando...</p>
            : turmas.length === 0 ? (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2.5rem", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
                <p style={{ fontSize: 15, color: "#5f5e5a", marginBottom: 16 }}>Nenhuma turma cadastrada ainda.</p>
                <button onClick={() => setAbaAtiva("criar")} style={{
                  padding: "10px 24px", fontSize: 14,
                  background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                  color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
                }}>Criar primeira turma</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {turmas.map(t => (
                  <div key={t.id} style={{
                    background: "#fff", border: "0.5px solid #d3d1c7",
                    borderLeft: "3px solid #2B9EC3", borderRadius: 10,
                    padding: "16px 20px", cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(43,158,195,0.04)"
                  }} onClick={() => handleAbrirTurma(t)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "#2B9EC3" }}>
                          {t.name}
                        </p>
                        <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                          {t.grade}{t.turma ? ` · Turma ${t.turma}` : ""}
                          {t.disciplina ? ` · ${t.disciplina}` : ""}
                          {t.periodo ? ` · ${t.periodo}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleExcluirTurma(t.id); }}
                        style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#a32d2d", border: "0.5px solid #f7c1c1", borderRadius: 6, cursor: "pointer" }}
                      >🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ABA: CRIAR TURMA */}
        {abaAtiva === "criar" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 24 }}>Nova turma</h2>
            <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nome da turma *</label>
                  <input value={formTurma.name} onChange={e => setFormTurma(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: 7º Ano A — Ciências" style={inputFull} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Série</label>
                    <select value={formTurma.grade} onChange={e => setFormTurma(p => ({ ...p, grade: e.target.value }))} style={inputFull}>
                      {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Turma</label>
                    <input value={formTurma.turma} onChange={e => setFormTurma(p => ({ ...p, turma: e.target.value }))}
                      placeholder="A, B, C..." style={inputFull} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ano letivo</label>
                    <input value={formTurma.year} onChange={e => setFormTurma(p => ({ ...p, year: e.target.value }))}
                      placeholder="2026" style={inputFull} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Disciplina</label>
                    <select value={formTurma.disciplina} onChange={e => setFormTurma(p => ({ ...p, disciplina: e.target.value }))} style={inputFull}>
                      {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Período</label>
                    <select value={formTurma.periodo} onChange={e => setFormTurma(p => ({ ...p, periodo: e.target.value }))} style={inputFull}>
                      {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button onClick={() => setAbaAtiva("turmas")} style={{ flex: 1, padding: "10px", fontSize: 13 }}>
                    Cancelar
                  </button>
                  <button onClick={handleCriarTurma} disabled={salvandoTurma} style={{
                    flex: 2, padding: "10px",
                    background: salvandoTurma ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                    color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 13, fontWeight: 500, cursor: salvandoTurma ? "not-allowed" : "pointer"
                  }}>
                    {salvandoTurma ? "Criando..." : "✅ Criar turma"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ABA: DETALHE DA TURMA */}
        {abaAtiva === "detalhe" && turmaSelecionada && (
          <>
            <div style={{ background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", borderRadius: 12, padding: "1.2rem 1.5rem", marginBottom: 24, color: "#fff" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{turmaSelecionada.name}</h2>
              <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
                {turmaSelecionada.grade}{turmaSelecionada.turma ? ` · Turma ${turmaSelecionada.turma}` : ""}
                {turmaSelecionada.disciplina ? ` · ${turmaSelecionada.disciplina}` : ""}
                {turmaSelecionada.periodo ? ` · ${turmaSelecionada.periodo}` : ""}
              </p>
            </div>

            {/* Alunos matriculados */}
            <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", marginBottom: 16 }}>
                👨‍🎓 Alunos matriculados ({alunosDaTurma.length})
              </h3>

              {alunos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a" }}>Nenhum aluno cadastrado ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alunos.map(a => {
                    const matriculado = alunosDaTurma.find(m => m.id === a.id);
                    return (
                      <div key={a.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", borderRadius: 8,
                        background: matriculado ? "#edfff6" : "#f5f9ff",
                        border: `0.5px solid ${matriculado ? "#4CAF82" : "#d3d1c7"}`
                      }}>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{a.full_name}</p>
                          <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                            {a.grade}{a.disability_type ? ` · ${a.disability_type}` : ""}
                          </p>
                        </div>
                        <button onClick={() => handleMatricular(a.id)} style={{
                          fontSize: 12, padding: "5px 12px",
                          background: matriculado ? "#4CAF82" : "#fff",
                          color: matriculado ? "#fff" : "#4CAF82",
                          border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer"
                        }}>
                          {matriculado ? "✅ Matriculado" : "+ Matricular"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gerar aula para a turma */}
            {alunosDaTurma.length > 0 && (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem" }}>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: "#534AB7", marginBottom: 16 }}>
                  🧠 Gerar aula para a turma
                </h3>
                <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 16 }}>
                  O Nexus7 vai gerar uma aula personalizada para cada aluno matriculado, considerando o perfil de NEE de cada um.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Tema da aula *</label>
                    <input value={formAula.tema} onChange={e => setFormAula(p => ({ ...p, tema: e.target.value }))}
                      placeholder="Ex: frações, fotossíntese, Segunda Guerra..."
                      style={inputFull} />
                  </div>

                  <div>
                    <label style={labelStyle}>Duração: {formAula.duracao} minutos</label>
                    <input type="range" min="30" max="120" step="10"
                      value={formAula.duracao} onChange={e => setFormAula(p => ({ ...p, duracao: e.target.value }))}
                      style={{ width: "100%", accentColor: "#534AB7" }} />
                  </div>

                  <div>
                    <label style={labelStyle}>Objetivo (opcional)</label>
                    <textarea value={formAula.objetivo} onChange={e => setFormAula(p => ({ ...p, objetivo: e.target.value }))}
                      placeholder="Ex: que o aluno compreenda o conceito de..."
                      rows={2} style={{ ...inputFull, resize: "vertical" }} />
                  </div>

                  {/* Seleção de alunos para a aula */}
                  <div>
                    <label style={labelStyle}>
                      Gerar para ({alunosSelecionados.length} de {alunosDaTurma.length} alunos)
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {alunosDaTurma.map(a => (
                        <button key={a.id}
                          onClick={() => setAlunosSelecionados(prev =>
                            prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                          )}
                          style={{
                            fontSize: 12, padding: "4px 12px",
                            background: alunosSelecionados.includes(a.id) ? "#534AB7" : "#fff",
                            color: alunosSelecionados.includes(a.id) ? "#fff" : "#534AB7",
                            border: "0.5px solid #534AB7", borderRadius: 20, cursor: "pointer"
                          }}>
                          {a.full_name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleGerarAulaTurma} disabled={gerandoAula || alunosSelecionados.length === 0} style={{
                    width: "100%", padding: "12px",
                    background: gerandoAula || alunosSelecionados.length === 0 ? "#ccc" : "linear-gradient(135deg, #534AB7, #2B9EC3)",
                    color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 15, fontWeight: 500,
                    cursor: gerandoAula || alunosSelecionados.length === 0 ? "not-allowed" : "pointer"
                  }}>
                    {gerandoAula
                      ? `Gerando ${alunosSelecionados.length} aula(s)...`
                      : `🧠 Gerar aula para ${alunosSelecionados.length} aluno(s)`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}