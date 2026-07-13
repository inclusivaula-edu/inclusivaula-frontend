import { useState, useEffect } from "react";
import { getSchoolInvite, rotateSchoolInvite } from "../services/mapiClient";

const cardStyle = {
  background: "#fff", border: "1px solid #4CAF82", borderRadius: 12,
  padding: "1.2rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)", marginBottom: 24
};

export default function ConviteProfessores() {
  const [convite, setConvite] = useState(null);
  const [copiado, setCopiado] = useState(null);
  const [girando, setGirando] = useState(false);

  useEffect(() => {
    getSchoolInvite().then(res => setConvite(res.data)).catch(() => {});
  }, []);

  if (!convite) return null;

  const link = `https://www.inclusivaula.com.br/cadastro?convite=${convite.inviteCode}`;
  const vagasCheias = convite.professoresLimite !== -1 && convite.professoresAtivos >= convite.professoresLimite;
  const msgWhats = encodeURIComponent(
    `Olá! Você foi convidado(a) a entrar na ${convite.schoolName} na InclusivAula, plataforma de educação inclusiva com IA. Crie sua conta pelo link (o código de convite já vai preenchido): ${link}`
  );

  function copiar(texto, qual) {
    navigator.clipboard.writeText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 2000);
  }

  async function novoCodigo() {
    if (!window.confirm("Gerar um novo código invalida o atual. Links já enviados deixarão de funcionar. Continuar?")) return;
    setGirando(true);
    try {
      const res = await rotateSchoolInvite();
      setConvite(prev => ({ ...prev, inviteCode: res.data.inviteCode }));
    } catch { /* toast global já avisa */ }
    setGirando(false);
  }

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#4CAF82", margin: "0 0 4px" }}>
        👩‍🏫 Convidar professores
      </p>
      <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
        Compartilhe o link — o professor cria a própria conta já vinculada à escola.{" "}
        <strong>{convite.professoresAtivos}</strong>
        {convite.professoresLimite !== -1 ? ` de ${convite.professoresLimite}` : ""} vaga(s) do plano em uso.
      </p>

      {convite.vagasFree && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {Object.entries(convite.vagasFree).map(([k, v]) => {
            const cheia = v.usadas >= v.limite;
            return (
              <span key={k} style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 12, fontWeight: 600,
                background: cheia ? "#f1efe8" : "#edfff6",
                color: cheia ? "#9b9a96" : "#0F6E56"
              }}>
                {v.rotulo}: {v.usadas}/{v.limite}
              </span>
            );
          })}
        </div>
      )}

      {vagasCheias && (
        <p role="alert" style={{ fontSize: 12, color: "#791f1f", background: "#fcebeb", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
          Limite de professores do plano atingido — novos convites serão recusados até um upgrade.
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <code style={{
          fontSize: 18, letterSpacing: 3, background: "#f1efe8",
          padding: "8px 14px", borderRadius: 8, fontWeight: 600
        }}>
          {convite.inviteCode}
        </code>
        <button onClick={() => copiar(convite.inviteCode, "codigo")} style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #d3d1c7", background: "#fff", cursor: "pointer" }}>
          {copiado === "codigo" ? "✅ Copiado" : "Copiar código"}
        </button>
        <button onClick={() => copiar(link, "link")} style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #2B9EC3", color: "#2B9EC3", background: "#fff", cursor: "pointer" }}>
          {copiado === "link" ? "✅ Copiado" : "🔗 Copiar link de convite"}
        </button>
        <a href={`https://wa.me/?text=${msgWhats}`} target="_blank" rel="noreferrer" style={{
          fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #4CAF82",
          color: "#4CAF82", background: "#fff", textDecoration: "none"
        }}>
          💬 Enviar por WhatsApp
        </a>
        <button onClick={novoCodigo} disabled={girando} style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "none", background: "none", color: "#5f5e5a", cursor: "pointer", textDecoration: "underline" }}>
          {girando ? "Gerando..." : "Gerar novo código"}
        </button>
      </div>
    </div>
  );
}
