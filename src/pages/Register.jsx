import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { createSchool, createTeacher } from "../services/schoolClient";
import logo from "../assets/logo.png";

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [schoolMode, setSchoolMode] = useState(null); // "criar" ou "entrar"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [auth, setAuth] = useState({ email: "", password: "", full_name: "", phone: "" });
  const [school, setSchool] = useState({ name: "", city: "", state: "AP", cnpj: "", phone: "", address: "" });
  const [inviteCode, setInviteCode] = useState("");
  const [userId, setUserId] = useState(null);

  function handleAuth(e) { setAuth(prev => ({ ...prev, [e.target.name]: e.target.value })); }
  function handleSchool(e) { setSchool(prev => ({ ...prev, [e.target.name]: e.target.value })); }

  // Etapa 1: cria a conta no Supabase Auth e faz logout imediato
  // para evitar que o AuthContext redirecione para o dashboard
  // antes de completar as etapas 2 e 3.
  async function handleStep1() {
    if (!auth.email || !auth.password || !auth.full_name) {
      setError("Preencha nome, e-mail e senha.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await supabase.auth.signUp({ email: auth.email, password: auth.password });
      if (response.error) throw response.error;
      if (!response.data?.user?.id) throw new Error("Falha ao criar usuário.");
      await supabase.auth.signOut(); // logout imediato — login real só no final
      setUserId(response.data.user.id);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Etapa 2a: professor cria uma escola nova
  async function handleCriarEscola() {
    if (!school.name || !school.city) {
      setError("Preencha nome e cidade da escola.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const newSchool = await createSchool({ ...school, admin_user_id: userId });
      await finalizarCadastro(newSchool.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Etapa 2b: professor entra em escola existente via código de convite
  async function handleEntrarEscola() {
    if (!inviteCode.trim()) {
      setError("Digite o código de convite da sua escola.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Busca a escola pelo código — case insensitive
      const { data: foundSchool, error: searchError } = await supabase
        .from("schools")
        .select("id, name")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .single();

      if (searchError || !foundSchool) {
        throw new Error("Código de convite inválido. Verifique com o administrador da sua escola.");
      }

      await finalizarCadastro(foundSchool.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Função compartilhada: vincula o professor à escola,
  // cria o perfil e faz o login real.
  async function finalizarCadastro(schoolId) {
    await supabase.from("users").upsert({
      id: userId, school_id: schoolId,
      full_name: auth.full_name, email: auth.email, role: "teacher"
    });
    await createTeacher({
      user_id: userId, school_id: schoolId,
      full_name: auth.full_name, email: auth.email,
      phone: auth.phone, specialization: ""
    });
    await supabase.from("profiles").upsert({
      id: userId, email: auth.email,
      role: "teacher", school_id: schoolId, full_name: auth.full_name
    });
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: auth.email, password: auth.password
    });
    if (signInError) throw signInError;
    setStep(3);
  }

  const inputStyle = { width: "100%", boxSizing: "border-box" };
  const labelStyle = { fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "linear-gradient(135deg, #f0f9ff 0%, #f0fff8 100%)"
    }}>
      <div style={{
        background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 16,
        padding: "2.5rem", width: "100%", maxWidth: 480,
        boxShadow: "0 4px 24px rgba(43,158,195,0.08)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={logo} alt="InclusivAula" style={{ height: 52, marginBottom: 8 }} />
        </div>

        {/* Barra de progresso das 3 etapas */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? "linear-gradient(135deg, #2B9EC3, #4CAF82)" : "#d3d1c7"
            }} />
          ))}
        </div>

        {error && (
          <div style={{
            background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8,
            padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 20
          }}>
            {error}
          </div>
        )}

        {/* Etapa 1 — Dados pessoais do professor */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "#2B9EC3" }}>Seus dados</h2>
            <div>
              <label style={labelStyle}>Nome completo *</label>
              <input name="full_name" value={auth.full_name} onChange={handleAuth} placeholder="Maria Silva" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>E-mail *</label>
              <input name="email" type="email" value={auth.email} onChange={handleAuth} placeholder="professor@escola.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Senha *</label>
              <input name="password" type="password" value={auth.password} onChange={handleAuth} placeholder="mínimo 6 caracteres" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input name="phone" value={auth.phone} onChange={handleAuth} placeholder="(96) 99999-9999" style={inputStyle} />
            </div>
            <button onClick={handleStep1} disabled={loading} style={{
              width: "100%", padding: "12px", marginTop: 8,
              background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
            }}>
              {loading ? "Criando conta..." : "Continuar →"}
            </button>
            <p style={{ fontSize: 13, textAlign: "center", color: "#5f5e5a" }}>
              Já tem conta?{" "}
              <span style={{ color: "#2B9EC3", cursor: "pointer" }} onClick={() => navigate("/")}>Entrar</span>
            </p>
          </div>
        )}

        {/* Etapa 2 — Escolha do caminho: criar ou entrar */}
        {step === 2 && !schoolMode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "#2B9EC3" }}>Sua escola</h2>
            <p style={{ fontSize: 14, color: "#5f5e5a", margin: 0 }}>
              Você quer criar uma escola nova ou entrar em uma que já está cadastrada?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              <div onClick={() => { setSchoolMode("criar"); setError(null); }} style={{
                border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.2rem",
                cursor: "pointer", transition: "border-color 0.2s"
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#2B9EC3"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#d3d1c7"}
              >
                <p style={{ fontWeight: 500, marginBottom: 4, color: "#2B9EC3" }}>🏫 Criar escola nova</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  Sou o primeiro professor ou diretor a cadastrar minha escola.
                </p>
              </div>
              <div onClick={() => { setSchoolMode("entrar"); setError(null); }} style={{
                border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.2rem",
                cursor: "pointer", transition: "border-color 0.2s"
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#4CAF82"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#d3d1c7"}
              >
                <p style={{ fontWeight: 500, marginBottom: 4, color: "#4CAF82" }}>🔑 Entrar com código de convite</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  Minha escola já está cadastrada. Tenho o código de convite.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2a — Formulário de criação de escola nova */}
        {step === 2 && schoolMode === "criar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ cursor: "pointer", fontSize: 13, color: "#2B9EC3" }}
                onClick={() => { setSchoolMode(null); setError(null); }}>← Voltar</span>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "#2B9EC3" }}>Criar escola</h2>
            </div>
            <div>
              <label style={labelStyle}>Nome da escola *</label>
              <input name="name" value={school.name} onChange={handleSchool} placeholder="E.E. Maria José" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Cidade *</label>
                <input name="city" value={school.city} onChange={handleSchool} placeholder="Macapá" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select name="state" value={school.state} onChange={handleSchool} style={inputStyle}>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>CNPJ</label>
              <input name="cnpj" value={school.cnpj} onChange={handleSchool} placeholder="00.000.000/0000-00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Endereço</label>
              <input name="address" value={school.address} onChange={handleSchool} placeholder="Rua, número, bairro" style={inputStyle} />
            </div>
            <button onClick={handleCriarEscola} disabled={loading} style={{
              width: "100%", padding: "12px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
            }}>
              {loading ? "Salvando..." : "Finalizar cadastro →"}
            </button>
          </div>
        )}

        {/* Etapa 2b — Entrar com código de convite */}
        {step === 2 && schoolMode === "entrar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ cursor: "pointer", fontSize: 13, color: "#2B9EC3" }}
                onClick={() => { setSchoolMode(null); setError(null); }}>← Voltar</span>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "#4CAF82" }}>Código de convite</h2>
            </div>
            <p style={{ fontSize: 14, color: "#5f5e5a", margin: 0 }}>
              Peça o código de convite para o administrador da sua escola. Ele tem 8 letras e números, como <strong>ESCOLA42</strong>.
            </p>
            <div>
              <label style={labelStyle}>Código de convite *</label>
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ex: ESCOLA42"
                maxLength={8}
                style={{ ...inputStyle, letterSpacing: 4, fontSize: 18, textAlign: "center", fontWeight: 500 }}
              />
            </div>
            <button onClick={handleEntrarEscola} disabled={loading} style={{
              width: "100%", padding: "12px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
            }}>
              {loading ? "Verificando..." : "Entrar na escola →"}
            </button>
          </div>
        )}

        {/* Etapa 3 — Confirmação de sucesso */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: "#4CAF82", marginBottom: 8 }}>Cadastro realizado!</h2>
            <p style={{ fontSize: 14, color: "#5f5e5a", marginBottom: 24 }}>
              Sua escola e perfil foram criados com sucesso.
            </p>
            <button onClick={() => navigate("/")} style={{
              width: "100%", padding: "12px",
              background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: "pointer"
            }}>
              Fazer login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}