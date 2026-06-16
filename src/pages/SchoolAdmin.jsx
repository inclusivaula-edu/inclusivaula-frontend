import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function SchoolAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [editando, setEditando] = useState(false);
  const [formEscola, setFormEscola] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) { setLoading(false); return; }

      const { data: schoolData } = await supabase
        .from("schools").select("*").eq("id", profile.school_id).single();

      const { data: teachersData } = await supabase
        .from("teachers").select("id, full_name, email, created_at")
        .eq("school_id", profile.school_id).order("full_name");

      setSchool(schoolData);
      setFormEscola({
        name: schoolData?.name || "",
        city: schoolData?.city || "",
        state: schoolData?.state || "AP",
        cnpj: schoolData?.cnpj || "",
        phone: schoolData?.phone || "",
        address: schoolData?.address || ""
      });
      setTeachers(teachersData || []);
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  function handleCopy() {
    navigator.clipboard.writeText(school.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSalvarEscola() {
    if (!formEscola.name?.trim() || !formEscola.city?.trim()) {
      mostrarFeedback("Preencha nome e cidade da escola.", "erro");
      return;
    }
    setSalvando(true);
    try {
      const { data, error } = await supabase
        .from("schools")
        .update({
          name: formEscola.name,
          city: formEscola.city,
          state: formEscola.state,
          cnpj: formEscola.cnpj || null,
          phone: formEscola.phone || null,
          address: formEscola.address || null
        })
        .eq("id", school.id)
        .select().single();

      if (error) throw new Error(error.message);
      setSchool(data);
      setEditando(false);
      mostrarFeedback("✅ Dados da escola atualizados com sucesso!");
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  const inputStyle = { width: "100%", boxSizing: "border-box" };
  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#5f5e5a", fontSize: 14 }}>Carregando...</p>
    </div>
  );

  if (!school) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#5f5e5a", fontSize: 14 }}>Escola não encontrada.</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        {!editando && (
          <button onClick={() => setEditando(true)} style={{
            fontSize: 13, padding: "8px 16px", background: "#fff",
            color: "#BA7517", border: "0.5px solid #BA7517",
            borderRadius: 8, cursor: "pointer"
          }}>✏️ Editar escola</button>
        )}
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Minha escola</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Gerencie os dados da escola e o código de convite para novos professores
        </p>

        {/* FORMULÁRIO DE EDIÇÃO */}
        {editando ? (
          <div style={{
            background: "#fff", border: "0.5px solid #BA7517",
            borderRadius: 12, padding: "1.5rem", marginBottom: 24,
            boxShadow: "0 2px 8px rgba(186,117,23,0.08)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, color: "#BA7517", marginBottom: 20 }}>
              ✏️ Editar dados da escola
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome da escola *</label>
                <input value={formEscola.name} onChange={e => setFormEscola(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome da escola" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Cidade *</label>
                  <input value={formEscola.city} onChange={e => setFormEscola(p => ({ ...p, city: e.target.value }))}
                    placeholder="Cidade" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select value={formEscola.state} onChange={e => setFormEscola(p => ({ ...p, state: e.target.value }))}
                    style={inputStyle}>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>CNPJ</label>
                  <input value={formEscola.cnpj} onChange={e => setFormEscola(p => ({ ...p, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Telefone</label>
                  <input value={formEscola.phone} onChange={e => setFormEscola(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(96) 3000-0000" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Endereço</label>
                <input value={formEscola.address} onChange={e => setFormEscola(p => ({ ...p, address: e.target.value }))}
                  placeholder="Rua, número, bairro" style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button onClick={() => { setEditando(false); setFormEscola({ name: school.name, city: school.city, state: school.state, cnpj: school.cnpj || "", phone: school.phone || "", address: school.address || "" }); }}
                  style={{ flex: 1, padding: "10px", fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={handleSalvarEscola} disabled={salvando} style={{
                  flex: 2, padding: "10px",
                  background: salvando ? "#ccc" : "linear-gradient(135deg, #BA7517, #d4961e)",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: salvando ? "not-allowed" : "pointer"
                }}>
                  {salvando ? "Salvando..." : "💾 Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CARD DE EXIBIÇÃO DOS DADOS DA ESCOLA */
          <div style={{
            background: "#fff", border: "0.5px solid #d3d1c7",
            borderRadius: 12, padding: "1.5rem", marginBottom: 24,
            boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#2B9EC3", marginBottom: 4 }}>{school.name}</h3>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  {school.city}{school.state ? `, ${school.state}` : ""}
                  {school.cnpj ? ` · CNPJ: ${school.cnpj}` : ""}
                </p>
                {school.phone && <p style={{ fontSize: 13, color: "#5f5e5a", margin: "4px 0 0" }}>📞 {school.phone}</p>}
                {school.address && <p style={{ fontSize: 13, color: "#5f5e5a", margin: "4px 0 0" }}>📍 {school.address}</p>}
              </div>
            </div>

            {/* Código de convite */}
            <div style={{
              background: "linear-gradient(135deg, #e8f7fd, #edfff6)",
              border: "0.5px solid #2B9EC3", borderRadius: 10, padding: "14px 16px"
            }}>
              <p style={{ fontSize: 12, color: "#1a6e8a", marginBottom: 8, fontWeight: 500 }}>
                🔑 Código de convite para novos professores
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  fontFamily: "monospace", fontSize: 22, fontWeight: 700,
                  letterSpacing: 4, color: "#2B9EC3"
                }}>
                  {school.invite_code}
                </span>
                <button onClick={handleCopy} style={{
                  fontSize: 12, padding: "6px 14px",
                  background: copied ? "#4CAF82" : "#fff",
                  color: copied ? "#fff" : "#2B9EC3",
                  border: `0.5px solid ${copied ? "#4CAF82" : "#2B9EC3"}`,
                  borderRadius: 6, cursor: "pointer"
                }}>
                  {copied ? "✅ Copiado!" : "Copiar"}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#5f5e5a", marginTop: 8, marginBottom: 0 }}>
                Compartilhe este código com professores da sua escola para que eles entrem na plataforma.
              </p>
            </div>
          </div>
        )}

        {/* LISTA DE PROFESSORES */}
        <div style={{
          background: "#fff", border: "0.5px solid #d3d1c7",
          borderRadius: 12, padding: "1.5rem",
          boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", marginBottom: 16 }}>
            🏫 Professores cadastrados ({teachers.length})
          </h3>

          {teachers.length === 0 ? (
            <p style={{ fontSize: 14, color: "#5f5e5a" }}>
              Nenhum professor cadastrado ainda além de você.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {teachers.map(t => (
                <div key={t.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", background: "#f5f9ff",
                  border: "0.5px solid #d3d1c7", borderRadius: 8
                }}>
                  <div>
                    <p style={{ fontWeight: 500, marginBottom: 2, fontSize: 14 }}>{t.full_name}</p>
                    <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>{t.email}</p>
                  </div>
                  <span style={{
                    fontSize: 11, padding: "3px 10px",
                    background: "#e8f7fd", color: "#1a6e8a", borderRadius: 20
                  }}>
                    Professor
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}