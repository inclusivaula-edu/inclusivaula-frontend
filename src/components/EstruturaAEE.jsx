import { useState, useEffect } from "react";
import { getEstruturaAEE, saveEstruturaAEE } from "../services/mapiClient";

/**
 * Inventário da estrutura de AEE da escola.
 * Preenchido uma vez, alimenta todas as gerações do Nexus7 (aula, PEI, PDI,
 * PAEE) para que as adaptações recomendadas considerem o que a escola tem.
 */
export default function EstruturaAEE({ podeEditar = false, onFeedback }) {
  const [opcoes, setOpcoes] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    getEstruturaAEE()
      .then(res => {
        setOpcoes(res.data.opcoes);
        setForm(res.data.estrutura || {
          srm_possui: "", srm_tipo: "", srm_turnos: [],
          recursos_ta: [], profissionais: {}, acessibilidade_fisica: [],
          parcerias: [], observacoes: ""
        });
      })
      .catch(() => onFeedback?.("Erro ao carregar a estrutura de AEE.", "erro"))
      .finally(() => setLoading(false));
  }, []);

  function toggle(campo, valor) {
    setForm(p => ({
      ...p,
      [campo]: p[campo]?.includes(valor)
        ? p[campo].filter(v => v !== valor)
        : [...(p[campo] || []), valor]
    }));
  }

  function setProfissional(nome, qtd) {
    const n = Math.max(0, Math.min(99, Number(qtd) || 0));
    setForm(p => {
      const profs = { ...(p.profissionais || {}) };
      if (n > 0) profs[nome] = n; else delete profs[nome];
      return { ...p, profissionais: profs };
    });
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const res = await saveEstruturaAEE(form);
      setForm(res.data);
      onFeedback?.("✅ Estrutura de AEE salva! O Nexus7 já vai considerá-la nas próximas gerações.");
    } catch (err) {
      onFeedback?.(err.message || "Erro ao salvar a estrutura.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  if (loading || !form || !opcoes) return null;

  const totalPreenchido =
    (form.recursos_ta?.length || 0) +
    Object.keys(form.profissionais || {}).length +
    (form.acessibilidade_fisica?.length || 0) +
    (form.parcerias?.length || 0) +
    (form.srm_possui ? 1 : 0);

  const chip = (marcado) => ({
    display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 10px",
    borderRadius: 20, border: `1px solid ${marcado ? "#2B9EC3" : "#d3d1c7"}`,
    background: marcado ? "#eaf6fa" : "#fff", cursor: podeEditar ? "pointer" : "default",
    color: marcado ? "#1a6e8a" : "#5f5e5a"
  });
  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 8, fontWeight: 500 };

  function Grupo({ titulo, campo }) {
    return (
      <div>
        <label style={labelStyle}>{titulo}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {opcoes[campo].map(op => {
            const marcado = form[campo]?.includes(op);
            return (
              <label key={op} style={chip(marcado)}>
                <input type="checkbox" checked={!!marcado} disabled={!podeEditar}
                  style={{ width: 14, height: 14 }}
                  onChange={() => toggle(campo, op)} />
                {op}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
      padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", margin: 0 }}>
            ♿ Estrutura de AEE da escola
          </h3>
          <p style={{ fontSize: 12, color: "#5f5e5a", margin: "4px 0 0", maxWidth: 560 }}>
            Informe o que a escola realmente tem. O Nexus7 usa este inventário para recomendar
            adaptações executáveis — e para marcar como <em>“a providenciar”</em> o que faltar,
            servindo de justificativa em solicitações à secretaria.
          </p>
          {totalPreenchido > 0 && (
            <p style={{ fontSize: 11, color: "#0F6E56", margin: "6px 0 0" }}>
              {totalPreenchido} item(ns) informado(s)
              {form.atualizado_em ? ` · atualizado em ${new Date(form.atualizado_em).toLocaleDateString("pt-BR")}` : ""}
            </p>
          )}
        </div>
        <button onClick={() => setAberto(a => !a)} style={{
          padding: "8px 16px", borderRadius: 8, border: "0.5px solid #d3d1c7",
          fontSize: 13, fontWeight: 500, cursor: "pointer", background: "#fff", color: "#5f5e5a"
        }}>
          {aberto ? "Fechar" : totalPreenchido > 0 ? "Ver / editar" : "Preencher"}
        </button>
      </div>

      {aberto && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
          {!podeEditar && (
            <p style={{ fontSize: 12, color: "#a35d17", margin: 0 }}>
              Somente coordenação e direção podem editar a estrutura da escola.
            </p>
          )}

          <div>
            <label style={labelStyle}>Sala de Recursos Multifuncionais (SRM)</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <select value={form.srm_possui} disabled={!podeEditar}
                onChange={e => setForm(p => ({ ...p, srm_possui: e.target.value }))}
                style={{ width: "100%", boxSizing: "border-box" }}>
                <option value="">A escola possui SRM?</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
              {form.srm_possui === "Sim" && (
                <select value={form.srm_tipo} disabled={!podeEditar}
                  onChange={e => setForm(p => ({ ...p, srm_tipo: e.target.value }))}
                  style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="">Tipo da sala</option>
                  {opcoes.srm_tipo.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
            {form.srm_possui === "Sim" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {opcoes.srm_turnos.map(t => {
                  const marcado = form.srm_turnos?.includes(t);
                  return (
                    <label key={t} style={chip(marcado)}>
                      <input type="checkbox" checked={!!marcado} disabled={!podeEditar}
                        style={{ width: 14, height: 14 }}
                        onChange={() => toggle("srm_turnos", t)} />
                      {t}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <Grupo titulo="Recursos de tecnologia assistiva disponíveis" campo="recursos_ta" />

          <div>
            <label style={labelStyle}>Profissionais na escola (informe a quantidade)</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
              {opcoes.profissionais.map(p => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="number" min="0" max="99" disabled={!podeEditar}
                    value={form.profissionais?.[p] ?? ""}
                    placeholder="0"
                    onChange={e => setProfissional(p, e.target.value)}
                    style={{ width: 60, fontSize: 13, padding: 6 }} />
                  <span style={{ fontSize: 13, color: form.profissionais?.[p] ? "#1a6e8a" : "#5f5e5a" }}>{p}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#5f5e5a", margin: "8px 0 0" }}>
              Deixe em branco ou 0 o que a escola não tem — a ausência também orienta a IA.
            </p>
          </div>

          <Grupo titulo="Acessibilidade física" campo="acessibilidade_fisica" />
          <Grupo titulo="Parcerias externas" campo="parcerias" />

          <div>
            <label style={labelStyle}>Observações sobre a estrutura</label>
            <textarea value={form.observacoes || ""} disabled={!podeEditar} maxLength={800}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              placeholder="Ex: a sala de recursos funciona em espaço compartilhado com a biblioteca"
              style={{ width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: 10 }} />
          </div>

          {podeEditar && (
            <button onClick={handleSalvar} disabled={salvando} style={{
              padding: "12px", background: salvando ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500,
              cursor: salvando ? "not-allowed" : "pointer"
            }}>
              {salvando ? "Salvando..." : "Salvar estrutura de AEE"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
