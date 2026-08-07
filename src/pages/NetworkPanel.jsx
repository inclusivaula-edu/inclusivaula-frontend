import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNetworkPanel, listManagementNetworks } from "../services/mapiClient";
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
  const [redes, setRedes] = useState([]);
  const [redeId, setRedeId] = useState("");

  // Carrega as redes visíveis. Para secretaria vem só a própria rede;
  // admin/mec não pertencem a uma rede e precisam escolher qual ver.
  useEffect(() => {
    listManagementNetworks()
      .then(res => {
        const lista = res.data || [];
        setRedes(lista);
        if (lista.length === 1) setRedeId(lista[0].id);
        else if (lista.length === 0) carregarPainel(null);
      })
      .catch(() => carregarPainel(null));
  }, []);

  useEffect(() => {
    if (redeId) carregarPainel(redeId);
  }, [redeId]);

  function carregarPainel(id) {
    setLoading(true);
    setError(null);
    getNetworkPanel(id)
      .then(res => setDados(res.data))
      .catch(err => { setError(err.message); setDados(null); })
      .finally(() => setLoading(false));
  }

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

        {redes.length > 1 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <label htmlFor="seletor-rede" style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
              Rede de ensino
            </label>
            <select id="seletor-rede" value={redeId} onChange={e => setRedeId(e.target.value)}
              style={{ width: "100%", maxWidth: 420, boxSizing: "border-box" }}>
              <option value="">Selecione uma rede</option>
              {redes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.city ? ` — ${r.city}` : ""}{r.state ? `/${r.state}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && <p role="status">Carregando dados da rede...</p>}
        {error && (
          <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f" }}>
            {error}
            {redes.length === 0 && (
              <p style={{ margin: "8px 0 0" }}>
                Nenhuma rede cadastrada ainda. Crie a rede em{" "}
                <button onClick={() => navigate("/admin")} style={{ background: "none", border: "none", padding: 0, color: "#2B9EC3", textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>
                  Administração Global
                </button>{" "}
                e vincule as escolas a ela.
              </p>
            )}
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
                ["Alunos com NEE", dados.totais.total_nee, "#0F6E56"],
                ["PEIs concluídos", dados.totais.pei_concluidos, "#534AB7"],
                ["PAEEs concluídos", dados.totais.aee_concluidos, "#4CAF82"]
              ].map(([rotulo, valor, cor]) => (
                <div key={rotulo} style={cardStyle}>
                  <p style={{ fontSize: 26, fontWeight: 600, color: cor, margin: 0 }}>{valor}</p>
                  <p style={{ fontSize: 12, color: "#5f5e5a", margin: "4px 0 0" }}>{rotulo}</p>
                </div>
              ))}
            </div>

            {/* Cobertura de infraestrutura — sustenta pedido de recurso à rede */}
            {dados.cobertura_estrutura && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>♿ Cobertura de estrutura de AEE na rede</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ fontSize: 20, color: dados.cobertura_estrutura.percentual_com_srm < 50 ? "#a32d2d" : "#0F6E56" }}>
                      {dados.cobertura_estrutura.percentual_com_srm ?? "—"}%
                    </strong>
                    <p style={{ margin: "2px 0 0", color: "#5f5e5a" }}>
                      das escolas têm Sala de Recursos Multifuncionais ({dados.cobertura_estrutura.escolas_com_srm} de {dados.total_escolas})
                    </p>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ fontSize: 20, color: dados.cobertura_estrutura.escolas_sem_profissional_aee > 0 ? "#a32d2d" : "#0F6E56" }}>
                      {dados.cobertura_estrutura.escolas_sem_profissional_aee}
                    </strong>
                    <p style={{ margin: "2px 0 0", color: "#5f5e5a" }}>
                      escola(s) com aluno NEE e nenhum profissional de AEE cadastrado
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FUNDEB agregado da rede */}
            {dados.fundeb_rede && dados.fundeb_rede.total_nee > 0 && (
              <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid #0F6E56" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0F6E56", margin: "0 0 4px" }}>🩺 Frequência do AEE — base do FUNDEB (rede)</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  <strong>{dados.fundeb_rede.sessoes_30d}</strong> sessão(ões) registradas nos últimos 30 dias na rede ·{" "}
                  <strong style={{ color: dados.fundeb_rede.alunos_sem_atendimento_30d > 0 ? "#a32d2d" : "#0F6E56" }}>
                    {dados.fundeb_rede.alunos_sem_atendimento_30d}
                  </strong> de {dados.fundeb_rede.total_nee} aluno(s) com NEE sem comprovação de atendimento.
                </p>
                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "6px 0 0" }}>
                  O recurso vem da matrícula declarada no Censo Escolar; a comprovação do atendimento
                  (PEI, profissional habilitado, registro pedagógico) é o que sustenta esse recurso em fiscalização.
                </p>

                {dados.fundeb_rede.valor_a_comprovar !== undefined && (
                  <div style={{ background: "#f0f8ff", borderRadius: 8, padding: "10px 14px", marginTop: 10 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                      <div>
                        <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: dados.fundeb_rede.alunos_sem_comprovacao > 0 ? "#a32d2d" : "#0F6E56" }}>
                          {dados.fundeb_rede.valor_a_comprovar.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <p style={{ fontSize: 11, color: "#5f5e5a", margin: "2px 0 0" }}>
                          exige comprovação documental na rede
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "#0F6E56" }}>
                          {dados.fundeb_rede.valor_total_vinculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <p style={{ fontSize: 11, color: "#5f5e5a", margin: "2px 0 0" }}>
                          total anual vinculado ao AEE na rede
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: 10, color: "#9b9a96", margin: "8px 0 0" }}>
                      Estimativa: VAAF {dados.fundeb_rede.vaaf?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ×
                      {" "}fator AEE {dados.fundeb_rede.fator_aee} ({dados.fundeb_rede.ano_referencia}).
                      {" "}{dados.fundeb_rede.fonte}. Confira a portaria vigente antes de uso oficial.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Formação docente — Res. CNE/CEB 4/2009 art. 12 */}
            {dados.formacao_docente && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>🎓 Formação docente na rede</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ fontSize: 20, color: "#0F6E56" }}>{dados.formacao_docente.profissionais_aee}</strong>
                    <p style={{ margin: "2px 0 0", color: "#5f5e5a" }}>profissional(is) de AEE na rede</p>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ fontSize: 20, color: dados.formacao_docente.aee_sem_formacao > 0 ? "#a32d2d" : "#0F6E56" }}>
                      {dados.formacao_docente.aee_sem_formacao}
                    </strong>
                    <p style={{ margin: "2px 0 0", color: "#5f5e5a" }}>
                      atuando no AEE sem formação registrada (Res. CNE/CEB 4/2009, art. 12)
                    </p>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ fontSize: 20, color: "#5f5e5a" }}>
                      {dados.formacao_docente.professores_sem_disciplina}
                    </strong>
                    <p style={{ margin: "2px 0 0", color: "#5f5e5a" }}>
                      de {dados.formacao_docente.total_professores} professor(es) sem disciplina cadastrada
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Evolução mensal da rede */}
            {dados.evolucao_mensal?.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>📈 Evolução da rede (últimos 6 meses)</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#5f5e5a", borderBottom: "1px solid #d3d1c7" }}>
                        <th scope="col" style={{ padding: "6px 8px" }}>Mês</th>
                        <th scope="col" style={{ padding: "6px 8px", textAlign: "right" }}>Aulas geradas</th>
                        <th scope="col" style={{ padding: "6px 8px", textAlign: "right" }}>Documentos concluídos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.evolucao_mensal.map(m => (
                        <tr key={m.mes} style={{ borderBottom: "0.5px solid #f1efe8" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 500 }}>{m.mes}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: m.aulas === 0 ? "#9b9a96" : "inherit" }}>{m.aulas}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: m.documentos === 0 ? "#9b9a96" : "inherit" }}>{m.documentos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ranking de risco — onde a rede precisa intervir primeiro */}
            {dados.escolas_por_risco && dados.escolas_por_risco.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>📊 Escolas por prioridade de atenção</p>
                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
                  Ordenadas por pendência documental — PEI/PDI, PAEE e Estudo de Caso faltantes de alunos com NEE.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dados.escolas_por_risco.map((e, i) => (
                    <div key={e.id} style={{
                      display: "flex", alignItems: "center", gap: 10, fontSize: 13,
                      padding: "8px 10px", borderRadius: 8,
                      background: e.pendencias_count > 0 ? "#fffbf3" : "#f5f9ff"
                    }}>
                      <span style={{ color: "#9b9a96", minWidth: 18 }}>{i + 1}º</span>
                      <span style={{ flex: 1, fontWeight: 500 }}>{e.nome}</span>
                      {e.estrutura_gaps_count > 0 && (
                        <span style={{ fontSize: 11, color: "#a32d2d" }}>⚠️ {e.estrutura_gaps_count} lacuna(s) de estrutura</span>
                      )}
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12,
                        background: e.pendencias_count > 0 ? "#fcebeb" : "#edfff6",
                        color: e.pendencias_count > 0 ? "#791f1f" : "#0F6E56"
                      }}>
                        {e.pendencias_count} pendência(s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>NEE</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>PEIs</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>AEE</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>Prof. AEE</th>
                        <th scope="col" style={{ padding: "8px 6px", textAlign: "right" }}>SRM</th>
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
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{e.total_nee}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{e.pei_concluidos}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{e.aee_concluidos}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: e.total_nee > 0 && e.profissionais_aee === 0 ? "#a32d2d" : "inherit" }}>
                            {e.profissionais_aee}
                            {e.aee_sem_formacao > 0 && (
                              <span title={`${e.aee_sem_formacao} sem formação registrada`} style={{ color: "#a32d2d", marginLeft: 4 }}>⚠️</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{e.tem_srm ? "✓" : "—"}</td>
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
