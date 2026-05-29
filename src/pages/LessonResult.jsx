import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLesson } from "../contexts/LessonContext";
import { getLessonStatus, getLessonPDF } from "../services/mapiClient";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

export default function LessonResult() {
  const navigate = useNavigate();
  const { jobId, lesson, setLesson, status, setStatus } = useLesson();
  const intervalRef = useRef(null);

  // Estados para as ações do professor
  const [aprovado, setAprovado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [lessonEditada, setLessonEditada] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [feedback, setFeedback] = useState(null); // mensagem de sucesso/erro

  // Polling: verifica o status da aula a cada 3s até completar
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

  // ── AÇÕES DO PROFESSOR ────────────────────────────────────────

  // Dar aval positivo: marca a aula como aprovada no banco
  async function handleAprovar() {
    try {
      await supabase
        .from("lessons")
        .update({ aprovado: true })
        .eq("id", jobId);
      setAprovado(true);
      mostrarFeedback("✅ Aula aprovada com sucesso!");
    } catch {
      mostrarFeedback("Erro ao aprovar a aula.", "erro");
    }
  }

  // Entrar no modo de edição: copia a aula atual para estado local editável
  function handleEditar() {
    setLessonEditada(JSON.parse(JSON.stringify(lesson)));
    setEditando(true);
  }

  // Salvar edição: persiste as alterações no banco via coluna result (jsonb)
  async function handleSalvarEdicao() {
    setSalvando(true);
    try {
      await supabase
        .from("lessons")
        .update({ result: lessonEditada })
        .eq("id", jobId);
      setLesson(lessonEditada);
      setEditando(false);
      mostrarFeedback("✅ Aula salva com sucesso!");
    } catch {
      mostrarFeedback("Erro ao salvar as alterações.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  // Excluir: remove a aula do banco e volta para o dashboard
  async function handleExcluir() {
    setExcluindo(true);
    try {
      await supabase
        .from("lessons")
        .delete()
        .eq("id", jobId);
      navigate("/dashboard");
    } catch {
      mostrarFeedback("Erro ao excluir a aula.", "erro");
      setExcluindo(false);
      setConfirmandoExclusao(false);
    }
  }

  // Download: gera um arquivo .txt com todo o conteúdo da aula
  async function handleDownload() {
    try {
      const pdf = await getLessonPDF(jobId);
      const blob = new Blob([pdf], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aula-inclusivaula-${jobId}.txt`;
      a.click();
    } catch {
      mostrarFeedback("Erro ao baixar a aula.", "erro");
    }
  }

  // Exibe mensagem de feedback por 3 segundos
  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  // ── TELA DE CARREGAMENTO ──────────────────────────────────────

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

  // Fonte de dados: usa a versão editada se estiver no modo edição
  const dados = editando ? lessonEditada : lesson;

  // ── TELA PRINCIPAL ────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>

      {/* Feedback flutuante de ações */}
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

      {/* Modal de confirmação de exclusão */}
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
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
              Excluir esta aula?
            </h3>
            <p style={{ fontSize: 14, color: "#5f5e5a", marginBottom: 24 }}>
              Esta ação não pode ser desfeita. A aula será removida permanentemente.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setConfirmandoExclusao(false)}
                style={{ flex: 1, padding: "10px", fontSize: 14 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluir}
                disabled={excluindo}
                style={{
                  flex: 1, padding: "10px", fontSize: 14,
                  background: "#a32d2d", color: "#fff",
                  border: "none", borderRadius: 8, cursor: "pointer"
                }}
              >
                {excluindo ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center"
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

        {/* Barra de ações do professor */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

          {/* Aprovar */}
          {!editando && (
            <button
              onClick={handleAprovar}
              disabled={aprovado}
              title="Dar aval pedagógico para esta aula"
              style={{
                fontSize: 13, padding: "8px 14px",
                background: aprovado ? "#edfff6" : "#fff",
                color: aprovado ? "#0F6E56" : "#5f5e5a",
                border: `0.5px solid ${aprovado ? "#4CAF82" : "#d3d1c7"}`,
                borderRadius: 8, cursor: aprovado ? "default" : "pointer"
              }}
            >
              {aprovado ? "✅ Aprovada" : "👍 Aprovar"}
            </button>
          )}

          {/* Editar / Salvar edição */}
          {!editando ? (
            <button
              onClick={handleEditar}
              title="Editar o conteúdo desta aula"
              style={{
                fontSize: 13, padding: "8px 14px", background: "#fff",
                color: "#5f5e5a", border: "0.5px solid #d3d1c7",
                borderRadius: 8, cursor: "pointer"
              }}
            >
              ✏️ Editar
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditando(false)}
                style={{
                  fontSize: 13, padding: "8px 14px", background: "#fff",
                  color: "#5f5e5a", border: "0.5px solid #d3d1c7",
                  borderRadius: 8, cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEdicao}
                disabled={salvando}
                style={{
                  fontSize: 13, padding: "8px 14px",
                  background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                  color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
                }}
              >
                {salvando ? "Salvando..." : "💾 Salvar"}
              </button>
            </>
          )}

          {/* Baixar */}
          {!editando && (
            <button
              onClick={handleDownload}
              title="Baixar esta aula em arquivo de texto"
              style={{
                fontSize: 13, padding: "8px 14px", background: "#fff",
                color: "#5f5e5a", border: "0.5px solid #d3d1c7",
                borderRadius: 8, cursor: "pointer"
              }}
            >
              ⬇️ Baixar
            </button>
          )}

          {/* Excluir */}
          {!editando && (
            <button
              onClick={() => setConfirmandoExclusao(true)}
              title="Excluir esta aula permanentemente"
              style={{
                fontSize: 13, padding: "8px 14px", background: "#fff",
                color: "#a32d2d", border: "0.5px solid #f7c1c1",
                borderRadius: 8, cursor: "pointer"
              }}
            >
              🗑️ Excluir
            </button>
          )}

          {/* Gerar nova */}
          {!editando && (
            <button
              onClick={() => navigate("/gerar")}
              style={{
                fontSize: 13, padding: "8px 14px",
                background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
              }}
            >
              + Nova aula
            </button>
          )}
        </div>
      </header>

      {/* Aviso de modo edição */}
      {editando && (
        <div style={{
          background: "#faeeda", borderBottom: "0.5px solid #BA7517",
          padding: "10px 2rem", fontSize: 13, color: "#854F0B"
        }}>
          ✏️ Modo edição ativo — edite os campos abaixo e clique em <strong>Salvar</strong> para confirmar as alterações.
        </div>
      )}

      {/* Conteúdo principal */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Badge de aprovação */}
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

        {/* Título */}
        {dados?.titulo && (
          editando ? (
            <input
              value={lessonEditada.titulo}
              onChange={e => setLessonEditada(p => ({ ...p, titulo: e.target.value }))}
              style={{
                width: "100%", boxSizing: "border-box", fontSize: 20,
                fontWeight: 600, color: "#2B9EC3", marginBottom: 16,
                border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "8px 12px"
              }}
            />
          ) : (
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: "#2B9EC3" }}>
              {dados.titulo}
            </h2>
          )
        )}

        {/* Estratégia */}
        {dados?.estrategia && (
          editando ? (
            <textarea
              value={lessonEditada.estrategia}
              onChange={e => setLessonEditada(p => ({ ...p, estrategia: e.target.value }))}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box", fontSize: 14,
                marginBottom: 24, border: "0.5px solid #2B9EC3",
                borderRadius: 8, padding: "10px 12px", resize: "vertical"
              }}
            />
          ) : (
            <div style={{
              background: "linear-gradient(135deg, #e8f7fd, #edfff6)",
              border: "0.5px solid #2B9EC3", borderRadius: 8,
              padding: "12px 16px", fontSize: 14, color: "#1a6e8a", marginBottom: 24
            }}>
              {dados.estrategia}
            </div>
          )
        )}

        {/* BNCC */}
        {dados?.bncc?.length > 0 && (
          <Section title="Habilidades BNCC" emoji="📋" color="#534AB7">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dados.bncc.map((item, i) => (
                <div key={i} style={{
                  background: "#fff", border: "0.5px solid #d3d1c7",
                  borderLeft: "3px solid #534AB7", borderRadius: 8, padding: "12px 16px"
                }}>
                  <span style={{
                    display: "inline-block", fontSize: 12, fontWeight: 600,
                    background: "#EEEDFE", color: "#534AB7",
                    padding: "2px 10px", borderRadius: 20, marginBottom: 6
                  }}>
                    {item.codigo}
                  </span>
                  <p style={{ fontSize: 14, color: "#2c2c2a", margin: 0, lineHeight: 1.6 }}>
                    {item.descricao}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Explicação */}
        {dados?.explicacao && (
          <Section title="Explicação" emoji="📖" color="#2B9EC3">
            {editando ? (
              <textarea
                value={lessonEditada.explicacao}
                onChange={e => setLessonEditada(p => ({ ...p, explicacao: e.target.value }))}
                rows={5}
                style={{
                  width: "100%", boxSizing: "border-box", fontSize: 14,
                  border: "0.5px solid #2B9EC3", borderRadius: 8,
                  padding: "10px 12px", resize: "vertical"
                }}
              />
            ) : (
              <p style={{ fontSize: 15, lineHeight: 1.8, color: "#2c2c2a" }}>
                {dados.explicacao}
              </p>
            )}
          </Section>
        )}

        {/* Atividades */}
        {dados?.atividades?.length > 0 && (
          <Section title="Atividades" emoji="✏️" color="#4CAF82">
            {dados.atividades.map((a, i) => (
              <div key={i} style={{