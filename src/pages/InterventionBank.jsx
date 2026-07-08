import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { INTERVENCOES, CATEGORIAS } from "../data/intervencoes";
import icone from "../assets/icone.png";

const cardStyle = {
  background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
  padding: "1.2rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
};

export default function InterventionBank() {
  const navigate = useNavigate();
  const perfis = Object.keys(INTERVENCOES);
  const [perfil, setPerfil] = useState(perfis[0]);
  const [categoria, setCategoria] = useState("todas");
  const [busca, setBusca] = useState("");

  const dados = INTERVENCOES[perfil];

  const itensFiltrados = useMemo(() => {
    let itens = dados.itens;
    if (categoria !== "todas") itens = itens.filter(i => i.cat === categoria);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      itens = itens.filter(i => i.titulo.toLowerCase().includes(q) || i.como.toLowerCase().includes(q));
    }
    return itens;
  }, [dados, categoria, busca]);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{ background: "#fff", borderBottom: "0.5px solid #d3d1c7", padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span></span>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>💡 Banco de Intervenções</h1>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Estratégias práticas prontas por perfil de NEE — para usar amanhã, sem gerar nada
        </p>

        {/* Filtros */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label htmlFor="bi-perfil" style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Perfil de NEE</label>
              <select id="bi-perfil" value={perfil} onChange={e => { setPerfil(e.target.value); setCategoria("todas"); }} style={{ width: "100%", boxSizing: "border-box" }}>
                {perfis.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bi-busca" style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Buscar</label>
              <input id="bi-busca" type="search" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="ex: prova, rotina..." style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="group" aria-label="Filtrar por categoria">
            <button onClick={() => setCategoria("todas")} style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 20,
              background: categoria === "todas" ? "#2B9EC3" : "#fff",
              color: categoria === "todas" ? "#fff" : "#5f5e5a",
              border: categoria === "todas" ? "none" : "0.5px solid #d3d1c7"
            }}>Todas</button>
            {Object.entries(CATEGORIAS).map(([id, c]) => (
              <button key={id} onClick={() => setCategoria(id)} style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 20,
                background: categoria === id ? "#2B9EC3" : "#fff",
                color: categoria === id ? "#fff" : "#5f5e5a",
                border: categoria === id ? "none" : "0.5px solid #d3d1c7"
              }}>{c.emoji} {c.label}</button>
            ))}
          </div>
        </div>

        {/* Fundamento do perfil */}
        <div style={{ background: "linear-gradient(135deg, #e8f7fd, #edfff6)", border: "0.5px solid #2B9EC3", borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 12, color: "#1a6e8a" }}>
          📚 <strong>Fundamentação:</strong> {dados.fundamento}
        </div>

        {/* Intervenções */}
        <p role="status" style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 12 }}>
          {itensFiltrados.length} intervenção(ões) encontrada(s)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {itensFiltrados.map((item, i) => {
            const cat = CATEGORIAS[item.cat];
            return (
              <div key={i} style={{ ...cardStyle, borderLeft: "3px solid #4CAF82" }}>
                <span style={{ fontSize: 11, padding: "2px 10px", background: "#f1efe8", color: "#5f5e5a", borderRadius: 20 }}>
                  {cat.emoji} {cat.label}
                </span>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "10px 0 6px", color: "#2c2c2a" }}>{item.titulo}</p>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: "#5f5e5a", margin: 0 }}>{item.como}</p>
              </div>
            );
          })}
        </div>

        <div style={{ ...cardStyle, marginTop: 24, textAlign: "center", background: "linear-gradient(135deg, #e8f7fd, #edfff6)" }}>
          <p style={{ fontSize: 13, color: "#1a6e8a", margin: "0 0 10px" }}>
            Precisa de algo específico para um aluno? Gere uma aula ou plano personalizado com IA.
          </p>
          <button onClick={() => navigate("/gerar")} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            🧠 Gerar aula adaptada
          </button>
        </div>
      </main>
    </div>
  );
}
