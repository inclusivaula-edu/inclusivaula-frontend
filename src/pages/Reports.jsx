import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { generateReport } from "../services/mapiClient";
import icone from "../assets/icone.png";

const TIPOS_RELATORIO = [
  {
    id: "semestral",
    label: "Relatório Semestral",
    descricao: "Progresso acadêmico e social do período",
    emoji: "📊",
    cor: "#2B9EC3"
  },
  {
    id: "familia",
    label: "Relatório para a Família",
    descricao: "Linguagem acessível para pais e responsáveis",
    emoji: "👨‍👩‍👧",
    cor: "#4CAF82"
  },
  {
    id: "aee",
    label: "Relatório para o AEE",
    descricao: "Técnico especializado para o atendimento educacional",
    emoji: "🎓",
    cor: "#534AB7"
  },
  {
    id: "pei",
    label: "PEI — Plano Educacional Individualizado",
    descricao: "Metas e estratégias para a equipe multidisciplinar",
    emoji: "📋",
    cor: "#BA7517"
  }
];

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [periodo, setPeriodo] = useState("1º Semestre 2026");
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function carregarAlunos() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();

      if (profile?.school_id) {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, grade, disability_type")
          .eq("school_id", profile.school_id)
          .order("full_name");
        setAlunos(data || []);
      }
    }
    if (user) carregarAlunos();
  }, [user]);

  async function handleGerar() {
    if (!alunoSelecionado) { setError("Selecione um aluno."); return; }
    if (!tipoSelecionado) { setError("Selecione o tipo de relatório."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await generateReport(alunoSelecionado.id, tipoSelecionado, periodo);
      setRelatorio(res.data);
      mostrarFeedback("✅ Relatório gerado com sucesso!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!relatorio) return;
    const txt = gerarTextoRelatorio(relatorio);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${alunoSelecionado?.full_name?.replace(/ /g, "_")}-${tipoSelecionado}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function gerarTextoRelatorio(r) {
    if (!r?.report) return "";
    const rep = r.report;
    let txt = `INCLUSIVAULA — ${rep.titulo || "RELATÓRIO PEDAGÓGICO"}\n`;
    txt += `${"=".repeat(60)}\n\n`;
    txt += `Aluno: ${rep.aluno?.nome || ""}\n`;
    txt += `Série: ${rep.aluno?.serie || ""}\n`;
    txt += `NEE: ${rep.aluno?.nee || ""}\n`;
    txt += `Período: ${rep.periodo || periodo}\n\n`;
    if (rep.sumario_executivo) txt += `SUMÁRIO EXECUTIVO:\n${rep.sumario_executivo}\n\n`;
    if (rep.desenvolvimento_academico) txt += `DESENVOLVIMENTO ACADÊMICO:\n${rep.desenvolvimento_academico}\n\n`;
    if (rep.desenvolvimento_social) txt += `DESENVOLVIMENTO SOCIAL:\n${rep.desenvolvimento_social}\n\n`;
    if (rep.adaptacoes_aplicadas) txt += `ADAPTAÇÕES APLICADAS:\n${rep.adaptacoes_aplicadas}\n\n`;
    if (rep.pontos_positivos?.length) {
      txt += `PONTOS POSITIVOS:\n`;
      rep.pontos_positivos.forEach(p => { txt += `  • ${p}\n`; });
      txt += "\n";
    }
    if (rep.areas_de_atencao?.length) {
      txt += `ÁREAS DE ATENÇÃO:\n`;
      rep.areas_de_atencao.forEach(a => { txt += `  • ${a}\n`; });
      txt += "\n";
    }
    if (rep.recomendacoes?.length) {
      txt += `RECOMENDAÇÕES:\n`;
      rep.recomendacoes.forEach(r => { txt += `  • ${r}\n`; });
      txt += "\n";
    }
    if (rep.metas_proxima_periodo?.length) {
      txt += `METAS PARA O PRÓXIMO PERÍODO:\n`;
      rep.metas_proxima_periodo.forEach(m => { txt += `  • ${m}\n`; });
      txt += "\n";
    }
    if (rep.base_legal) txt += `BASE LEGAL:\n${rep.base_legal}\n\n`;
    if (rep.observacoes_finais) txt += `OBSERVAÇÕES FINAIS:\n${rep.observacoes_finais}\n\n`;
    txt += `${"=".repeat(60)}\n`;
    txt += `Gerado por InclusivAula — www.inclusivaula.com.br\n`;
    return txt;
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

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
        {relatorio && (
          <button onClick={handleDownload} style={{
            fontSize: 13, padding: "8px 16px",
            background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
            color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
          }}>
            ⬇️ Baixar relatório
          </button>
        )}
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
          Relatórios pedagógicos
        </h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Relatórios obrigatórios gerados com IA — fundamentados na Lei Brasileira de Inclusão e PNEE/MEC
        </p>

        {!relatorio ? (
          <div style={{
            background: "#fff", border: "0.5px solid #d3d1c7",
            borderRadius: 12, padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
          }}>

            {error && (
              <div style={{
                background: "#fcebeb", border: "0.5px solid #a32d2d",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#791f1f", marginBottom: 20
              }}>
                {error}
              </div>
            )}

            {/* Seleção de aluno */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                Aluno *
              </label>
              <select
                value={alunoSelecionado?.id || ""}
                onChange={e => {
                  const a = alunos.find(a => a.id === e.target.value);
                  setAlunoSelecionado(a || null);
                }}
                style={{ width: "100%", boxSizing: "border-box" }}
              >
                <option value="">— Selecione um aluno —</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}{a.grade ? ` · ${a.grade}` : ""}{a.disability_type ? ` · ${a.disability_type}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de relatório */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 10 }}>
                Tipo de relatório *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {TIPOS_RELATORIO.map(tipo => (
                  <div
                    key={tipo.id}
                    onClick={() => setTipoSelecionado(tipo.id)}
                    style={{
                      border: `0.5px solid ${tipoSelecionado === tipo.id ? tipo.cor : "#d3d1c7"}`,
                      borderLeft: `3px solid ${tipoSelecionado === tipo.id ? tipo.cor : "#d3d1c7"}`,
                      borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                      background: tipoSelecionado === tipo.id ? "#f5f9ff" : "#fff",
                      transition: "all 0.15s"
                    }}
                  >
                    <p style={{ fontWeight: 500, marginBottom: 4, fontSize: 14, color: tipo.cor }}>
                      {tipo.emoji} {tipo.label}
                    </p>
                    <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                      {tipo.descricao}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Período */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                Período letivo
              </label>
              <input
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
                placeholder="Ex: 1º Semestre 2026"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <button
              onClick={handleGerar}
              disabled={loading}
              style={{
                width: "100%", padding: "12px",
                background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Nexus7 gerando relatório..." : "📄 Gerar relatório com IA"}
            </button>
          </div>

        ) : (
          /* Renderização do relatório gerado */
          <div>
            <button
              onClick={() => setRelatorio(null)}
              style={{ fontSize: 13, marginBottom: 20, color: "#2B9EC3", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              ← Gerar outro relatório
            </button>

            {/* Cabeçalho do relatório */}
            <div style={{
              background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              borderRadius: 12, padding: "1.5rem", marginBottom: 20, color: "#fff"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                {relatorio.report?.titulo || "Relatório Pedagógico"}
              </h2>
              <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
                {relatorio.student?.full_name} · {relatorio.report?.periodo || periodo}
              </p>
            </div>

            {/* Métricas */}
            {relatorio.metrics && (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12, marginBottom: 20
              }}>
                {[
                  { label: "Aulas geradas", valor: relatorio.metrics.totalAulas, emoji: "📖" },
                  { label: "Avaliações", valor: relatorio.metrics.totalAvaliacoes, emoji: "📝" },
                  { label: "Média geral", valor: relatorio.metrics.mediaNota ? `${relatorio.metrics.mediaNota}/10` : "—", emoji: "⭐" },
                  { label: "Frequência", valor: relatorio.metrics.frequencia ? `${relatorio.metrics.frequencia}%` : "—", emoji: "📅" }
                ].map((m, i) => (
                  <div key={i} style={{
                    background: "#fff", border: "0.5px solid #d3d1c7",
                    borderRadius: 10, padding: "14px", textAlign: "center"
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{m.emoji}</div>
                    <p style={{ fontSize: 18, fontWeight: 600, color: "#2B9EC3", marginBottom: 2 }}>{m.valor ?? "—"}</p>
                    <p style={{ fontSize: 11, color: "#5f5e5a", margin: 0 }}>{m.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Conteúdo do relatório */}
            {relatorio.report && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {relatorio.report.sumario_executivo && (
                  <Secao titulo="Sumário executivo" cor="#2B9EC3">
                    <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{relatorio.report.sumario_executivo}</p>
                  </Secao>
                )}

                {relatorio.report.desenvolvimento_academico && (
                  <Secao titulo="Desenvolvimento acadêmico" cor="#2B9EC3">
                    <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{relatorio.report.desenvolvimento_academico}</p>
                  </Secao>
                )}

                {relatorio.report.desenvolvimento_social && (
                  <Secao titulo="Desenvolvimento social" cor="#4CAF82">
                    <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{relatorio.report.desenvolvimento_social}</p>
                  </Secao>
                )}

                {relatorio.report.adaptacoes_aplicadas && (
                  <Secao titulo="Adaptações aplicadas" cor="#534AB7">
                    <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{relatorio.report.adaptacoes_aplicadas}</p>
                  </Secao>
                )}

                {relatorio.report.pontos_positivos?.length > 0 && (
                  <Secao titulo="Pontos positivos" cor="#4CAF82">
                    {relatorio.report.pontos_positivos.map((p, i) => (
                      <div key={i} style={{
                        background: "#edfff6", border: "0.5px solid #4CAF82",
                        borderRadius: 6, padding: "8px 12px", marginBottom: 8, fontSize: 14
                      }}>
                        ✅ {p}
                      </div>
                    ))}
                  </Secao>
                )}

                {relatorio.report.areas_de_atencao?.length > 0 && (
                  <Secao titulo="Áreas de atenção" cor="#BA7517">
                    {relatorio.report.areas_de_atencao.map((a, i) => (
                      <div key={i} style={{
                        background: "#faeeda", border: "0.5px solid #BA7517",
                        borderRadius: 6, padding: "8px 12px", marginBottom: 8, fontSize: 14
                      }}>
                        ⚠️ {a}
                      </div>
                    ))}
                  </Secao>
                )}

                {relatorio.report.recomendacoes?.length > 0 && (
                  <Secao titulo="Recomendações pedagógicas" cor="#2B9EC3">
                    {relatorio.report.recomendacoes.map((r, i) => (
                      <div key={i} style={{
                        background: "#e8f7fd", border: "0.5px solid #2B9EC3",
                        borderRadius: 6, padding: "8px 12px", marginBottom: 8, fontSize: 14
                      }}>
                        💡 {r}
                      </div>
                    ))}
                  </Secao>
                )}

                {relatorio.report.metas_proxima_periodo?.length > 0 && (
                  <Secao titulo="Metas para o próximo período" cor="#534AB7">
                    {relatorio.report.metas_proxima_periodo.map((m, i) => (
                      <div key={i} style={{
                        background: "#EEEDFE", border: "0.5px solid #534AB7",
                        borderRadius: 6, padding: "8px 12px", marginBottom: 8, fontSize: 14
                      }}>
                        🎯 {m}
                      </div>
                    ))}
                  </Secao>
                )}

                {relatorio.report.observacoes_finais && (
                  <Secao titulo="Observações finais" cor="#888780">
                    <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{relatorio.report.observacoes_finais}</p>
                  </Secao>
                )}

                {relatorio.report.base_legal && (
                  <div style={{
                    background: "#f1efe8", border: "0.5px solid #d3d1c7",
                    borderRadius: 8, padding: "12px 16px", fontSize: 12, color: "#5f5e5a"
                  }}>
                    ⚖️ <strong>Base legal:</strong> {relatorio.report.base_legal}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Secao({ titulo, cor, children }) {
  return (
    <div style={{
      background: "#fff", border: "0.5px solid #d3d1c7",
      borderLeft: `3px solid ${cor}`, borderRadius: 10, padding: "16px 20px"
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: cor, marginBottom: 12 }}>{titulo}</h3>
      {children}
    </div>
  );
}