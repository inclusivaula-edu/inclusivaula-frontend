import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";
import ConviteProfessores from "../components/ConviteProfessores";

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function SchoolAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [editando, setEditando] = useState(false);
  const [formEscola, setFormEscola] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
        address: schoolData?.address || "",
        inep_code: schoolData?.inep_code || "",
        logo_url: schoolData?.logo_url || ""
      });
      setTeachers(teachersData || []);
      setLoading(false);
    }
    if (user) load();
  }, [user]);

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
          address: formEscola.address || null,
          inep_code: formEscola.inep_code || null,
          logo_url: formEscola.logo_url || null
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

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { mostrarFeedback("Arquivo muito grande. Máx 2 MB.", "erro"); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/${school.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("school-assets").upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
      setFormEscola(p => ({ ...p, logo_url: urlData.publicUrl }));
      mostrarFeedback("✅ Logo carregada! Salve para aplicar.");
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setUploadingLogo(false);
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
        <div role="status" aria-live="polite" style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "10px 16px", display: "flex",
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

              <div>
                <label style={labelStyle}>Código INEP</label>
                <input value={formEscola.inep_code} onChange={e => setFormEscola(p => ({ ...p, inep_code: e.target.value }))}
                  placeholder="Ex: 16000001" maxLength={8} style={inputStyle} />
                <p style={{ fontSize: 11, color: "#5f5e5a", marginTop: 4 }}>
                  8 dígitos · Consulte em <strong>educacenso.inep.gov.br</strong>
                </p>
              </div>

              <div>
                <label style={labelStyle}>Logo da escola</label>
                {formEscola.logo_url && (
                  <div style={{ marginBottom: 8 }}>
                    <img src={formEscola.logo_url} alt="Logo atual" style={{ height: 56, borderRadius: 8, border: "0.5px solid #d3d1c7", objectFit: "contain", background: "#f5f9ff", padding: 4 }} />
                  </div>
                )}
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  style={{ fontSize: 13, cursor: "pointer" }} />
                <p style={{ fontSize: 11, color: "#5f5e5a", marginTop: 4 }}>
                  PNG, JPG ou SVG · Máx 2 MB{uploadingLogo ? " · Enviando..." : ""}
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button onClick={() => { setEditando(false); setFormEscola({ name: school.name, city: school.city, state: school.state, cnpj: school.cnpj || "", phone: school.phone || "", address: school.address || "", inep_code: school.inep_code || "", logo_url: school.logo_url || "" }); }}
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
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#2B9EC3", marginBottom: 4 }}>{school.name}</h3>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  {school.city}{school.state ? `, ${school.state}` : ""}
                  {school.cnpj ? ` · CNPJ: ${school.cnpj}` : ""}
                </p>
                {school.inep_code && <p style={{ fontSize: 13, color: "#5f5e5a", margin: "4px 0 0" }}>🏫 INEP: {school.inep_code}</p>}
                {school.phone && <p style={{ fontSize: 13, color: "#5f5e5a", margin: "4px 0 0" }}>📞 {school.phone}</p>}
                {school.address && <p style={{ fontSize: 13, color: "#5f5e5a", margin: "4px 0 0" }}>📍 {school.address}</p>}
              </div>
              {school.logo_url && (
                <img src={school.logo_url} alt="Logo da escola" style={{ height: 60, maxWidth: 100, objectFit: "contain", borderRadius: 8, border: "0.5px solid #d3d1c7", padding: 4, background: "#fff" }} />
              )}
            </div>

          </div>
        )}

        {/* CONVITE DE PROFESSORES */}
        <ConviteProfessores />

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