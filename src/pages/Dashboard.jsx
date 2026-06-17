import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import { getUsage } from "../services/mapiClient";
import icone from "../assets/icone.png";

const CARDS = [
  { emoji: "🧠", label: "Gerar nova aula", desc: "Crie uma aula adaptada com IA", rota: "/gerar", cor: "#2B9EC3" },
  { emoji: "👨‍🎓", label: "Alunos", desc: "Gerencie seus alunos", rota: "/alunos", cor: "#4CAF82" },
  { emoji: "📚", label: "Histórico", desc: "Veja suas aulas geradas", rota: "/historico", cor: "#4CAF82" },
  { emoji: "✏️", label: "Avaliações", desc: "Avaliações por bimestre/semestre", rota: "/avaliacoes", cor: "#534AB7" },
  { emoji: "📅", label: "Frequência", desc: "Registre presenças e faltas", rota: "/frequencia", cor: "#2B9EC3" },
  { emoji: "📄", label: "Relatórios", desc: "Relatórios obrigatórios com IA", rota: "/relatorios", cor: "#BA7517" },
  { emoji: "🏫", label: "Minha escola", desc: "Código de convite e professores", rota: "/escola", cor: "#2B9EC3" },
];

const PLANO_LABELS = {
  free: { label: "Gratuito", cor: "#5f5e5a", bg: "#f1efe8" },
  professor: { label: "Professor", cor: "#2B9EC3", bg: "#e8f7fd" },
  escola: { label: "Escola", cor: "#4CAF82", bg: "#edfff6" },
  rede: { label: "Rede", cor: "#534AB7", bg: "#EEEDFE" }
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { reset } = useLesson();
  const navigate = useNavigate();
  const [uso, setUso] = useState(null);

  useEffect(() => {
    getUsage().then(res => setUso(res.data)).catch(() => { });
  }, []);

  function handleCard(rota) {
    if (rota === "/gerar") reset();
    navigate(rota);
  }

  const planoInfo = PLANO_LABELS[uso?.plano] || PLANO_LABELS.free;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 36 }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: "#2B9EC3" }}>
            Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#5f5e5a" }}>{user?.email}</span>
          <button onClick={signOut} style={{ fontSize: 13 }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Olá, professor 👋</h2>
        <p style={{ color: "#5f5e5a", marginBottom: 24 }}>O que vamos fazer hoje?</p>

        {/* Banner de uso do plano */}
        {uso && (
          <div style={{
            background: "#fff", border: "0.5px solid #d3d1c7",
            borderRadius: 12, padding: "14px 20px", marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12,
            boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 12, padding: "3px 12px", borderRadius: 20, fontWeight: 600,
                background: planoInfo.bg, color: planoInfo.cor
              }}>
                Plano {planoInfo.label}
              </span>
              <span style={{ fontSize: 13, color: "#5f5e5a" }}>
                {uso.mes?.replace("-", "/")}
              </span>
            </div>

            <div style={{ display: "flex", gap: 20 }}>
              {/* Barra de aulas */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5f5e5a" }}>
                  <span>🧠 Aulas</span>
                  <span style={{ fontWeight: 600, color: uso.aulas.limite === -1 ? "#4CAF82" : uso.aulas.usadas >= uso.aulas.limite ? "#a32d2d" : "#2B9EC3" }}>
                    {uso.aulas.usadas}/{uso.aulas.limite === -1 ? "∞" : uso.aulas.limite}
                  </span>
                </div>
                {uso.aulas.limite !== -1 && (
                  <div style={{ height: 4, background: "#f1efe8", borderRadius: 2 }}>
                    <div style={{
                      height: 4, borderRadius: 2,
                      width: `${Math.min(100, (uso.aulas.usadas / uso.aulas.limite) * 100)}%`,
                      background: uso.aulas.usadas >= uso.aulas.limite ? "#a32d2d" : "linear-gradient(135deg, #2B9EC3, #4CAF82)"
                    }} />
                  </div>
                )}
              </div>

              {/* Barra de relatórios */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5f5e5a" }}>
                  <span>📄 Relatórios</span>
                  <span style={{ fontWeight: 600, color: uso.relatorios.limite === -1 ? "#4CAF82" : uso.relatorios.usados >= uso.relatorios.limite ? "#a32d2d" : "#BA7517" }}>
                    {uso.relatorios.usados}/{uso.relatorios.limite === -1 ? "∞" : uso.relatorios.limite}
                  </span>
                </div>
                {uso.relatorios.limite !== -1 && (
                  <div style={{ height: 4, background: "#f1efe8", borderRadius: 2 }}>
                    <div style={{
                      height: 4, borderRadius: 2,
                      width: `${Math.min(100, (uso.relatorios.usados / uso.relatorios.limite) * 100)}%`,
                      background: uso.relatorios.usados >= uso.relatorios.limite ? "#a32d2d" : "linear-gradient(135deg, #BA7517, #d4961e)"
                    }} />
                  </div>
                )}
              </div>
            </div>

            {/* Botão upgrade — só aparece no plano free */}
            {uso.plano === "free" && (
              <button
                onClick={() => window.open(
                  "https://wa.me/55SEU_NUMERO?text=Olá! Quero fazer upgrade do meu plano na InclusivAula.",
                  "_blank"
                )}
                style={{
                  fontSize: 12, padding: "6px 16px",
                  background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                  color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
                  fontWeight: 500
                }}
              >
                ⚡ Fazer upgrade
              </button>
            )}
          </div>
        )}

        {/* Cards de navegação */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16
        }}>
          {CARDS.map(card => (
            <div key={card.rota} onClick={() => handleCard(card.rota)} style={{
              background: "#fff", border: "0.5px solid #d3d1c7",
              borderRadius: 12, padding: "1.5rem", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(43,158,195,0.06)",
              transition: "box-shadow 0.2s, transform 0.15s"
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(43,158,195,0.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(43,158,195,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{card.emoji}</div>
              <p style={{ fontWeight: 500, marginBottom: 4, color: card.cor }}>{card.label}</p>
              <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}