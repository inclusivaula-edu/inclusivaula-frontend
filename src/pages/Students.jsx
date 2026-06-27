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
  disability_type: "Nenhuma", guardian_name: "", guardian_phone: "", notes: ""
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
      disability_type: aluno.disability_type || "Nenhuma",
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
        disability_type: form.disability_type === "Nenhuma" ? null : form.disability_type,
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
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#0F6E56", color: "#fff", padding: "10px 24px",
          borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>{feedback}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center"
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
              <div style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome completo *</label>
                <input name="full_name" value={form.full_name} onChange={handleChange}
                  placeholder="Nome do aluno" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
                <label style={labelStyle}>Perfil / Necessidade especial</label>
                <select name="disability_type" value={form.disability_type}
                  onChange={handleChange} style={inputStyle}>
                  {DISABILITIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
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
                <label style={labelStyle}>Observações pedagógicas</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                  placeholder="Informações relevantes para o professor..."
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
            {alunosFiltrados.map(s => (
              <div key={s.id} style={{
                background: "#fff",
                border: "0.5px solid #d3d1c7",
                borderLeft: s.disability_type ? "3px solid #2B9EC3" : "3px solid #d3d1c7",
                borderRadius: 10, padding: "14px 16px",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: 4 }}>{s.full_name}</p>
                  <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                    {s.grade}
                    {s.turma ? ` · Turma ${s.turma}` : ""}
                    {s.disability_type ? ` · ${s.disability_type}` : ""}
                    {s.guardian_name ? ` · Resp: ${s.guardian_name}` : ""}
                  </p>
                  {s.notes && (
                    <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>📝 {s.notes}</p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}