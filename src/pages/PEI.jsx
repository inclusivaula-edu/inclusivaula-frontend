import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { generatePEI, getPEIStatus, listPEIs, approvePEI, getPEIPDFBlob } from "../services/mapiClient";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

const PERIODOS = [
  "1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre",
  "1º Semestre", "2º Semestre", "Anual"
];

const CARGOS_ADMIN = ["coordenador_municipal","coordenador_estadual","secretario_municipal","secretario_estadual","diretor","coordenador"];

export default function PEI() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [alunos, setAlunos] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const [periodo, setPeriodo] = useState("1º Semestre");
  const [escola, setEscola] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const [tab, setTab] = useState("gerar");
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [aprovado, setAprovado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [resultadoEdit, setResultadoEdit] = useState(null);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [baixandoPDF, setBaixandoPDF] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      setLoadingAlunos(true);
      const { data: profile } = await supabase
        .from("profiles").select("school_id, cargo").eq("id", user.id).single();

      const isAdmin = CARGOS_ADMIN.includes(profile?.cargo);
      let escolasData = [];
      if (isAdmin) {
        const { data } = await supabase.from("schools").select("id, name").order("name");
        escolasData = data || [];
      } else if (profile?.school_id) {
        const { data } = await supabase.from("schools").select("id, name").eq("id", profile.school_id).single();
        if (data) escolasData = [data];
      }
      setEscolas(escolasData);
      if (escolasData.length === 1) setEscola(escolasData[0].name);

      const schoolIds = isAdmin ? escolasData.map(e => e.id) : profile?.school_id ? [profile.school_id] : [];
      if (schoolIds.length > 0) {
        const { data } = await supabase
          .from("students").select("id, full_name, grade, disability_type, notes, turma")
          .in("school_id", schoolIds).order("full_name");
        setAlunos(data || []);
      }
      setLoadingAlunos(false);
    }
    if (user) carregarDados();
  }, [user]);

  useEffect(() => {
    if (!jobId || status === "completed" || status === "error") return;
    const interval = setInterval(async () => {
      try {
        const res = await getPEIStatus(jobId);
        if (res.status === "completed") {
          setStatus("completed");
          setResultado(res.data);
          clearInterval(interval);
        } else if (res.status === "error") {
          setStatus("error");
          setLocalError("Erro ao gerar PEI. Tente novamente.");
          clearInterval(interval);
        }
      } catch { /* retry */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId, status]);

  async function loadHistorico() {
    setLoadingHist(true);
    try {
      const res = await listPEIs();
      setHistorico(res.data || []);
    } catch { }
    setLoadingHist(false);
  }

  function handleTabChange(t) {
    setTab(t);
    if (t === "historico") loadHistorico();
  }

  async function handleSubmit() {
    if (!alunoId) { setLocalError("Selecione um aluno."); return; }
    if (!escola) { setLocalError("Selecione a escola."); return; }
    setLocalError(null);
    setLoading(true);
    setResultado(null);
    setStatus(null);
    setAprovado(false);
    try {
      const res = await generatePEI(alunoId, periodo, escola);
      setJobId(res.jobId);
      setStatus("processing");
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerHistorico(id) {
    try {
      const res = await getPEIStatus(id);
      if (res.status === "completed") {
        setResultado(res.data);
        setStatus("completed");
        setJobId(id);
        setAprovado(!!res.aprovado);
        setTab("gerar");
      }
    } catch { }
  }

  async function handleExcluirPEI(id) {
    if (!window.confirm("Excluir este PEI? Esta ação não pode ser desfeita.")) return;
    try {
      await supabase.from("pei_documents").delete().eq("id", id);
      setHistorico(prev => prev.filter(h => h.id !== id));
      mostrarFeedback("PEI excluído.");
    } catch {
      mostrarFeedback("Erro ao excluir.", "erro");
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function handleAprovar() {
    try {
      await approvePEI(jobId);
      setAprovado(true);
      mostrarFeedback("✅ PEI aprovado!");
    } catch {
      mostrarFeedback("Erro ao aprovar.", "erro");
    }
  }

  async function handleDownloadPDF() {
    setBaixandoPDF(true);
    try {
      const blob = await getPEIPDFBlob(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pei-${jobId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      mostrarFeedback("Erro ao gerar PDF.", "erro");
    } finally {
      setBaixandoPDF(false);
    }
  }

  function handleEditar() {
    setResultadoEdit(JSON.parse(JSON.stringify(resultado)));
    setEditando(true);
  }

  async function handleSalvarEdicao() {
    setSalvandoEdit(true);
    try {
      await supabase.from("pei_documents").update({ result: resultadoEdit }).eq("id", jobId);
      setResultado(resultadoEdit);
      setEditando(false);
      mostrarFeedback("PEI salvo!");
    } catch {
      mostrarFeedback("Erro ao salvar.", "erro");
    } finally {
      setSalvandoEdit(false);
    }
  }

  const alunoSelecionado = alunos.find(a => a.id === alunoId);
  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };
  const inputFull = { width: "100%", boxSizing: "border-box" };
  const btnBase = { padding: "8px 16px", borderRadius: 8, border: "0.5px solid #d3d1c7", fontSize: 13, fontWeight: 500, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 16
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
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>📋 PEI — Plano Educacional Individualizado</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Obrigatório pela Lei 13.146/2015 — gere com IA para cada aluno com NEE
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["gerar", "historico"].map(t => (
            <button key={t} onClick={() => handleTabChange(t)} style={{
              padding: "8px 20px", borderRadius: 8, border: "0.5px solid #d3d1c7",
              background: tab === t ? "#2B9EC3" : "#fff",
              color: tab === t ? "#fff" : "#5f5e5a",
              fontSize: 13, fontWeight: 500, cursor: "pointer"
            }}>
              {t === "gerar" ? "Gerar PEI" : "Histórico"}
            </button>
          ))}
        </div>

        {localError && (
          <div style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 20 }}>
            {localError}
          </div>
        )}

        {tab === "gerar" && !resultado && (
          <div style={{
            background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem",
            display: "flex", flexDirection: "column", gap: 20,
            boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
          }}>
            <div>
              <label style={labelStyle}>Aluno *</label>
              <select value={alunoId} onChange={e => setAlunoId(e.target.value)}
                disabled={loadingAlunos} style={inputFull}>
                <option value="">{loadingAlunos ? "Carregando..." : "— Selecione um aluno —"}</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}{a.turma ? ` · ${a.turma}` : ""}{a.disability_type ? ` · ${a.disability_type}` : ""}
                  </option>
                ))}
              </select>
              {alunoSelecionado && (
                <div style={{ marginTop: 10, background: "linear-gradient(135deg, #e8f7fd, #edfff6)", border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1a6e8a" }}>
                  <strong>{alunoSelecionado.full_name}</strong>
                  {alunoSelecionado.grade && ` · ${alunoSelecionado.grade}`}
                  {alunoSelecionado.disability_type && ` · ${alunoSelecionado.disability_type}`}
                  {alunoSelecionado.notes && <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.85 }}>📝 {alunoSelecionado.notes}</p>}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Período letivo *</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={inputFull}>
                {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Escola *</label>
              <select value={escola} onChange={e => setEscola(e.target.value)} style={inputFull} required>
                <option value="">— Selecione a escola —</option>
                {escolas.map(e => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))}
              </select>
            </div>

            <button onClick={handleSubmit} disabled={loading || status === "processing"} style={{
              width: "100%", padding: "12px",
              background: (loading || status === "processing") ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: (loading || status === "processing") ? "not-allowed" : "pointer"
            }}>
              {status === "processing" ? "⏳ Gerando PEI com IA..." : loading ? "Enviando..." : "📋 Gerar PEI"}
            </button>
          </div>
        )}

        {status === "processing" && !resultado && (
          <div style={{
            background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
            padding: "2rem", textAlign: "center", marginTop: 20,
            boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3" }}>Gerando PEI com inteligência artificial...</p>
            <p style={{ fontSize: 13, color: "#5f5e5a", marginTop: 8 }}>
              O Nexus7 está analisando o perfil do aluno e elaborando o PEI completo.
              Isso pode levar até 30 segundos.
            </p>
          </div>
        )}

        {resultado && status === "completed" && (
          <div style={{ marginTop: 20 }}>
            {/* Barra de ações */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 500, color: "#2B9EC3", margin: 0 }}>PEI Gerado</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => { setResultado(null); setStatus(null); setJobId(null); setAprovado(false); setEditando(false); }}
                  style={{ ...btnBase, background: "#fff", color: "#5f5e5a" }}>
                  ← Gerar outro
                </button>
                {!editando && (
                  <button onClick={handleEditar}
                    style={{ ...btnBase, background: "#fff", color: "#534AB7", borderColor: "#534AB7" }}>
                    ✏️ Editar
                  </button>
                )}
                {editando && (
                  <>
                    <button onClick={handleSalvarEdicao} disabled={salvandoEdit}
                      style={{ ...btnBase, background: "#534AB7", color: "#fff", border: "none" }}>
                      {salvandoEdit ? "Salvando..." : "💾 Salvar"}
                    </button>
                    <button onClick={() => { setEditando(false); setResultadoEdit(null); }}
                      style={{ ...btnBase, background: "#fff", color: "#5f5e5a" }}>
                      Cancelar
                    </button>
                  </>
                )}
                <button onClick={handleDownloadPDF} disabled={baixandoPDF}
                  style={{ ...btnBase, background: baixandoPDF ? "#ccc" : "#fff", color: "#2B9EC3", borderColor: "#2B9EC3" }}>
                  {baixandoPDF ? "Gerando..." : "📄 PDF"}
                </button>
                <button onClick={handleAprovar} disabled={aprovado}
                  style={{ ...btnBase, background: aprovado ? "#edfff6" : "#fff", color: aprovado ? "#0F6E56" : "#5f5e5a", borderColor: aprovado ? "#4CAF82" : "#d3d1c7" }}>
                  {aprovado ? "✅ Aprovado" : "👍 Aprovar"}
                </button>
              </div>
            </div>

            {editando ? renderPEIEdit(resultado, resultadoEdit, setResultadoEdit) : renderPEI(resultado)}
          </div>
        )}

        {tab === "historico" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {loadingHist && <p style={{ fontSize: 13, color: "#5f5e5a" }}>Carregando...</p>}
            {!loadingHist && historico.length === 0 && (
              <p style={{ fontSize: 13, color: "#5f5e5a" }}>Nenhum PEI gerado ainda.</p>
            )}
            {historico.map(h => (
              <div key={h.id} style={{
                background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 10,
                padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{h.periodo}</span>
                  <span style={{
                    marginLeft: 10, fontSize: 11, padding: "2px 8px", borderRadius: 12,
                    background: h.status === "completed" ? "#edfff6" : h.status === "error" ? "#fcebeb" : "#fff8e6",
                    color: h.status === "completed" ? "#0F6E56" : h.status === "error" ? "#791f1f" : "#8a6d1b"
                  }}>
                    {h.status === "completed" ? "Concluído" : h.status === "error" ? "Erro" : "Processando"}
                  </span>
                  {h.aprovado && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, padding: "2px 10px", borderRadius: 12,
                      background: "#edfff6", color: "#0F6E56", border: "0.5px solid #4CAF82", fontWeight: 600
                    }}>✅ Aprovado</span>
                  )}
                  <p style={{ fontSize: 11, color: "#888", margin: "4px 0 0" }}>
                    {new Date(h.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {h.status === "completed" && (
                    <button onClick={() => handleVerHistorico(h.id)} style={{
                      fontSize: 12, color: "#2B9EC3", background: "none", border: "0.5px solid #2B9EC3",
                      borderRadius: 6, padding: "4px 12px", cursor: "pointer"
                    }}>Ver</button>
                  )}
                  <button onClick={() => handleExcluirPEI(h.id)} style={{
                    fontSize: 12, color: "#a32d2d", background: "none", border: "0.5px solid #a32d2d",
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer"
                  }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function renderPEIEdit(original, edit, setEdit) {
  if (!edit) return null;
  const textareaStyle = {
    width: "100%", boxSizing: "border-box", fontSize: 12, padding: 8,
    border: "0.5px solid #d3d1c7", borderRadius: 6, resize: "vertical", minHeight: 80, fontFamily: "inherit"
  };
  const sectionStyle = {
    background: "#fff", border: "0.5px solid #534AB7", borderRadius: 10,
    padding: "16px 20px", marginBottom: 14
  };
  const titleStyle = { fontSize: 13, fontWeight: 600, color: "#534AB7", marginBottom: 8 };

  return (
    <div>
      {edit.identificacao && (
        <div style={sectionStyle}>
          <p style={titleStyle}>Identificação — Escola</p>
          <textarea style={textareaStyle} value={edit.identificacao.escola || ""} rows={1}
            onChange={e => setEdit(prev => ({ ...prev, identificacao: { ...prev.identificacao, escola: e.target.value } }))} />
        </div>
      )}
      {edit.diagnostico_pedagogico && (
        <div style={sectionStyle}>
          <p style={titleStyle}>Diagnóstico Pedagógico</p>
          <textarea style={textareaStyle}
            value={edit.diagnostico_pedagogico.nivel_atual || ""}
            onChange={e => setEdit(prev => ({ ...prev, diagnostico_pedagogico: { ...prev.diagnostico_pedagogico, nivel_atual: e.target.value } }))} />
        </div>
      )}
      <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        Edite os campos acima e clique em "Salvar" para atualizar o PEI.
      </p>
    </div>
  );
}

function renderPEI(pei) {
  const sectionStyle = {
    background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 10,
    padding: "16px 20px", marginBottom: 14,
    boxShadow: "0 1px 4px rgba(43,158,195,0.04)"
  };
  const titleStyle = { fontSize: 14, fontWeight: 600, color: "#2B9EC3", marginBottom: 10 };
  const textStyle = { fontSize: 13, color: "#333", lineHeight: 1.6 };
  const listStyle = { fontSize: 13, color: "#333", lineHeight: 1.8, paddingLeft: 20 };

  return (
    <div>
      {pei.identificacao && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>1. Identificação</h4>
          <div style={{ ...textStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
            <span><strong>Aluno:</strong> {pei.identificacao.nome_aluno}</span>
            <span><strong>Série:</strong> {pei.identificacao.serie}</span>
            <span><strong>Escola:</strong> {pei.identificacao.escola}</span>
            <span><strong>Professor:</strong> {pei.identificacao.professor}</span>
            <span><strong>Período:</strong> {pei.identificacao.periodo}</span>
            <span><strong>NEE:</strong> {pei.identificacao.deficiencia_nee}</span>
            <span><strong>Responsável:</strong> {pei.identificacao.responsavel}</span>
            <span><strong>Data:</strong> {pei.identificacao.data_elaboracao}</span>
          </div>
        </div>
      )}
      {pei.diagnostico_pedagogico && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>2. Diagnóstico Pedagógico</h4>
          <p style={textStyle}><strong>Nível atual:</strong> {pei.diagnostico_pedagogico.nivel_atual}</p>
          <p style={{ ...textStyle, marginTop: 8 }}><strong>Estilo de aprendizagem:</strong> {pei.diagnostico_pedagogico.estilo_aprendizagem}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
            <div>
              <strong style={{ fontSize: 12, color: "#4CAF82" }}>Potencialidades:</strong>
              <ul style={listStyle}>{(pei.diagnostico_pedagogico.potencialidades || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
            <div>
              <strong style={{ fontSize: 12, color: "#BA7517" }}>Dificuldades:</strong>
              <ul style={listStyle}>{(pei.diagnostico_pedagogico.dificuldades || []).map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
      {pei.objetivos && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>3. Objetivos</h4>
          <strong style={{ fontSize: 12, color: "#2B9EC3" }}>Curto prazo (bimestre):</strong>
          <ul style={listStyle}>{(pei.objetivos.curto_prazo || []).map((o, i) => <li key={i}><strong>{o.area}:</strong> {o.meta}</li>)}</ul>
          <strong style={{ fontSize: 12, color: "#534AB7", marginTop: 8, display: "block" }}>Longo prazo (ano letivo):</strong>
          <ul style={listStyle}>{(pei.objetivos.longo_prazo || []).map((o, i) => <li key={i}><strong>{o.area}:</strong> {o.meta}</li>)}</ul>
        </div>
      )}
      {pei.estrategias_pedagogicas && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>4. Estratégias Pedagógicas</h4>
          <ul style={listStyle}>{pei.estrategias_pedagogicas.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {pei.adaptacoes_curriculares && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>5. Adaptações Curriculares</h4>
          {Object.entries(pei.adaptacoes_curriculares).map(([key, items]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12, textTransform: "capitalize" }}>{key}:</strong>
              <ul style={listStyle}>{(items || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {pei.aee && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>6. AEE — Atendimento Educacional Especializado</h4>
          <p style={textStyle}><strong>Frequência:</strong> {pei.aee.frequencia}</p>
          <p style={textStyle}><strong>Local:</strong> {pei.aee.local}</p>
          <p style={textStyle}><strong>Profissional:</strong> {pei.aee.profissional}</p>
          <strong style={{ fontSize: 12 }}>Atividades:</strong>
          <ul style={listStyle}>{(pei.aee.atividades || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
          <p style={{ fontSize: 11, color: "#888", marginTop: 6 }}>{pei.aee.base_legal}</p>
        </div>
      )}
      {pei.tecnologia_assistiva && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>7. Tecnologia Assistiva</h4>
          {pei.tecnologia_assistiva.map((ta, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "8px 12px", background: "#f9f9f7", borderRadius: 8 }}>
              <strong style={{ fontSize: 13 }}>{ta.recurso}</strong>
              <p style={{ fontSize: 12, color: "#555", margin: "4px 0" }}>{ta.finalidade}</p>
              <p style={{ fontSize: 11, color: "#888" }}>📦 {ta.como_obter}</p>
            </div>
          ))}
        </div>
      )}
      {pei.avaliacao_processual && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>8. Avaliação Processual</h4>
          <p style={textStyle}><strong>Frequência:</strong> {pei.avaliacao_processual.frequencia}</p>
          <strong style={{ fontSize: 12 }}>Instrumentos:</strong>
          <ul style={listStyle}>{(pei.avaliacao_processual.instrumentos || []).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
          <strong style={{ fontSize: 12 }}>Indicadores de progresso:</strong>
          <ul style={listStyle}>{(pei.avaliacao_processual.indicadores || []).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
        </div>
      )}
      {pei.comunicacao_familia && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>9. Comunicação com a Família</h4>
          <p style={textStyle}><strong>Frequência:</strong> {pei.comunicacao_familia.frequencia}</p>
          <strong style={{ fontSize: 12 }}>Meios:</strong>
          <ul style={listStyle}>{(pei.comunicacao_familia.meios || []).map((m, i) => <li key={i}>{m}</li>)}</ul>
          <strong style={{ fontSize: 12 }}>Orientações para casa:</strong>
          <ul style={listStyle}>{(pei.comunicacao_familia.orientacoes_em_casa || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
        </div>
      )}
      {pei.equipe_multidisciplinar && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>10. Equipe Multidisciplinar</h4>
          {pei.equipe_multidisciplinar.map((e, i) => (
            <p key={i} style={textStyle}><strong>{e.profissional}:</strong> {e.papel}</p>
          ))}
        </div>
      )}
      {pei.revisao_cronograma && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>11. Revisão e Cronograma</h4>
          <p style={textStyle}><strong>Responsável:</strong> {pei.revisao_cronograma.responsavel_revisao}</p>
          <p style={textStyle}><strong>Critérios:</strong> {pei.revisao_cronograma.criterios_revisao}</p>
          <strong style={{ fontSize: 12 }}>Datas de revisão:</strong>
          <ul style={listStyle}>{(pei.revisao_cronograma.datas_revisao || []).map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>
      )}
      {pei.base_legal && (
        <div style={{ ...sectionStyle, background: "#f9f9f7" }}>
          <h4 style={{ ...titleStyle, color: "#888" }}>Base Legal</h4>
          <p style={{ fontSize: 12, color: "#666" }}>{pei.base_legal}</p>
        </div>
      )}
    </div>
  );
}
