import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSchoolPanel, getSchoolInvite, rotateSchoolInvite } from "../services/mapiClient";
import icone from "../assets/icone.png";

const cardStyle = {
  background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
  padding: "1.2rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
};

function Indicador({ rotulo, valor, sufixo = "", cor = "#2B9EC3" }) {
  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 26, fontWeight: 600, color: cor, margin: 0 }}>
        {valor === null || valor === undefined ? "—" : valor}{sufixo}
      </p>
      <p style={{ fontSize: 12, color: "#5f5e5a", margin: "4px 0 0" }}>{rotulo}</p>
    </div>
  );
}

function ConviteProfessores() {
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
    <div style={{ ...cardStyle, marginBottom: 24, border: "1px solid #4CAF82" }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#4CAF82", margin: "0 0 4px" }}>
        👩‍🏫 Convidar professores
      </p>
      <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
        Compartilhe o link — o professor cria a própria conta já vinculada à escola.{" "}
        <strong>{convite.professoresAtivos}</strong>
        {convite.professoresLimite !== -1 ? ` de ${convite.professoresLimite}` : ""} vaga(s) do plano em uso.
      </p>

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

export default function SchoolPanel() {
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchoolPanel()
      .then(res => setDados(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{ background: "#fff", borderBottom: "0.5px solid #d3d1c7", padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span></span>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>🏫 Painel da Escola</h1>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Visão consolidada de gestão — alunos, frequência, desempenho, documentos e alertas
        </p>

        <ConviteProfessores />

        {loading && <p role="status">Carregando indicadores...</p>}
        {error && (
          <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f" }}>
            {error}
          </div>
        )}

        {dados && (
          <>
            {/* Indicadores principais */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
              <Indicador rotulo="Alunos" valor={dados.totais.alunos} />
              <Indicador rotulo="Professores" valor={dados.totais.professores} />
              <Indicador rotulo="Turmas" valor={dados.totais.turmas} />
              <Indicador rotulo="Aulas geradas (30 dias)" valor={dados.totais.aulas_30d} cor="#534AB7" />
              <Indicador rotulo="Taxa de frequência" valor={dados.frequencia.taxa} sufixo="%" cor={dados.frequencia.taxa !== null && dados.frequencia.taxa < 75 ? "#a32d2d" : "#4CAF82"} />
              <Indicador rotulo="Média de notas (0-10)" valor={dados.desempenho.media_notas} cor={dados.desempenho.media_notas !== null && dados.desempenho.media_notas < 6 ? "#BA7517" : "#4CAF82"} />
            </div>

            {/* PEI / AEE */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={cardStyle}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#534AB7", margin: "0 0 6px" }}>📋 PEI</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  {dados.documentos.pei.concluidos} concluído(s) de {dados.documentos.pei.total} gerado(s)
                </p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#2B9EC3", margin: "0 0 6px" }}>♿ Planos AEE</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  {dados.documentos.aee.concluidos} concluído(s) de {dados.documentos.aee.total} gerado(s)
                </p>
              </div>
            </div>

            {/* Perfis NEE */}
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Alunos por perfil de NEE</p>
              {Object.keys(dados.nee_por_tipo).length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Nenhum aluno cadastrado.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(dados.nee_por_tipo).map(([tipo, qtd]) => (
                    <span key={tipo} style={{ fontSize: 12, padding: "4px 12px", background: "#e8f7fd", color: "#1a6e8a", borderRadius: 20 }}>
                      {tipo}: <strong>{qtd}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Alertas pedagógicos */}
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>
                ⚠️ Alertas pedagógicos ({dados.alertas_pedagogicos.length})
              </p>
              {dados.alertas_pedagogicos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#0F6E56", margin: 0 }}>✅ Nenhum alerta — frequência e desempenho dentro do esperado.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                  {dados.alertas_pedagogicos.map((a, i) => (
                    <li key={i} style={{ fontSize: 13, color: "#854F0B" }}>
                      <strong>{a.student}</strong> — {a.message || a.type}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Predições */}
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>📈 Tendência por aluno</p>
              {dados.predicoes.length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Sem dados de avaliação suficientes.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dados.predicoes.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "6px 10px", background: "#f5f9ff", borderRadius: 6 }}>
                      <span>{p.student}</span>
                      <span style={{ color: "#5f5e5a" }}>média {p.averageScore} · {p.prediction}</span>
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
