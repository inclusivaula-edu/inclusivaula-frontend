import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { generateSimulado, getSimuladoStatus, listSimulados, deleteSimulado, getSimuladoPDFBlob } from "../services/mapiClient";
import icone from "../assets/icone.png";

const PERIODOS = [
  "1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre",
  "1º Trimestre", "2º Trimestre", "3º Trimestre",
  "1º Semestre", "2º Semestre"
];

const DISCIPLINAS_DISPONIVEIS = [
  "Matemática", "Língua Portuguesa", "Ciências", "História", "Geografia", "Artes",
  "Educação Física", "Inglês", "Ensino Religioso"
];

const TIPOS_QUESTAO = [
  { id: "multipla_escolha", label: "Múltipla escolha" },
  { id: "discursiva", label: "Discursiva" },
  { id: "verdadeiro_falso", label: "Verdadeiro ou falso" }
];

export default function Simulado() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("gerar");
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Config
  const [classId, setClassId] = useState("");
  const [grade, setGrade] = useState("6º ano");
  const [periodo, setPeriodo] = useState("1º Trimestre");
  const [disciplinas, setDisciplinas] = useState(["Matemática", "Língua Portuguesa"]);
  const [qtdPorDisc, setQtdPorDisc] = useState(5);
  const [tiposQuestao, setTiposQuestao] = useState(["multipla_escolha"]);
  const [studentId, setStudentId] = useState("");

  // Geração
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [resultado, setResultado] = useState(null);
  const intervalRef = useRef(null);

  // Histórico
  const [historico, setHistorico] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    loadAlunos();
    loadTurmas();
  }, []);

  useEffect(() => {
    if (tab === "historico") loadHistorico();
  }, [tab]);

  async function loadAlunos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase
      .from("teachers").select("school_id").eq("user_id", user.id).single();
    if (!p) return;
    const { data } = await supabase
      .from("students")
      .select("id, full_name, disability_type, observable_behavior, what_helps")
      .eq("school_id", p.school_id)
      .order("full_name");
    setAlunos(data || []);
  }

  async function loadTurmas() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase
      .from("teachers").select("school_id").eq("user_id", user.id).single();
    if (!p) return;
    const { data } = await supabase
      .from("classes")
      .select("id, disciplina, grade, turma, periodo")
      .eq("school_id", p.school_id)
      .order("disciplina");
    setTurmas(data || []);
  }

  async function loadHistorico() {
    setHistLoading(true);
    try {
      const res = await listSimulados();
      setHistorico(res.data || []);
    } catch { }
    setHistLoading(false);
  }

  function toggleDisciplina(d) {
    setDisciplinas(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  }

  function toggleTipo(t) {
    setTiposQuestao(prev => {
      if (prev.includes(t)) {
        const next = prev.filter(x => x !== t);
        return next.length === 0 ? prev : next;
      }
      return [...prev, t];
    });
  }

  async function handleGerar() {
    if (disciplinas.length === 0) {
      mostrarFeedback("Selecione pelo menos uma disciplina.", "erro");
      return;
    }
    setLoading(true);
    setResultado(null);
    try {
      const res = await generateSimulado({
        disciplinas,
        grade,
        periodo,
        questoes_por_disciplina: qtdPorDisc,
        tipos_questao: tiposQuestao,
        student_id: studentId || undefined,
        class_id: classId || undefined
      });
      setJobId(res.jobId);
      setStatus("processing");
      pollStatus(res.jobId);
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao gerar simulado.", "erro");
    }
    setLoading(false);
  }

  function pollStatus(id) {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const res = await getSimuladoStatus(id);
        if (res.status === "completed" && res.data && !res.data.error) {
          clearInterval(intervalRef.current);
          setResultado(res.data);
          setStatus("done");
        } else if (res.status === "error") {
          clearInterval(intervalRef.current);
          setStatus("error");
          mostrarFeedback("Erro ao gerar simulado.", "erro");
        }
      } catch {
        clearInterval(intervalRef.current);
        setStatus("error");
      }
    }, 3000);
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  async function handleDownloadPDF(id, tipo) {
    try {
      const blob = await getSimuladoPDFBlob(id || jobId, tipo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simulado-${tipo}-${(id || jobId).slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      mostrarFeedback("Erro ao baixar PDF.", "erro");
    }
  }

  async function handleExcluir(id) {
    if (!window.confirm("Excluir este simulado?")) return;
    try {
      await deleteSimulado(id);
      setHistorico(prev => prev.filter(h => h.id !== id));
      mostrarFeedback("Simulado excluído.");
    } catch {
      mostrarFeedback("Erro ao excluir.", "erro");
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  const alunoSel = alunos.find(a => a.id === studentId);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>
          {feedback.msg}
        </div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "10px 16px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13, background: "none", border: "none", cursor: "pointer", color: "#5f5e5a" }}>← Dashboard</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        <span style={{ fontSize: 13, color: "#5f5e5a" }}>Simulados</span>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>📝 Simulado avaliativo</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Questões geradas por IA baseadas nas aulas já criadas na plataforma
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["gerar", "historico"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "6px 16px", fontSize: 13, borderRadius: 20,
              border: tab === t ? "1px solid #534AB7" : "0.5px solid #d3d1c7",
              background: tab === t ? "#EEEDFE" : "#fff",
              color: tab === t ? "#534AB7" : "#5f5e5a",
              cursor: "pointer", fontWeight: tab === t ? 500 : 400
            }}>
              {t === "gerar" ? "Gerar simulado" : "Histórico"}
            </button>
          ))}
        </div>

        {tab === "gerar" && status !== "processing" && status !== "done" && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem" }}>

            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 4 }}>Série</label>
            <select value={grade} onChange={e => setGrade(e.target.value)} style={selectStyle}>
              {["1º ano","2º ano","3º ano","4º ano","5º ano","6º ano","7º ano","8º ano","9º ano"].map(g =>
                <option key={g} value={g}>{g}</option>
              )}
            </select>

            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 4, marginTop: 12 }}>Aluno (opcional — gera versão adaptada)</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} style={selectStyle}>
              <option value="">Geral (sem adaptação individual)</option>
              {alunos.map(a => (
                <option key={a.id} value={a.id}>
                  {a.full_name}{a.disability_type ? ` — ${a.disability_type}` : ""}
                </option>
              ))}
            </select>

            {alunoSel && alunoSel.disability_type && (
              <div style={{
                background: "#FFF8E1", border: "0.5px solid #BA7517", borderRadius: 8,
                padding: "8px 12px", fontSize: 12, color: "#854F0B", marginTop: 8
              }}>
                ⚠️ Versão adaptada para <strong>{alunoSel.disability_type}</strong>: enunciados mais curtos, linguagem simplificada
                {alunoSel.observable_behavior && (
                  <div style={{ marginTop: 4 }}>👁 {alunoSel.observable_behavior}</div>
                )}
              </div>
            )}

            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 8, marginTop: 16 }}>Período de referência</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {PERIODOS.map(p => (
                <button key={p} onClick={() => setPeriodo(p)} style={{
                  padding: "5px 14px", fontSize: 12, borderRadius: 20, cursor: "pointer",
                  border: periodo === p ? "1px solid #534AB7" : "0.5px solid #d3d1c7",
                  background: periodo === p ? "#EEEDFE" : "#fff",
                  color: periodo === p ? "#534AB7" : "#5f5e5a",
                  fontWeight: periodo === p ? 500 : 400
                }}>
                  {p}
                </button>
              ))}
            </div>

            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 8 }}>Disciplinas</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {DISCIPLINAS_DISPONIVEIS.map(d => (
                <button key={d} onClick={() => toggleDisciplina(d)} style={{
                  padding: "5px 14px", fontSize: 12, borderRadius: 20, cursor: "pointer",
                  border: disciplinas.includes(d) ? "1px solid #0F6E56" : "0.5px solid #d3d1c7",
                  background: disciplinas.includes(d) ? "#E1F5EE" : "#fff",
                  color: disciplinas.includes(d) ? "#0F6E56" : "#5f5e5a",
                  fontWeight: disciplinas.includes(d) ? 500 : 400
                }}>
                  {d}
                </button>
              ))}
            </div>

            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 4 }}>Questões por disciplina</label>
            <select value={qtdPorDisc} onChange={e => setQtdPorDisc(Number(e.target.value))} style={selectStyle}>
              {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} questões</option>)}
            </select>

            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 8, marginTop: 16 }}>Tipos de questão</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {TIPOS_QUESTAO.map(t => (
                <button key={t.id} onClick={() => toggleTipo(t.id)} style={{
                  padding: "5px 14px", fontSize: 12, borderRadius: 20, cursor: "pointer",
                  border: tiposQuestao.includes(t.id) ? "1px solid #534AB7" : "0.5px solid #d3d1c7",
                  background: tiposQuestao.includes(t.id) ? "#EEEDFE" : "#fff",
                  color: tiposQuestao.includes(t.id) ? "#534AB7" : "#5f5e5a",
                  fontWeight: tiposQuestao.includes(t.id) ? 500 : 400
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ background: "#e8f7fd", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1a6e8a", marginBottom: 16 }}>
              📋 Total: <strong>{disciplinas.length * qtdPorDisc}</strong> questões ({disciplinas.length} disciplinas × {qtdPorDisc} cada)
            </div>

            <button onClick={handleGerar} disabled={loading || disciplinas.length === 0} style={{
              width: "100%", padding: "12px", fontSize: 14, fontWeight: 500,
              background: "linear-gradient(135deg, #534AB7, #2B9EC3)",
              color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
              opacity: loading ? 0.6 : 1
            }}>
              {loading ? "Enviando..." : "📝 Gerar simulado"}
            </button>
          </div>
        )}

        {tab === "gerar" && status === "processing" && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <img src={icone} alt="" style={{ height: 48, marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 500, color: "#534AB7" }}>Gerando simulado com IA...</p>
            <p style={{ fontSize: 12, color: "#5f5e5a" }}>Analisando aulas do período e criando questões</p>
          </div>
        )}

        {tab === "gerar" && status === "done" && resultado && (
          <div>
            <div style={{
              background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
              padding: "1.5rem", marginBottom: 16
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 500, color: "#534AB7", margin: "0 0 16px" }}>
                {resultado.titulo || "Simulado gerado"}
              </h3>

              {(resultado.questoes || []).map((q, i) => (
                <div key={i} style={{
                  background: "#fff",
                  border: "0.5px solid #d3d1c7",
                  borderLeft: `3px solid ${q.tipo === "discursiva" ? "#0F6E56" : q.tipo === "verdadeiro_falso" ? "#BA7517" : "#534AB7"}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 10
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#534AB7" }}>
                      {q.disciplina} · Questão {q.numero}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 20,
                        background: q.dificuldade === "facil" ? "#E1F5EE" : q.dificuldade === "medio" ? "#FFF8E1" : "#FCEBEB",
                        color: q.dificuldade === "facil" ? "#085041" : q.dificuldade === "medio" ? "#633806" : "#791f1f"
                      }}>
                        {q.dificuldade === "facil" ? "Fácil" : q.dificuldade === "medio" ? "Médio" : "Difícil"}
                      </span>
                      {q.habilidade_bncc && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#EEEDFE", color: "#3C3489" }}>
                          {q.habilidade_bncc}
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: 14, color: "#2c2c2a", lineHeight: 1.6, margin: "0 0 8px" }}>{q.enunciado}</p>

                  {q.tipo === "multipla_escolha" && q.alternativas && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {q.alternativas.map((alt, j) => (
                        <div key={j} style={{
                          display: "flex", alignItems: "center", gap: 8, fontSize: 13,
                          color: alt.startsWith(q.resposta_correta + ")") ? "#0F6E56" : "#5f5e5a",
                          fontWeight: alt.startsWith(q.resposta_correta + ")") ? 500 : 400
                        }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                            border: alt.startsWith(q.resposta_correta + ")") ? "2px solid #0F6E56" : "1px solid #d3d1c7",
                            background: alt.startsWith(q.resposta_correta + ")") ? "#E1F5EE" : "transparent"
                          }} />
                          {alt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.tipo === "verdadeiro_falso" && (
                    <div style={{ fontSize: 13, color: "#0F6E56", fontWeight: 500 }}>
                      Resposta: {q.resposta_correta === "V" ? "Verdadeiro" : "Falso"}
                    </div>
                  )}

                  {q.tipo === "discursiva" && q.resposta_esperada && (
                    <div style={{
                      background: "#E1F5EE", borderRadius: 6, padding: "8px 12px",
                      fontSize: 12, color: "#085041", marginTop: 4
                    }}>
                      <strong>Resposta esperada:</strong> {q.resposta_esperada}
                    </div>
                  )}

                  {q.justificativa && (
                    <div style={{
                      background: "#EEEDFE", borderRadius: 6, padding: "6px 10px",
                      fontSize: 11, color: "#3C3489", marginTop: 6
                    }}>
                      💡 {q.justificativa}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => { setStatus(null); setResultado(null); setJobId(null); }} style={btnGhost}>
                + Novo simulado
              </button>
              <button onClick={() => handleDownloadPDF(jobId, "aluno")} style={btnGhost}>
                ⬇️ PDF aluno
              </button>
              <button onClick={() => handleDownloadPDF(jobId, "gabarito")} style={{
                ...btnGhost, background: "linear-gradient(135deg, #534AB7, #2B9EC3)", color: "#fff", border: "none"
              }}>
                ⬇️ PDF gabarito
              </button>
            </div>
          </div>
        )}

        {tab === "historico" && (
          <div>
            {histLoading ? (
              <p style={{ fontSize: 13, color: "#5f5e5a" }}>Carregando...</p>
            ) : historico.length === 0 ? (
              <p style={{ fontSize: 13, color: "#5f5e5a" }}>Nenhum simulado gerado ainda.</p>
            ) : (
              historico.map(h => (
                <div key={h.id} style={{
                  background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
                  padding: "14px 16px", marginBottom: 10
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "#2c2c2a" }}>
                        {h.titulo || `${h.periodo} — ${(h.disciplinas || []).join(", ")}`}
                      </p>
                      <p style={{ fontSize: 12, color: "#5f5e5a", margin: "2px 0 0" }}>
                        {h.grade} · {new Date(h.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      background: h.status === "completed" ? "#E1F5EE" : h.status === "error" ? "#FCEBEB" : "#FFF8E1",
                      color: h.status === "completed" ? "#085041" : h.status === "error" ? "#791f1f" : "#633806"
                    }}>
                      {h.status === "completed" ? "Concluído" : h.status === "error" ? "Erro" : "Processando"}
                    </span>
                  </div>
                  {h.status === "completed" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => handleDownloadPDF(h.id, "aluno")} style={{ ...btnSmall }}>PDF aluno</button>
                      <button onClick={() => handleDownloadPDF(h.id, "gabarito")} style={{ ...btnSmall, color: "#534AB7", borderColor: "#534AB7" }}>PDF gabarito</button>
                      <button onClick={() => handleExcluir(h.id)} style={{ ...btnSmall, color: "#a32d2d", borderColor: "#f7c1c1" }}>Excluir</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const selectStyle = {
  width: "100%", boxSizing: "border-box", padding: "8px 12px", fontSize: 13,
  border: "0.5px solid #d3d1c7", borderRadius: 8, marginBottom: 4,
  background: "#fff", color: "#2c2c2a"
};

const btnGhost = {
  padding: "8px 16px", fontSize: 13, background: "#fff",
  color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 8, cursor: "pointer"
};

const btnSmall = {
  padding: "4px 10px", fontSize: 11, background: "#fff",
  color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer"
};
