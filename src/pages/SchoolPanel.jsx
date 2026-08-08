import { useState, useEffect } from "react";
import SecaoPainel from "../components/SecaoPainel";
import { useNavigate } from "react-router-dom";
import { getSchoolPanel } from "../services/mapiClient";
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

        {loading && <p role="status">Carregando indicadores...</p>}
        {error && (
          <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f" }}>
            {error}
          </div>
        )}

        {dados && (
          <>
            <SecaoPainel titulo="Panorama da escola"
              descricao="Quantos alunos, quantos com NEE e o estado geral do atendimento." />

            {/* Indicadores principais */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
              <Indicador rotulo="Alunos" valor={dados.totais.alunos} />
              <Indicador rotulo="Professores" valor={dados.totais.professores} />
              <Indicador rotulo="Turmas" valor={dados.totais.turmas} />
              <Indicador rotulo="Aulas geradas (30 dias)" valor={dados.totais.aulas_30d} cor="#534AB7" />
              <Indicador rotulo="Taxa de frequência" valor={dados.frequencia.taxa} sufixo="%" cor={dados.frequencia.taxa !== null && dados.frequencia.taxa < 75 ? "#a32d2d" : "#4CAF82"} />
              <Indicador rotulo="Média de notas (0-10)" valor={dados.desempenho.media_notas} cor={dados.desempenho.media_notas !== null && dados.desempenho.media_notas < 6 ? "#BA7517" : "#4CAF82"} />
            </div>

            <SecaoPainel titulo="Situação documental"
              descricao="O que falta produzir por aluno, e o recurso do FUNDEB que depende dessa comprovação." />

            {/* Pendências documentais — o raio-X da inclusão */}
            {dados.pendencias_documentais && dados.pendencias_documentais.total_nee > 0 && (
              <div style={{ ...cardStyle, marginBottom: 24, border: "1px solid #BA7517" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#854F0B", margin: "0 0 4px" }}>
                  📌 Pendências documentais — alunos com NEE
                </p>
                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
                  {dados.pendencias_documentais.total_nee} aluno(s) com NEE ·{" "}
                  <strong style={{ color: dados.pendencias_documentais.sem_estudo_caso ? "#a32d2d" : "#0F6E56" }}>
                    {dados.pendencias_documentais.sem_estudo_caso} sem estudo de caso
                  </strong>{" · "}
                  <strong style={{ color: dados.pendencias_documentais.sem_pei ? "#a32d2d" : "#0F6E56" }}>
                    {dados.pendencias_documentais.sem_pei} sem PEI
                  </strong>{" · "}
                  <strong style={{ color: dados.pendencias_documentais.sem_paee ? "#a32d2d" : "#0F6E56" }}>
                    {dados.pendencias_documentais.sem_paee} sem PAEE
                  </strong>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                  {dados.pendencias_documentais.alunos.map(a => (
                    <div key={a.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 10px", background: "#fffbf3", borderRadius: 8 }}>
                      <span style={{ flex: 1, minWidth: 140 }}><strong>{a.nome}</strong> <span style={{ color: "#9b9a96" }}>({a.nee})</span></span>
                      {[
                        ["Estudo de caso", a.tem_estudo_caso, "/estudo-caso"],
                        ["PEI", a.tem_pei, "/pei"],
                        ["PAEE", a.tem_paee, "/aee"]
                      ].map(([rotulo, tem, rota]) => (
                        <button key={rotulo} onClick={() => !tem && navigate(rota)} disabled={tem}
                          title={tem ? `${rotulo} concluído` : `Gerar ${rotulo} agora`}
                          style={{
                            fontSize: 11, padding: "3px 10px", borderRadius: 12,
                            border: "none", cursor: tem ? "default" : "pointer",
                            background: tem ? "#edfff6" : "#fcebeb",
                            color: tem ? "#0F6E56" : "#791f1f", fontWeight: 600
                          }}>
                          {tem ? `✓ ${rotulo}` : `✗ ${rotulo}`}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frequência do AEE — base do FUNDEB */}
            {dados.frequencia_aee && dados.frequencia_aee.total_nee > 0 && (
              <div style={{ ...cardStyle, marginBottom: 24, border: "1px solid #0F6E56" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0F6E56", margin: "0 0 4px" }}>
                  🩺 Frequência do AEE (base do FUNDEB)
                </p>
                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
                  Últimos 30 dias: <strong>{dados.frequencia_aee.sessoes_30d}</strong> sessão(ões) ·{" "}
                  <strong>{dados.frequencia_aee.alunos_atendidos_30d}</strong> de {dados.frequencia_aee.total_nee} aluno(s) com NEE atendido(s).
                  {" "}O FUNDEB gera recurso pela matrícula declarada no Censo Escolar — mas a legitimidade
                  desse recurso depende de comprovar que o atendimento aconteceu (PEI atualizado,
                  profissional habilitado e registro pedagógico).
                </p>

                {/* Estimativa financeira do recurso vinculado */}
                {dados.fundeb && dados.fundeb.total_nee > 0 && (
                  <div style={{ background: "#f0f8ff", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                      <div>
                        <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: dados.fundeb.alunos_sem_comprovacao > 0 ? "#a32d2d" : "#0F6E56" }}>
                          {dados.fundeb.valor_a_comprovar.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <p style={{ fontSize: 11, color: "#5f5e5a", margin: "2px 0 0" }}>
                          vinculado a {dados.fundeb.alunos_sem_comprovacao} aluno(s) sem comprovação de atendimento
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "#0F6E56" }}>
                          {dados.fundeb.valor_total_vinculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <p style={{ fontSize: 11, color: "#5f5e5a", margin: "2px 0 0" }}>
                          total vinculado aos {dados.fundeb.total_nee} aluno(s) com NEE
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: 10, color: "#9b9a96", margin: "8px 0 0" }}>
                      Estimativa: VAAF {dados.fundeb.vaaf.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ×
                      {" "}fator AEE {dados.fundeb.fator_aee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} = {dados.fundeb.valor_por_aluno_ano.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/aluno/ano
                      {" "}({dados.fundeb.ano_referencia}). {dados.fundeb.fonte}. Confira os valores na portaria vigente antes de uso oficial.
                    </p>
                  </div>
                )}
                {dados.frequencia_aee.sem_atendimento_30d.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#0F6E56", margin: 0 }}>✅ Todos os alunos com NEE têm atendimento registrado nos últimos 30 dias.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                    {dados.frequencia_aee.sem_atendimento_30d.map(a => (
                      <div key={a.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 10px", background: "#fff5f5", borderRadius: 8 }}>
                        <span style={{ flex: 1, minWidth: 140 }}><strong>{a.nome}</strong> <span style={{ color: "#9b9a96" }}>({a.nee})</span></span>
                        <span style={{ fontSize: 12, color: "#791f1f", fontWeight: 600 }}>
                          {a.ultima_sessao === null
                            ? "nunca atendido"
                            : `${a.dias_sem_atendimento} dias sem atendimento (último: ${new Date(a.ultima_sessao).toLocaleDateString("pt-BR")})`}
                        </span>
                        <button onClick={() => navigate("/agenda")} style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 12, border: "1px solid #0F6E56",
                          background: "#fff", color: "#0F6E56", cursor: "pointer", fontWeight: 600
                        }}>
                          📅 Agendar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documentos por tipo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              <div style={cardStyle}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#BA7517", margin: "0 0 6px" }}>🔎 Estudo de Caso</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  {dados.documentos.estudo_caso?.concluidos ?? 0} concluído(s) de {dados.documentos.estudo_caso?.total ?? 0}
                </p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#534AB7", margin: "0 0 6px" }}>📋 PEI</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  {dados.documentos.pei.concluidos} concluído(s) de {dados.documentos.pei.total}
                </p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#0F6E56", margin: "0 0 6px" }}>🗂 PDI</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  {dados.documentos.pdi?.concluidos ?? 0} concluído(s) de {dados.documentos.pdi?.total ?? 0}
                </p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#2B9EC3", margin: "0 0 6px" }}>♿ PAEE</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  {dados.documentos.aee.concluidos} concluído(s) de {dados.documentos.aee.total}
                </p>
              </div>
            </div>

            <SecaoPainel titulo="Estrutura e evolução"
              descricao="Se a escola tem os recursos que o perfil dos alunos exige, e como isso muda no tempo." />

            {/* Estrutura de AEE × perfil de NEE matriculado */}
            {dados.estrutura_gaps && dados.estrutura_gaps.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 24, border: "1px solid #a32d2d" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#791f1f", margin: "0 0 4px" }}>
                  ♿ Lacunas de estrutura de AEE
                </p>
                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
                  Cruzamento entre o perfil de NEE dos alunos matriculados e o inventário cadastrado em Minha Escola.
                  Use esta lista como justificativa em pedido de recurso à secretaria.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dados.estrutura_gaps.map((g, i) => (
                    <div key={i} style={{ fontSize: 13, padding: "6px 10px", background: "#fff5f5", borderRadius: 8, color: "#791f1f" }}>
                      ⚠️ {g.mensagem}
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate("/escola")} style={{
                  marginTop: 10, fontSize: 12, padding: "5px 12px", borderRadius: 8,
                  border: "1px solid #a32d2d", background: "#fff", color: "#a32d2d", cursor: "pointer"
                }}>
                  Atualizar estrutura de AEE
                </button>
              </div>
            )}

            {/* Evolução mensal — o painel era só foto do momento */}
            {dados.evolucao_mensal?.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>📈 Evolução da escola (últimos 6 meses)</p>
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

            <SecaoPainel titulo="Equipe e acompanhamento"
              descricao="Quem está registrando o trabalho e como os alunos evoluem." />

            {/* Uso da plataforma pelos professores */}
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 6px" }}>👩‍🏫 Uso da plataforma pelos professores</p>
              <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                <strong style={{ color: dados.uso_professores.total > 0 && dados.uso_professores.ativos_30d === 0 ? "#a32d2d" : "#0F6E56" }}>
                  {dados.uso_professores.ativos_30d}
                </strong> de {dados.uso_professores.total} professor(es) geraram ao menos uma aula nos últimos 30 dias
                {" · "}{dados.profissionais_aee} profissional(is) de AEE cadastrado(s)
              </p>
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
