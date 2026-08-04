import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createAnamnese, listAnamneses, getAnamnese, updateAnamnese, deleteAnamnese } from "../services/mapiClient";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

const CAMPOS = [
  { key: "gestacao_parto", label: "Gestação e parto", placeholder: "Intercorrências na gestação, tipo de parto, prematuridade..." },
  { key: "desenvolvimento_motor", label: "Desenvolvimento motor", placeholder: "Quando engatinhou, andou, marcos motores..." },
  { key: "desenvolvimento_linguagem", label: "Desenvolvimento da linguagem", placeholder: "Primeiras palavras, frases, atraso de fala..." },
  { key: "historico_saude", label: "Histórico de saúde", placeholder: "Internações, cirurgias, condições de saúde relevantes..." },
  { key: "diagnostico_laudo", label: "Diagnóstico / laudo", placeholder: "CID, data do laudo, profissional responsável..." },
  { key: "medicacoes_em_uso", label: "Medicações em uso", placeholder: "Nome, dosagem, horários, efeitos observados..." },
  { key: "historico_familiar", label: "Histórico familiar", placeholder: "Composição familiar, casos semelhantes na família..." },
  { key: "rotina_sono_alimentacao", label: "Rotina de sono e alimentação", placeholder: "Qualidade do sono, seletividade alimentar..." },
  { key: "comportamento_observado", label: "Comportamento observado pela família", placeholder: "Comportamentos em casa, gatilhos, o que acalma..." },
  { key: "observacoes_escolares", label: "Observações escolares complementares", placeholder: "Informações relevantes vindas da escola/AEE..." }
];

const vazio = () => Object.fromEntries(CAMPOS.map(c => [c.key, ""]));

export default function Anamnese() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState("");
  const [tab, setTab] = useState("form");
  const [form, setForm] = useState(vazio());
  const [editandoId, setEditandoId] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [aberta, setAberta] = useState(null);

  useEffect(() => {
    async function carregar() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) {
        const { data } = await supabase
          .from("students").select("id, full_name, grade")
          .eq("school_id", profile.school_id).order("full_name");
        setAlunos(data || []);
      }
    }
    carregar();
  }, [user.id]);

  useEffect(() => {
    if (tab === "historico") carregarHistorico();
  }, [tab, alunoId]);

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregarHistorico() {
    setLoadingHist(true);
    try {
      const res = await listAnamneses(alunoId || null);
      setHistorico(res.data || []);
    } catch {
      mostrarFeedback("Erro ao carregar histórico.", "erro");
    } finally {
      setLoadingHist(false);
    }
  }

  async function handleSalvar() {
    if (!alunoId) { mostrarFeedback("Selecione o aluno.", "erro"); return; }
    setSalvando(true);
    try {
      if (editandoId) {
        await updateAnamnese(editandoId, form);
        mostrarFeedback("Anamnese atualizada!");
      } else {
        await createAnamnese(alunoId, form);
        mostrarFeedback("Anamnese salva!");
      }
      setForm(vazio());
      setEditandoId(null);
      setTab("historico");
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao salvar.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function handleAbrir(id) {
    if (aberta === id) { setAberta(null); return; }
    try {
      const res = await getAnamnese(id);
      setAberta(id);
      setHistorico(prev => prev.map(h => h.id === id ? { ...h, data: res.data.data } : h));
    } catch {
      mostrarFeedback("Erro ao abrir anamnese.", "erro");
    }
  }

  function handleEditarItem(item) {
    setAlunoId(item.student_id);
    setForm({ ...vazio(), ...item.data });
    setEditandoId(item.id);
    setTab("form");
  }

  async function handleExcluir(id) {
    if (!window.confirm("Excluir esta anamnese? Esta ação não pode ser desfeita.")) return;
    try {
      const res = await deleteAnamnese(id);
      if (!res?.success) throw new Error(res?.error || "Falha ao excluir");
      setHistorico(prev => prev.filter(h => h.id !== id));
      mostrarFeedback("Anamnese excluída.");
    } catch {
      mostrarFeedback("Erro ao excluir.", "erro");
    }
  }

  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };
  const inputFull = { width: "100%", boxSizing: "border-box" };
  const textareaStyle = { ...inputFull, minHeight: 70, resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: 10 };
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
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>🩺 Anamnese</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Histórico de desenvolvimento e saúde do aluno, base para PEI, PAEE e Estudo de Caso
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[{ k: "form", l: editandoId ? "Editando" : "Nova anamnese" }, { k: "historico", l: "Histórico" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              ...btnBase,
              background: tab === t.k ? "#2B9EC3" : "#fff",
              color: tab === t.k ? "#fff" : "#5f5e5a",
              borderColor: tab === t.k ? "#2B9EC3" : "#d3d1c7"
            }}>{t.l}</button>
          ))}
        </div>

        {tab === "form" && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Aluno</label>
              <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={inputFull} disabled={!!editandoId}>
                <option value="">Selecione o aluno</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.full_name}{a.grade ? ` — ${a.grade}` : ""}</option>)}
              </select>
            </div>

            {CAMPOS.map(c => (
              <div key={c.key}>
                <label style={labelStyle}>{c.label}</label>
                <textarea
                  value={form[c.key]}
                  onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}
                  placeholder={c.placeholder}
                  style={textareaStyle}
                  maxLength={2000}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSalvar} disabled={salvando} style={{
                flex: 1, padding: "12px", background: salvando ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500,
                cursor: salvando ? "not-allowed" : "pointer"
              }}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar anamnese"}
              </button>
              {editandoId && (
                <button onClick={() => { setForm(vazio()); setEditandoId(null); }} style={btnBase}>Cancelar edição</button>
              )}
            </div>
          </div>
        )}

        {tab === "historico" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={{ ...inputFull, maxWidth: 320 }}>
                <option value="">Todos os alunos</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>

            {loadingHist ? (
              <p style={{ fontSize: 13, color: "#5f5e5a" }}>Carregando...</p>
            ) : historico.length === 0 ? (
              <p style={{ fontSize: 13, color: "#5f5e5a" }}>Nenhuma anamnese registrada ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {historico.map(h => {
                  const aluno = alunos.find(a => a.id === h.student_id);
                  return (
                    <div key={h.id} style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <strong style={{ fontSize: 14 }}>{aluno?.full_name || "Aluno"}</strong>
                          <p style={{ fontSize: 12, color: "#5f5e5a", margin: "2px 0 0" }}>
                            {new Date(h.updated_at || h.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleAbrir(h.id)} style={{ ...btnBase, padding: "4px 10px", fontSize: 11 }}>
                            {aberta === h.id ? "Fechar" : "Ver detalhes"}
                          </button>
                          <button onClick={() => handleEditarItem(h)} style={{ ...btnBase, padding: "4px 10px", fontSize: 11 }}>Editar</button>
                          <button onClick={() => handleExcluir(h.id)} style={{ ...btnBase, padding: "4px 10px", fontSize: 11, color: "#a32d2d", borderColor: "#f7c1c1" }}>Excluir</button>
                        </div>
                      </div>
                      {aberta === h.id && h.data && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #eee", display: "flex", flexDirection: "column", gap: 8 }}>
                          {CAMPOS.filter(c => h.data[c.key]).map(c => (
                            <p key={c.key} style={{ fontSize: 13, margin: 0 }}>
                              <strong>{c.label}:</strong> {h.data[c.key]}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
