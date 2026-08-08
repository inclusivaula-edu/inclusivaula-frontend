import { useState, useEffect } from "react";
import { getNetworkInvite, rotateNetworkInvite } from "../services/mapiClient";

const cardStyle = {
  background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
  padding: "1.2rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
};

/**
 * Código para a secretaria trazer a própria equipe.
 *
 * Quem entra por ele recebe acesso de rede — números agregados das escolas, sem
 * o aluno individual. A primeira conta de cada rede não vem daqui: é
 * provisionada pela equipe InclusivAula, porque um código sozinho não comprova
 * que alguém trabalha na secretaria.
 */
export default function ConviteRede({ networkId }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [trocando, setTrocando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    let ativo = true;
    getNetworkInvite(networkId || null)
      .then(r => { if (ativo) setDados(r.data); })
      .catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [networkId]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(dados.inviteCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o código manualmente.");
    }
  }

  async function trocar() {
    setTrocando(true);
    setErro(null);
    try {
      const r = await rotateNetworkInvite(networkId || null);
      setDados(d => ({ ...d, inviteCode: r.data.inviteCode }));
      setConfirmando(false);
    } catch (e) {
      setErro(e.message);
    } finally {
      setTrocando(false);
    }
  }

  if (erro && !dados) return null;   // sem permissão ou sem rede: o card só some
  if (!dados) return null;

  return (
    <div style={{ ...cardStyle, marginBottom: 20 }}>
      <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>🔑 Convidar equipe da secretaria</p>
      <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
        Quem entrar com este código acompanha os números da rede, sem acesso aos dados
        individuais dos alunos. Hoje há {dados.membrosDaRede} pessoa(s) com acesso de rede.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <code style={{
          fontSize: 20, fontWeight: 600, letterSpacing: 2, color: "#0F6E56",
          background: "#edfff6", padding: "8px 16px", borderRadius: 8
        }}>{dados.inviteCode}</code>
        <button onClick={copiar} style={{
          padding: "8px 14px", borderRadius: 8, fontSize: 13,
          border: "1px solid #0F6E56", background: "#fff", color: "#0F6E56", cursor: "pointer"
        }}>{copiado ? "✅ Copiado" : "Copiar"}</button>

        {!confirmando ? (
          <button onClick={() => setConfirmando(true)} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 13,
            border: "0.5px solid #d3d1c7", background: "#fff", color: "#5f5e5a", cursor: "pointer"
          }}>Gerar novo</button>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#854F0B" }}>
            O código atual deixa de funcionar. Confirma?
            <button onClick={trocar} disabled={trocando} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12,
              border: "1px solid #a32d2d", background: "#fff", color: "#a32d2d", cursor: "pointer"
            }}>{trocando ? "Gerando..." : "Sim, trocar"}</button>
            <button onClick={() => setConfirmando(false)} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12,
              border: "0.5px solid #d3d1c7", background: "#fff", cursor: "pointer"
            }}>Cancelar</button>
          </span>
        )}
      </div>

      {erro && <p style={{ fontSize: 12, color: "#a32d2d", margin: "10px 0 0" }}>{erro}</p>}
    </div>
  );
}
