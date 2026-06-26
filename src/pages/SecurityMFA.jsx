import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient.js";

export default function SecurityMFA() {
  const navigate = useNavigate();
  const [step, setStep] = useState("loading"); // loading | list | enroll | verify | done
  const [factors, setFactors] = useState([]);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [factorId, setFactorId] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadFactors(); }, []);

  async function loadFactors() {
    setStep("loading");
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setError(error.message); setStep("list"); return; }
    setFactors(data?.totp || []);
    setStep("list");
  }

  async function startEnroll() {
    setLoading(true); setError(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `InclusivAula ${Date.now()}` });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setStep("verify");
  }

  async function verifyCode() {
    setLoading(true); setError(null);
    const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chalErr) { setError(chalErr.message); setLoading(false); return; }
    const { error: verErr } = await supabase.auth.mfa.verify({ factorId, challengeId: chal.id, code });
    setLoading(false);
    if (verErr) { setError("Código inválido. Tente novamente."); return; }
    setStep("done");
    setTimeout(() => loadFactors(), 1500);
  }

  async function removeFactor(id) {
    if (!confirm("Remover este fator de autenticação?")) return;
    await supabase.auth.mfa.unenroll({ factorId: id });
    loadFactors();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 4px 20px rgba(43,158,195,0.08)" }}>
        <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "#2B9EC3", cursor: "pointer", padding: 0, marginBottom: 16, fontSize: 14 }}>← Voltar</button>

        <h1 style={{ color: "#1a1a2e", marginTop: 0, fontSize: 24 }}>🔐 Autenticação em 2 Fatores</h1>
        <p style={{ color: "#5f5e5a", fontSize: 14, marginBottom: 24 }}>
          Adicione uma camada extra de segurança usando um app autenticador (Google Authenticator, Authy, 1Password).
        </p>

        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #fca5a5", color: "#dc2626", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {step === "loading" && <p>Carregando...</p>}

        {step === "list" && (
          <>
            {factors.filter(f => f.status === "verified").length === 0 ? (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: "#92400e" }}>⚠️ Você ainda não configurou 2FA. Recomendamos fortemente que faça isso agora.</p>
              </div>
            ) : (
              <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: "#065f46" }}>✅ 2FA ativo. Sua conta está protegida.</p>
              </div>
            )}

            {factors.filter(f => f.status === "verified").map(f => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #d3d1c7", borderRadius: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{f.friendly_name || "TOTP"}</div>
                  <div style={{ fontSize: 12, color: "#5f5e5a" }}>Adicionado em {new Date(f.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <button onClick={() => removeFactor(f.id)} style={{ background: "none", border: "1px solid #fca5a5", color: "#dc2626", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Remover</button>
              </div>
            ))}

            <button onClick={startEnroll} disabled={loading} style={{ marginTop: 16, width: "100%", padding: 12, background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              {loading ? "Aguarde..." : "+ Adicionar autenticador"}
            </button>
          </>
        )}

        {step === "verify" && qrCode && (
          <>
            <h3 style={{ color: "#1a1a2e", fontSize: 16, marginTop: 0 }}>1. Escaneie o QR code</h3>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <img src={qrCode} alt="QR code TOTP" style={{ maxWidth: 220, border: "1px solid #d3d1c7", borderRadius: 8 }} />
            </div>

            <details style={{ marginBottom: 16 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, color: "#5f5e5a" }}>Não consegue escanear? Use a chave manual</summary>
              <code style={{ display: "block", padding: 12, background: "#f5f5f5", borderRadius: 6, marginTop: 8, fontSize: 13, wordBreak: "break-all" }}>{secret}</code>
            </details>

            <h3 style={{ color: "#1a1a2e", fontSize: 16 }}>2. Digite o código de 6 dígitos</h3>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              style={{ width: "100%", padding: 12, fontSize: 18, letterSpacing: 8, textAlign: "center", border: "1px solid #d3d1c7", borderRadius: 8, marginBottom: 16, boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep("list")} disabled={loading} style={{ flex: 1, padding: 12, background: "none", border: "1px solid #d3d1c7", borderRadius: 8, cursor: "pointer", color: "#5f5e5a" }}>Cancelar</button>
              <button onClick={verifyCode} disabled={loading || code.length !== 6} style={{ flex: 1, padding: 12, background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 500, cursor: loading || code.length !== 6 ? "not-allowed" : "pointer", opacity: loading || code.length !== 6 ? 0.6 : 1 }}>
                {loading ? "Verificando..." : "Confirmar"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h3 style={{ color: "#065f46" }}>2FA ativado com sucesso!</h3>
            <p style={{ color: "#5f5e5a", fontSize: 14 }}>Da próxima vez que entrar, vamos pedir o código do seu app.</p>
          </div>
        )}
      </div>
    </div>
  );
}
