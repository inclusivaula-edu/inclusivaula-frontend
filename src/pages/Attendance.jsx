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
  const [datasExtra, setDatasExtra] = useState([]);
  const [dataPrincipal, setDataPrincipal] = useState(new Date().toISOString().split("T")[0]);
  const [presencas, setPresencas] = useState({});
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [aba, setAba] = useState("registrar");
  const [filtroAluno, setFiltroAluno] = useState("");

  const datasParaRegistrar = [dataPrincipal, ...datasExtra].filter(Boolean);

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
          .order("attendance_date", { ascending: false })
          .limit(300);
        setHistorico(histData || []);
      }
      setLoading(false);
    }
    if (user) carregar();
  }, [user]);

  function addData() {
    setDatasExtra(prev => [...prev, new Date().toISOString().split("T")[0]]);
  }

  function removeData(idx) {
    setDatasExtra(prev => prev.filter((_, i) => i !== idx));
  }

  function updateDataExtra(idx, val) {
    setDatasExtra(prev => prev.map((d, i) => i === idx ? val : d));
  }

  function togglePresenca(alunoId, presente) {
    setPresencas(prev => ({ ...prev, [alunoId]: presente }));
  }

  async function handleSalvar() {
    if (Object.keys(presencas).length === 0) {
      mostrarFeedback("Registre pelo menos uma presença ou falta.", "erro"); return;
    }
    setSalvando(true);
    try {
      const ops = [];
      for (const data of datasParaRegistrar) {
        for (const [student_id, presente] of Object.entries(presencas)) {
          const status = presente ? "present" : "absent";
          const { data: existing } = await supabase.from("attendance").select("id")
            .eq("student_id", student_id).eq("attendance_date", data).maybeSingle();
          if (existing?.id) {
            ops.push(supabase.from("attendance")
              .update({ status, present: presente, school_id: schoolId }).eq("id", existing.id));
          } else {
            ops.push(supabase.from("attendance")
              .insert([{ student_id, school_id: schoolId, attendance_date: data, status, present: presente }]));
          }
        }
      }
      await Promise.all(ops);
      const { data: histData } = await supabase.from("attendance").select("*")
        .eq("school_id", schoolId).order("attendance_date", { ascending: false }).limit(300);
      setHistorico(histData || []);
      setPresencas({});
      mostrarFeedback(`Frequencia registrada em ${datasParaRegistrar.length} data(s).`);
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  function calcularFrequencia(alunoId) {
    const registros = historico.filter(h => h.student_id === alunoId);
    if (registros.length === 0) return null;
    const presentes = registros.filter(h => h.status === "present" || h.present === true).length;
    return { presentes, total: registros.length, pct: Math.round((presentes / registros.length) * 100) };
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  const alunosFiltrados = alunos.filter(a =>
    !filtroAluno || a.full_name.toLowerCase().includes(filtroAluno.toLowerCase())
  );

  const diasUnicos = [...new Set(historico.map(h => h.attendance_date))].sort().reverse().slice(0, 20);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>Voltar</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Frequencia e faltas</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Registre presencas e acompanhe frequencia por aluno
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[
            { id: "registrar", label: "Registrar" },
            { id: "historico", label: "Historico" },
            { id: "resumo", label: "Resumo" }
          ].map(tab => (
            <button key={tab.id} onClick={() => setAba(tab.id)} style={{
              padding: "8px 16px", fontSize: 13, borderRadius: 8,
              background: aba === tab.id ? "linear-gradient(135deg, #2B9EC3, #4CAF82)" : "#fff",
              color: aba === tab.id ? "#fff" : "#5f5e5a",
              border: `0.5px solid ${aba === tab.id ? "transparent" : "#d3d1c7"}`,
              cursor: "pointer"
            }}>{tab.label}</button>
          ))}
        </div>

        {aba === "registrar" && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem" }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 8, fontWeight: 500 }}>
                Data(s) do registro
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="date" value={dataPrincipal}
                    onChange={e => setDataPrincipal(e.target.value)}
                    style={{ width: 180 }} />
                  <span style={{ fontSize: 12, color: "#5f5e5a" }}>Data principal</span>
                </div>
                {datasExtra.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="date" value={d}
                      onChange={e => updateDataExtra(i, e.target.value)}
                      style={{ width: 180 }} />
                    <button onClick={() => removeData(i)} style={{
                      fontSize: 12, padding: "4px 10px", background: "#fcebeb",
                      color: "#791f1f", border: "0.5px solid #a32d2d", borderRadius: 6, cursor: "pointer"
                    }}>Remover</button>
                  </div>
                ))}
                <button onClick={addData} style={{
                  alignSelf: "flex-start", fontSize: 12, padding: "6px 14px",
                  background: "#e8f7fd", color: "#1a6e8a",
                  border: "0.5px solid #2B9EC3", borderRadius: 6, cursor: "pointer"
                }}>+ Adicionar outra data</button>
              </div>
              {datasParaRegistrar.length > 1 && (
                <div style={{ marginTop: 8, padding: "6px 12px", background: "#EEEDFE", borderRadius: 6, fontSize: 12, color: "#534AB7" }}>
                  A frequencia sera registrada nas {datasParaRegistrar.length} datas selecionadas de uma vez.
                </div>
              )}
            </div>

            {loading ? (
              <p style={{ color: "#5f5e5a", fontSize: 14 }}>Carregando alunos...</p>
            ) : alunos.length === 0 ? (
              <p style={{ fontSize: 14, color: "#5f5e5a" }}>Nenhum aluno cadastrado.</p>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
                  <button onClick={() => { const p = {}; alunos.forEach(a => { p[a.id] = true; }); setPresencas(p); }}
                    style={{ fontSize: 12, padding: "4px 12px", background: "#edfff6", color: "#0F6E56", border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer" }}>
                    Todos presentes
                  </button>
                  <button onClick={() => { const p = {}; alunos.forEach(a => { p[a.id] = false; }); setPresencas(p); }}
                    style={{ fontSize: 12, padding: "4px 12px", background: "#fcebeb", color: "#791f1f", border: "0.5px solid #a32d2d", borderRadius: 6, cursor: "pointer" }}>
                    Todos ausentes
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {alunos.map(a => (
                    <div key={a.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", borderRadius: 8,
                      background: presencas[a.id] === true ? "#edfff6" : presencas[a.id] === false ? "#fcebeb" : "#f5f9ff",
                      border: `0.5px solid ${presencas[a.id] === true ? "#4CAF82" : presencas[a.id] === false ? "#a32d2d" : "#d3d1c7"}`
                    }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{a.full_name}</p>
                        <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>{a.grade}{a.disability_type ? ` - ${a.disability_type}` : ""}</p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => togglePresenca(a.id, true)} style={{
                          fontSize: 12, padding: "6px 12px",
                          background: presencas[a.id] === true ? "#4CAF82" : "#fff",
                          color: presencas[a.id] === true ? "#fff" : "#4CAF82",
                          border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer"
                        }}>Presente</button>
                        <button onClick={() => togglePresenca(a.id, false)} style={{
                          fontSize: 12, padding: "6px 12px",
                          background: presencas[a.id] === false ? "#a32d2d" : "#fff",
                          color: presencas[a.id] === false ? "#fff" : "#a32d2d",
                          border: "0.5px solid #a32d2d", borderRadius: 6, cursor: "pointer"
                        }}>Falta</button>
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
                  {salvando ? "Salvando..." : `Salvar frequencia${datasParaRegistrar.length > 1 ? ` (${datasParaRegistrar.length} datas)` : ""}`}
                </button>
              </>
            )}
          </div>
        )}

        {aba === "historico" && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem" }}>
            <input placeholder="Filtrar aluno..." value={filtroAluno}
              onChange={e => setFiltroAluno(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", marginBottom: 16 }} />

            {diasUnicos.length === 0 ? (
              <p style={{ fontSize: 14, color: "#5f5e5a" }}>Nenhuma frequencia registrada ainda.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", background: "#f5f9ff", fontWeight: 500, position: "sticky", left: 0, minWidth: 150, zIndex: 1 }}>
                        Aluno
                      </th>
                      {diasUnicos.map(dia => (
                        <th key={dia} style={{ padding: "8px 4px", background: "#f5f9ff", fontWeight: 500, textAlign: "center", whiteSpace: "nowrap", minWidth: 46 }}>
                          {new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </th>
                      ))}
                      <th style={{ padding: "8px 10px", background: "#f5f9ff", fontWeight: 500, textAlign: "center" }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosFiltrados.map(a => {
                      const freq = calcularFrequencia(a.id);
                      return (
                        <tr key={a.id} style={{ borderTop: "0.5px solid #f1efe8" }}>
                          <td style={{ padding: "7px 10px", fontWeight: 500, position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>
                            {a.full_name}
                          </td>
                          {diasUnicos.map(dia => {
                            const reg = historico.find(h => h.student_id === a.id && h.attendance_date === dia);
                            if (!reg) return <td key={dia} style={{ textAlign: "center", color: "#d3d1c7", padding: "7px 4px" }}>-</td>;
                            const presente = reg.status === "present" || reg.present === true;
                            return (
                              <td key={dia} style={{ textAlign: "center", padding: "7px 4px" }}>
                                {presente ? "P" : "F"}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: "center", padding: "7px 10px" }}>
                            {freq ? (
                              <span style={{ fontWeight: 600, color: freq.pct >= 75 ? "#0F6E56" : "#791f1f" }}>
                                {freq.pct}%
                              </span>
                            ) : <span style={{ color: "#d3d1c7" }}>-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: "#5f5e5a", marginTop: 12 }}>
                  Ultimas {diasUnicos.length} datas registradas. P = Presente, F = Falta.
                </p>
              </div>
            )}
          </div>
        )}

        {aba === "resumo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alunos.map(a => {
              const freq = calcularFrequencia(a.id);
              return (
                <div key={a.id} style={{
                  background: "#fff",
                  border: "0.5px solid #d3d1c7",
                  borderLeft: `3px solid ${!freq ? "#d3d1c7" : freq.pct >= 75 ? "#4CAF82" : "#a32d2d"}`,
                  borderRadius: 10, padding: "14px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{a.full_name}</p>
                    <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                      {a.grade}{a.disability_type ? ` - ${a.disability_type}` : ""}
                    </p>
                  </div>
                  {freq ? (
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: freq.pct >= 75 ? "#4CAF82" : "#a32d2d" }}>
                        {freq.pct}%
                      </p>
                      <p style={{ fontSize: 11, color: "#5f5e5a", margin: 0 }}>
                        {freq.presentes}/{freq.total} aulas
                        {freq.pct < 75 && <span style={{ color: "#a32d2d" }}> - Abaixo de 75%</span>}
                      </p>
                    </div>
                  ) : <span style={{ fontSize: 12, color: "#5f5e5a" }}>Sem registros</span>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
