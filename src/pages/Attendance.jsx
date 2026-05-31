import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

export default function Attendance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [presencas, setPresencas] = useState({});
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [aba, setAba] = useState("registrar");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        const { data: alunosData } = await supabase
          .from("students").select("id, full_name, grade, disability_type")
          .eq("school_id", profile.school_id).order("full_name");
        setAlunos(alunosData || []);

        const { data: histData } = await supabase
          .from("attendance").select("*")
          .eq("school_id", profile.school_id)
          .order("date", { ascending: false }).limit(100);
        setHistorico(histData || []);
      }
      setLoading(false);
    }
    if (user) carregar();
  }, [user]);

  function togglePresenca(alunoId, presente) {
    setPresencas(prev => ({ ...prev, [alunoId]: presente }));
  }

  async function handleSalvar() {
    if (Object.keys(presencas).length === 0) {
      mostrarFeedback("Registre pelo menos uma presença ou falta.", "erro"); return;
    }
    setSalvando(true);
    try {
      const registros = Object.entries(presencas).map(([student_id, present]) => ({
        student_id, school_id: schoolId, date: data, present
      }));
      const { error } = await supabase.from("attendance").upsert(registros, {
        onConflict: "student_id,date"
      });
      if (error) throw new Error(error.message);

      const { data: histData } = await supabase
        .from("attendance").select("*").eq("school_id", schoolId)
        .order("date", { ascending: false }).limit(100);
      setHistorico(histData || []);
      setPresencas({});
      mostrarFeedback("✅ Frequência registrada com sucesso!");
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  function calcularFrequencia(alunoId) {
    const registros = historico.filter(h => h.student_id === alunoId);
    if (registros.length === 0) return null;
    const presentes = registros.filter(h => h.present).length;
    return { presentes, total: registros.length, pct: Math.round((presentes / registros.length) * 100) };
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  const diasUnicos = [...new Set(historico.map(h => h.date))].sort().reverse().slice(0, 10);
  const nomesAlunos = Object.fromEntries(alunos.map(a => [a.id, a.full_name]));

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center"
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
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Frequência e faltas</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Registre a presença dos alunos por data
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["registrar", "historico", "resumo"].map(tab => (
            <button key={tab} onClick={() => setAba(tab)} style={{
              padding: "8px 16px", fontSize: 13, borderRadius: 8,
              background: aba === tab ? "linear-gradient(135deg, #2B9EC3, #4CAF82)" : "#fff",
              color: aba === tab ? "#fff" : "#5f5e5a",
              border: `0.5px solid ${aba === tab ? "transparent" : "#d3d1c7"}`,
              cursor: "pointer"
            }}>
              {tab === "registrar" ? "📋 Registrar" : tab === "historico" ? "📅 Histórico" : "📊 Resumo"}
            </button>
          ))}
        </div>

        {/* ABA REGISTRAR */}
        {aba === "registrar" && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Data *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                style={{ width: 200, boxSizing: "border-box" }} />
            </div>

            {loading ? <p style={{ color: "#5f5e5a", fontSize: 14 }}>Carregando...</p>
            : alunos.length === 0 ? <p style={{ fontSize: 14, color: "#5f5e5a" }}>Nenhum aluno cadastrado.</p>
            : (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
                  <button onClick={() => { const p = {}; alunos.forEach(a => { p[a.id] = true; }); setPresencas(p); }}
                    style={{ fontSize: 12, padding: "4px 12px", background: "#edfff6", color: "#0F6E56", border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer" }}>
                    ✅ Todos presentes
                  </button>
                  <button onClick={() => { const p = {}; alunos.forEach(a => { p[a.id] = false; }); setPresencas(p); }}
                    style={{ fontSize: 12, padding: "4px 12px", background: "#fcebeb", color: "#791f1f", border: "0.5px solid #a32d2d", borderRadius: 6, cursor: "pointer" }}>
                    ❌ Todos ausentes
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {alunos.map(a => (
                    <div key={a.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", background: presencas[a.id] === true ? "#edfff6"
                        : presencas[a.id] === false ? "#fcebeb" : "#f5f9ff",
                      border: `0.5px solid ${presencas[a.id] === true ? "#4CAF82" : presencas[a.id] === false ? "#a32d2d" : "#d3d1c7"}`,
                      borderRadius: 8
                    }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{a.full_name}</p>
                        <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                          {a.grade}{a.disability_type ? ` · ${a.disability_type}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => togglePresenca(a.id, true)} style={{
                          fontSize: 12, padding: "6px 14px",
                          background: presencas[a.id] === true ? "#4CAF82" : "#fff",
                          color: presencas[a.id] === true ? "#fff" : "#4CAF82",
                          border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer"
                        }}>✅ Presente</button>
                        <button onClick={() => togglePresenca(a.id, false)} style={{
                          fontSize: 12, padding: "6px 14px",
                          background: presencas[a.id] === false ? "#a32d2d" : "#fff",
                          color: presencas[a.id] === false ? "#fff" : "#a32d2d",
                          border: "0.5px solid #a32d2d", borderRadius: 6, cursor: "pointer"
                        }}>❌ Falta</button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={handleSalvar} disabled={salvando} style={{
                  width: "100%", padding: "12px",
                  background: salvando ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 15, fontWeight: 500, cursor: salvando ? "not-allowed" : "pointer"
                }}>
                  {salvando ? "Salvando..." : "💾 Salvar frequência"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ABA HISTÓRICO */}
        {aba === "historico" && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem" }}>
            {diasUnicos.length === 0 ? (
              <p style={{ fontSize: 14, color: "#5f5e5a" }}>Nenhuma frequência registrada ainda.</p>
            ) : diasUnicos.map(dia => {
              const registrosDia = historico.filter(h => h.date === dia);
              const presentes = registrosDia.filter(h => h.present).length;
              return (
                <div key={dia} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>
                      {new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </p>
                    <span style={{ fontSize: 12, padding: "3px 10px", background: "#e8f7fd", color: "#1a6e8a", borderRadius: 20 }}>
                      {presentes}/{registrosDia.length} presentes
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {registrosDia.map(r => (
                      <div key={r.id} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: 6,
                        background: r.present ? "#edfff6" : "#fcebeb",
                        fontSize: 13
                      }}>
                        <span>{nomesAlunos[r.student_id] || r.student_id}</span>
                        <span style={{ color: r.present ? "#0F6E56" : "#791f1f" }}>
                          {r.present ? "✅ Presente" : "❌ Falta"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA RESUMO */}
        {aba === "resumo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alunos.map(a => {
              const freq = calcularFrequencia(a.id);
              return (
                <div key={a.id} style={{
                  background: "#fff", border: "0.5px solid #d3d1c7",
                  borderLeft: `3px solid ${!freq ? "#d3d1c7" : freq.pct >= 75 ? "#4CAF82" : "#a32d2d"}`,
                  borderRadius: 10, padding: "14px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{a.full_name}</p>
                    <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                      {a.grade}{a.disability_type ? ` · ${a.disability_type}` : ""}
                    </p>
                  </div>
                  {freq ? (
                    <div style={{ textAlign: "right" }}>
                      <p style={{
                        fontSize: 20, fontWeight: 600, margin: 0,
                        color: freq.pct >= 75 ? "#4CAF82" : "#a32d2d"
                      }}>{freq.pct}%</p>
                      <p style={{ fontSize: 11, color: "#5f5e5a", margin: 0 }}>
                        {freq.presentes}/{freq.total} aulas
                        {freq.pct < 75 && <span style={{ color: "#a32d2d" }}> ⚠️ Abaixo de 75%</span>}
                      </p>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "#5f5e5a" }}>Sem registros</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}