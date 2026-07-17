import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createStudent, getStudents } from "../services/schoolClient";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

const SERIES = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
  "1º EM", "2º EM", "3º EM"
];

const DISABILITIES = [
  "Nenhuma", "TDAH", "Autismo", "Dislexia",
  "Baixa visão", "Deficiência auditiva", "Deficiência intelectual", "Outra"
];

const formVazio = {
  full_name: "", birth_date: "", grade: "1º ano", turma: "",
  endereco: "", endereco_numero: "", endereco_bairro: "", endereco_cidade: "",
  guardian_relationship: "",
  observable_behavior: "", what_helps: "", historico_escolar: "",
  disability_type: "Nenhuma", deficiencia_hipotese: "", sistema_linguistico: "",
  recursos_acessibilidade: "", atividades_adaptacoes: "", implicacoes_curriculares: "",
  guardian_name: "", guardian_phone: "", notes: ""
};

export default function Students() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editandoAluno, setEditandoAluno] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState(formVazio);
  const [filtro, setFiltro] = useState("");
  const [selecionados, setSelecionados] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        const [studentsData, turmasRes] = await Promise.all([
          getStudents(profile.school_id),
          supabase.from("classes").select("id, turma, grade, name").eq("school_id", profile.school_id).order("turma")
        ]);
        setStudents(studentsData || []);
        setTurmas(turmasRes.data || []);
      }
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleNovoAluno() {
    setEditandoAluno(null);
    setForm(formVazio);
    setError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEditar(aluno) {
    setEditandoAluno(aluno);
    setForm({
      full_name: aluno.full_name || "",
      birth_date: aluno.birth_date || "",
      grade: aluno.grade || "1º ano",
      turma: aluno.turma || "",
      endereco: aluno.endereco || "",
      endereco_numero: aluno.endereco_numero || "",
      endereco_bairro: aluno.endereco_bairro || "",
      endereco_cidade: aluno.endereco_cidade || "",
      guardian_relationship: aluno.guardian_relationship || "",
      observable_behavior: aluno.observable_behavior || "",
      what_helps: aluno.what_helps || "",
      historico_escolar: aluno.historico_escolar || "",
      disability_type: aluno.disability_type || "Nenhuma",
      deficiencia_hipotese: aluno.deficiencia_hipotese || "",
      sistema_linguistico: aluno.sistema_linguistico || "",
      recursos_acessibilidade: aluno.recursos_acessibilidade || "",
      atividades_adaptacoes: aluno.atividades_adaptacoes || "",
      implicacoes_curriculares: aluno.implicacoes_curriculares || "",
      guardian_name: aluno.guardian_name || "",
      guardian_phone: aluno.guardian_phone || "",
      notes: aluno.notes || ""
    });
    setError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setError("Informe o nome do aluno."); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        birth_date: form.birth_date || null,
        grade: form.grade,
        turma: form.turma || null,
        endereco: form.endereco?.trim() || null,
        endereco_numero: form.endereco_numero?.trim() || null,
        endereco_bairro: form.endereco_bairro?.trim() || null,
        endereco_cidade: form.endereco_cidade?.trim() || null,
        guardian_relationship: form.guardian_relationship?.trim() || null,
        observable_behavior: form.observable_behavior?.trim() || null,
        what_helps: form.what_helps?.trim() || null,
        historico_escolar: form.historico_escolar?.trim() || null,
        disability_type: form.disability_type === "Nenhuma" ? null : form.disability_type,
        deficiencia_hipotese: form.deficiencia_hipotese?.trim() || null,
        sistema_linguistico: form.sistema_linguistico?.trim() || null,
        recursos_acessibilidade: form.recursos_acessibilidade?.trim() || null,
        atividades_adaptacoes: form.atividades_adaptacoes?.trim() || null,
        implicacoes_curriculares: form.implicacoes_curriculares?.trim() || null,
        guardian_name: form.guardian_name,
        guardian_phone: form.guardian_phone,
        notes: form.notes
      };

      if (editandoAluno) {
        const { data, error: updateError } = await supabase
          .from("students").update(payload).eq("id", editandoAluno.id).select().single();
        if (updateError) throw new Error(updateError.message);
        setStudents(prev => prev.map(s => s.id === editandoAluno.id ? data : s));
        mostrarFeedback("✅ Aluno atualizado com sucesso!");
      } else {
        const newStudent = await createStudent({ school_id: schoolId, ...payload });
        setStudents(prev => [newStudent, ...prev]);
        mostrarFeedback("✅ Aluno cadastrado com sucesso!");
      }
      setForm(formVazio);
      setEditandoAluno(null);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function mostrarFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleExcluirAluno(aluno) {
    if (!window.confirm(`Excluir o aluno "${aluno.full_name}"? Esta ação não pode ser desfeita.`)) return;
    const { error: delError } = await supabase.from("students").delete().eq("id", aluno.id);
    if (delError) {
      if (delError.code === "23503" || /foreign key|violates/i.test(delError.message)) {
        mostrarFeedback("⚠️ Este aluno possui registros vinculados (aulas, documentos, avaliações ou frequência) e não pode ser excluído.");
      } else {
        mostrarFeedback("⚠️ Erro ao excluir o aluno.");
      }
      return;
    }
    setStudents(prev => prev.filter(s => s.id !== aluno.id));
    mostrarFeedback("✅ Aluno excluído.");
  }

  function handleExportarCSV() {
    const colunas = [
      ["Nome", "full_name"], ["Nascimento", "birth_date"], ["Série", "grade"], ["Turma", "turma"],
      ["Endereço", "endereco"], ["Número", "endereco_numero"], ["Bairro", "endereco_bairro"], ["Cidade", "endereco_cidade"],
      ["NEE", "disability_type"], ["Deficiência/hipótese (4.1)", "deficiencia_hipotese"],
      ["Sistema linguístico (4.2)", "sistema_linguistico"], ["Recursos utilizados (4.3)", "recursos_acessibilidade"],
      ["Adaptações pretendidas (4.4)", "atividades_adaptacoes"], ["Implicações curriculares (4.5)", "implicacoes_curriculares"],
      ["Dados educacionais específicos", "observable_behavior"], ["Metodologia utilizada", "what_helps"],
      ["Histórico escolar", "historico_escolar"],
      ["Responsável", "guardian_name"], ["Parentesco", "guardian_relationship"], ["Telefone", "guardian_phone"],
      ["Observações (4.6)", "notes"]
    ];
    const esc = v => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    // Data de nascimento em formato brasileiro (o banco guarda AAAA-MM-DD)
    const valor = (a, campo) => {
      const v = a[campo];
      if (campo === "birth_date" && v && /^\d{4}-\d{2}-\d{2}/.test(String(v))) {
        const [ano, mes, dia] = String(v).substring(0, 10).split("-");
        return `${dia}/${mes}/${ano}`;
      }
      return v;
    };
    // Exporta só os selecionados; sem seleção, exporta todos os visíveis no filtro
    const base = selecionados.length > 0
      ? alunosFiltrados.filter(a => selecionados.includes(a.id))
      : alunosFiltrados;
    const csv = "﻿" + colunas.map(c => esc(c[0])).join(";") + "\n" +
      base.map(a => colunas.map(c => esc(valor(a, c[1]))).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `alunos-inclusivaula-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const alunosFiltrados = students.filter(s => {
    if (!filtro.trim()) return true;
    const t = filtro.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(t) ||
      s.turma?.toLowerCase().includes(t) ||
      s.grade?.toLowerCase().includes(t) ||
      s.disability_type?.toLowerCase().includes(t)
    );
  });

  const inputStyle = { width: "100%", boxSizing: "border-box" };
  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#0F6E56", color: "#fff", padding: "10px 24px",
          borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>{feedback}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "10px 16px", display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 8
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
        <button onClick={handleNovoAluno} style={{
          background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "8px 16px", fontSize: 13, cursor: "pointer"
        }}>+ Novo aluno</button>
        <button onClick={() => navigate("/alunos/importar")} style={{
          background: "#fff", color: "#2B9EC3", border: "1px solid #2B9EC3",
          borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", marginLeft: 8
        }}>📥 Importar planilha</button>
        <button onClick={handleExportarCSV} style={{
          background: "#fff", color: "#0F6E56", border: "1px solid #0F6E56",
          borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", marginLeft: 8
        }}>⬇️ Exportar{selecionados.length > 0 ? ` (${selecionados.length})` : " dados"}</button>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Alunos</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          {students.length} aluno{students.length !== 1 ? "s" : ""} cadastrado{students.length !== 1 ? "s" : ""}
        </p>

        {/* Formulário */}
        {showForm && (
          <div style={{
            background: "#fff",
            border: `0.5px solid ${editandoAluno ? "#BA7517" : "#2B9EC3"}`,
            borderRadius: 12, padding: "1.5rem", marginBottom: 24,
            boxShadow: "0 2px 8px rgba(43,158,195,0.08)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 20, color: editandoAluno ? "#BA7517" : "#2B9EC3" }}>
              {editandoAluno ? `✏️ Editando: ${editandoAluno.full_name}` : "Novo aluno"}
            </h3>

            {error && (
              <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome completo *</label>
                <input name="full_name" value={form.full_name} onChange={handleChange}
                  placeholder="Nome do aluno" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Data de nascimento</label>
                  <input name="birth_date" type="date" value={form.birth_date}
                    onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Série</label>
                  <select name="grade" value={form.grade} onChange={handleChange} style={inputStyle}>
                    {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Turma</label>
                  {turmas.length > 0 ? (
                    <select
                      value={turmas.some(t => t.turma === form.turma) ? form.turma : (form.turma ? "__outra__" : "")}
                      onChange={e => {
                        if (e.target.value === "__outra__") setForm(prev => ({ ...prev, turma: "" }));
                        else setForm(prev => ({ ...prev, turma: e.target.value }));
                      }}
                      style={inputStyle}
                    >
                      <option value="">— Selecione —</option>
                      {turmas.map(t => (
                        <option key={t.id} value={t.turma}>
                          {t.turma}{t.grade ? ` · ${t.grade}` : ""}
                        </option>
                      ))}
                      <option value="__outra__">Outra (digitar)</option>
                    </select>
                  ) : null}
                  {(turmas.length === 0 || !turmas.some(t => t.turma === form.turma)) && (
                    <input name="turma" value={form.turma} onChange={handleChange}
                      placeholder="Ex: A, B, 7ºA..."
                      style={{ ...inputStyle, marginTop: turmas.length > 0 ? 6 : 0 }} />
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Dados educacionais específicos do estudante{" "}
                  <span style={{ color: "#2B9EC3", fontWeight: 600 }}>★ Campo mais importante</span>
                </label>
                <textarea name="observable_behavior" value={form.observable_behavior}
                  onChange={handleChange} rows={3} maxLength={500}
                  placeholder="Ex: Em atividade em grupo, ele se isola e cobre os ouvidos quando tem barulho. Não consegue manter foco por mais de 5 minutos em tarefa escrita."
                  style={{ ...inputStyle, resize: "vertical", fontSize: 13 }} />
                <span style={{ fontSize: 11, color: "#999" }}>{form.observable_behavior.length}/500</span>
              </div>

              <div>
                <label style={labelStyle}>Tipo de metodologia educacional utilizada com esse aluno</label>
                <textarea name="what_helps" value={form.what_helps}
                  onChange={handleChange} rows={2} maxLength={500}
                  placeholder="Ex: Responde melhor quando recebe instrução individual antes da atividade coletiva. Gosta de desenhar para registrar o que aprendeu."
                  style={{ ...inputStyle, resize: "vertical", fontSize: 13 }} />
                <span style={{ fontSize: 11, color: "#999" }}>{form.what_helps.length}/500</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Endereço (rua/logradouro)</label>
                  <input name="endereco" value={form.endereco} onChange={handleChange}
                    placeholder="Rua das Flores" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Número</label>
                  <input name="endereco_numero" value={form.endereco_numero} onChange={handleChange}
                    placeholder="123" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Bairro</label>
                  <input name="endereco_bairro" value={form.endereco_bairro} onChange={handleChange}
                    placeholder="Centro" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input name="endereco_cidade" value={form.endereco_cidade} onChange={handleChange}
                    placeholder="Macapá" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Histórico escolar — comum e antecedentes relevantes</label>
                <textarea name="historico_escolar" value={form.historico_escolar}
                  onChange={handleChange} rows={3} maxLength={1000}
                  placeholder="Ex: Estudou na E.M. X até o 3º ano; reprovou o 4º ano; acompanhamento fonoaudiológico desde 2024; mudança de escola por transferência da família..."
                  style={{ ...inputStyle, resize: "vertical", fontSize: 13 }} />
              </div>

              {/* 4. Necessidades Educacionais Especiais do(a) Estudante */}
              <div style={{ border: "1px solid #534AB7", borderRadius: 10, padding: "14px 16px", background: "#f8f7ff" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#534AB7", margin: "0 0 12px" }}>
                  ♿ Necessidades Educacionais Especiais do(a) Estudante
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Perfil / Necessidade especial <span style={{ color: "#999", fontWeight: 400 }}>(opcional)</span></label>
                    <select name="disability_type" value={form.disability_type}
                      onChange={handleChange} style={inputStyle}>
                      {DISABILITIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>4.1 Deficiência(s) ou hipótese específica apresentada</label>
                    <input name="deficiencia_hipotese" value={form.deficiencia_hipotese} onChange={handleChange}
                      placeholder="Ex: Transtorno do Espectro Autista (TEA) — CID-10: F84" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>4.2 Sistema linguístico utilizado na comunicação</label>
                    <input name="sistema_linguistico" value={form.sistema_linguistico} onChange={handleChange}
                      placeholder="Ex: Língua portuguesa (oral e escrita), Libras, comunicação alternativa..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>4.3 Recursos de acessibilidade ou equipamentos já utilizados</label>
                    <textarea name="recursos_acessibilidade" value={form.recursos_acessibilidade}
                      onChange={handleChange} rows={2} maxLength={500}
                      placeholder="Ex: Tablet, computador e jogos digitais de concentração e sequência lógica."
                      style={{ ...inputStyle, resize: "vertical", fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>4.4 Atividades/adaptações que pretende desenvolver e recursos a providenciar</label>
                    <textarea name="atividades_adaptacoes" value={form.atividades_adaptacoes}
                      onChange={handleChange} rows={2} maxLength={500}
                      placeholder="Ex: Atividades e avaliações adaptadas, notebook, curso de informática, tablet."
                      style={{ ...inputStyle, resize: "vertical", fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>4.5 Implicações da NEE para a acessibilidade curricular</label>
                    <textarea name="implicacoes_curriculares" value={form.implicacoes_curriculares}
                      onChange={handleChange} rows={3} maxLength={1000}
                      placeholder="Ex: Currículo flexibilizado, conteúdos claros e concretos com recursos visuais, tempo adequado ao ritmo do aluno, inclusão nas programações da escola..."
                      style={{ ...inputStyle, resize: "vertical", fontSize: 13 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nome do responsável</label>
                  <input name="guardian_name" value={form.guardian_name}
                    onChange={handleChange} placeholder="Nome" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Telefone do responsável</label>
                  <input name="guardian_phone" value={form.guardian_phone}
                    onChange={handleChange} placeholder="(96) 99999-9999" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Grau de parentesco do responsável</label>
                <select name="guardian_relationship" value={form.guardian_relationship}
                  onChange={handleChange} style={inputStyle}>
                  <option value="">— Selecione —</option>
                  {["Mãe", "Pai", "Avó", "Avô", "Tia", "Tio", "Irmã", "Irmão", "Madrasta", "Padrasto", "Tutor(a) legal", "Outro"].map(g =>
                    <option key={g} value={g}>{g}</option>
                  )}
                </select>
              </div>

              <div>
                <label style={labelStyle}>4.6 Outras informações relevantes / observações pedagógicas</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                  placeholder="Ex: Realiza atividades sozinho em sala regular; dificuldade em apresentar trabalhos; alterações de humor quando não compreendido..."
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => { setShowForm(false); setEditandoAluno(null); setError(null); }}
                  style={{ flex: 1, padding: "10px", fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 2, padding: "10px",
                  background: saving ? "#ccc" : editandoAluno
                    ? "linear-gradient(135deg, #BA7517, #d4961e)"
                    : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer"
                }}>
                  {saving ? "Salvando..." : editandoAluno ? "💾 Salvar alterações" : "Salvar aluno"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Busca */}
        {students.length > 0 && (
          <input value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar por nome, turma, série ou perfil..."
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 16, fontSize: 13 }} />
        )}

        {/* Lista */}
        {loading ? (
          <p style={{ color: "#5f5e5a", fontSize: 14 }}>Carregando...</p>
        ) : students.length === 0 ? (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍🎓</div>
            <p style={{ fontSize: 15, color: "#5f5e5a" }}>Nenhum aluno cadastrado ainda.</p>
            <button onClick={handleNovoAluno} style={{ marginTop: 16, padding: "8px 20px" }}>
              Cadastrar primeiro aluno
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Barra de seleção para exportar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#5f5e5a", padding: "0 4px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox"
                  checked={alunosFiltrados.length > 0 && selecionados.length === alunosFiltrados.length}
                  onChange={e => setSelecionados(e.target.checked ? alunosFiltrados.map(a => a.id) : [])}
                  style={{ accentColor: "#0F6E56" }} />
                Selecionar todos
              </label>
              {selecionados.length > 0 && (
                <span style={{ color: "#0F6E56", fontWeight: 600 }}>
                  {selecionados.length} selecionado(s) — a exportação usará apenas estes
                </span>
              )}
            </div>
            {alunosFiltrados.map(s => (
              <div key={s.id} style={{
                background: selecionados.includes(s.id) ? "#f2fbf7" : "#fff",
                border: "0.5px solid #d3d1c7",
                borderLeft: s.disability_type ? "3px solid #2B9EC3" : "3px solid #d3d1c7",
                borderRadius: 10, padding: "14px 16px",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10
              }}>
                <input type="checkbox"
                  checked={selecionados.includes(s.id)}
                  onChange={e => setSelecionados(prev =>
                    e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                  )}
                  aria-label={`Selecionar ${s.full_name}`}
                  style={{ accentColor: "#0F6E56", width: 16, height: 16, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: 4 }}>{s.full_name}</p>
                  <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                    {s.grade}
                    {s.turma ? ` · Turma ${s.turma}` : ""}
                    {s.disability_type ? ` · ${s.disability_type}` : ""}
                    {s.guardian_name ? ` · Resp: ${s.guardian_name}` : ""}
                  </p>
                  {s.observable_behavior && (
                    <p style={{ fontSize: 12, color: "#1a6e8a", margin: "4px 0 0" }}>👁 {s.observable_behavior.length > 80 ? s.observable_behavior.slice(0, 80) + "…" : s.observable_behavior}</p>
                  )}
                  {s.notes && !s.observable_behavior && (
                    <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>📝 {s.notes}</p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <div style={{
                    fontSize: 11, padding: "4px 10px",
                    background: s.disability_type ? "#e8f7fd" : "#f1efe8",
                    color: s.disability_type ? "#1a6e8a" : "#5f5e5a", borderRadius: 20
                  }}>
                    {s.disability_type || "Sem NEE"}
                  </div>
                  <button onClick={() => handleEditar(s)} style={{
                    fontSize: 12, padding: "4px 12px", background: "#fff",
                    color: "#BA7517", border: "0.5px solid #BA7517",
                    borderRadius: 6, cursor: "pointer"
                  }}>✏️ Editar</button>
                  <button onClick={() => navigate(`/alunos/${s.id}/documentos`)} style={{
                    fontSize: 12, padding: "4px 12px", background: "#fff",
                    color: "#534AB7", border: "0.5px solid #534AB7",
                    borderRadius: 6, cursor: "pointer"
                  }}>📎 Documentos</button>
                  <button onClick={() => handleExcluirAluno(s)} style={{
                    fontSize: 12, padding: "4px 12px", background: "#fff",
                    color: "#a32d2d", border: "0.5px solid #f7c1c1",
                    borderRadius: 6, cursor: "pointer"
                  }}>🗑 Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}