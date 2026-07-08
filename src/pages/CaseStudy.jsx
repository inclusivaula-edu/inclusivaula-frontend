import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { generateCaseStudy, getCaseStudyStatus, listCaseStudies, getCaseStudyPDFBlob } from "../services/mapiClient";
import icone from "../assets/icone.png";

const cardStyle = {
  background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
  padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
};
const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };

function Secao({ titulo, children, cor = "#2B9EC3" }) {
  return (
    <div style={{ ...cardStyle, marginBottom: 14, borderLeft: `3px solid ${cor}` }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: cor, margin: "0 0 8px" }}>{titulo}</p>
      {children}
    </div>
  );
}

function Lista({ itens }) {
  if (!itens?.length) return null;
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
      {itens.map((i, k) => <li key={k} style={{ fontSize: 13, lineHeight: 1.6 }}>{typeof i === "string" ? i : JSON.stringify(i)}</li>)}
    </ul>
  );
}

export default function CaseStudy() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState("");
  const [periodo, setPeriodo] = useState("1º Semestre 2026");
  const [escola, setEscola] = useState("");
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [tab, setTab] = useState("gerar");
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, grade, disability_type")
          .eq("school_id", profile.school_id)
          .order("full_name");
        setAlunos(data || []);
        const { data: sch } = await supabase
          .from("schools").select("id, name").eq("id", profile.school_id);
        setEscolas(sch || []);
        if (sch?.[0]) setEscola(sch[0].name);
      }
    }
    if (user) carregar();
  }, [user]);

  // Polling do job
  useEffect(() => {
    if (!jobId || status !== "processing") return;
    const t = setInterval(async () => {
      try {
        const res = await getCaseStudyStatus(jobId);
        if (res.status === "completed") { setResultado(res.data); setStatus("completed"); }
        if (res.status === "error") { setError("Falha ao gerar o estudo de caso. Tente novamente."); setStatus("error"); }
      } catch { /* mantém polling */ }
    }, 4000);
    return () => clearInterval(t);
  }, [jobId, status]);

  async function handleGerar() {
    if (!alunoId) { setError("Selecione um aluno."); return; }
    setError(null); setLoading(true); setResultado(null);
    try {
      const res = await generateCaseStudy(alunoId, periodo, escola);
      setJobId(res.jobId);
      setStatus("processing");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarHistorico() {
    try {
      const res = await listCaseStudies();
      setHistorico(res.data || []);
    } catch { /* silencioso */ }
  }

  async function abrirDoHistorico(id) {
    try {
      const res = await getCaseStudyStatus(id);
      if (res.status === "completed") {
        setResultado(res.data); setStatus("completed"); setJobId(id); setTab("gerar");
      }
    } catch { /* silencioso */ }
  }

  async function baixarPDF(formato = "pdf") {
    setBaixando(true);
    try {
      const blob = await getCaseStudyPDFBlob(jobId, formato);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estudo-de-caso-${jobId.slice(0, 8)}.${formato === "docx" ? "docx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erro ao gerar PDF.");
    } finally {
      setBaixando(false);
    }
  }

  const nomeAluno = (id) => alunos.find(a => a.id === id)?.full_name || "—";
  const barreiras = resultado?.barreiras_identificadas || {};
  const rotulosBarreiras = {
    pedagogicas: "Pedagógicas", comunicacionais: "Comunicacionais", atitudinais: "Atitudinais",
    fisicas_arquitetonicas: "Físicas/Arquitetônicas", tecnologicas: "Tecnológicas"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{ background: "#fff", borderBottom: "0.5px solid #d3d1c7", padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span></span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>🔍 Estudo de Caso</h1>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Avaliação biopsicossocial com foco em barreiras — porta de entrada do AEE conforme a Portaria MEC 421/2026 (dispensa laudo médico)
        </p>

        {/* Abas */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["gerar", "📝 Gerar"], ["historico", "🗂️ Histórico"]].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); if (id === "historico") carregarHistorico(); }} style={{
              padding: "8px 16px", fontSize: 13, borderRadius: 8,
              background: tab === id ? "linear-gradient(135deg, #2B9EC3, #4CAF82)" : "#fff",
              color: tab === id ? "#fff" : "#5f5e5a",
              border: `0.5px solid ${tab === id ? "transparent" : "#d3d1c7"}`, cursor: "pointer"
            }}>{label}</button>
          ))}
        </div>

        {error && (
          <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {tab === "historico" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {historico.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#5f5e5a", margin: 0 }}>Nenhum estudo de caso gerado ainda.</p>
              </div>
            ) : historico.map(h => (
              <div key={h.id} style={{ ...cardStyle, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{nomeAluno(h.student_id)}</p>
                  <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                    {h.periodo || "—"} · {new Date(h.created_at).toLocaleDateString("pt-BR")} ·{" "}
                    {h.status === "completed" ? "✅ concluído" : h.status === "error" ? "❌ erro" : "⏳ processando"}
                  </p>
                </div>
                {h.status === "completed" && (
                  <button onClick={() => abrirDoHistorico(h.id)} style={{ fontSize: 12, padding: "6px 14px" }}>Abrir</button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "gerar" && !resultado && (
          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="ec-aluno" style={labelStyle}>Aluno *</label>
                <select id="ec-aluno" value={alunoId} onChange={e => setAlunoId(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="">— Selecione o aluno —</option>
                  {alunos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}{a.grade ? ` · ${a.grade}` : ""}{a.disability_type ? ` · ${a.disability_type}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label htmlFor="ec-periodo" style={labelStyle}>Período</label>
                  <input id="ec-periodo" value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label htmlFor="ec-escola" style={labelStyle}>Escola</label>
                  <select id="ec-escola" value={escola} onChange={e => setEscola(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
                    {escolas.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleGerar} disabled={loading || status === "processing"} style={{
                width: "100%", padding: 12,
                background: loading || status === "processing" ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500,
                cursor: loading || status === "processing" ? "not-allowed" : "pointer"
              }}>
                {status === "processing" ? "⏳ Nexus7 analisando o caso..." : "🔍 Gerar estudo de caso"}
              </button>
              {status === "processing" && (
                <p role="status" style={{ fontSize: 12, color: "#5f5e5a", textAlign: "center", margin: 0 }}>
                  Isso leva cerca de 1 minuto. A página atualiza sozinha.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "gerar" && resultado && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <button onClick={() => { setResultado(null); setStatus(null); setJobId(null); }} style={{ fontSize: 13 }}>← Gerar outro</button>
              <button onClick={() => baixarPDF("pdf")} disabled={baixando} style={{ fontSize: 13, background: "#534AB7", color: "#fff", border: "none" }}>
                {baixando ? "Gerando..." : "📄 Baixar PDF"}
              </button>
              <button onClick={() => baixarPDF("docx")} disabled={baixando} style={{ fontSize: 13, background: "#185ABD", color: "#fff", border: "none" }}>
                📝 Baixar Word
              </button>
            </div>

            <div style={{ background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", borderRadius: 12, padding: "1.2rem 1.5rem", marginBottom: 16, color: "#fff" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                Estudo de Caso — {resultado.identificacao?.nome_aluno || "—"}
              </h2>
              <p style={{ fontSize: 13, opacity: 0.9, margin: "4px 0 0" }}>
                {resultado.identificacao?.serie || ""} · {resultado.identificacao?.periodo || ""} · {resultado.identificacao?.data_elaboracao || ""}
              </p>
            </div>

            <Secao titulo="Contexto Biopsicossocial" cor="#2B9EC3">
              <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Biológica:</strong> {resultado.contexto_biopsicossocial?.dimensao_biologica}</p>
              <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Psicológica:</strong> {resultado.contexto_biopsicossocial?.dimensao_psicologica}</p>
              <p style={{ fontSize: 13, margin: 0 }}><strong>Social:</strong> {resultado.contexto_biopsicossocial?.dimensao_social}</p>
            </Secao>

            <Secao titulo="Barreiras Identificadas" cor="#BA7517">
              {Object.entries(rotulosBarreiras).map(([chave, rotulo]) =>
                barreiras[chave]?.length ? (
                  <div key={chave} style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>{rotulo}</p>
                    <Lista itens={barreiras[chave]} />
                  </div>
                ) : null
              )}
            </Secao>

            <Secao titulo="Potencialidades" cor="#4CAF82">
              <Lista itens={resultado.potencialidades} />
            </Secao>

            <Secao titulo="Necessidades de Apoio" cor="#2B9EC3">
              <Lista itens={(resultado.necessidades_de_apoio || []).map(n =>
                typeof n === "string" ? n : `${n.area}: ${n.apoio} (${n.intensidade || "—"})`)} />
            </Secao>

            {resultado.encaminhamentos?.length > 0 && (
              <Secao titulo="Encaminhamentos Sugeridos" cor="#534AB7">
                <Lista itens={resultado.encaminhamentos.map(e =>
                  typeof e === "string" ? e : `${e.profissional_ou_servico}: ${e.motivo}`)} />
              </Secao>
            )}

            <Secao titulo="Recomendações" cor="#0F6E56">
              <p style={{ fontSize: 13, margin: "0 0 8px" }}>
                <strong>PEI:</strong> {resultado.recomendacoes?.elaborar_pei ? "✅ recomendado" : "não indicado"} ·{" "}
                <strong>PAEE:</strong> {resultado.recomendacoes?.elaborar_paee ? "✅ recomendado" : "não indicado"}
              </p>
              <p style={{ fontSize: 13, margin: "0 0 8px" }}>{resultado.recomendacoes?.justificativa}</p>
              <Lista itens={resultado.recomendacoes?.apoios_prioritarios} />
            </Secao>

            {(resultado.recomendacoes?.elaborar_pei || resultado.recomendacoes?.elaborar_paee) && (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => navigate("/pei")} style={{ flex: 1, padding: 10, background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                  → Elaborar PEI/PDI deste aluno
                </button>
                <button onClick={() => navigate("/aee")} style={{ flex: 1, padding: 10, background: "#fff", color: "#534AB7", border: "1px solid #534AB7", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                  → Elaborar Plano AEE
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
