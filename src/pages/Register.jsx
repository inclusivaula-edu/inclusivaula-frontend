import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import logo from "../assets/logo.png";

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const EDGE_URL = "https://mauafavxvwzcvcotdjdi.supabase.co/functions/v1/register-user";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [schoolMode, setSchoolMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [auth, setAuth] = useState({ email: "", password: "", confirmPassword: "", full_name: "", phone: "", cargo: "professor" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [school, setSchool] = useState({ name: "", city: "", state: "AP", cnpj: "", phone: "", address: "" });
  const [inviteCode, setInviteCode] = useState("");

  function handleAuth(e) { setAuth(prev => ({ ...prev, [e.target.name]: e.target.value })); }
  function handleSchool(e) { setSchool(prev => ({ ...prev, [e.target.name]: e.target.value })); }

  function validarCNPJ(cnpj) {
    const n = cnpj.replace(/\D/g, "");
    if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
    const calc = (len) => {
      let sum = 0, pos = len - 7;
      for (let i = len; i >= 1; i--) {
        sum += parseInt(n.charAt(len - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      const r = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      return r === parseInt(n.charAt(len));
    };
    return calc(12) && calc(13);
  }

  function validateStep1() {
    if (!auth.full_name.trim()) return "Informe seu nome completo.";
    if (!auth.email.trim()) return "Informe seu e-mail.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auth.email)) return "E-mail inválido.";
    if (!auth.password) return "Informe uma senha.";
    if (auth.password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (auth.password !== auth.confirmPassword) return "As senhas não coincidem.";
    if (!acceptedTerms) return "Você precisa aceitar os Termos de Uso e a Política de Privacidade.";
    return null;
  }

  function validateSchool() {
    if (!school.name.trim() || !school.city.trim()) return "Preencha nome e cidade da escola.";
    if (school.cnpj && !validarCNPJ(school.cnpj)) return "CNPJ inválido. Verifique os dígitos.";
    return null;
  }

  function handleStep1() {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(null);
    setStep(2);
  }

  async function handleFinalizar() {
    if (schoolMode === "criar") {
      const errSchool = validateSchool();
      if (errSchool) { setError(errSchool); return; }
    }
    if (schoolMode === "entrar" && !inviteCode.trim()) {
      setError("Digite o código de convite.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: auth.email,
          password: auth.password,
          full_name: auth.full_name,
          phone: auth.phone,
          cargo: auth.cargo,
          schoolMode,
          school: schoolMode === "criar" ? school : null,
          inviteCode: schoolMode === "entrar" ? inviteCode : null,
          acceptedTerms
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro no cadastro.");

      // Sucesso — vai para tela de confirmação de email
      setStep(3);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { width: "100%", boxSizing: "border-box" };
  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "linear-gradient(135deg, #f0f9ff 0%, #f0fff8 100%)",
      padding: "1rem"
    }}>
      <div style={{
        background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 16,
        padding: "2.5rem", width: "100%", maxWidth: 480,
        boxShadow: "0 4px 24px rgba(43,158,195,0.08)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={logo} alt="InclusivAula" style={{ height: 52, marginBottom: 8 }} />
        </div>

        {/* Barra de progresso */}
        {step < 3 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: s <= step ? "linear-gradient(135deg, #2B9EC3, #4CAF82)" : "#d3d1c7"
              }} />
            ))}
          </div>
        )}

        {/* Erro */}
        {error && (
          <div style={{
            background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8,
            padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 20
          }}>
            {error}
          </div>
        )}

        {/* ETAPA 1 — Dados pessoais */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: "#2B9EC3" }}>
                Criar sua conta
              </h2>
              <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                Etapa 1 de 2 — Seus dados pessoais
              </p>
            </div>

            <div>
              <label style={labelStyle}>Nome completo *</label>
              <input name="full_name" value={auth.full_name} onChange={handleAuth}
                placeholder="Maria da Silva" style={inputStyle} autoComplete="name" />
            </div>

            <div>
              <label style={labelStyle}>E-mail profissional *</label>
              <input name="email" type="email" value={auth.email} onChange={handleAuth}
                placeholder="professor@escola.com.br" style={inputStyle} autoComplete="email" />
            </div>

            <div>
              <label style={labelStyle}>Telefone</label>
              <input name="phone" value={auth.phone} onChange={handleAuth}
                placeholder="(96) 99999-9999" style={inputStyle} autoComplete="tel" />
            </div>

            <div>
              <label style={labelStyle}>Cargo / função *</label>
              <select name="cargo" value={auth.cargo} onChange={handleAuth} style={inputStyle}>
                <option value="professor">Professor(a)</option>
                <option value="coordenador">Coordenador(a) pedagógico(a)</option>
                <option value="diretor">Diretor(a)</option>
                <option value="coordenador_municipal">Coordenador(a) municipal</option>
                <option value="coordenador_estadual">Coordenador(a) estadual</option>
                <option value="secretario_municipal">Secretário(a) municipal de educação</option>
                <option value="secretario_estadual">Secretário(a) estadual de educação</option>
                <option value="aee">Profissional de AEE</option>
                <option value="psicologo">Psicólogo(a) escolar</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Senha * (mínimo 6 caracteres)</label>
              <input name="password" type="password" value={auth.password} onChange={handleAuth}
                placeholder="••••••••" style={inputStyle} autoComplete="new-password" />
            </div>

            <div>
              <label style={labelStyle}>Confirmar senha *</label>
              <input name="confirmPassword" type="password" value={auth.confirmPassword} onChange={handleAuth}
                placeholder="••••••••" style={inputStyle} autoComplete="new-password" />
            </div>

            <button onClick={handleStep1} style={{
              width: "100%", padding: "12px", marginTop: 4,
              background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: "pointer"
            }}>
              Continuar →
            </button>

            <p style={{ fontSize: 13, textAlign: "center", color: "#5f5e5a" }}>
              Já tem conta?{" "}
              <span style={{ color: "#2B9EC3", cursor: "pointer", fontWeight: 500 }}
                onClick={() => navigate("/")}>
                Entrar
              </span>
            </p>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#5f5e5a", lineHeight: 1.5, cursor: "pointer" }}>
              <input type="checkbox" checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#2B9EC3" }} />
              <span>
                Li e concordo com os{" "}
                <a href="/termos" target="_blank" style={{ color: "#2B9EC3" }}>Termos de Uso</a>
                {" "}e com a{" "}
                <a href="/privacidade" target="_blank" style={{ color: "#2B9EC3" }}>Política de Privacidade</a>,
                incluindo o tratamento de dados educacionais e de saúde de alunos conforme a LGPD.
              </span>
            </label>
          </div>
        )}

        {/* ETAPA 2 — Escola */}
        {step === 2 && !schoolMode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: "#2B9EC3" }}>
                Sua escola
              </h2>
              <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                Etapa 2 de 2 — Vincule-se a uma escola
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              {["coordenador", "coordenador_municipal", "coordenador_estadual", "diretor", "secretario_municipal", "secretario_estadual"].includes(auth.cargo) ? (
                <div onClick={() => { setSchoolMode("criar"); setError(null); }} style={{
                  border: "0.5px solid #d3d1c7", borderRadius: 12,
                  padding: "1.2rem", cursor: "pointer"
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#2B9EC3"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#d3d1c7"}
                >
                  <p style={{ fontWeight: 600, marginBottom: 4, color: "#2B9EC3" }}>🏫 Cadastrar escola nova</p>
                  <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                    Sou coordenador(a) ou diretor(a) e vou cadastrar minha escola.
                  </p>
                </div>
              ) : (
                <div style={{
                  border: "0.5px solid #d3d1c7", borderRadius: 12,
                  padding: "1.2rem", opacity: 0.5
                }}>
                  <p style={{ fontWeight: 600, marginBottom: 4, color: "#888" }}>🏫 Cadastrar escola nova</p>
                  <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                    Disponível apenas para coordenadores, diretores ou autoridades. Solicite o código de convite.
                  </p>
                </div>
              )}

              <div onClick={() => { setSchoolMode("entrar"); setError(null); }} style={{
                border: "0.5px solid #d3d1c7", borderRadius: 12,
                padding: "1.2rem", cursor: "pointer"
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#4CAF82"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#d3d1c7"}
              >
                <p style={{ fontWeight: 600, marginBottom: 4, color: "#4CAF82" }}>🔑 Entrar com código de convite</p>
                <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                  Minha escola já está cadastrada. Tenho o código de convite.
                </p>
              </div>
            </div>

            <button onClick={() => { setStep(1); setError(null); }} style={{
              background: "none", border: "none", color: "#5f5e5a",
              fontSize: 13, cursor: "pointer", textAlign: "left"
            }}>
              ← Voltar
            </button>
          </div>
        )}

        {/* ETAPA 2a — Criar escola */}
        {step === 2 && schoolMode === "criar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: "#2B9EC3" }}>
                Dados da escola
              </h2>
              <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                Você será o administrador desta escola
              </p>
            </div>

            <div>
              <label style={labelStyle}>Nome da escola *</label>
              <input name="name" value={school.name} onChange={handleSchool}
                placeholder="E.M. Prof. Maria Silva" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
              <div>
                <label style={labelStyle}>Cidade *</label>
                <input name="city" value={school.city} onChange={handleSchool}
                  placeholder="Macapá" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select name="state" value={school.state} onChange={handleSchool} style={inputStyle}>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>CNPJ</label>
                <input name="cnpj" value={school.cnpj} onChange={handleSchool}
                  placeholder="00.000.000/0000-00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input name="phone" value={school.phone} onChange={handleSchool}
                  placeholder="(96) 3000-0000" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Endereço</label>
              <input name="address" value={school.address} onChange={handleSchool}
                placeholder="Rua, número, bairro" style={inputStyle} />
            </div>

            <button onClick={handleFinalizar} disabled={loading} style={{
              width: "100%", padding: "12px", marginTop: 4,
              background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
            }}>
              {loading ? "Criando cadastro..." : "✅ Finalizar cadastro"}
            </button>

            <button onClick={() => { setSchoolMode(null); setError(null); }} style={{
              background: "none", border: "none", color: "#5f5e5a",
              fontSize: 13, cursor: "pointer", textAlign: "left"
            }}>
              ← Voltar
            </button>
          </div>
        )}

        {/* ETAPA 2b — Entrar com código */}
        {step === 2 && schoolMode === "entrar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: "#4CAF82" }}>
                Código de convite
              </h2>
              <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                Solicite o código ao administrador da sua escola
              </p>
            </div>

            <div>
              <label style={labelStyle}>Código de convite *</label>
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ex: AB12CD"
                maxLength={8}
                style={{
                  ...inputStyle,
                  fontFamily: "monospace", fontSize: 22,
                  letterSpacing: 4, textAlign: "center",
                  textTransform: "uppercase"
                }}
              />
            </div>

            <button onClick={handleFinalizar} disabled={loading} style={{
              width: "100%", padding: "12px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
            }}>
              {loading ? "Verificando código..." : "✅ Entrar na escola"}
            </button>

            <button onClick={() => { setSchoolMode(null); setError(null); }} style={{
              background: "none", border: "none", color: "#5f5e5a",
              fontSize: 13, cursor: "pointer", textAlign: "left"
            }}>
              ← Voltar
            </button>
          </div>
        )}

        {/* ETAPA 3 — Confirmação de email enviado */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#2B9EC3", marginBottom: 8 }}>
              Confirme seu e-mail
            </h2>
            <p style={{ fontSize: 14, color: "#5f5e5a", marginBottom: 8, lineHeight: 1.6 }}>
              Enviamos um link de confirmação para:
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#2c2c2a", marginBottom: 20 }}>
              {auth.email}
            </p>
            <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24, lineHeight: 1.6 }}>
              Clique no link que enviamos por e-mail para ativar sua conta e acessar a plataforma.
              Verifique também a pasta de spam.
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
              Ir para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}