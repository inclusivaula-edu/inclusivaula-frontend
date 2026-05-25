import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { createSchool, createTeacher } from "../services/schoolClient";
import logo from "../assets/logo.png";

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [auth, setAuth] = useState({ email: "", password: "", full_name: "", phone: "" });
  const [school, setSchool] = useState({ name: "", city: "", state: "AP", cnpj: "", phone: "", address: "" });
  const [userId, setUserId] = useState(null);

  function handleAuth(e) {
    setAuth(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSchool(e) {
    setSchool(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleStep1() {
    if (!auth.email || !auth.password || !auth.full_name) {
      setError("Preencha nome, e-mail e senha.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: auth.email,
        password: auth.password
      });
      if (signUpError) throw signUpError;
      setUserId(data.user.id);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2() {
    if (!school.name || !school.city) {
      setError("Preencha nome e cidade da escola.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const newSchool = await createSchool({
        ...school,
        admin_user_id: userId
      });

      await createTeacher({
        user_id: userId,
        school_id: newSchool.id,
        full_name: auth.full_name,
        email: auth.email,
        phone: auth.phone,
        specialization: ""
      });

      await supabase.from("profiles").upsert({
        id: userId,
        email: auth.email,
        role: "teacher",
        school_id: newSchool.id,
        full_name: auth.full_name
      });

      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { width: "100%", boxSizing: "border-box" };
  const labelStyle = { fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f0f9ff 0%, #f0fff8 100%)"
    }}>
      <div style={{
        background: "#fff",
        border: "0.5px solid #d3d1c7",
        borderRadius: 16,
        padding: "2.5rem",
        width: "100%",
        maxWidth: 480,
        boxShadow: "0 4px 24px rgba(43,158,195,0.08)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={logo} alt="InclusivAula" style={{ height: 52, marginBottom: 8 }} />
        </div>

        {/* Steps indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: s <= step ? "linear-gradient(135deg, #2B9EC3, #4CAF82)" : "#d3d1c7"
            }} />
          ))}
        </div>

        {error && (
          <div style={{
            background: "#fcebeb",
            border: "0.5px solid #a32d2d",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#791f1f",
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        {/* Step 1 — Dados do professor */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "#2B9EC3" }}>
              Seus dados
            </h2>
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
            <button
              onClick={handleStep1}
              disabled={loading}
              style={{
                width: "100%", padding: "12px",
                background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Criando conta..." : "Continuar →"}
            </button>
            <p style={{ fontSize: 13, textAlign: "center", color: "#5f5e5a" }}>
              Já tem conta?{" "}
              <span style={{ color: "#2B9EC3", cursor: "pointer" }} onClick={() => navigate("/")}>
                Entrar
              </span>
            </p>
          </div>
        )}

        {/* Step 2 — Dados da escola */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "#2B9EC3" }}>
              Sua escola
            </h2>
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
            <button
              onClick={handleStep2}
              disabled={loading}
              style={{
                width: "100%", padding: "12px",
                background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Salvando..." : "Finalizar cadastro →"}
            </button>
          </div>
        )}

        {/* Step 3 — Sucesso */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: "#4CAF82", marginBottom: 8 }}>
              Cadastro realizado!
            </h2>
            <p style={{ fontSize: 14, color: "#5f5e5a", marginBottom: 24 }}>
              Sua escola e perfil foram criados com sucesso.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                width: "100%", padding: "12px",
                background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 500, cursor: "pointer"
              }}
            >
              Fazer login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}