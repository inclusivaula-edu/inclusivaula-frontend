import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

export default function History() {
  const { user } = useAuth();
  const { setLesson, setJobId, setStatus } = useLesson();
  const navigate = useNavigate();
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      // Busca todas as aulas completadas — o filtro por user_id
      // é feito no cliente porque o user_id fica dentro do jsonb input
      const { data, error } = await supabase
        .from("lessons")
        .select("id, status, aprovado, created_at, input, result")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAulas(data);
      }
      setLoading(false);
    }
    if (user) carregar();
  }, [user]);

  // Ao clicar numa aula, injeta os dados no LessonContext
  // e navega direto para /resultado sem fazer polling —
  // a aula já está pronta, só precisamos exibi-la
  function handleAbrirAula(aula) {
    setJobId(aula.id);
    setLesson(aula.result);
    setStatus("done");
    navigate("/resultado");
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  // Busca em tempo real por tema, perfil, série ou título
  const aulasFiltradas = aulas.filter(a => {
    if (!filtro.trim()) return true;
    const termo = filtro.toLowerCase();
    return (
      a.input?.tema?.toLowerCase().includes(termo) ||
      a.input?.deficiencia?.toLowerCase().includes(termo) ||
      a.input?.serie?.toLowerCase().includes(termo) ||
      a.result?.titulo?.toLowerCase().includes(termo)
    );
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "10px 16px", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>
            ← Voltar
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate("/gerar")}
          style={{
            fontSize: 13, padding: "8px 16px",
            background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
            color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
          }}
        >
          + Nova aula
        </button>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
          Histórico de aulas
        </h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          {aulas.length} aula{aulas.length !== 1 ? "s" : ""} gerada{aulas.length !== 1 ? "s" : ""}
        </p>

        {/* Campo de busca — só aparece quando há aulas */}
        {aulas.length > 0 && (
          <input
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar por tema, perfil ou série..."
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 20, fontSize: 14 }}
          />
        )}

        {/* Estados da lista */}
        {loading ? (
          <p style={{ color: "#5f5e5a", fontSize: 14 }}>Carregando...</p>

        ) : aulas.length === 0 ? (
          <div style={{
            background: "#fff", border: "0.5px solid #d3d1c7",
            borderRadius: 12, padding: "2.5rem", textAlign: "center"
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <p style={{ fontSize: 15, color: "#5f5e5a", marginBottom: 16 }}>
              Você ainda não gerou nenhuma aula.
            </p>
            <button
              onClick={() => navigate("/gerar")}
              style={{
                padding: "10px 24px", fontSize: 14,
                background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
              }}
            >
              Gerar primeira aula
            </button>
          </div>

        ) : aulasFiltradas.length === 0 ? (
          <p style={{ fontSize: 14, color: "#5f5e5a" }}>
            Nenhuma aula encontrada para "{filtro}".
          </p>

        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {aulasFiltradas.map(aula => (
              <div
                key={aula.id}
                onClick={() => handleAbrirAula(aula)}
                style={{
                  background: "#fff",
                  // Borda esquerda verde para aprovadas, azul para as demais
                  border: "0.5px solid #d3d1c7",
                  borderLeft: `3px solid ${aula.aprovado ? "#4CAF82" : "#2B9EC3"}`,
                  borderRadius: 10, padding: "16px 20px",
                  cursor: "pointer", transition: "box-shadow 0.2s",
                  boxShadow: "0 2px 8px rgba(43,158,195,0.04)"
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(43,158,195,0.12)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(43,158,195,0.04)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Título gerado pela IA ou fallback para o tema digitado */}
                    <p style={{ fontWeight: 500, marginBottom: 6, fontSize: 15, color: "#2c2c2a" }}>
                      {aula.result?.titulo || aula.input?.tema || "Aula sem título"}
                    </p>
                    {/* Metadados do formulário de geração */}
                    <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                      {aula.input?.serie && <span>{aula.input.serie}</span>}
                      {aula.input?.deficiencia && <span> · {aula.input.deficiencia}</span>}
                      {aula.input?.duracao && <span> · {aula.input.duracao} min</span>}
                      <span> · {formatarData(aula.created_at)}</span>
                    </p>
                  </div>

                  {/* Badges de aprovação e BNCC */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    {aula.aprovado && (
                      <span style={{
                        fontSize: 11, padding: "2px 10px",
                        background: "#edfff6", color: "#0F6E56",
                        borderRadius: 20, whiteSpace: "nowrap"
                      }}>
                        ✅ Aprovada
                      </span>
                    )}
                    {aula.result?.bncc?.length > 0 && (
                      <span style={{
                        fontSize: 11, padding: "2px 10px",
                        background: "#EEEDFE", color: "#534AB7",
                        borderRadius: 20, whiteSpace: "nowrap"
                      }}>
                        {aula.result.bncc[0].codigo}
                        {aula.result.bncc.length > 1 ? ` +${aula.result.bncc.length - 1}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}