import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

const TIPO_CONFIG = {
  semestral: { label: "Relatório Semestral", emoji: "📊", cor: "#2B9EC3" },
  familia:   { label: "Relatório para a Família", emoji: "👨‍👩‍👧", cor: "#4CAF82" },
  aee:       { label: "Relatório para o AEE", emoji: "🎓", cor: "#534AB7" },
  pei:       { label: "PEI", emoji: "📋", cor: "#BA7517" },
  paee:      { label: "PAEE", emoji: "📁", cor: "#0F6E56" }
};

export default function SavedReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState([]);
  const [alunos, setAlunos] = useState({});
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();

      if (profile?.school_id) {
        const { data: rels } = await supabase
          .from("reports")
          .select("*")
          .eq("school_id", profile.school_id)
          .order("created_at", { ascending: false });

        setRelatorios(rels || []);

        // Busca nomes dos alunos para exibir nos cards
        const { data: alunosData } = await supabase
          .from("students")
          .select("id, full_name, grade, disability_type")
          .eq("school_id", profile.school_id);

        const mapaAlunos = {};
        (alunosData || []).forEach(a => { mapaAlunos[a.id] = a; });
        setAlunos(mapaAlunos);
      }
      setLoading(false);
    }
    if (user) carregar();
  }, [user]);

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric"
    });
  }

  function handleDownload(rel) {
    const aluno = alunos[rel.student_id];
    const rep = rel.content?.report || rel.content;
    if (!rep) return;

    let txt = `INCLUSIVAULA — ${rep.titulo || TIPO_CONFIG[rel.report_type]?.label || "RELATÓRIO"}\n`;
    txt += `${"=".repeat(60)}\n\n`;
    txt += `Aluno: ${aluno?.full_name || ""}\n`;
    txt += `Série: ${aluno?.grade || ""}\n`;
    txt += `NEE: ${aluno?.disability_type || ""}\n`;
    txt += `Período: ${rel.period || ""}\n`;
    txt += `Gerado em: ${formatarData(rel.created_at)}\n\n`;

    const campos = [
      ["SUMÁRIO EXECUTIVO", rep.sumario_executivo],
      ["DESENVOLVIMENTO ACADÊMICO", rep.desenvolvimento_academico],
      ["DESENVOLVIMENTO SOCIAL", rep.desenvolvimento_social],
      ["ADAPTAÇÕES APLICADAS", rep.adaptacoes_aplicadas],
      ["OBSERVAÇÕES FINAIS", rep.observacoes_finais],
      ["BASE LEGAL", rep.base_legal]
    ];
    campos.forEach(([titulo, valor]) => {
      if (valor) txt += `${titulo}:\n${valor}\n\n`;
    });

    if (rep.pontos_positivos?.length) {
      txt += `PONTOS POSITIVOS:\n`;
      rep.pontos_positivos.forEach(p => { txt += `  • ${p}\n`; });
      txt += "\n";
    }
    if (rep.recomendacoes?.length) {
      txt += `RECOMENDAÇÕES:\n`;
      rep.recomendacoes.forEach(r => { txt += `  • ${r}\n`; });
      txt += "\n";
    }
    if (rep.metas_proxima_periodo?.length) {
      txt += `METAS:\n`;
      rep.metas_proxima_periodo.forEach(m => { txt += `  • ${m}\n`; });
      txt += "\n";
    }

    txt += `${"=".repeat(60)}\n`;
    txt += `Gerado por InclusivAula — www.inclusivaula.com.br\n`;

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${aluno?.full_name?.replace(/ /g, "_") || "aluno"}-${rel.report_type}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filtragem por aluno e tipo
  const relatoriosFiltrados = relatorios.filter(r => {
    const aluno = alunos[r.student_id];
    const matchAluno = !filtroAluno || aluno?.full_name?.toLowerCase().includes(filtroAluno.toLowerCase());
    const matchTipo = !filtroTipo || r.report_type === filtroTipo;
    return matchAluno && matchTipo;
  });

  // Agrupa relatórios por aluno para exibição organizada
  const porAluno = {};
  relatoriosFiltrados.forEach(r => {
    const key = r.student_id || "sem_aluno";
    if (!porAluno[key]) porAluno[key] = [];
    porAluno[key].push(r);
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/relatorios")} style={{ fontSize: 13 }}>← Gerar novo</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Relatórios salvos</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          {relatorios.length} relatório{relatorios.length !== 1 ? "s" : ""} gerado{relatorios.length !== 1 ? "s" : ""}
        </p>

        {/* Filtros */}
        {relatorios.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <input
              value={filtroAluno}
              onChange={e => setFiltroAluno(e.target.value)}
              placeholder="Buscar por nome do aluno..."
              style={{ flex: 1, minWidth: 200, boxSizing: "border-box", fontSize: 13 }}
            />
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              style={{ minWidth: 180, boxSizing: "border-box", fontSize: 13 }}
            >
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_CONFIG).map(([id, cfg]) => (
                <option key={id} value={id}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: 14, color: "#5f5e5a" }}>Carregando...</p>
        ) : relatorios.length === 0 ? (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <p style={{ fontSize: 15, color: "#5f5e5a", marginBottom: 16 }}>Nenhum relatório gerado ainda.</p>
            <button onClick={() => navigate("/relatorios")} style={{
              padding: "10px 24px", fontSize: 14,
              background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
            }}>
              Gerar primeiro relatório
            </button>
          </div>
        ) : (
          /* Relatórios agrupados por aluno */
          Object.entries(porAluno).map(([alunoId, rels]) => {
            const aluno = alunos[alunoId];
            return (
              <div key={alunoId} style={{ marginBottom: 28 }}>
                {/* Cabeçalho do aluno */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 10
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 600, flexShrink: 0
                  }}>
                    {aluno?.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>
                      {aluno?.full_name || "Aluno não encontrado"}
                    </p>
                    <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                      {aluno?.grade}{aluno?.disability_type ? ` · ${aluno.disability_type}` : ""}
                    </p>
                  </div>
                </div>

                {/* Cards dos relatórios deste aluno */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 46 }}>
                  {rels.map(rel => {
                    const cfg = TIPO_CONFIG[rel.report_type] || { label: rel.report_type, emoji: "📄", cor: "#5f5e5a" };
                    const isOpen = selecionado?.id === rel.id;

                    return (
                      <div key={rel.id} style={{
                        background: "#fff", border: "0.5px solid #d3d1c7",
                        borderLeft: `3px solid ${cfg.cor}`,
                        borderRadius: 10, overflow: "hidden"
                      }}>
                        {/* Header do relatório */}
                        <div
                          onClick={() => setSelecionado(isOpen ? null : rel)}
                          style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "12px 16px", cursor: "pointer"
                          }}
                        >
                          <div>
                            <p style={{ fontWeight: 500, fontSize: 14, margin: 0, color: cfg.cor }}>
                              {cfg.emoji} {cfg.label}
                            </p>
                            <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                              {rel.period} · {formatarData(rel.created_at)}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button
                              onClick={e => { e.stopPropagation(); handleDownload(rel); }}
                              style={{
                                fontSize: 12, padding: "4px 12px",
                                background: "#fff", color: cfg.cor,
                                border: `0.5px solid ${cfg.cor}`,
                                borderRadius: 6, cursor: "pointer"
                              }}
                            >
                              ⬇️ Baixar
                            </button>
                            <span style={{ fontSize: 12, color: "#5f5e5a" }}>
                              {isOpen ? "▲" : "▼"}
                            </span>
                          </div>
                        </div>

                        {/* Conteúdo expandido do relatório */}
                        {isOpen && rel.content && (
                          <div style={{ padding: "0 16px 16px", borderTop: "0.5px solid #f1efe8" }}>
                            {(() => {
                              const rep = rel.content?.report || rel.content;
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                                  {rep.sumario_executivo && (
                                    <div style={{ background: "#f5f9ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.7 }}>
                                      <strong style={{ color: cfg.cor }}>Sumário:</strong> {rep.sumario_executivo}
                                    </div>
                                  )}
                                  {rep.pontos_positivos?.length > 0 && (
                                    <div>
                                      <p style={{ fontSize: 12, fontWeight: 600, color: "#4CAF82", marginBottom: 6 }}>Pontos positivos</p>
                                      {rep.pontos_positivos.map((p, i) => (
                                        <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#edfff6", borderRadius: 6, marginBottom: 4 }}>✅ {p}</div>
                                      ))}
                                    </div>
                                  )}
                                  {rep.areas_de_atencao?.length > 0 && (
                                    <div>
                                      <p style={{ fontSize: 12, fontWeight: 600, color: "#BA7517", marginBottom: 6 }}>Áreas de atenção</p>
                                      {rep.areas_de_atencao.map((a, i) => (
                                        <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#faeeda", borderRadius: 6, marginBottom: 4 }}>⚠️ {a}</div>
                                      ))}
                                    </div>
                                  )}
                                  {rep.recomendacoes?.length > 0 && (
                                    <div>
                                      <p style={{ fontSize: 12, fontWeight: 600, color: "#2B9EC3", marginBottom: 6 }}>Recomendações</p>
                                      {rep.recomendacoes.map((r, i) => (
                                        <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#e8f7fd", borderRadius: 6, marginBottom: 4 }}>💡 {r}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}