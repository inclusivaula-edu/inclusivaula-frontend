import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import { getUsage, subscribePlan } from "../services/mapiClient";
import icone from "../assets/icone.png";

const CARDS = [
  { emoji: "🧠", label: "Gerar Plano de aula", desc: "Crie uma aula adaptada com IA", rota: "/gerar", cor: "#2B9EC3" },
  { emoji: "👨‍🎓", label: "Alunos", desc: "Gerencie seus alunos", rota: "/alunos", cor: "#4CAF82" },
  { emoji: "📚", label: "Histórico", desc: "Veja suas aulas geradas", rota: "/historico", cor: "#4CAF82" },
  { emoji: "✏️", label: "Avaliações", desc: "Avaliações por bimestre/semestre", rota: "/avaliacoes", cor: "#534AB7" },
  { emoji: "📅", label: "Frequência", desc: "Registre presenças e faltas", rota: "/frequencia", cor: "#2B9EC3" },
  { emoji: "📄", label: "Relatórios", desc: "Semestral, família e AEE", rota: "/relatorios", cor: "#BA7517" },
  { emoji: "🏫", label: "Minha escola", desc: "Código de convite e professores", rota: "/escola", cor: "#2B9EC3" },
  { emoji: "🏫", label: "Turmas", desc: "Gerencie turmas e matrículas", rota: "/turmas", cor: "#534AB7" },
  { emoji: "📋", label: "PEI", desc: "Plano Educacional Individualizado", rota: "/pei", cor: "#2B9EC3" },
  { emoji: "🎓", label: "AEE", desc: "Atendimento Educacional Especializado", rota: "/aee", cor: "#534AB7" },
  { emoji: "📝", label: "Sessões AEE", desc: "Frequência e evolução — FUNDEB", rota: "/aee-sessoes", cor: "#0F6E56" },
];

const PLANO_LABELS = {
  free: { label: "Gratuito", cor: "#ad3e3e", bg: "#f1efe8" },
  professor: { label: "Professor", cor: "#2B9EC3", bg: "#e8f7fd" },
  escola: { label: "Escola", cor: "#4CAF82", bg: "#edfff6" },
  rede: { label: "Rede", cor: "#534AB7", bg: "#EEEDFE" }
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { reset } = useLesson();
  const navigate = useNavigate();
  const [uso, setUso] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(null);
  const [upgradeError, setUpgradeError] = useState(null);

  useEffect(() => {
    getUsage().then(res => setUso(res.data)).catch(() => { });
  }, []);

  async function handleUpgrade(plan) {
    setUpgradeLoading(plan);
    setUpgradeError(null);
    try {
      const res = await subscribePlan(plan);
      if (res?.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        setUpgradeError("Não foi possível gerar o link de pagamento. Tente novamente.");
      }
    } catch (e) {
      setUpgradeError(e?.message || "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setUpgradeLoading(null);
    }
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/seguranca")}
            title="Configurar 2FA"
            style={{ fontSize: 13, background: "none", border: "1px solid #d3d1c7", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#5f5e5a" }}
          >
            🔐 Segurança
          </button>
          <button
            onClick={() => navigate("/auditoria")}
            title="Ver logs de auditoria"
            style={{ fontSize: 13, background: "none", border: "1px solid #d3d1c7", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#5f5e5a" }}
          >
            📋 Auditoria
          </button>
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
                onClick={() => { setUpgradeModal(true); setUpgradeError(null); }}
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

      {/* Modal de upgrade */}
      {upgradeModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16
        }} onClick={() => setUpgradeModal(false)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "2rem",
            maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 8px", color: "#1a1a2e", fontSize: 22 }}>Escolha seu plano</h2>
            <p style={{ color: "#5f5e5a", margin: "0 0 24px", fontSize: 14 }}>
              Pagamento seguro via Mercado Pago. Cancele quando quiser.
            </p>

            {upgradeError && (
              <div style={{
                background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 8,
                padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626"
              }}>
                {upgradeError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Pro */}
              <div style={{
                border: "2px solid #2B9EC3", borderRadius: 12, padding: "1rem 1.25rem",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#2B9EC3", marginBottom: 2 }}>Pro</div>
                  <div style={{ fontSize: 13, color: "#5f5e5a" }}>100 aulas · 10 relatórios · 10 professores</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e" }}>R$ 49/mês</div>
                  <button
                    onClick={() => handleUpgrade("pro")}
                    disabled={upgradeLoading !== null}
                    style={{
                      marginTop: 6, padding: "6px 18px", fontSize: 13, fontWeight: 600,
                      background: upgradeLoading === "pro" ? "#9ca3af" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                      color: "#fff", border: "none", borderRadius: 6, cursor: upgradeLoading ? "not-allowed" : "pointer"
                    }}
                  >
                    {upgradeLoading === "pro" ? "Aguarde..." : "Assinar"}
                  </button>
                </div>
              </div>

              {/* Enterprise */}
              <div style={{
                border: "2px solid #534AB7", borderRadius: 12, padding: "1rem 1.25rem",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#534AB7", marginBottom: 2 }}>Enterprise</div>
                  <div style={{ fontSize: 13, color: "#5f5e5a" }}>Ilimitado · Para redes escolares</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e" }}>R$ 199/mês</div>
                  <button
                    onClick={() => handleUpgrade("enterprise")}
                    disabled={upgradeLoading !== null}
                    style={{
                      marginTop: 6, padding: "6px 18px", fontSize: 13, fontWeight: 600,
                      background: upgradeLoading === "enterprise" ? "#9ca3af" : "linear-gradient(135deg, #534AB7, #2B9EC3)",
                      color: "#fff", border: "none", borderRadius: 6, cursor: upgradeLoading ? "not-allowed" : "pointer"
                    }}
                  >
                    {upgradeLoading === "enterprise" ? "Aguarde..." : "Assinar"}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setUpgradeModal(false)}
              style={{
                marginTop: 20, width: "100%", padding: "10px", fontSize: 14,
                background: "none", border: "1px solid #d3d1c7", borderRadius: 8,
                cursor: "pointer", color: "#5f5e5a"
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}