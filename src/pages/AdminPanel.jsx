import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getGlobalPanel,
  listAllNetworks, createNetworkAdmin, updateNetworkAdmin, deleteNetworkAdmin,
  listAllSchools, createSchoolAdmin, updateSchoolAdmin, deleteSchoolAdmin
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

const redeVazia = () => ({ name: "", type: "municipal", city: "", state: "" });
const escolaVazia = () => ({ name: "", city: "", state: "", network_id: "" });

export default function AdminPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("panorama");
  const [panorama, setPanorama] = useState(null);
  const [redes, setRedes] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const [formRede, setFormRede] = useState(redeVazia());
  const [editandoRede, setEditandoRede] = useState(null);
  const [formEscola, setFormEscola] = useState(escolaVazia());
  const [editandoEscola, setEditandoEscola] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    setLoading(true);
    try {
      const [pRes, rRes, eRes] = await Promise.all([getGlobalPanel(), listAllNetworks(), listAllSchools()]);
      setPanorama(pRes.data);
      setRedes(rRes.data || []);
      setEscolas(eRes.data || []);
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

  const nomeRede = (id) => redes.find(r => r.id === id)?.name || "—";

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
            ["escolas", `Escolas (${escolas.length})`]
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
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
      </main>
    </div>
  );
}
