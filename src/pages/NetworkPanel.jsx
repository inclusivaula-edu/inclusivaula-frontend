import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNetworkPanel } from "../services/mapiClient";
import icone from "../assets/icone.png";

const cardStyle = {
  background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
  padding: "1.2rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
};

export default function NetworkPanel() {
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNetworkPanel()
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
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>🏛️ Painel da Rede de Ensino</h1>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Visão consolidada de todas as escolas da rede — secretaria de educação
        </p>

        {loading && <p role="status">Carregando dados da rede...</p>}
        {error && (
          <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f" }}>
            {error}
          </div>
        )}

        {dados && (
          <>
            <div style={{ ...cardStyle, marginBottom: 20, background: "linear-gradient(135deg, #e8f7fd, #edfff6)" }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#1a6e8a" }}>{dados.rede.name}</p>
              <p style={{ fontSize: 12, color: "#5f5e5a", margin: "4px 0 0" }}>
                Rede {dados.rede.type}{dados.rede.city ? ` · ${dados.rede.city}` : ""}{dados.rede.state ? `/${dados.rede.state}` : ""}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                ["Escolas", dados.total_escolas, "#2B9EC3"],
                ["Alunos", dados.totais.alunos, "#2B9EC3"],
                ["Professores", dados.totais.professores, "#2B9EC3"],
                ["PEIs concluídos", dados.totais.pei_concluidos, "#534AB7"],
                ["PAEEs concluídos", dados.totais.aee_concluidos, "#4CAF82"]
              ].map(([rotulo, valor, cor]) => (
                <div key={rotulo} style={cardStyle}>
                  <p style={{ fontSize: 26, fontWeight: 600, color: cor, margin: 0 }}>{valor}</p>
                  <p style={{ fontSize: 12, color: "#5f5e5a", margin: "4px 0 0" }}>{rotulo}</p>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 12px" }}>Escolas da rede</p>
              {dados.escolas.length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  Nenhuma escola vinculada à rede ainda.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#5f5e5a", borderBottom: "1px solid #d3d1c7" }}>
                        <th scope="col" style={{ padding: "8px 6px" }}>Escola</th>
                        <th scope="col" style={{ padding: "8px 6px" }}>Cidade</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>Alunos</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>Professores</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>PEIs</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>AEE</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>Frequência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.escolas.map(e => (
                        <tr key={e.id} style={{ borderBottom: "0.5px solid #f1efe8" }}>
                          <td style={{ padding: "8px 6px", fontWeight: 500 }}>{e.nome}</td>
                          <td style={{ padding: "8px 6px", color: "#5f5e5a" }}>{e.cidade || "—"}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{e.alunos}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{e.professores}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{e.pei_concluidos}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{e.aee_concluidos}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: e.taxa_frequencia !== null && e.taxa_frequencia < 75 ? "#a32d2d" : "#0F6E56" }}>
                            {e.taxa_frequencia === null ? "—" : `${e.taxa_frequencia}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
