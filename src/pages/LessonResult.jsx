import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLesson } from "../contexts/LessonContext";
import { getLessonStatus, getLessonPDF, indexApprovedLesson } from "../services/mapiClient";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

export default function LessonResult() {
  const navigate = useNavigate();
  const { jobId, lesson, setLesson, status, setStatus } = useLesson();
  const intervalRef = useRef(null);

  const [aprovado, setAprovado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [lessonEditada, setLessonEditada] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!jobId) { navigate("/gerar"); return; }
    if (status === "done") return;
    intervalRef.current = setInterval(async () => {
      try {
        const res = await getLessonStatus(jobId);
        if (res.status === "completed" && res.data && !res.data.error) {
          setLesson(res.data);
          setStatus("done");
          clearInterval(intervalRef.current);
        } else if (res.status === "error" || (res.data && res.data.error)) {
          clearInterval(intervalRef.current);
          setStatus("error");
        }
      } catch {
        clearInterval(intervalRef.current);
        setStatus("error");
      }
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [jobId]);

  async function handleAprovar() {
    try {
      await supabase.from("lessons").update({ aprovado: true }).eq("id", jobId);
      setAprovado(true);
      mostrarFeedback("✅ Aula aprovada com sucesso!");
      // Indexa no RAG e memória em background (não bloqueia UI)
      indexApprovedLesson(jobId).catch(() => {});
    } catch {
      mostrarFeedback("Erro ao aprovar a aula.", "erro");
    }
  }

  function handleEditar() {
    setLessonEditada(JSON.parse(JSON.stringify(lesson)));
    setEditando(true);
  }

  async function handleSalvarEdicao() {
    setSalvando(true);
    try {
      await supabase.from("lessons").update({ result: lessonEditada }).eq("id", jobId);
      setLesson(lessonEditada);
      setEditando(false);
      mostrarFeedback("✅ Aula salva com sucesso!");
    } catch {
      mostrarFeedback("Erro ao salvar as alterações.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    setExcluindo(true);
    try {
      await supabase.from("lessons").delete().eq("id", jobId);
      navigate("/dashboard");
    } catch {
      mostrarFeedback("Erro ao excluir a aula.", "erro");
      setExcluindo(false);
      setConfirmandoExclusao(false);
    }
  }

  async function handleDownload() {
    try {
      const blob = await getLessonPDF(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aula-inclusivaula-${jobId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      mostrarFeedback("Erro ao baixar PDF.", "erro");
    }
  }

  function gerarTextoAula(l) {
    if (!l) return "";
    let txt = "";
    txt += `INCLUSIVAULA — PLANO DE AULA\n`;
    txt += `${"=".repeat(50)}\n\n`;
    if (l.titulo) txt += `TÍTULO: ${l.titulo}\n\n`;
    if (l.estrategia) txt += `ESTRATÉGIA PEDAGÓGICA:\n${l.estrategia}\n\n`;
    if (l.bncc?.length) {
      txt += `HABILIDADES BNCC:\n`;
      l.bncc.forEach(b => { txt += `  [${b.codigo}] ${b.descricao}\n`; });
      txt += "\n";
    }
    if (l.explicacao) txt += `EXPLICAÇÃO:\n${l.explicacao}\n\n`;
    if (l.atividades?.length) {
      txt += `ATIVIDADES:\n`;
      l.atividades.forEach((a, i) => {
        const texto = typeof a === "string" ? a : a.descricao || "";
        txt += `  ${i + 1}. ${texto.replace(/^atividade\s*\d+[:\-]?\s*/i, "")}\n`;
      });
      txt += "\n";
    }
    if (l.adaptacoes?.length) {
      txt += `ADAPTAÇÕES INCLUSIVAS:\n`;
      l.adaptacoes.forEach(a => { txt += `  • ${typeof a === "string" ? a : JSON.stringify(a)}\n`; });
      txt += "\n";
    }
    if (l.recursos?.length) {
      txt += `RECURSOS DIDÁTICOS:\n`;
      l.recursos.forEach(r => { txt += `  • ${typeof r === "string" ? r : JSON.stringify(r)}\n`; });
      txt += "\n";
    }
    if (l.avaliacao) txt += `AVALIAÇÃO:\n${l.avaliacao}\n\n`;
    if (l.base_legal) txt += `BASE LEGAL E CIENTÍFICA:\n${l.base_legal}\n\n`;
    txt += `${"=".repeat(50)}\n`;
    txt += `Gerado por InclusivAula — www.inclusivaula.com.br\n`;
    return txt;
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  if (status === "error") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#f5f9ff", gap: 16, padding: "2rem"
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <p style={{ fontSize: 18, fontWeight: 500, color: "#a32d2d" }}>
          Erro ao gerar a aula
        </p>
        <p style={{ fontSize: 13, color: "#5f5e5a", textAlign: "center", maxWidth: 360 }}>
          O Nexus7 não conseguiu processar sua solicitação. Verifique sua conexão e tente novamente.
        </p>
        <button onClick={() => navigate("/gerar")} style={{
          padding: "10px 28px", fontSize: 14,
          background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
          color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
        }}>
          ← Tentar novamente
        </button>
      </div>
    );
  }

  if (status !== "done") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #f0f9ff 0%, #f0fff8 100%)", gap: 16
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

  const dados = editando ? lessonEditada : lesson;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>

      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>
          {feedback.msg}
        </div>
      )}

      {confirmandoExclusao && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 998
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "2rem",
            maxWidth: 400, width: "90%", textAlign: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)"
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Excluir esta aula?</h3>
            <p style={{ fontSize: 14, color: "#5f5e5a", marginBottom: 24 }}>
              Esta ação não pode ser desfeita. A aula será removida permanentemente.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setConfirmandoExclusao(false)} style={{ flex: 1, padding: "10px", fontSize: 14 }}>
                Cancelar
              </button>
              <button
                onClick={handleExcluir} disabled={excluindo}
                style={{ flex: 1, padding: "10px", fontSize: 14, background: "#a32d2d", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                {excluindo ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Dashboard</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

          {!editando && (
            <button onClick={handleAprovar} disabled={aprovado} style={{
              fontSize: 13, padding: "8px 14px",
              background: aprovado ? "#edfff6" : "#fff",
              color: aprovado ? "#0F6E56" : "#5f5e5a",
              border: `0.5px solid ${aprovado ? "#4CAF82" : "#d3d1c7"}`,
              borderRadius: 8, cursor: aprovado ? "default" : "pointer"
            }}>
              {aprovado ? "✅ Aprovada" : "👍 Aprovar"}
            </button>
          )}

          {!editando ? (
            <button onClick={handleEditar} style={{
              fontSize: 13, padding: "8px 14px", background: "#fff",
              color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 8, cursor: "pointer"
            }}>
              ✏️ Editar
            </button>
          ) : (
            <>
              <button onClick={() => setEditando(false)} style={{
                fontSize: 13, padding: "8px 14px", background: "#fff",
                color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 8, cursor: "pointer"
              }}>
                Cancelar
              </button>
              <button onClick={handleSalvarEdicao} disabled={salvando} style={{
                fontSize: 13, padding: "8px 14px",
                background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
              }}>
                {salvando ? "Salvando..." : "💾 Salvar"}
              </button>
            </>
          )}

          {/* Exercícios — passa contexto da aula para a tela de exercícios */}
          {!editando && (
            <button
              onClick={() => navigate("/exercicios", {
                state: {
                  lessonId: jobId,
                  lessonTitulo: lesson?.titulo,
                  studentId: lesson?.student_id || null,
                  studentNome: null
                }
              })}
              style={{
                fontSize: 13, padding: "8px 14px", background: "#fff",
                color: "#534AB7", border: "0.5px solid #534AB7",
                borderRadius: 8, cursor: "pointer"
              }}
            >
              📝 Exercícios
            </button>
          )}

          {!editando && (
            <button onClick={handleDownload} style={{
              fontSize: 13, padding: "8px 14px", background: "#fff",
              color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 8, cursor: "pointer"
            }}>
              ⬇️ Baixar
            </button>
          )}

          {!editando && (
            <button onClick={() => setConfirmandoExclusao(true)} style={{
              fontSize: 13, padding: "8px 14px", background: "#fff",
              color: "#a32d2d", border: "0.5px solid #f7c1c1", borderRadius: 8, cursor: "pointer"
            }}>
              🗑️ Excluir
            </button>
          )}

          {!editando && (
            <button onClick={() => navigate("/gerar")} style={{
              fontSize: 13, padding: "8px 14px",
              background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
            }}>
              + Nova aula
            </button>
          )}
        </div>
      </header>

      {editando && (
        <div style={{
          background: "#faeeda", borderBottom: "0.5px solid #BA7517",
          padding: "10px 2rem", fontSize: 13, color: "#854F0B"
        }}>
          ✏️ Modo edição ativo — edite os campos abaixo e clique em <strong>Salvar</strong> para confirmar.
        </div>
      )}

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>

        {aprovado && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#edfff6", border: "0.5px solid #4CAF82",
            borderRadius: 20, padding: "4px 14px", fontSize: 13,
            color: "#0F6E56", marginBottom: 16
          }}>
            ✅ Aula com aval pedagógico do professor
          </div>
        )}

        {dados?.titulo && (
          editando ? (
            <input value={lessonEditada.titulo}
              onChange={e => setLessonEditada(p => ({ ...p, titulo: e.target.value }))}
              style={{ width: "100%", boxSizing: "border-box", fontSize: 20, fontWeight: 600, color: "#2B9EC3", marginBottom: 16, border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "8px 12px" }}
            />
          ) : (
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: "#2B9EC3" }}>{dados.titulo}</h2>
          )
        )}

        {dados?.estrategia && (
          editando ? (
            <textarea value={lessonEditada.estrategia}
              onChange={e => setLessonEditada(p => ({ ...p, estrategia: e.target.value }))}
              rows={3} style={{ width: "100%", boxSizing: "border-box", fontSize: 14, marginBottom: 24, border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "10px 12px", resize: "vertical" }}
            />
          ) : (
            <div style={{ background: "linear-gradient(135deg, #e8f7fd, #edfff6)", border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#1a6e8a", marginBottom: 24 }}>
              {dados.estrategia}
            </div>
          )
        )}

        {dados?.bncc?.length > 0 && (
          <Section title="Habilidades BNCC" emoji="📋" color="#534AB7">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dados.bncc.map((item, i) => (
                <div key={i} style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderLeft: "3px solid #534AB7", borderRadius: 8, padding: "12px 16px" }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, background: "#EEEDFE", color: "#534AB7", padding: "2px 10px", borderRadius: 20, marginBottom: 6 }}>
                    {item.codigo}
                  </span>
                  <p style={{ fontSize: 14, color: "#2c2c2a", margin: 0, lineHeight: 1.6 }}>{item.descricao}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {dados?.explicacao && (
          <Section title="Explicação" emoji="📖" color="#2B9EC3">
            {editando ? (
              <textarea value={lessonEditada.explicacao}
                onChange={e => setLessonEditada(p => ({ ...p, explicacao: e.target.value }))}
                rows={5} style={{ width: "100%", boxSizing: "border-box", fontSize: 14, border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "10px 12px", resize: "vertical" }}
              />
            ) : (
              <p style={{ fontSize: 15, lineHeight: 1.8, color: "#2c2c2a" }}>{dados.explicacao}</p>
            )}
          </Section>
        )}

        {dados?.atividades?.length > 0 && (
          <Section title="Atividades" emoji="✏️" color="#4CAF82">
            {dados.atividades.map((a, i) => (
              <div key={i} style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderLeft: "3px solid #4CAF82", borderRadius: 8, padding: "12px 16px", marginBottom: 10, fontSize: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#4CAF82", marginRight: 8 }}>Atividade {i + 1}</span>
                {editando ? (
                  <textarea
                    value={typeof lessonEditada.atividades[i] === "string" ? lessonEditada.atividades[i] : lessonEditada.atividades[i].descricao || ""}
                    onChange={e => { const novas = [...lessonEditada.atividades]; novas[i] = e.target.value; setLessonEditada(p => ({ ...p, atividades: novas })); }}
                    rows={3} style={{ width: "100%", boxSizing: "border-box", fontSize: 13, marginTop: 6, border: "0.5px solid #4CAF82", borderRadius: 6, padding: "8px 10px", resize: "vertical" }}
                  />
                ) : (
                  <span>{typeof a === "string" ? a.replace(/^atividade\s*\d+[:\-]?\s*/i, "") : a.descricao || JSON.stringify(a)}</span>
                )}
              </div>
            ))}
          </Section>
        )}

        {dados?.adaptacoes?.length > 0 && (
          <Section title="Adaptações inclusivas" emoji="♿" color="#2B9EC3">
            {dados.adaptacoes.map((a, i) => (
              <div key={i} style={{ background: "#e8f7fd", border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "12px 16px", marginBottom: 10, fontSize: 14, color: "#1a6e8a" }}>
                {editando ? (
                  <textarea
                    value={typeof lessonEditada.adaptacoes[i] === "string" ? lessonEditada.adaptacoes[i] : JSON.stringify(lessonEditada.adaptacoes[i])}
                    onChange={e => { const novas = [...lessonEditada.adaptacoes]; novas[i] = e.target.value; setLessonEditada(p => ({ ...p, adaptacoes: novas })); }}
                    rows={2} style={{ width: "100%", boxSizing: "border-box", fontSize: 13, border: "0.5px solid #2B9EC3", borderRadius: 6, padding: "8px 10px", resize: "vertical", color: "#1a6e8a" }}
                  />
                ) : (typeof a === "string" ? a : JSON.stringify(a))}
              </div>
            ))}
          </Section>
        )}

        {dados?.recursos?.length > 0 && (
          <Section title="Recursos didáticos" emoji="🎯" color="#4CAF82">
            {dados.recursos.map((r, i) => (
              <div key={i} style={{ background: "#edfff6", border: "0.5px solid #4CAF82", borderRadius: 8, padding: "12px 16px", marginBottom: 10, fontSize: 14, color: "#2a7a55" }}>
                {typeof r === "string" ? r : JSON.stringify(r)}
              </div>
            ))}
          </Section>
        )}

        {dados?.avaliacao && (
          <Section title="Avaliação" emoji="📊" color="#2B9EC3">
            {editando ? (
              <textarea value={lessonEditada.avaliacao}
                onChange={e => setLessonEditada(p => ({ ...p, avaliacao: e.target.value }))}
                rows={4} style={{ width: "100%", boxSizing: "border-box", fontSize: 14, border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "10px 12px", resize: "vertical" }}
              />
            ) : (
              <p style={{ fontSize: 15, lineHeight: 1.8, color: "#2c2c2a" }}>{dados.avaliacao}</p>
            )}
          </Section>
        )}

        {dados?.base_legal && (
          <Section title="Base legal e científica" emoji="⚖️" color="#888780">
            <div style={{ background: "#f1efe8", border: "0.5px solid #d3d1c7", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#5f5e5a", lineHeight: 1.8 }}>
              {dados.base_legal}
            </div>
          </Section>
        )}

      </main>
    </div>
  );
}

function Section({ title, emoji, color, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, color }}>{emoji} {title}</h3>
      {children}
    </div>
  );
}