import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { generateAEE, getAEEStatus, listAEEs, approveAEE, getAEEPDFBlob } from "../services/mapiClient";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

const PERIODOS = [
  "1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre",
  "1º Semestre", "2º Semestre", "Anual"
];

export default function AEE() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [escolas, setEscolas] = useState([]);
  const [alunoId, setAlunoId] = useState("");
  const [periodo, setPeriodo] = useState("1º Semestre");
  const [escola, setEscola] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const [tab, setTab] = useState("gerar");
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [aprovado, setAprovado] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [baixandoPDF, setBaixandoPDF] = useState(false);
  const [editando, setEditando] = useState(false);
  const [resultadoEdit, setResultadoEdit] = useState(null);
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  const CARGOS_ADMIN = ["coordenador_municipal","coordenador_estadual","secretario_municipal","secretario_estadual","diretor","coordenador"];

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

      const schoolIds = isAdmin
        ? escolasData.map(e => e.id)
        : profile?.school_id ? [profile.school_id] : [];

      if (schoolIds.length > 0) {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, grade, disability_type, notes, turma")
          .in("school_id", schoolIds)
          .order("full_name");
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
        const res = await getAEEStatus(jobId);
        if (res.status === "completed") {
          setStatus("completed");
          setResultado(res.data);
          clearInterval(interval);
        } else if (res.status === "error") {
          setStatus("error");
          setLocalError("Erro ao gerar PAEE. Tente novamente.");
          clearInterval(interval);
        }
      } catch { /* retry */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId, status]);

  async function loadHistorico() {
    setLoadingHist(true);
    try {
      const res = await listAEEs();
      setHistorico(res.data || []);
    } catch { }
    setLoadingHist(false);
  }

  function handleTabChange(t) {
    setTab(t);
    if (t === "historico") loadHistorico();
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function handleAprovar() {
    try {
      await approveAEE(jobId);
      setAprovado(true);
      mostrarFeedback("✅ PAEE aprovado!");
    } catch {
      mostrarFeedback("Erro ao aprovar.", "erro");
    }
  }

  async function handleDownloadPDF(formato = "pdf") {
    setBaixandoPDF(true);
    try {
      const blob = await getAEEPDFBlob(jobId, formato);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plano-aee-${jobId}.${formato === "docx" ? "docx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      mostrarFeedback("Erro ao gerar PDF.", "erro");
    } finally {
      setBaixandoPDF(false);
    }
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
      const res = await generateAEE(alunoId, periodo, escola);
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
      const res = await getAEEStatus(id);
      if (res.status === "completed") {
        setResultado(res.data);
        setStatus("completed");
        setJobId(id);
        setAprovado(!!res.aprovado);
        setEditando(false);
        setTab("gerar");
      }
    } catch { }
  }

  async function handleExcluirAEE(id) {
    if (!window.confirm("Excluir este PAEE? Esta ação não pode ser desfeita.")) return;
    try {
      await supabase.from("aee_documents").delete().eq("id", id);
      setHistorico(prev => prev.filter(h => h.id !== id));
      mostrarFeedback("PAEE excluído.");
    } catch {
      mostrarFeedback("Erro ao excluir.", "erro");
    }
  }

  function handleEditar() {
    setResultadoEdit(JSON.parse(JSON.stringify(resultado)));
    setEditando(true);
  }

  async function handleSalvarEdicao() {
    setSalvandoEdit(true);
    try {
      await supabase.from("aee_documents").update({ result: resultadoEdit }).eq("id", jobId);
      setResultado(resultadoEdit);
      setEditando(false);
      mostrarFeedback("PAEE salvo!");
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
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>🏫 AEE — Atendimento Educacional Especializado</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Obrigatório pelo Decreto 7.611/2011 — plano de atendimento complementar para cada aluno
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["gerar", "historico"].map(t => (
            <button key={t} onClick={() => handleTabChange(t)} style={{
              padding: "8px 20px", borderRadius: 8, border: "0.5px solid #d3d1c7",
              background: tab === t ? "#534AB7" : "#fff",
              color: tab === t ? "#fff" : "#5f5e5a",
              fontSize: 13, fontWeight: 500, cursor: "pointer"
            }}>
              {t === "gerar" ? "Gerar PAEE" : "Histórico"}
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
                <div style={{ marginTop: 10, background: "linear-gradient(135deg, #EEEDFE, #e8f7fd)", border: "0.5px solid #534AB7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#3b3480" }}>
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
              background: (loading || status === "processing") ? "#ccc" : "linear-gradient(135deg, #534AB7, #2B9EC3)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: (loading || status === "processing") ? "not-allowed" : "pointer"
            }}>
              {status === "processing" ? "⏳ Gerando PAEE..." : loading ? "Enviando..." : "🏫 Gerar PAEE"}
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
            <p style={{ fontSize: 15, fontWeight: 500, color: "#534AB7" }}>Gerando PAEE com inteligência artificial...</p>
            <p style={{ fontSize: 13, color: "#5f5e5a", marginTop: 8 }}>
              O Nexus7 está elaborando o plano de atendimento especializado.
              Isso pode levar até 30 segundos.
            </p>
          </div>
        )}

        {resultado && status === "completed" && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 500, color: "#534AB7", margin: 0 }}>PAEE Gerado</h3>
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
                <button onClick={() => handleDownloadPDF("pdf")} disabled={baixandoPDF}
                  style={{ ...btnBase, background: baixandoPDF ? "#ccc" : "#fff", color: "#534AB7", borderColor: "#534AB7" }}>
                  {baixandoPDF ? "Gerando..." : "📄 PDF"}
                </button>
                <button onClick={() => handleDownloadPDF("docx")} disabled={baixandoPDF}
                  style={{ ...btnBase, background: baixandoPDF ? "#ccc" : "#fff", color: "#185ABD", borderColor: "#185ABD" }}>
                  📝 Word
                </button>
                <button onClick={handleAprovar} disabled={aprovado}
                  style={{ ...btnBase, background: aprovado ? "#edfff6" : "#fff", color: aprovado ? "#0F6E56" : "#5f5e5a", borderColor: aprovado ? "#4CAF82" : "#d3d1c7" }}>
                  {aprovado ? "✅ Aprovado" : "👍 Aprovar"}
                </button>
              </div>
            </div>

            {editando ? renderAEEEdit(resultado, resultadoEdit, setResultadoEdit) : renderAEE(resultado)}
          </div>
        )}

        {tab === "historico" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {loadingHist && <p style={{ fontSize: 13, color: "#5f5e5a" }}>Carregando...</p>}
            {!loadingHist && historico.length === 0 && (
              <p style={{ fontSize: 13, color: "#5f5e5a" }}>Nenhum PAEE gerado ainda.</p>
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
                      fontSize: 12, color: "#534AB7", background: "none", border: "0.5px solid #534AB7",
                      borderRadius: 6, padding: "4px 12px", cursor: "pointer"
                    }}>Ver</button>
                  )}
                  <button onClick={() => handleExcluirAEE(h.id)} style={{
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

function renderAEEEdit(original, edit, setEdit) {
  if (!edit) return null;
  const textareaStyle = {
    width: "100%", boxSizing: "border-box", fontSize: 12, padding: 8,
    border: "0.5px solid #d3d1c7", borderRadius: 6, resize: "vertical", minHeight: 72, fontFamily: "inherit"
  };
  const sectionStyle = { background: "#fff", border: "0.5px solid #534AB7", borderRadius: 10, padding: "14px 18px", marginBottom: 14 };
  const titleStyle = { fontSize: 13, fontWeight: 600, color: "#534AB7", marginBottom: 8, margin: "0 0 8px 0" };

  function updatePath(path, value) {
    const keys = path.split(".");
    setEdit(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]] || {};
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  }

  return (
    <div>
      {edit.avaliacao_inicial?.necessidades_especificas !== undefined && (
        <div style={sectionStyle}>
          <p style={titleStyle}>Necessidades Específicas</p>
          <textarea style={textareaStyle} value={edit.avaliacao_inicial.necessidades_especificas}
            onChange={e => updatePath("avaliacao_inicial.necessidades_especificas", e.target.value)} />
        </div>
      )}
      {edit.plano_atendimento?.objetivos && (
        <div style={sectionStyle}>
          <p style={titleStyle}>Objetivos do Atendimento</p>
          <textarea style={textareaStyle} value={(edit.plano_atendimento.objetivos || []).join("\n")}
            onChange={e => updatePath("plano_atendimento.objetivos", e.target.value.split("\n"))} />
        </div>
      )}
      {edit.articulacao_sala_regular?.orientacoes_professor && (
        <div style={sectionStyle}>
          <p style={titleStyle}>Orientações ao Professor</p>
          <textarea style={textareaStyle} value={(edit.articulacao_sala_regular.orientacoes_professor || []).join("\n")}
            onChange={e => updatePath("articulacao_sala_regular.orientacoes_professor", e.target.value.split("\n"))} />
        </div>
      )}
      {edit.articulacao_familia?.orientacoes && (
        <div style={sectionStyle}>
          <p style={titleStyle}>Orientações à Família</p>
          <textarea style={textareaStyle} value={(edit.articulacao_familia.orientacoes || []).join("\n")}
            onChange={e => updatePath("articulacao_familia.orientacoes", e.target.value.split("\n"))} />
        </div>
      )}
      <p style={{ fontSize: 12, color: "#888" }}>Edite os campos acima e clique em "Salvar".</p>
    </div>
  );
}

function renderAEE(aee) {
  const sectionStyle = {
    background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 10,
    padding: "16px 20px", marginBottom: 14,
    boxShadow: "0 1px 4px rgba(83,74,183,0.04)"
  };
  const titleStyle = { fontSize: 14, fontWeight: 600, color: "#534AB7", marginBottom: 10 };
  const textStyle = { fontSize: 13, color: "#333", lineHeight: 1.6 };
  const listStyle = { fontSize: 13, color: "#333", lineHeight: 1.8, paddingLeft: 20 };

  return (
    <div>
      {aee.identificacao && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Identificação</h4>
          <div style={{ ...textStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
            <span><strong>Aluno:</strong> {aee.identificacao.nome_aluno}</span>
            <span><strong>Série:</strong> {aee.identificacao.serie}</span>
            <span><strong>Escola:</strong> {aee.identificacao.escola}</span>
            <span><strong>Período:</strong> {aee.identificacao.periodo}</span>
            <span><strong>NEE:</strong> {aee.identificacao.deficiencia_nee}</span>
            <span><strong>Tipo:</strong> {aee.identificacao.tipo_atendimento}</span>
          </div>
        </div>
      )}

      {aee.avaliacao_inicial && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Avaliação Inicial</h4>
          <p style={textStyle}><strong>Necessidades específicas:</strong> {aee.avaliacao_inicial.necessidades_especificas}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
            <div>
              <strong style={{ fontSize: 12, color: "#4CAF82" }}>Habilidades preservadas:</strong>
              <ul style={listStyle}>{(aee.avaliacao_inicial.habilidades_preservadas || []).map((h, i) => <li key={i}>{h}</li>)}</ul>
            </div>
            <div>
              <strong style={{ fontSize: 12, color: "#BA7517" }}>Barreiras:</strong>
              <ul style={listStyle}>{(aee.avaliacao_inicial.barreiras_aprendizagem || []).map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          </div>
        </div>
      )}

      {aee.necessidades_educacionais_especiais && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Necessidades Educacionais Especiais do(a) Estudante</h4>
          <ul style={listStyle}>
            {aee.necessidades_educacionais_especiais.deficiencia_hipotese && <li><strong>4.1 Deficiência/hipótese específica:</strong> {aee.necessidades_educacionais_especiais.deficiencia_hipotese}</li>}
            {aee.necessidades_educacionais_especiais.sistema_linguistico && <li><strong>4.2 Sistema linguístico:</strong> {aee.necessidades_educacionais_especiais.sistema_linguistico}</li>}
            {aee.necessidades_educacionais_especiais.recursos_acessibilidade_utilizados && <li><strong>4.3 Recursos já utilizados:</strong> {aee.necessidades_educacionais_especiais.recursos_acessibilidade_utilizados}</li>}
            {aee.necessidades_educacionais_especiais.atividades_adaptacoes_pretendidas && <li><strong>4.4 Atividades/adaptações pretendidas:</strong> {aee.necessidades_educacionais_especiais.atividades_adaptacoes_pretendidas}</li>}
            {aee.necessidades_educacionais_especiais.implicacoes_acessibilidade_curricular && <li><strong>4.5 Implicações para o currículo:</strong> {aee.necessidades_educacionais_especiais.implicacoes_acessibilidade_curricular}</li>}
            {aee.necessidades_educacionais_especiais.outras_informacoes_relevantes && <li><strong>4.6 Outras informações relevantes:</strong> {aee.necessidades_educacionais_especiais.outras_informacoes_relevantes}</li>}
          </ul>
        </div>
      )}

      {aee.desenvolvimento_do_estudante && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Desenvolvimento do(a) Estudante (dificuldades e potencialidades)</h4>
          {aee.desenvolvimento_do_estudante.funcao_cognitiva && (
            <div style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 12, color: "#534AB7" }}>Função Cognitiva:</strong>
              <ul style={listStyle}>
                {aee.desenvolvimento_do_estudante.funcao_cognitiva.percepcao && <li><strong>Percepção:</strong> {aee.desenvolvimento_do_estudante.funcao_cognitiva.percepcao}</li>}
                {aee.desenvolvimento_do_estudante.funcao_cognitiva.atencao && <li><strong>Atenção:</strong> {aee.desenvolvimento_do_estudante.funcao_cognitiva.atencao}</li>}
                {aee.desenvolvimento_do_estudante.funcao_cognitiva.memoria && <li><strong>Memória:</strong> {aee.desenvolvimento_do_estudante.funcao_cognitiva.memoria}</li>}
                {aee.desenvolvimento_do_estudante.funcao_cognitiva.linguagem && <li><strong>Linguagem:</strong> {aee.desenvolvimento_do_estudante.funcao_cognitiva.linguagem}</li>}
                {aee.desenvolvimento_do_estudante.funcao_cognitiva.raciocinio_logico && <li><strong>Raciocínio lógico:</strong> {aee.desenvolvimento_do_estudante.funcao_cognitiva.raciocinio_logico}</li>}
              </ul>
            </div>
          )}
          {aee.desenvolvimento_do_estudante.funcao_motora_psicomotora?.desenvolvimento_e_capacidade_motora && (
            <p style={textStyle}><strong style={{ color: "#2B9EC3" }}>Função Motora e Psicomotora:</strong> {aee.desenvolvimento_do_estudante.funcao_motora_psicomotora.desenvolvimento_e_capacidade_motora}</p>
          )}
          {aee.desenvolvimento_do_estudante.funcao_interpessoal_afetiva?.area_emocional_afetiva_social && (
            <p style={textStyle}><strong style={{ color: "#4CAF82" }}>Funções Interpessoais — Afetivas (emocional, afetiva e social):</strong> {aee.desenvolvimento_do_estudante.funcao_interpessoal_afetiva.area_emocional_afetiva_social}</p>
          )}
        </div>
      )}

      {aee.plano_atendimento && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Plano de Atendimento</h4>
          <p style={textStyle}><strong>Frequência:</strong> {aee.plano_atendimento.frequencia}</p>
          <p style={textStyle}><strong>Local:</strong> {aee.plano_atendimento.local}</p>
          <p style={textStyle}><strong>Agrupamento:</strong> {aee.plano_atendimento.agrupamento}</p>
          <strong style={{ fontSize: 12 }}>Objetivos:</strong>
          <ul style={listStyle}>{(aee.plano_atendimento.objetivos || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
          <strong style={{ fontSize: 12, marginTop: 8, display: "block" }}>Atividades:</strong>
          {(aee.plano_atendimento.atividades || []).map((at, i) => (
            <div key={i} style={{ margin: "8px 0", padding: "10px 14px", background: "#f9f9f7", borderRadius: 8 }}>
              <strong style={{ fontSize: 13 }}>{at.atividade}</strong>
              <p style={{ fontSize: 12, color: "#555", margin: "4px 0" }}>{at.descricao}</p>
              <p style={{ fontSize: 11, color: "#888" }}>⏱ {at.duracao} · 🎯 {at.objetivo}</p>
              {at.materiais && <p style={{ fontSize: 11, color: "#888" }}>📦 {at.materiais.join(", ")}</p>}
            </div>
          ))}
        </div>
      )}

      {aee.tecnologia_assistiva && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Tecnologia Assistiva</h4>
          {aee.tecnologia_assistiva.map((ta, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "8px 12px", background: "#f9f9f7", borderRadius: 8 }}>
              <strong style={{ fontSize: 13 }}>{ta.recurso}</strong>
              <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>({ta.categoria})</span>
              <p style={{ fontSize: 12, color: "#555", margin: "4px 0" }}>No AEE: {ta.uso_no_aee}</p>
              <p style={{ fontSize: 12, color: "#555" }}>Em sala: {ta.uso_em_sala}</p>
              <p style={{ fontSize: 11, color: "#888" }}>📦 {ta.como_obter}</p>
            </div>
          ))}
        </div>
      )}

      {aee.articulacao_sala_regular && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Articulação com Sala Regular</h4>
          <p style={textStyle}><strong>Reuniões:</strong> {aee.articulacao_sala_regular.frequencia_reuniao}</p>
          <strong style={{ fontSize: 12 }}>Orientações para o professor:</strong>
          <ul style={listStyle}>{(aee.articulacao_sala_regular.orientacoes_professor || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
          <strong style={{ fontSize: 12 }}>Adaptações sugeridas:</strong>
          <ul style={listStyle}>{(aee.articulacao_sala_regular.adaptacoes_sugeridas || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}

      {aee.articulacao_familia && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Articulação com a Família</h4>
          <strong style={{ fontSize: 12 }}>Orientações:</strong>
          <ul style={listStyle}>{(aee.articulacao_familia.orientacoes || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
          <strong style={{ fontSize: 12 }}>Atividades em casa:</strong>
          <ul style={listStyle}>{(aee.articulacao_familia.atividades_em_casa || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}

      {aee.avaliacao_resultados && (
        <div style={sectionStyle}>
          <h4 style={titleStyle}>Avaliação de Resultados</h4>
          <p style={textStyle}><strong>Revisão:</strong> {aee.avaliacao_resultados.revisao}</p>
          <strong style={{ fontSize: 12 }}>Instrumentos:</strong>
          <ul style={listStyle}>{(aee.avaliacao_resultados.instrumentos || []).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
          <strong style={{ fontSize: 12 }}>Indicadores de progresso:</strong>
          <ul style={listStyle}>{(aee.avaliacao_resultados.indicadores_progresso || []).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
        </div>
      )}

      {aee.base_legal && (
        <div style={{ ...sectionStyle, background: "#f9f9f7" }}>
          <h4 style={{ ...titleStyle, color: "#888" }}>Base Legal</h4>
          <p style={{ fontSize: 12, color: "#666" }}>{aee.base_legal}</p>
        </div>
      )}
    </div>
  );
}
