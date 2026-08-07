import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createAnamnese, listAnamneses, getAnamnese, updateAnamnese, deleteAnamnese, getAnamnesePDFBlob } from "../services/mapiClient";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

// Estrutura fiel à Ficha de Anamnese – AEE (Resolução Nº 048/2025-CP/CEE-AP)

const ATITUDES_SOCIAIS = ["Obediente", "Agressivo", "Independente", "Cooperador", "Comunicativo", "Agitado"];
const CARACTERISTICAS_SONO = ["Tranquilo", "Agitado", "Range dentes", "Enurese", "Terror noturno", "Sonambulismo", "Fala dormindo"];
const DOENCAS = [
  "Febre alta", "Rubéola", "Complicação com vacinas", "Acidentes", "Bronquite", "Sarampo",
  "Coqueluche", "Adenoide", "Asma", "Convulsões", "Meningite", "Desidratação grave",
  "Caxumba", "Otite", "Alergias", "Catapora"
];

// Campos da primeira versão do formulário. Anamneses salvas antes da
// reformulação para o modelo oficial ainda usam estes nomes — mantemos a
// exibição para que esses registros não pareçam vazios.
const CAMPOS_LEGADOS = [
  ["gestacao_parto", "Gestação e parto"],
  ["desenvolvimento_motor", "Desenvolvimento motor"],
  ["desenvolvimento_linguagem", "Desenvolvimento da linguagem"],
  ["historico_saude", "Histórico de saúde"],
  ["historico_familiar", "Histórico familiar"],
  ["diagnostico_laudo", "Diagnóstico / laudo"],
  ["medicacoes_em_uso", "Medicações em uso"],
  ["rotina_sono_alimentacao", "Rotina de sono e alimentação"],
  ["comportamento_observado", "Comportamento observado pela família"],
  ["observacoes_escolares", "Observações escolares"]
];

const vazio = () => ({
  // 1 — Identificação (complementa o que já está no cadastro do aluno)
  turma: "", naturalidade: "", nacionalidade: "Brasileira", telefone_estudante: "", email: "",

  // 2 — Motivo do atendimento / queixa principal / laudo
  queixa_principal: "", laudo: "", diagnostico: "",
  dificuldades_aprendizagem: "", dificuldades_interacao: "",
  usa_medicacao: "", qual_medicacao: "",

  // 3 — Dados familiares
  nome_pai: "", nome_mae: "", responsavel: "", pais_situacao: "",
  irmaos: [],
  composicao_familiar: [],

  // 4 — Histórico da escolaridade
  inicio_escolarizacao: "", apoio_pedagogico_casa: "", apoio_pedagogico_quem: "",
  avaliado_por_profissional: "", acompanhamento_profissional: "", acompanhamento_qual: "",

  // 9 — Atitudes sociais predominantes
  atitudes_sociais: [],

  // 10 — Sono
  onde_dorme: "", quarto_tipo: "", compartilha_com: "", dorme_com_pais: "",
  hora_dormir: "", hora_acordar: "", caracteristicas_sono: [],

  // 11 — Reação quando contrariado
  reacao_contrariado: "",

  // 12 — Saúde
  acompanhamento_medico_psicologico: "", acompanhamento_qual_profissional: "",
  usa_medicacao_controlada: "",

  // 13 — Doenças
  doencas: [], doenca_outra: "",

  // Condições do nascimento
  tipo_parto: "", tipo_parto_outro_local: "", trauma_craniano: "", tipo_anestesia: "",
  altura_nascimento: "", peso_nascimento: "", duracao_parto: "",
  primeiras_reacoes: "", chorou_logo: "", chorou_logo_tempo: "",
  precisou_oxigenio: "", precisou_oxigenio_tempo: "",
  reacao_primeiro_dia: "", ficou_ictérico: "", ictérico_tipo: "",

  outras_observacoes: ""
});

const SIM_NAO = ["", "Sim", "Não"];
const SIM_NAO_INVEST = ["", "Sim", "Não", "Em investigação"];

function toggleArrayItem(arr, item) {
  return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
}

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
  const [baixandoPDF, setBaixandoPDF] = useState(null);

  useEffect(() => {
    async function carregar() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, grade, turma, birth_date, endereco, endereco_numero, endereco_bairro, endereco_cidade, guardian_name, guardian_phone, guardian_relationship, disability_type")
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

  async function handleBaixarPDF(item) {
    setBaixandoPDF(item.id);
    try {
      const { blob, filename } = await getAnamnesePDFBlob(item.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      mostrarFeedback("Erro ao gerar PDF.", "erro");
    } finally {
      setBaixandoPDF(null);
    }
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

  const alunoSelecionado = alunos.find(a => a.id === alunoId);

  // ── estilos ────────────────────────────────────────────────
  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };
  const inputFull = { width: "100%", boxSizing: "border-box" };
  const textareaStyle = { ...inputFull, minHeight: 60, resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: 10 };
  const btnBase = { padding: "8px 16px", borderRadius: 8, border: "0.5px solid #d3d1c7", fontSize: 13, fontWeight: 500, cursor: "pointer" };
  const sectionCard = { background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.3rem", display: "flex", flexDirection: "column", gap: 14 };
  const sectionTitle = { fontSize: 14, fontWeight: 600, color: "#2B9EC3", margin: 0, paddingBottom: 8, borderBottom: "1px solid #eee" };
  const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const row3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

  function Campo({ label, children }) {
    return <div><label style={labelStyle}>{label}</label>{children}</div>;
  }

  function Texto({ campo, placeholder, maxLength = 500 }) {
    return (
      <input value={form[campo]} maxLength={maxLength} placeholder={placeholder}
        onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))} style={inputFull} />
    );
  }

  function Select({ campo, opcoes }) {
    return (
      <select value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))} style={inputFull}>
        {opcoes.map(o => <option key={o} value={o}>{o || "Selecione"}</option>)}
      </select>
    );
  }

  function CheckboxGroup({ campo, opcoes }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {opcoes.map(op => {
          const marcado = form[campo].includes(op);
          return (
            <label key={op} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 10px",
              borderRadius: 20, border: `1px solid ${marcado ? "#2B9EC3" : "#d3d1c7"}`,
              background: marcado ? "#eaf6fa" : "#fff", cursor: "pointer", color: marcado ? "#1a6e8a" : "#5f5e5a"
            }}>
              <input type="checkbox" checked={marcado} style={{ width: 14, height: 14 }}
                onChange={() => setForm(p => ({ ...p, [campo]: toggleArrayItem(p[campo], op) }))} />
              {op}
            </label>
          );
        })}
      </div>
    );
  }

  function ListaPessoas({ campo, campos }) {
    const itens = form[campo];
    function atualizar(i, chave, valor) {
      const novos = [...itens];
      novos[i] = { ...novos[i], [chave]: valor };
      setForm(p => ({ ...p, [campo]: novos }));
    }
    function remover(i) {
      setForm(p => ({ ...p, [campo]: itens.filter((_, idx) => idx !== i) }));
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {itens.map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${campos.length}, 1fr) auto`, gap: 8, alignItems: "center" }}>
            {campos.map(c => (
              c.tipo === "select" ? (
                <select key={c.key} value={item[c.key] || ""} onChange={e => atualizar(i, c.key, e.target.value)} style={{ fontSize: 13 }}>
                  <option value="">{c.label}</option>
                  {c.opcoes.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input key={c.key} value={item[c.key] || ""} placeholder={c.label}
                  onChange={e => atualizar(i, c.key, e.target.value)} style={{ fontSize: 13 }} />
              )
            ))}
            <button onClick={() => remover(i)} style={{ ...btnBase, padding: "4px 10px", fontSize: 11, color: "#a32d2d", borderColor: "#f7c1c1" }}>Remover</button>
          </div>
        ))}
        <button onClick={() => setForm(p => ({ ...p, [campo]: [...itens, {}] }))}
          style={{ ...btnBase, alignSelf: "flex-start", fontSize: 12 }}>+ Adicionar</button>
      </div>
    );
  }

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

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>🩺 Ficha de Anamnese — AEE</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Coleta de dados com pais e responsáveis, base para o trabalho da equipe de AEE (modelo CEE-AP)
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div style={sectionCard}>
              <p style={sectionTitle}>1. Identificação do estudante</p>
              <Campo label="Aluno">
                <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={inputFull} disabled={!!editandoId}>
                  <option value="">Selecione o aluno</option>
                  {alunos.map(a => <option key={a.id} value={a.id}>{a.full_name}{a.grade ? ` — ${a.grade}` : ""}</option>)}
                </select>
              </Campo>
              {alunoSelecionado && (
                <div style={{ fontSize: 12, color: "#5f5e5a", background: "#f5f9ff", borderRadius: 8, padding: "8px 12px" }}>
                  Nascimento: {alunoSelecionado.birth_date ? new Date(alunoSelecionado.birth_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"} ·
                  {" "}Turma: {alunoSelecionado.turma || "—"} ·
                  {" "}Endereço: {alunoSelecionado.endereco || "—"}{alunoSelecionado.endereco_numero ? `, ${alunoSelecionado.endereco_numero}` : ""}{alunoSelecionado.endereco_bairro ? ` — ${alunoSelecionado.endereco_bairro}` : ""} ·
                  {" "}Responsável: {alunoSelecionado.guardian_name || "—"} ({alunoSelecionado.guardian_relationship || "—"}) · {alunoSelecionado.guardian_phone || "—"}
                  <br />Esses dados vêm do cadastro do aluno — para corrigi-los, use a página Alunos.
                </div>
              )}
              <div style={row3}>
                <Campo label="Turma (se diferente do cadastro)"><Texto campo="turma" /></Campo>
                <Campo label="Naturalidade"><Texto campo="naturalidade" /></Campo>
                <Campo label="Nacionalidade"><Texto campo="nacionalidade" /></Campo>
              </div>
              <div style={row2}>
                <Campo label="Telefone do estudante"><Texto campo="telefone_estudante" /></Campo>
                <Campo label="E-mail"><Texto campo="email" /></Campo>
              </div>
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>2. Motivo do atendimento / queixa principal / laudo</p>
              <Campo label="Queixa principal"><textarea style={textareaStyle} value={form.queixa_principal}
                onChange={e => setForm(p => ({ ...p, queixa_principal: e.target.value }))} maxLength={500} /></Campo>
              <div style={row2}>
                <Campo label="Laudo"><Select campo="laudo" opcoes={SIM_NAO_INVEST} /></Campo>
                <Campo label="Faz uso de medicação?"><Select campo="usa_medicacao" opcoes={SIM_NAO} /></Campo>
              </div>
              {form.usa_medicacao === "Sim" && (
                <Campo label="Qual medicação?"><Texto campo="qual_medicacao" /></Campo>
              )}
              <Campo label="Diagnóstico"><Texto campo="diagnostico" /></Campo>
              <div style={row2}>
                <Campo label="Dificuldades de aprendizagem"><Texto campo="dificuldades_aprendizagem" /></Campo>
                <Campo label="Dificuldades de interação"><Texto campo="dificuldades_interacao" /></Campo>
              </div>
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>3. Dados familiares</p>
              <div style={row2}>
                <Campo label="Nome do pai"><Texto campo="nome_pai" /></Campo>
                <Campo label="Nome da mãe"><Texto campo="nome_mae" /></Campo>
              </div>
              <div style={row2}>
                <Campo label="Responsável pelo estudante"><Texto campo="responsavel" /></Campo>
                <Campo label="Situação dos pais"><Select campo="pais_situacao" opcoes={["", "Casados", "Separados"]} /></Campo>
              </div>
              <Campo label="Irmãos">
                <ListaPessoas campo="irmaos" campos={[
                  { key: "nome", label: "Nome" },
                  { key: "genero", label: "Gênero", tipo: "select", opcoes: ["Masculino", "Feminino"] },
                  { key: "idade", label: "Idade" }
                ]} />
              </Campo>
              <Campo label="Composição familiar (quem mora com o estudante)">
                <ListaPessoas campo="composicao_familiar" campos={[
                  { key: "nome", label: "Nome" },
                  { key: "parentesco", label: "Parentesco" },
                  { key: "idade", label: "Idade" }
                ]} />
              </Campo>
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>4. Histórico da escolaridade</p>
              <Campo label="Início da escolarização (idade)"><Texto campo="inicio_escolarizacao" placeholder="Ex: 4 anos" /></Campo>
              <div style={row2}>
                <Campo label="Recebe apoio pedagógico em casa?"><Select campo="apoio_pedagogico_casa" opcoes={SIM_NAO} /></Campo>
                {form.apoio_pedagogico_casa === "Sim" && (
                  <Campo label="De quem?"><Texto campo="apoio_pedagogico_quem" /></Campo>
                )}
              </div>
              <div style={row2}>
                <Campo label="Já foi avaliado por algum profissional?"><Select campo="avaliado_por_profissional" opcoes={SIM_NAO} /></Campo>
                <Campo label="Ainda faz acompanhamento específico?"><Select campo="acompanhamento_profissional" opcoes={SIM_NAO} /></Campo>
              </div>
              {form.acompanhamento_profissional === "Sim" && (
                <Campo label="Qual profissional?"><Texto campo="acompanhamento_qual" /></Campo>
              )}
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>9. Atitudes sociais predominantes</p>
              <CheckboxGroup campo="atitudes_sociais" opcoes={ATITUDES_SOCIAIS} />
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>10. Sono</p>
              <div style={row3}>
                <Campo label="Onde o estudante dorme"><Texto campo="onde_dorme" placeholder="Ex: cama" /></Campo>
                <Campo label="Quarto"><Select campo="quarto_tipo" opcoes={["", "Exclusivo", "Compartilhado"]} /></Campo>
                {form.quarto_tipo === "Compartilhado" && (
                  <Campo label="Com quem?"><Texto campo="compartilha_com" /></Campo>
                )}
              </div>
              <div style={row3}>
                <Campo label="Tem costume de dormir com os pais?"><Select campo="dorme_com_pais" opcoes={SIM_NAO} /></Campo>
                <Campo label="Que horas dorme?"><Texto campo="hora_dormir" placeholder="Ex: 22h" /></Campo>
                <Campo label="Que horas acorda?"><Texto campo="hora_acordar" placeholder="Ex: 6h" /></Campo>
              </div>
              <Campo label="Características do sono">
                <CheckboxGroup campo="caracteristicas_sono" opcoes={CARACTERISTICAS_SONO} />
              </Campo>
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>11. Reação quando contrariado(a)</p>
              <textarea style={textareaStyle} value={form.reacao_contrariado}
                onChange={e => setForm(p => ({ ...p, reacao_contrariado: e.target.value }))} maxLength={500} />
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>12. Saúde</p>
              <div style={row2}>
                <Campo label="Faz acompanhamento médico/psicológico?"><Select campo="acompanhamento_medico_psicologico" opcoes={SIM_NAO} /></Campo>
                <Campo label="Faz uso de medicação controlada?"><Select campo="usa_medicacao_controlada" opcoes={SIM_NAO} /></Campo>
              </div>
              {form.acompanhamento_medico_psicologico === "Sim" && (
                <Campo label="Qual profissional (ex: psiquiatra)?"><Texto campo="acompanhamento_qual_profissional" /></Campo>
              )}
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>13. Doenças</p>
              <CheckboxGroup campo="doencas" opcoes={DOENCAS} />
              <Campo label="Outra doença"><Texto campo="doenca_outra" /></Campo>
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>Condições do nascimento</p>
              <div style={row2}>
                <Campo label="Tipo de parto"><Select campo="tipo_parto" opcoes={["", "Normal", "Fórceps", "Cesariana", "Outro local"]} /></Campo>
                {form.tipo_parto === "Outro local" && (
                  <Campo label="Qual local?"><Texto campo="tipo_parto_outro_local" /></Campo>
                )}
              </div>
              <div style={row3}>
                <Campo label="Houve trauma craniano?"><Select campo="trauma_craniano" opcoes={SIM_NAO} /></Campo>
                <Campo label="Tipo de anestesia"><Texto campo="tipo_anestesia" /></Campo>
                <Campo label="Duração do parto"><Texto campo="duracao_parto" /></Campo>
              </div>
              <div style={row2}>
                <Campo label="Altura ao nascer"><Texto campo="altura_nascimento" /></Campo>
                <Campo label="Peso ao nascer"><Texto campo="peso_nascimento" /></Campo>
              </div>
              <Campo label="Primeiras reações"><Texto campo="primeiras_reacoes" /></Campo>
              <div style={row2}>
                <Campo label="Chorou logo?"><Select campo="chorou_logo" opcoes={SIM_NAO} /></Campo>
                {form.chorou_logo === "Sim" && (
                  <Campo label="Quanto tempo?"><Texto campo="chorou_logo_tempo" /></Campo>
                )}
              </div>
              <div style={row2}>
                <Campo label="Precisou de oxigênio?"><Select campo="precisou_oxigenio" opcoes={SIM_NAO} /></Campo>
                {form.precisou_oxigenio === "Sim" && (
                  <Campo label="Quanto tempo?"><Texto campo="precisou_oxigenio_tempo" /></Campo>
                )}
              </div>
              <Campo label="Reação ao primeiro dia de vida"><Texto campo="reacao_primeiro_dia" /></Campo>
              <div style={row2}>
                <Campo label="Ficou ictérico?"><Select campo="ficou_ictérico" opcoes={SIM_NAO} /></Campo>
                {form.ficou_ictérico === "Sim" && (
                  <Campo label="Tipo (amarelo/esverdeado)"><Texto campo="ictérico_tipo" /></Campo>
                )}
              </div>
            </div>

            <div style={sectionCard}>
              <p style={sectionTitle}>Outras observações</p>
              <textarea style={textareaStyle} value={form.outras_observacoes}
                onChange={e => setForm(p => ({ ...p, outras_observacoes: e.target.value }))} maxLength={1000} />
            </div>

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
                          <button onClick={() => handleBaixarPDF(h)} disabled={baixandoPDF === h.id}
                            style={{ ...btnBase, padding: "4px 10px", fontSize: 11, color: "#0F6E56", borderColor: "#9fd8c4" }}>
                            {baixandoPDF === h.id ? "Gerando..." : "📄 PDF"}
                          </button>
                          <button onClick={() => handleEditarItem(h)} style={{ ...btnBase, padding: "4px 10px", fontSize: 11 }}>Editar</button>
                          <button onClick={() => handleExcluir(h.id)} style={{ ...btnBase, padding: "4px 10px", fontSize: 11, color: "#a32d2d", borderColor: "#f7c1c1" }}>Excluir</button>
                        </div>
                      </div>
                      {aberta === h.id && h.data && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #eee", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                          {h.data.queixa_principal && <p style={{ margin: 0 }}><strong>Queixa principal:</strong> {h.data.queixa_principal}</p>}
                          {h.data.laudo && <p style={{ margin: 0 }}><strong>Laudo:</strong> {h.data.laudo}</p>}
                          {h.data.diagnostico && <p style={{ margin: 0 }}><strong>Diagnóstico:</strong> {h.data.diagnostico}</p>}
                          {h.data.atitudes_sociais?.length > 0 && <p style={{ margin: 0 }}><strong>Atitudes sociais:</strong> {h.data.atitudes_sociais.join(", ")}</p>}
                          {h.data.caracteristicas_sono?.length > 0 && <p style={{ margin: 0 }}><strong>Sono:</strong> {h.data.caracteristicas_sono.join(", ")}</p>}
                          {h.data.doencas?.length > 0 && <p style={{ margin: 0 }}><strong>Doenças:</strong> {h.data.doencas.join(", ")}</p>}
                          {h.data.reacao_contrariado && <p style={{ margin: 0 }}><strong>Reação quando contrariado:</strong> {h.data.reacao_contrariado}</p>}
                          {h.data.outras_observacoes && <p style={{ margin: 0 }}><strong>Observações:</strong> {h.data.outras_observacoes}</p>}
                          {CAMPOS_LEGADOS.filter(([campo]) => h.data[campo]).map(([campo, rotulo]) => (
                            <p key={campo} style={{ margin: 0 }}><strong>{rotulo}:</strong> {h.data[campo]}</p>
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
