import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { generateExercises } from "../services/mapiClient";
import icone from "../assets/icone.png";

const PERIODOS = [
  "1º Bimestre 2026", "2º Bimestre 2026", "3º Bimestre 2026", "4º Bimestre 2026",
  "1º Trimestre 2026", "2º Trimestre 2026", "3º Trimestre 2026",
  "1º Semestre 2026", "2º Semestre 2026",
  "Ano letivo 2026",
  "1º Bimestre 2025", "2º Bimestre 2025", "3º Bimestre 2025", "4º Bimestre 2025",
  "1º Semestre 2025", "2º Semestre 2025"
];

const DISCIPLINAS = [
  "Matemática", "Língua Portuguesa", "Ciências", "História",
  "Geografia", "Artes", "Educação Física", "Inglês", "Outra"
];

export default function Assessments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [avaliacoesSalvas, setAvaliacoesSalvas] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [avaliacao, setAvaliacao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [notas, setNotas] = useState({});
  const [notasSalvas, setNotasSalvas] = useState({});
  const [aba, setAba] = useState("gerar"); // "gerar" ou "salvas"

  // Estado de edição da avaliação gerada
  const [editando, setEditando] = useState(false);
  const [avaliacaoEditada, setAvaliacaoEditada] = useState(null);

  const [form, setForm] = useState({
    alunoId: "",
    lessonIds: [],
    periodo: "1º Bimestre 2026",
    disciplina: "Matemática",
    quantidade: 5
  });

  useEffect(() => {
    async function carregar() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id, id").eq("id", user.id).single();

      if (profile?.school_id) {
        setSchoolId(profile.school_id);

        const { data: alunosData } = await supabase
          .from("students")
          .select("id, full_name, grade, disability_type, notes")
          .eq("school_id", profile.school_id)
          .order("full_name");
        setAlunos(alunosData || []);

        const { data: aulasData } = await supabase
          .from("lessons")
          .select("id, result, input, created_at")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(50);

        const minhasAulas = (aulasData || []).filter(a => a.input?.user_id === user.id);
        setAulas(minhasAulas);

        // Carrega avaliações já salvas na tabela activities
        const { data: atividadesData } = await supabase
          .from("activities")
          .select("*")
          .eq("school_id", profile.school_id)
          .eq("activity_type", "exercicios_adaptados")
          .order("created_at", { ascending: false });
        setAvaliacoesSalvas(atividadesData || []);
      }
    }
    if (user) carregar();
  }, [user]);

  async function handleGerar() {
    if (form.lessonIds.length === 0) { setError("Selecione pelo menos uma aula como base para a avaliação."); return; }
    setError(null);
    setLoading(true);
    try {
      const aluno = alunos.find(a => a.id === form.alunoId) || null;
      const res = await generateExercises(form.lessonIds[0], form.alunoId || null, form.quantidade);

      // Atualiza a tabela activities com período e disciplina
      if (res.activityId) {
        await supabase.from("activities")
          .update({
            description: `${form.disciplina} · ${form.periodo} · ${res.data.instrucoes || ""}`,
            activity_type: "exercicios_adaptados"
          })
          .eq("id", res.activityId);
      }

      const novaAvaliacao = { ...res.data, activityId: res.activityId, aluno, periodo: form.periodo, disciplina: form.disciplina };
      setAvaliacao(novaAvaliacao);

      // Recarrega lista de avaliações salvas
      const { data: atividadesData } = await supabase
        .from("activities").select("*")
        .eq("school_id", schoolId)
        .eq("activity_type", "exercicios_adaptados")
        .order("created_at", { ascending: false });
      setAvaliacoesSalvas(atividadesData || []);

      mostrarFeedback("✅ Avaliação gerada e salva com sucesso!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Salva edições feitas pelo professor nas questões da avaliação
  async function handleSalvarEdicao() {
    if (!avaliacao?.activityId) return;
    try {
      await supabase.from("activities")
        .update({ questions: avaliacaoEditada.exercicios })
        .eq("id", avaliacao.activityId);
      setAvaliacao(prev => ({ ...prev, ...avaliacaoEditada }));
      setEditando(false);
      mostrarFeedback("✅ Avaliação editada e salva!");
    } catch {
      mostrarFeedback("Erro ao salvar edição.", "erro");
    }
  }

  async function handleSalvarNota(alunoId) {
    const nota = notas[alunoId];
    if (nota === undefined || nota === "") { mostrarFeedback("Digite uma nota entre 0 e 10.", "erro"); return; }
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
      mostrarFeedback("✅ Nota registrada com sucesso!");
    } catch {
      mostrarFeedback("Erro ao salvar nota.", "erro");
    }
  }

  function handleEditar() {
    // Cria uma cópia profunda para edição sem modificar o original
    setAvaliacaoEditada(JSON.parse(JSON.stringify(avaliacao)));
    setEditando(true);
  }

  function abrirAvaliacaoSalva(atividade) {
    // Reconstrói o objeto de avaliação a partir da atividade salva no banco
    const questoes = atividade.questions || [];
    const partes = atividade.description?.split(" · ") || [];
    setAvaliacao({
      titulo: atividade.title,
      instrucoes: partes[2] || atividade.description,
      exercicios: questoes,
      activityId: atividade.id,
      disciplina: partes[0] || "—",
      periodo: partes[1] || "—",
      criterios_avaliacao: atividade.gabarito?.criterios || "",
      pontuacao_maxima: atividade.gabarito?.pontuacao_maxima || 10
    });
    setAba("gerar");
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  const nivelColor = { basico: "#4CAF82", intermediario: "#BA7517", avancado: "#a32d2d" };
  const tipoLabel = { multipla_escolha: "Múltipla escolha", verdadeiro_falso: "V ou F", dissertativo: "Dissertativo" };

  function labelAula(aula) {
    const titulo = aula.result?.titulo || aula.input?.tema || "Aula sem título";
    const data = new Date(aula.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const serie = aula.input?.serie || "";
    const periodo = aula.input?.periodo || "";
    return `${titulo}${serie ? ` · ${serie}` : ""}${periodo ? ` · ${periodo}` : ""} (${data})`;
  }

  const dadosAvaliacao = editando ? avaliacaoEditada : avaliacao;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        {/* Ações quando há avaliação aberta */}
        {avaliacao && (
          <div style={{ display: "flex", gap: 8 }}>
            {!editando ? (
              <button onClick={handleEditar} style={{
                fontSize: 13, padding: "8px 14px", background: "#fff",
                color: "#BA7517", border: "0.5px solid #BA7517",
                borderRadius: 8, cursor: "pointer"
              }}>✏️ Editar</button>
            ) : (
              <>
                <button onClick={() => setEditando(false)} style={{
                  fontSize: 13, padding: "8px 14px", background: "#fff",
                  color: "#5f5e5a", border: "0.5px solid #d3d1c7",
                  borderRadius: 8, cursor: "pointer"
                }}>Cancelar</button>
                <button onClick={handleSalvarEdicao} style={{
                  fontSize: 13, padding: "8px 14px",
                  background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                  color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
                }}>💾 Salvar edição</button>
              </>
            )}
          </div>
        )}
      </header>

      {editando && (
        <div style={{ background: "#faeeda", borderBottom: "0.5px solid #BA7517", padding: "10px 2rem", fontSize: 13, color: "#854F0B" }}>
          ✏️ Modo edição ativo — edite as questões abaixo e clique em <strong>Salvar edição</strong>.
        </div>
      )}

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Avaliações por período</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Gere avaliações com gabarito baseadas nas aulas já aplicadas no período
        </p>

        {/* Abas */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[
            { id: "gerar", label: "📝 Gerar nova" },
            { id: "salvas", label: `🗂️ Avaliações salvas (${avaliacoesSalvas.length})` }
          ].map(tab => (
            <button key={tab.id} onClick={() => { setAba(tab.id); if (tab.id === "gerar") { setAvaliacao(null); setEditando(false); setNotas({}); setNotasSalvas({}); } }} style={{
              padding: "8px 16px", fontSize: 13, borderRadius: 8,
              background: aba === tab.id ? "linear-gradient(135deg, #2B9EC3, #4CAF82)" : "#fff",
              color: aba === tab.id ? "#fff" : "#5f5e5a",
              border: `0.5px solid ${aba === tab.id ? "transparent" : "#d3d1c7"}`,
              cursor: "pointer"
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ABA: AVALIAÇÕES SALVAS */}
        {aba === "salvas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {avaliacoesSalvas.length === 0 ? (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                <p style={{ fontSize: 15, color: "#5f5e5a" }}>Nenhuma avaliação gerada ainda.</p>
              </div>
            ) : avaliacoesSalvas.map(at => {
              const partes = at.description?.split(" · ") || [];
              const disciplina = partes[0] || "Disciplina";
              const periodo = partes[1] || "Período";
              return (
                <div key={at.id} style={{
                  background: "#fff", border: "0.5px solid #d3d1c7",
                  borderLeft: "3px solid #534AB7", borderRadius: 10,
                  padding: "14px 20px", cursor: "pointer"
                }} onClick={() => abrirAvaliacaoSalva(at)}>
                  <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 4, color: "#534AB7" }}>
                    📝 {at.title}
                  </p>
                  <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                    {disciplina} · {periodo} · {(at.questions || []).length} questões ·{" "}
                    {new Date(at.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA: GERAR NOVA */}
        {aba === "gerar" && !avaliacao && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
            {error && (
              <div style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Aula base */}
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                  Aula(s) base *
                  <span style={{ color: "#888", marginLeft: 6, fontWeight: 400 }}>(selecione uma ou mais aulas como base)</span>
                </label>
                {aulas.length === 0 ? (
                  <div style={{ background: "#f1efe8", border: "0.5px solid #d3d1c7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#5f5e5a" }}>
                    Nenhuma aula gerada ainda. Gere uma aula primeiro.
                  </div>
                ) : (
                  <div style={{ border: "0.5px solid #d3d1c7", borderRadius: 8, maxHeight: 180, overflowY: "auto", background: "#fff" }}>
                    {aulas.map(a => (
                      <label key={a.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 14px", cursor: "pointer", fontSize: 13,
                        background: form.lessonIds.includes(a.id) ? "#e8f7fd" : "transparent",
                        borderBottom: "0.5px solid #f1efe8"
                      }}>
                        <input type="checkbox" checked={form.lessonIds.includes(a.id)}
                          onChange={e => {
                            setForm(p => ({
                              ...p,
                              lessonIds: e.target.checked
                                ? [...p.lessonIds, a.id]
                                : p.lessonIds.filter(id => id !== a.id)
                            }));
                          }} />
                        <span>{labelAula(a)}</span>
                      </label>
                    ))}
                  </div>
                )}
                {form.lessonIds.length > 0 && (
                  <div style={{ marginTop: 8, background: "linear-gradient(135deg, #e8f7fd, #edfff6)", border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#1a6e8a" }}>
                    {form.lessonIds.length} aula(s) selecionada(s) — a IA usará todo o conteúdo como base.
                  </div>
                )}
              </div>

              {/* Aluno */}
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                  Aluno <span style={{ color: "#888", fontWeight: 400 }}>(opcional)</span>
                </label>
                <select value={form.alunoId} onChange={e => setForm(p => ({ ...p, alunoId: e.target.value }))}
                  style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="">— Avaliação para turma geral —</option>
                  {alunos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}{a.grade ? ` · ${a.grade}` : ""}{a.disability_type ? ` · ${a.disability_type}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Período e disciplina */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Período *</label>
                  <select value={form.periodo} onChange={e => setForm(p => ({ ...p, periodo: e.target.value }))}
                    style={{ width: "100%", boxSizing: "border-box" }}>
                    {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Disciplina</label>
                  <select value={form.disciplina} onChange={e => setForm(p => ({ ...p, disciplina: e.target.value }))}
                    style={{ width: "100%", boxSizing: "border-box" }}>
                    {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                  Quantidade de questões: {form.quantidade}
                </label>
                <input type="range" min="3" max="10" step="1" value={form.quantidade}
                  onChange={e => setForm(p => ({ ...p, quantidade: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#2B9EC3" }} />
              </div>

              <button onClick={handleGerar} disabled={loading || !form.lessonId} style={{
                width: "100%", padding: "12px",
                background: loading || form.lessonIds.length === 0 ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 500, cursor: loading || form.lessonIds.length === 0 ? "not-allowed" : "pointer"
              }}>
                {loading ? "Nexus7 gerando avaliação..." : `📝 Gerar avaliação${form.lessonIds.length > 1 ? ` (${form.lessonIds.length} aulas)` : ""}`}
              </button>
            </div>
          </div>
        )}

        {/* RESULTADO DA AVALIAÇÃO */}
        {aba === "gerar" && avaliacao && (
          <>
            <button onClick={() => { setAvaliacao(null); setEditando(false); setNotas({}); setNotasSalvas({}); }}
              style={{ fontSize: 13, marginBottom: 20, color: "#2B9EC3", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              ← Gerar outra avaliação
            </button>

            {/* Cabeçalho */}
            <div style={{ background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", borderRadius: 12, padding: "1.2rem 1.5rem", marginBottom: 20, color: "#fff" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{dadosAvaliacao.titulo}</h3>
              <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
                {dadosAvaliacao.disciplina} · {dadosAvaliacao.periodo}
                {dadosAvaliacao.aluno ? ` · ${dadosAvaliacao.aluno.full_name}` : " · Turma geral"}
              </p>
            </div>

            {dadosAvaliacao.instrucoes && (
              <div style={{ background: "#f1efe8", border: "0.5px solid #d3d1c7", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#5f5e5a" }}>
                📋 {dadosAvaliacao.instrucoes}
              </div>
            )}

            {/* Questões */}
            {dadosAvaliacao.exercicios?.map((ex, i) => (
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

                {editando ? (
                  <textarea
                    value={avaliacaoEditada.exercicios[i]?.enunciado || ""}
                    onChange={e => {
                      const novasQuestoes = [...avaliacaoEditada.exercicios];
                      novasQuestoes[i] = { ...novasQuestoes[i], enunciado: e.target.value };
                      setAvaliacaoEditada(prev => ({ ...prev, exercicios: novasQuestoes }));
                    }}
                    rows={3}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 14, marginBottom: 10, border: "0.5px solid #534AB7", borderRadius: 6, padding: "8px 10px", resize: "vertical" }}
                  />
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{ex.enunciado}</p>
                )}

                {ex.opcoes?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
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

            {/* Registro de notas */}
            {!editando && (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", marginTop: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", marginBottom: 16 }}>
                  📝 Registrar notas — {dadosAvaliacao.disciplina} · {dadosAvaliacao.periodo}
                </h3>
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
            )}
          </>
        )}
      </main>
    </div>
  );
}