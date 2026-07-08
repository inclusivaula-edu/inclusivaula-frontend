import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import { getUsage, subscribePlan } from "../services/mapiClient";
import icone from "../assets/icone.png";

// Ordem mobile: Gerar aula (full), Alunos|Turmas, Historico|Avaliações, Frequencia|Sessões AEE, Minha escola|Relatórios, PEI|AEE
const CARDS = [
  // --- Professor ---
  { emoji: "🧠", label: "Gerar Plano de aula", desc: "Crie uma aula adaptada com IA", rota: "/gerar", cor: "#2B9EC3", span: 2 },
  { emoji: "👨‍🎓", label: "Alunos", desc: "Gerencie seus alunos", rota: "/alunos", cor: "#4CAF82" },
  { emoji: "📚", label: "Histórico", desc: "Veja suas aulas geradas", rota: "/historico", cor: "#4CAF82" },
  { emoji: "📅", label: "Frequência", desc: "Registre presenças e faltas", rota: "/frequencia", cor: "#2B9EC3" },
  { emoji: "✏️", label: "Avaliações", desc: "Avaliações por bimestre/semestre", rota: "/avaliacoes", cor: "#534AB7" },
  { emoji: "📋", label: "PEI", desc: "Plano Educacional Individualizado", rota: "/pei", cor: "#2B9EC3" },
  { emoji: "🎓", label: "PAEE", desc: "Plano de Atendimento Educacional Especializado", rota: "/aee", cor: "#534AB7" },
  { emoji: "📝", label: "Sessões AEE", desc: "Frequência e evolução — FUNDEB", rota: "/aee-sessoes", cor: "#0F6E56" },
  // --- Coordenador+ ---
  { emoji: "📝", label: "Simulado", desc: "Simulados baseados nas aulas geradas", rota: "/simulado", cor: "#534AB7", minRole: "coordenador" },
  { emoji: "🏫", label: "Turmas", desc: "Gerencie turmas e matrículas", rota: "/turmas", cor: "#534AB7", minRole: "coordenador" },
  { emoji: "🏫", label: "Minha escola", desc: "Código de convite e professores", rota: "/escola", cor: "#2B9EC3", minRole: "coordenador" },
  { emoji: "📄", label: "Relatórios", desc: "Relatórios consolidados da escola", rota: "/relatorios", cor: "#BA7517", minRole: "coordenador" },
];

const PLANO_LABELS = {
  free: { label: "Gratuito", cor: "#ad3e3e", bg: "#f1efe8" },
  pro: { label: "Pro", cor: "#2B9EC3", bg: "#e8f7fd" },
  escola_mini: { label: "Escola Mini", cor: "#4CAF82", bg: "#edfff6" },
  escola_standard: { label: "Escola Standard", cor: "#4CAF82", bg: "#edfff6" },
  premium: { label: "Premium", cor: "#534AB7", bg: "#EEEDFE" },
  // legados
  professor: { label: "Professor", cor: "#2B9EC3", bg: "#e8f7fd" },
  escola: { label: "Escola", cor: "#4CAF82", bg: "#edfff6" },
  rede: { label: "Rede", cor: "#534AB7", bg: "#EEEDFE" },
  enterprise: { label: "Enterprise", cor: "#534AB7", bg: "#EEEDFE" }
};

const PLANS_CONFIG = [
  {
    key: "pro",
    label: "Pro Individual",
    emoji: "⭐",
    desc: "1 professor · 100 aulas/mês · 10 relatórios",
    color: "#2B9EC3",
    cycles: {
      mensal:    { price: 49.90,   label: "R$ 49,90/mês" },
      semestral: { price: 44.90,   label: "R$ 44,90/mês", badge: "10% off" },
      anual:     { price: 39.90,   label: "R$ 39,90/mês", badge: "20% off" }
    }
  },
  {
    key: "escola_mini",
    label: "Escola Mini",
    emoji: "🏫",
    desc: "Até 10 professores · Aulas ilimitadas · Painel coordenação",
    color: "#4CAF82",
    cycles: {
      mensal:    { price: 299.00,  label: "R$ 299/mês" },
      semestral: { price: 269.00,  label: "R$ 269/mês", badge: "10% off" },
      anual:     { price: 239.00,  label: "R$ 239/mês", badge: "20% off" }
    }
  },
  {
    key: "escola_standard",
    label: "Escola Standard",
    emoji: "🎯",
    desc: "Até 25 professores · Ilimitado · Auditoria + suporte prioritário",
    color: "#4CAF82",
    highlight: true,
    cycles: {
      mensal:    { price: 798.00,  label: "R$ 798/mês" },
      semestral: { price: 718.00,  label: "R$ 718/mês", badge: "10% off" },
      anual:     { price: 638.00,  label: "R$ 638/mês", badge: "20% off" }
    }
  },
  {
    key: "premium",
    label: "Premium",
    emoji: "💎",
    desc: "Até 50 professores · White-label PDFs · API + onboarding",
    color: "#534AB7",
    cycles: {
      mensal:    { price: 2499.00, label: "R$ 2.499/mês" },
      semestral: { price: 2249.00, label: "R$ 2.249/mês", badge: "10% off" },
      anual:     { price: 1999.00, label: "R$ 1.999/mês", badge: "20% off" }
    }
  }
];

const CYCLE_LABELS = {
  mensal:    { label: "Mensal",    sub: "Cancele quando quiser" },
  semestral: { label: "Semestral", sub: "Fidelidade 6 meses · 10% off" },
  anual:     { label: "Anual",     sub: "Fidelidade 12 meses · 20% off" }
};

export default function Dashboard() {
  const { user, profile, signOut, hasRole } = useAuth();
  const { reset } = useLesson();
  const navigate = useNavigate();
  const [uso, setUso] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("escola_standard");
  const [selectedCycle, setSelectedCycle] = useState("mensal");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    getUsage().then(res => setUso(res.data)).catch(() => { });
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function handleUpgrade() {
    setUpgradeLoading(true);
    setUpgradeError(null);
    try {
      const res = await subscribePlan(selectedPlan, selectedCycle);
      if (res?.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        setUpgradeError("Não foi possível gerar o link de pagamento. Tente novamente.");
      }
    } catch (e) {
      setUpgradeError(e?.message || "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setUpgradeLoading(false);
    }
  }

  function openModal() {
    setUpgradeError(null);
    setSelectedPlan("escola_standard");
    setSelectedCycle("mensal");
    setUpgradeModal(true);
  }

  function handleCard(rota) {
    if (rota === "/gerar") reset();
    navigate(rota);
  }

  const planoInfo = PLANO_LABELS[uso?.plano] || PLANO_LABELS.free;
  const activePlanConfig = PLANS_CONFIG.find(p => p.key === selectedPlan);
  const activeCycleConfig = activePlanConfig?.cycles[selectedCycle];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "12px 16px"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#5f5e5a", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</span>
            <button onClick={() => navigate("/seguranca")} title="Segurança e privacidade" style={{ fontSize: 12, padding: "4px 10px", background: "none", border: "1px solid #d3d1c7", borderRadius: 6, cursor: "pointer", color: "#5f5e5a" }}>🔐</button>
            <button onClick={signOut} style={{ fontSize: 12, padding: "4px 10px", background: "none", border: "1px solid #d3d1c7", borderRadius: 6, cursor: "pointer", color: "#5f5e5a" }}>Sair</button>
          </div>
        </div>
        {hasRole("diretor") && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => navigate("/seguranca/alertas")} style={{ flex: 1, fontSize: 12, background: "none", border: "1px solid #d3d1c7", borderRadius: 6, padding: "6px 4px", cursor: "pointer", color: "#5f5e5a", textAlign: "center" }}>
              🛡️ Alertas
            </button>
            <button onClick={() => navigate("/seguranca")} style={{ flex: 1, fontSize: 12, background: "none", border: "1px solid #d3d1c7", borderRadius: 6, padding: "6px 4px", cursor: "pointer", color: "#5f5e5a", textAlign: "center" }}>
              🔐 Segurança
            </button>
            <button onClick={() => navigate("/auditoria")} style={{ flex: 1, fontSize: 12, background: "none", border: "1px solid #d3d1c7", borderRadius: 6, padding: "6px 4px", cursor: "pointer", color: "#5f5e5a", textAlign: "center" }}>
              📋 Auditoria
            </button>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Olá, {profile?.full_name?.split(" ")[0] || "professor"} 👋</h2>
        <p style={{ color: "#5f5e5a", marginBottom: 24 }}>
          {profile?.cargo && profile.cargo !== "professor" ? `${profile.cargo.replace(/_/g, " ")} · ` : ""}O que vamos fazer hoje?
        </p>

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
                onClick={openModal}
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
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(200px, 1fr))",
          gap: isMobile ? 10 : 16
        }}>
          {CARDS.filter(card => !card.minRole || hasRole(card.minRole)).map(card => (
            <div key={card.rota} onClick={() => handleCard(card.rota)} style={{
              background: "#fff", border: "0.5px solid #d3d1c7",
              borderRadius: 12, padding: isMobile ? "1rem" : "1.5rem", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(43,158,195,0.06)",
              transition: "box-shadow 0.2s, transform 0.15s",
              ...(isMobile && card.span ? { gridColumn: `span ${card.span}` } : {})
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(43,158,195,0.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(43,158,195,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: isMobile ? 26 : 32, marginBottom: isMobile ? 8 : 12 }}>{card.emoji}</div>
              <p style={{ fontWeight: 500, marginBottom: 4, color: card.cor, fontSize: isMobile ? 13 : 15 }}>{card.label}</p>
              <p style={{ fontSize: isMobile ? 11 : 13, color: "#5f5e5a", margin: 0 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Modal de upgrade */}
      {upgradeModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16
        }} onClick={() => setUpgradeModal(false)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "2rem",
            maxWidth: 560, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflowY: "auto"
          }} onClick={e => e.stopPropagation()}>

            <h2 style={{ margin: "0 0 4px", color: "#1a1a2e", fontSize: 22 }}>Escolha seu plano</h2>
            <p style={{ color: "#5f5e5a", margin: "0 0 20px", fontSize: 13 }}>
              Pagamento mensal via Mercado Pago. Planos com fidelidade têm desconto garantido.
            </p>

            {/* Seletor de ciclo */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "#f5f9ff", borderRadius: 10, padding: 4 }}>
              {Object.entries(CYCLE_LABELS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCycle(key)}
                  style={{
                    flex: 1, padding: "8px 4px", border: "none", borderRadius: 7, cursor: "pointer",
                    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                    background: selectedCycle === key ? "#fff" : "transparent",
                    color: selectedCycle === key ? "#2B9EC3" : "#5f5e5a",
                    boxShadow: selectedCycle === key ? "0 1px 4px rgba(0,0,0,0.12)" : "none"
                  }}
                >
                  {val.label}
                  {key !== "mensal" && (
                    <span style={{
                      display: "block", fontSize: 10, fontWeight: 400,
                      color: selectedCycle === key ? "#4CAF82" : "#9ca3af"
                    }}>
                      {key === "semestral" ? "10% off" : "20% off"}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16, marginTop: -12 }}>
              {CYCLE_LABELS[selectedCycle].sub}
            </p>

            {/* Cards de planos */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PLANS_CONFIG.map(plan => {
                const cycleData = plan.cycles[selectedCycle];
                const isSelected = selectedPlan === plan.key;
                return (
                  <div
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    style={{
                      border: isSelected ? `2px solid ${plan.color}` : "2px solid #e5e7eb",
                      borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      background: isSelected ? `${plan.color}08` : "#fff",
                      transition: "all 0.15s",
                      position: "relative"
                    }}
                  >
                    {plan.highlight && (
                      <span style={{
                        position: "absolute", top: -10, left: 16,
                        background: "linear-gradient(135deg, #4CAF82, #2B9EC3)",
                        color: "#fff", fontSize: 10, fontWeight: 700,
                        padding: "2px 10px", borderRadius: 10
                      }}>
                        MAIS POPULAR
                      </span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        border: `2px solid ${isSelected ? plan.color : "#d1d5db"}`,
                        background: isSelected ? plan.color : "transparent",
                        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: plan.color, fontSize: 14 }}>
                          {plan.emoji} {plan.label}
                        </div>
                        <div style={{ fontSize: 12, color: "#5f5e5a", marginTop: 2 }}>{plan.desc}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>
                        {cycleData.label}
                      </div>
                      {cycleData.badge && (
                        <span style={{ fontSize: 10, color: "#4CAF82", fontWeight: 600 }}>
                          {cycleData.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo do selecionado */}
            {activePlanConfig && activeCycleConfig && (
              <div style={{
                marginTop: 16, padding: "12px 16px",
                background: "#f5f9ff", borderRadius: 10, fontSize: 13
              }}>
                <strong>{activePlanConfig.emoji} {activePlanConfig.label} — {CYCLE_LABELS[selectedCycle].label}</strong>
                <br />
                <span style={{ color: "#5f5e5a" }}>
                  {activeCycleConfig.label} cobrado mensalmente
                  {selectedCycle !== "mensal" && ` · contrato de ${selectedCycle === "semestral" ? "6" : "12"} meses`}
                </span>
              </div>
            )}

            {upgradeError && (
              <div style={{
                background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 8,
                padding: "10px 14px", marginTop: 12, fontSize: 13, color: "#dc2626"
              }}>
                {upgradeError}
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              style={{
                marginTop: 16, width: "100%", padding: "13px", fontSize: 15, fontWeight: 700,
                background: upgradeLoading
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 10,
                cursor: upgradeLoading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s"
              }}
            >
              {upgradeLoading ? "Aguarde..." : `Assinar ${activePlanConfig?.label || ""} →`}
            </button>

            <button
              onClick={() => setUpgradeModal(false)}
              style={{
                marginTop: 10, width: "100%", padding: "10px", fontSize: 13,
                background: "none", border: "1px solid #d3d1c7", borderRadius: 8,
                cursor: "pointer", color: "#5f5e5a"
              }}
            >
              Cancelar
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 12, marginBottom: 0 }}>
              🔒 Pagamento seguro via Mercado Pago · Cancele pelo suporte
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
