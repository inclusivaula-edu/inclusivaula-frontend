import { useState, useEffect } from "react";
import SecaoPainel from "../components/SecaoPainel";
import { useNavigate } from "react-router-dom";
import {
  getGlobalPanel,
  listAllNetworks, createNetworkAdmin, updateNetworkAdmin, deleteNetworkAdmin,
  listAllSchools, createSchoolAdmin, updateSchoolAdmin, deleteSchoolAdmin,
  listAllUsers, updateUserVinculo
} from "../services/mapiClient";
import icone from "../assets/icone.png";

const cardStyle = {
  background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
  padding: "1.2rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
};
const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };
const inputFull = { width: "100%", boxSizing: "border-box" };
const btnBase = { padding: "8px 16px", borderRadius: 8, border: "0.5px solid #d3d1c7", fontSize: 13, fontWeight: 500, cursor: "pointer" };
const btnSmall = { ...btnBase, padding: "4px 10px", fontSize: 11 };

const TIPOS_REDE = ["municipal", "estadual", "federal", "privada"];
const PAPEIS = ["professor", "coordenador", "diretor", "secretaria", "mec", "admin"];
const PAPEL_DESC = {
  professor: "vê apenas os próprios alunos e documentos",
  coordenador: "vê toda a escola",
  diretor: "gestão completa da escola",
  secretaria: "vê todas as escolas da rede vinculada",
  mec: "panorama nacional (dados agregados)",
  admin: "acesso global e gestão da plataforma"
};

// Papéis que atuam acima da escola. Espelha ROLES_DE_REDE do backend, que é
// quem de fato recusa o vínculo — aqui é só para orientar quem preenche.
const ROLES_DE_REDE = ["secretaria", "mec"];

// Quem opera o sistema nesses níveis é o departamento, não o titular da pasta:
// secretário e ministro mudam a cada gestão. Lista aberta — o nome do setor
// varia em cada rede, então o campo aceita texto livre.
const FUNCOES_REDE = [
  "Educação Especial / AEE",
  "Coordenação pedagógica da rede",
  "Equipe técnica / Censo",
  "Gabinete / Secretário(a)",
  "SECADI — Educação Especial",
  "INEP / Censo Escolar"
];
const FUNCOES_ESCOLA = [
  "Professor(a)", "Coordenador(a) pedagógico(a)", "Diretor(a)",
  "Profissional de AEE", "Psicólogo(a) escolar"
];

const redeVazia = () => ({ name: "", type: "municipal", city: "", state: "" });
const escolaVazia = () => ({ name: "", city: "", state: "", network_id: "" });

export default function AdminPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("panorama");
  const [panorama, setPanorama] = useState(null);
  const [periodo, setPeriodo] = useState("6m");
  const [carregandoPanorama, setCarregandoPanorama] = useState(false);
  const [redes, setRedes] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const [formRede, setFormRede] = useState(redeVazia());
  const [editandoRede, setEditandoRede] = useState(null);
  const [formEscola, setFormEscola] = useState(escolaVazia());
  const [editandoEscola, setEditandoEscola] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [formUsuario, setFormUsuario] = useState({ role: "", network_id: "", school_id: "", cargo: "" });

  const ehPapelDeRede = ROLES_DE_REDE.includes(formUsuario.role);

  useEffect(() => { carregarTudo(); }, []);

  // O período só afeta o painel MEC (aulas/documentos/evolução) — redes,
  // escolas e usuários não têm noção de "período", então recarregam só o
  // panorama em vez de tudo de novo.
  useEffect(() => {
    if (!panorama) return; // evita disparo duplicado no primeiro carregamento
    carregarPanorama(periodo);
  }, [periodo]);

  async function carregarPanorama(periodoSelecionado) {
    setCarregandoPanorama(true);
    try {
      const pRes = await getGlobalPanel(periodoSelecionado);
      setPanorama(pRes.data);
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao carregar panorama.", "erro");
    } finally {
      setCarregandoPanorama(false);
    }
  }

  async function carregarTudo() {
    setLoading(true);
    try {
      const [pRes, rRes, eRes, uRes] = await Promise.all([
        getGlobalPanel(periodo), listAllNetworks(), listAllSchools(), listAllUsers()
      ]);
      setPanorama(pRes.data);
      setRedes(rRes.data || []);
      setEscolas(eRes.data || []);
      setUsuarios(uRes.data || []);
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao carregar dados.", "erro");
    } finally {
      setLoading(false);
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function handleSalvarRede() {
    if (!formRede.name.trim()) { mostrarFeedback("Nome da rede é obrigatório.", "erro"); return; }
    setSalvando(true);
    try {
      if (editandoRede) {
        await updateNetworkAdmin(editandoRede, formRede);
        mostrarFeedback("Rede atualizada!");
      } else {
        await createNetworkAdmin(formRede);
        mostrarFeedback("Rede criada!");
      }
      setFormRede(redeVazia());
      setEditandoRede(null);
      const r = await listAllNetworks();
      setRedes(r.data || []);
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao salvar rede.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  function handleEditarRede(rede) {
    setFormRede({ name: rede.name || "", type: rede.type || "municipal", city: rede.city || "", state: rede.state || "" });
    setEditandoRede(rede.id);
  }

  async function handleExcluirRede(id) {
    if (!window.confirm("Excluir esta rede? As escolas vinculadas ficarão sem rede.")) return;
    try {
      await deleteNetworkAdmin(id);
      setRedes(prev => prev.filter(r => r.id !== id));
      mostrarFeedback("Rede excluída.");
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao excluir rede.", "erro");
    }
  }

  async function handleSalvarEscola() {
    if (!formEscola.name.trim()) { mostrarFeedback("Nome da escola é obrigatório.", "erro"); return; }
    setSalvando(true);
    try {
      const payload = { ...formEscola, network_id: formEscola.network_id || null };
      if (editandoEscola) {
        await updateSchoolAdmin(editandoEscola, payload);
        mostrarFeedback("Escola atualizada!");
      } else {
        await createSchoolAdmin(payload);
        mostrarFeedback("Escola criada!");
      }
      setFormEscola(escolaVazia());
      setEditandoEscola(null);
      const e = await listAllSchools();
      setEscolas(e.data || []);
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao salvar escola.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  function handleEditarEscola(escola) {
    setFormEscola({ name: escola.name || "", city: escola.city || "", state: escola.state || "", network_id: escola.network_id || "" });
    setEditandoEscola(escola.id);
  }

  async function handleExcluirEscola(id) {
    if (!window.confirm("Excluir esta escola? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteSchoolAdmin(id);
      setEscolas(prev => prev.filter(e => e.id !== id));
      mostrarFeedback("Escola excluída.");
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao excluir escola.", "erro");
    }
  }

  function handleEditarUsuario(u) {
    setFormUsuario({
      role: u.role || "", network_id: u.network_id || "",
      school_id: u.school_id || "", cargo: u.cargo || ""
    });
    setEditandoUsuario(u.id);
  }

  async function handleSalvarUsuario(id) {
    setSalvando(true);
    try {
      const res = await updateUserVinculo(id, formUsuario);
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...res.data } : u));
      setEditandoUsuario(null);
      mostrarFeedback("Vínculo atualizado!");
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao atualizar vínculo.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function copiarConvite(codigo) {
    try {
      await navigator.clipboard.writeText(codigo);
      mostrarFeedback(`Código ${codigo} copiado!`);
    } catch {
      mostrarFeedback(`Código: ${codigo}`, "erro");
    }
  }

  const nomeRede = (id) => redes.find(r => r.id === id)?.name || "—";
  const nomeEscola = (id) => escolas.find(e => e.id === id)?.name || "—";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999
        }}>{feedback.msg}</div>
      )}
      <header style={{ background: "#fff", borderBottom: "0.5px solid #d3d1c7", padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span></span>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>🌐 Administração Global</h1>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Panorama de toda a plataforma e gestão de escolas e redes de ensino — acesso restrito a administrador
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            ["panorama", "Panorama"],
            ["redes", `Redes (${redes.length})`],
            ["escolas", `Escolas (${escolas.length})`],
            ["usuarios", `Usuários (${usuarios.length})`]
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              ...btnBase,
              background: tab === k ? "#2B9EC3" : "#fff",
              color: tab === k ? "#fff" : "#5f5e5a",
              borderColor: tab === k ? "#2B9EC3" : "#d3d1c7"
            }}>{l}</button>
          ))}
        </div>

        {loading && <p role="status">Carregando...</p>}

        {!loading && tab === "panorama" && panorama && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div>
              <label htmlFor="periodo-mec" style={{ fontSize: 12, color: "#5f5e5a", display: "block", marginBottom: 4 }}>
                Período (aulas, documentos e evolução mensal)
              </label>
              <select id="periodo-mec" value={periodo} onChange={e => setPeriodo(e.target.value)}
                disabled={carregandoPanorama} style={{ fontSize: 13, padding: "6px 10px" }}>
                <option value="30d">Últimos 30 dias</option>
                <option value="3m">Últimos 3 meses</option>
                <option value="6m">Últimos 6 meses</option>
                <option value="12m">Últimos 12 meses</option>
                <option value="total">Total (desde o início)</option>
              </select>
            </div>
            <p style={{ fontSize: 11, color: "#9b9a96", margin: 0, maxWidth: 320, textAlign: "right" }}>
              Redes, escolas, alunos e cobertura de estrutura são sempre o retrato de agora — só a
              atividade (aulas, documentos, evolução) muda com o período.
            </p>
          </div>
        )}

        {!loading && tab === "panorama" && panorama && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, opacity: carregandoPanorama ? 0.5 : 1 }}>
            {[
              ["Redes de ensino", panorama.redes, "#0F6E56"],
              ["Escolas", panorama.escolas, "#2B9EC3"],
              ["Alunos", panorama.alunos, "#2B9EC3"],
              ["Professores", panorama.professores, "#2B9EC3"],
              ["Aulas geradas", panorama.aulas_geradas, "#534AB7"],
              ["PEIs concluídos", panorama.peis_concluidos, "#534AB7"],
              ["PAEEs concluídos", panorama.aees_concluidos, "#4CAF82"]
            ].map(([rotulo, valor, cor]) => (
              <div key={rotulo} style={cardStyle}>
                <p style={{ fontSize: 26, fontWeight: 600, color: cor, margin: 0 }}>{valor}</p>
                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "4px 0 0" }}>{rotulo}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "panorama" && panorama && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16, opacity: carregandoPanorama ? 0.5 : 1 }}>

            <SecaoPainel titulo="Alcance da política"
              descricao="Onde a educação especial está sendo atendida no país." />

            {/* Distribuição geográfica */}
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>🗺️ Distribuição geográfica</p>
              {Object.keys(panorama.distribuicao_geografica?.escolas_por_estado || {}).length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Nenhuma escola cadastrada ainda.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#5f5e5a", borderBottom: "1px solid #d3d1c7" }}>
                        <th scope="col" style={{ padding: "6px 8px" }}>UF</th>
                        <th scope="col" style={{ padding: "6px 8px", textAlign: "right" }}>Redes</th>
                        <th scope="col" style={{ padding: "6px 8px", textAlign: "right" }}>Escolas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(panorama.distribuicao_geografica.escolas_por_estado)
                        .sort((a, b) => b[1] - a[1])
                        .map(([uf, qtdEscolas]) => (
                          <tr key={uf} style={{ borderBottom: "0.5px solid #f1efe8" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 500 }}>{uf}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right" }}>{panorama.distribuicao_geografica.redes_por_estado[uf] || 0}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right" }}>{qtdEscolas}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {/* Perfis de NEE — agregado nacional, anônimo */}
              <div style={cardStyle}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>♿ Perfis de NEE (agregado nacional)</p>
                {Object.keys(panorama.nee_nacional || {}).length === 0 ? (
                  <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Nenhum aluno com NEE cadastrado.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(panorama.nee_nacional).sort((a, b) => b[1] - a[1]).map(([tipo, qtd]) => (
                      <span key={tipo} style={{ fontSize: 12, padding: "4px 12px", background: "#e8f7fd", color: "#1a6e8a", borderRadius: 20 }}>
                        {tipo}: <strong>{qtd}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Cobertura de SRM nacional */}
              <div style={cardStyle}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>🏫 Cobertura de Sala de Recursos</p>
                <p style={{ fontSize: 26, fontWeight: 600, margin: 0, color: (panorama.cobertura_estrutura?.percentual_com_srm ?? 0) < 50 ? "#a32d2d" : "#0F6E56" }}>
                  {panorama.cobertura_estrutura?.percentual_com_srm ?? "—"}%
                </p>
                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "4px 0 0" }}>
                  {panorama.cobertura_estrutura?.escolas_com_srm ?? 0} de {panorama.cobertura_estrutura?.total_escolas ?? 0} escolas com SRM cadastrada (Decreto 7.611/2011)
                </p>
              </div>
            </div>

            <SecaoPainel titulo="Efetividade e adoção"
              descricao="Se o atendimento está sendo formalizado e se a rede acompanha." />

            {/* Cobertura documental — quantos alunos com NEE estão atendidos.
                Substituiu a taxa de conclusão (documentos iniciados que
                terminaram), que marcava 100% mesmo com a maioria dos alunos
                sem documento algum — leitura perigosa para decisão de política. */}
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>📄 Cobertura documental dos alunos com NEE</p>
              <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
                Sobre {panorama.cobertura_documental?.total_nee ?? 0} aluno(s) com NEE matriculado(s) na plataforma.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {[
                  ["PEI", panorama.cobertura_documental?.pei],
                  ["PDI", panorama.cobertura_documental?.pdi],
                  ["PAEE", panorama.cobertura_documental?.paee],
                  ["Estudo de Caso", panorama.cobertura_documental?.estudo_caso]
                ].map(([rotulo, c]) => (
                  <div key={rotulo}>
                    <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: !c ? "#9b9a96" : c.percentual < 60 ? "#a32d2d" : "#0F6E56" }}>
                      {!c ? "—" : `${c.percentual}%`}
                    </p>
                    <p style={{ fontSize: 11, color: "#5f5e5a", margin: "2px 0 0" }}>
                      {rotulo}
                      {c && <span style={{ color: "#9b9a96" }}> · {c.alunos_com} de {c.total}</span>}
                    </p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#9b9a96", margin: "10px 0 0" }}>
                % de alunos com NEE que têm o documento concluído. Reflete o estado atual — não muda
                com o filtro de período, porque um documento feito antes segue valendo.
              </p>
            </div>

            {/* Evolução mensal — adoção da plataforma */}
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>
                📈 Evolução mensal ({{
                  "30d": "últimos 30 dias", "3m": "últimos 3 meses", "6m": "últimos 6 meses",
                  "12m": "últimos 12 meses", total: "todo o período"
                }[periodo] || "período selecionado"})
              </p>
              {Object.keys(panorama.evolucao_mensal?.aulas || {}).length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Sem dados suficientes ainda.</p>
              ) : (
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
                      {Object.keys({ ...panorama.evolucao_mensal.aulas, ...panorama.evolucao_mensal.documentos })
                        .sort()
                        .map(mes => (
                          <tr key={mes} style={{ borderBottom: "0.5px solid #f1efe8" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 500 }}>{mes}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right" }}>{panorama.evolucao_mensal.aulas[mes] || 0}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right" }}>{panorama.evolucao_mensal.documentos[mes] || 0}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === "redes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 12px" }}>
                {editandoRede ? "Editando rede" : "Nova rede de ensino"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input value={formRede.name} onChange={e => setFormRede(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Secretaria Municipal de Educação de..." style={inputFull} />
                </div>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select value={formRede.type} onChange={e => setFormRede(p => ({ ...p, type: e.target.value }))} style={inputFull}>
                    {TIPOS_REDE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input value={formRede.city} onChange={e => setFormRede(p => ({ ...p, city: e.target.value }))} style={inputFull} />
                </div>
                <div>
                  <label style={labelStyle}>UF</label>
                  <input value={formRede.state} maxLength={2} onChange={e => setFormRede(p => ({ ...p, state: e.target.value.toUpperCase() }))} style={inputFull} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSalvarRede} disabled={salvando} style={{
                  ...btnBase, background: "#2B9EC3", color: "#fff", borderColor: "#2B9EC3",
                  cursor: salvando ? "not-allowed" : "pointer"
                }}>
                  {editandoRede ? "Salvar alterações" : "Criar rede"}
                </button>
                {editandoRede && (
                  <button onClick={() => { setFormRede(redeVazia()); setEditandoRede(null); }} style={btnBase}>Cancelar</button>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 12px" }}>Redes cadastradas</p>
              {redes.length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Nenhuma rede cadastrada ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {redes.map(r => (
                    <div key={r.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                      padding: "10px 12px", background: "#f5f9ff", border: "0.5px solid #d3d1c7", borderRadius: 8
                    }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>{r.name}</strong>
                        <p style={{ fontSize: 11, color: "#5f5e5a", margin: "2px 0 0" }}>
                          {r.type}{r.city ? ` · ${r.city}` : ""}{r.state ? `/${r.state}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleEditarRede(r)} style={btnSmall}>Editar</button>
                        <button onClick={() => handleExcluirRede(r.id)} style={{ ...btnSmall, color: "#a32d2d", borderColor: "#f7c1c1" }}>Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === "escolas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 12px" }}>
                {editandoEscola ? "Editando escola" : "Nova escola"}
              </p>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Nome</label>
                <input value={formEscola.name} onChange={e => setFormEscola(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome da escola" style={inputFull} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input value={formEscola.city} onChange={e => setFormEscola(p => ({ ...p, city: e.target.value }))} style={inputFull} />
                </div>
                <div>
                  <label style={labelStyle}>UF</label>
                  <input value={formEscola.state} maxLength={2} onChange={e => setFormEscola(p => ({ ...p, state: e.target.value.toUpperCase() }))} style={inputFull} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Rede de ensino (opcional)</label>
                <select value={formEscola.network_id} onChange={e => setFormEscola(p => ({ ...p, network_id: e.target.value }))} style={inputFull}>
                  <option value="">Sem rede vinculada</option>
                  {redes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSalvarEscola} disabled={salvando} style={{
                  ...btnBase, background: "#2B9EC3", color: "#fff", borderColor: "#2B9EC3",
                  cursor: salvando ? "not-allowed" : "pointer"
                }}>
                  {editandoEscola ? "Salvar alterações" : "Criar escola"}
                </button>
                {editandoEscola && (
                  <button onClick={() => { setFormEscola(escolaVazia()); setEditandoEscola(null); }} style={btnBase}>Cancelar</button>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 12px" }}>Escolas cadastradas</p>
              {escolas.length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Nenhuma escola cadastrada ainda.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "0.5px solid #d3d1c7" }}>
                        <th style={{ padding: "6px 8px" }}>Nome</th>
                        <th style={{ padding: "6px 8px" }}>Cidade/UF</th>
                        <th style={{ padding: "6px 8px" }}>Rede</th>
                        <th style={{ padding: "6px 8px" }}>Convite</th>
                        <th style={{ padding: "6px 8px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {escolas.map(e => (
                        <tr key={e.id} style={{ borderBottom: "0.5px solid #eee" }}>
                          <td style={{ padding: "8px" }}>{e.name}</td>
                          <td style={{ padding: "8px", color: "#5f5e5a" }}>
                            {e.city || "—"}{e.state ? `/${e.state}` : ""}
                          </td>
                          <td style={{ padding: "8px", color: "#5f5e5a" }}>{nomeRede(e.network_id)}</td>
                          <td style={{ padding: "8px" }}>
                            {e.invite_code ? (
                              <button onClick={() => copiarConvite(e.invite_code)}
                                title="Copiar código de convite"
                                style={{
                                  fontFamily: "monospace", fontSize: 12, letterSpacing: 1,
                                  background: "#eaf6fa", color: "#1a6e8a", border: "1px solid #b9e0ee",
                                  borderRadius: 6, padding: "3px 8px", cursor: "pointer"
                                }}>
                                {e.invite_code} 📋
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: "#a35d17" }}>sem código</span>
                            )}
                          </td>
                          <td style={{ padding: "8px", display: "flex", gap: 6 }}>
                            <button onClick={() => handleEditarEscola(e)} style={btnSmall}>Editar</button>
                            <button onClick={() => handleExcluirEscola(e.id)} style={{ ...btnSmall, color: "#a32d2d", borderColor: "#f7c1c1" }}>Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === "usuarios" && (
          <div style={cardStyle}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Usuários da plataforma</p>
            <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 16px" }}>
              Defina o papel de cada usuário e o vínculo com escola ou rede de ensino.
              Um usuário com papel <strong>secretaria</strong> precisa estar vinculado a uma rede
              para acessar o Painel da Rede.
            </p>

            {usuarios.length === 0 ? (
              <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Nenhum usuário cadastrado.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {usuarios.map(u => (
                  <div key={u.id} style={{
                    padding: "12px 14px", background: "#f5f9ff",
                    border: "0.5px solid #d3d1c7", borderRadius: 8
                  }}>
                    {editandoUsuario === u.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <strong style={{ fontSize: 13 }}>{u.full_name || u.email}</strong>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                          <div>
                            <label style={labelStyle}>Papel</label>
                            <select value={formUsuario.role}
                              onChange={e => {
                                const novo = e.target.value;
                                // Escolher papel de rede solta a escola na hora: o backend
                                // recusaria o par, e deixar o campo preenchido só confunde.
                                setFormUsuario(p => ({
                                  ...p, role: novo,
                                  school_id: ROLES_DE_REDE.includes(novo) ? "" : p.school_id
                                }));
                              }}
                              style={inputFull}>
                              {PAPEIS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <p style={{ fontSize: 11, color: "#5f5e5a", margin: "4px 0 0" }}>
                              {PAPEL_DESC[formUsuario.role] || ""}
                            </p>
                          </div>
                          <div>
                            <label style={labelStyle}>Rede de ensino</label>
                            <select value={formUsuario.network_id}
                              onChange={e => setFormUsuario(p => ({ ...p, network_id: e.target.value }))}
                              style={inputFull}>
                              <option value="">Sem rede</option>
                              {redes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Escola</label>
                            <select value={formUsuario.school_id}
                              onChange={e => setFormUsuario(p => ({ ...p, school_id: e.target.value }))}
                              disabled={ehPapelDeRede}
                              style={{ ...inputFull, ...(ehPapelDeRede ? { background: "#f1efe8", cursor: "not-allowed" } : {}) }}>
                              <option value="">Sem escola</option>
                              {escolas.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Função / departamento</label>
                            <input value={formUsuario.cargo}
                              onChange={e => setFormUsuario(p => ({ ...p, cargo: e.target.value }))}
                              list="funcoes-sugeridas" style={inputFull}
                              placeholder={ehPapelDeRede ? "Ex.: Educação Especial" : "Ex.: Professor(a)"} />
                            <datalist id="funcoes-sugeridas">
                              {(ehPapelDeRede ? FUNCOES_REDE : FUNCOES_ESCOLA).map(f => <option key={f} value={f} />)}
                            </datalist>
                          </div>
                        </div>
                        {ehPapelDeRede && (
                          <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                            Papel de rede enxerga números agregados das escolas, não o aluno.
                            Por isso não pode ficar vinculado a uma escola.
                          </p>
                        )}
                        {formUsuario.role === "secretaria" && !formUsuario.network_id && (
                          <p style={{ fontSize: 12, color: "#a35d17", margin: 0 }}>
                            Sem uma rede vinculada, este usuário não conseguirá abrir o Painel da Rede.
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleSalvarUsuario(u.id)} disabled={salvando}
                            style={{ ...btnBase, background: "#2B9EC3", color: "#fff", borderColor: "#2B9EC3" }}>
                            {salvando ? "Salvando..." : "Salvar vínculo"}
                          </button>
                          <button onClick={() => setEditandoUsuario(null)} style={btnBase}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <strong style={{ fontSize: 13 }}>{u.full_name || "(sem nome)"}</strong>
                          <p style={{ fontSize: 11, color: "#5f5e5a", margin: "2px 0 0" }}>{u.email}</p>
                          <p style={{ fontSize: 11, color: "#5f5e5a", margin: "4px 0 0" }}>
                            Papel: <strong>{u.role || "—"}</strong>
                            {u.cargo ? ` · cargo: ${u.cargo}` : ""}
                            {" · "}Escola: {nomeEscola(u.school_id)}
                            {" · "}Rede: {nomeRede(u.network_id)}
                          </p>
                          {u.role === "secretaria" && !u.network_id && (
                            <p style={{ fontSize: 11, color: "#a35d17", margin: "4px 0 0" }}>
                              Sem rede vinculada — Painel da Rede indisponível para este usuário.
                            </p>
                          )}
                        </div>
                        <button onClick={() => handleEditarUsuario(u)} style={btnSmall}>Editar vínculo</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
