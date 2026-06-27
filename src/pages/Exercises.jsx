import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { generateExercises, registerGrade } from "../services/mapiClient";
import icone from "../assets/icone.png";

export default function Exercises() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Recebe lessonId e studentId via state da navegação
  const { lessonId, lessonTitulo, studentId, studentNome } = location.state || {};

  const [exercicios, setExercicios] = useState(null);
  const [activityId, setActivityId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Estado para registro de notas por aluno
  const [alunos, setAlunos] = useState([]);
  const [notas, setNotas] = useState({});
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [notasSalvas, setNotasSalvas] = useState({});

  // Carrega alunos da escola para registro de notas
  useEffect(() => {
    async function carregarAlunos() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profile?.school_id) {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, grade, disability_type")
          .eq("school_id", profile.school_id)
          .order("full_name");
        setAlunos(data || []);
      }
    }
    if (user) carregarAlunos();
  }, [user]);

  async function handleGerar() {
    if (!lessonId) {
      setError("Nenhuma aula selecionada. Volte ao histórico e selecione uma aula.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await generateExercises(lessonId, studentId || null, 5);
      setExercicios(res.data);
      setActivityId(res.activityId);
      mostrarFeedback("✅ Exercícios gerados com sucesso!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarNota(alunoId) {
    const nota = notas[alunoId];
    if (nota === undefined || nota === "") {
      mostrarFeedback("Digite uma nota entre 0 e 10.", "erro");
      return;
    }
    setSalvandoNota(true);
    try {
      await registerGrade(
        activityId,
        alunoId,
        Number(nota),
        ""
      );
      setNotasSalvas(prev => ({ ...prev, [alunoId]: Number(nota) }));
      mostrarFeedback("✅ Nota registrada com sucesso!");
    } catch (err) {
      mostrarFeedback("Erro ao registrar nota.", "erro");
    } finally {
      setSalvandoNota(false);
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  const tipoLabel = { multipla_escolha: "Múltipla escolha", verdadeiro_falso: "V ou F", dissertativo: "Dissertativo" };
  const nivelColor = { basico: "#4CAF82", intermediario: "#BA7517", avancado: "#a32d2d" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>

      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>
          {feedback.msg}
        </div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "10px 16px", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/historico")} style={{ fontSize: 13 }}>
            ← Histórico
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
          Exercícios adaptados
        </h2>

        {/* Contexto da aula e aluno */}
        <div style={{
          background: "linear-gradient(135deg, #e8f7fd, #edfff6)",
          border: "0.5px solid #2B9EC3", borderRadius: 8,
          padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#1a6e8a"
        }}>
          {lessonTitulo && <span>📖 <strong>{lessonTitulo}</strong></span>}
          {studentNome && <span> · 👤 Para: <strong>{studentNome}</strong></span>}
          {!lessonTitulo && <span>Selecione uma aula no histórico para gerar exercícios.</span>}
        </div>

        {error && (
          <div style={{
            background: "#fcebeb", border: "0.5px solid #a32d2d",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, color: "#791f1f", marginBottom: 20
          }}>
            {error}
          </div>
        )}

        {/* Botão de geração */}
        {!exercicios && (
          <button
            onClick={handleGerar}
            disabled={loading || !lessonId}
            style={{
              width: "100%", padding: "14px",
              background: loading || !lessonId ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500,
              cursor: loading || !lessonId ? "not-allowed" : "pointer",
              marginBottom: 24
            }}
          >
            {loading ? "Nexus7 gerando exercícios..." : "✏️ Gerar exercícios adaptados"}
          </button>
        )}

        {/* Lista de exercícios */}
        {exercicios && (
          <>
            <div style={{
              background: "#fff", border: "0.5px solid #d3d1c7",
              borderRadius: 12, padding: "1.5rem", marginBottom: 24,
              boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: "#2B9EC3", marginBottom: 8 }}>
                {exercicios.titulo}
              </h3>
              <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 0 }}>
                📋 {exercicios.instrucoes}
              </p>
            </div>

            {exercicios.exercicios?.map((ex, i) => (
              <div key={i} style={{
                background: "#fff", border: "0.5px solid #d3d1c7",
                borderLeft: "3px solid #2B9EC3",
                borderRadius: 10, padding: "16px 20px", marginBottom: 16
              }}>
                {/* Header do exercício */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <span style={{
                    fontSize: 11, padding: "2px 10px",
                    background: "#e8f7fd", color: "#2B9EC3",
                    borderRadius: 20, fontWeight: 500
                  }}>
                    Exercício {ex.numero}
                  </span>
                  <span style={{
                    fontSize: 11, padding: "2px 10px",
                    background: "#f1efe8", color: "#5f5e5a", borderRadius: 20
                  }}>
                    {tipoLabel[ex.tipo] || ex.tipo}
                  </span>
                  <span style={{
                    fontSize: 11, padding: "2px 10px",
                    background: "#f1efe8",
                    color: nivelColor[ex.nivel] || "#5f5e5a", borderRadius: 20
                  }}>
                    {ex.nivel}
                  </span>
                </div>

                {/* Enunciado */}
                <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12, color: "#2c2c2a" }}>
                  {ex.enunciado}
                </p>

                {/* Opções para múltipla escolha */}
                {ex.opcoes?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    {ex.opcoes.map((op, j) => (
                      <div key={j} style={{
                        padding: "8px 12px", borderRadius: 6,
                        background: op.startsWith(ex.resposta_correta) ? "#edfff6" : "#f5f9ff",
                        border: `0.5px solid ${op.startsWith(ex.resposta_correta) ? "#4CAF82" : "#d3d1c7"}`,
                        fontSize: 13, color: "#2c2c2a"
                      }}>
                        {op}
                        {op.startsWith(ex.resposta_correta) && (
                          <span style={{ color: "#4CAF82", marginLeft: 8, fontSize: 11 }}>✓ correta</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Gabarito */}
                <div style={{
                  background: "#f5f9ff", border: "0.5px solid #d3d1c7",
                  borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#5f5e5a"
                }}>
                  <strong>Gabarito:</strong> {ex.resposta_correta} —{" "}
                  {ex.justificativa}
                </div>

                {/* Adaptação aplicada */}
                {ex.adaptacao && (
                  <div style={{
                    marginTop: 8, fontSize: 11, color: "#1a6e8a",
                    background: "#e8f7fd", borderRadius: 6, padding: "6px 10px"
                  }}>
                    ♿ {ex.adaptacao}
                  </div>
                )}
              </div>
            ))}

            {/* Critérios de avaliação */}
            <div style={{
              background: "#f1efe8", border: "0.5px solid #d3d1c7",
              borderRadius: 8, padding: "12px 16px", marginBottom: 24,
              fontSize: 13, color: "#5f5e5a"
            }}>
              <strong>📊 Critérios de avaliação:</strong> {exercicios.criterios_avaliacao}
            </div>

            {/* Registro de notas */}
            <div style={{
              background: "#fff", border: "0.5px solid #d3d1c7",
              borderRadius: 12, padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", marginBottom: 16 }}>
                📝 Registrar notas dos alunos
              </h3>
              {alunos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a" }}>
                  Nenhum aluno cadastrado. Cadastre alunos primeiro.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {alunos.map(a => (
                    <div key={a.id} style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 12,
                      padding: "10px 14px", background: "#f5f9ff",
                      border: "0.5px solid #d3d1c7", borderRadius: 8
                    }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{a.full_name}</p>
                        <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                          {a.grade}{a.disability_type ? ` · ${a.disability_type}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {notasSalvas[a.id] !== undefined ? (
                          <span style={{
                            fontSize: 13, padding: "4px 12px",
                            background: "#edfff6", color: "#0F6E56",
                            borderRadius: 20, fontWeight: 500
                          }}>
                            ✅ {notasSalvas[a.id]}/10
                          </span>
                        ) : (
                          <>
                            <input
                              type="number"
                              min="0" max="10" step="0.5"
                              placeholder="nota"
                              value={notas[a.id] || ""}
                              onChange={e => setNotas(prev => ({ ...prev, [a.id]: e.target.value }))}
                              style={{
                                width: 70, textAlign: "center",
                                fontSize: 14, padding: "6px 8px"
                              }}
                            />
                            <button
                              onClick={() => handleSalvarNota(a.id)}
                              disabled={salvandoNota}
                              style={{
                                fontSize: 12, padding: "6px 14px",
                                background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                                color: "#fff", border: "none",
                                borderRadius: 6, cursor: "pointer"
                              }}
                            >
                              Salvar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}