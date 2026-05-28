import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import icone from "../assets/icone.png";

export default function SchoolAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    async function load() {
      // Busca o school_id do professor logado via tabela profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) { setLoading(false); return; }

      // Busca os dados completos da escola incluindo o código de convite
      const { data: schoolData } = await supabase
        .from("schools")
        .select("*")
        .eq("id", profile.school_id)
        .single();

      // Busca todos os professores vinculados a essa escola
      const { data: teachersData } = await supabase
        .from("teachers")
        .select("id, full_name, email, created_at")
        .eq("school_id", profile.school_id)
        .order("full_name");

      setSchool(schoolData);
      setTeachers(teachersData || []);
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  function handleCopy() {
    navigator.clipboard.writeText(school.invite_code);
    setCopied(true);
    // Reseta o feedback visual após 2 segundos
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#5f5e5a", fontSize: 14 }}>Carregando...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#5f5e5a", fontSize: 14 }}>Escola não encontrada.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex", alignItems: "center", gap: 16
      }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
            Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Dados da escola */}
        <div style={{
          background: "#fff", border: "0.5px solid #d3d1c7",
          borderRadius: 12, padding: "1.5rem", marginBottom: 20,
          boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: "#2B9EC3", marginBottom: 4 }}>
            {school.name}
          </h2>
          <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 0 }}>
            {school.city} · {school.state}
            {school.cnpj ? ` · CNPJ: ${school.cnpj}` : ""}
          </p>
        </div>

        {/* Bloco do código de convite — este é o elemento central da tela */}
        <div style={{
          background: "linear-gradient(135deg, #e8f7fd, #edfff6)",
          border: "0.5px solid #2B9EC3", borderRadius: 12,
          padding: "1.5rem", marginBottom: 20
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", marginBottom: 8 }}>
            🔑 Código de convite
          </h3>
          <p style={{ fontSize: 13, color: "#1a6e8a", marginBottom: 16 }}>
            Compartilhe este código com os professores da sua escola. Eles vão usar no cadastro para entrar automaticamente na escola certa.
          </p>

          {/* O código em destaque, com botão de copiar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#fff", border: "0.5px solid #2B9EC3",
            borderRadius: 10, padding: "14px 20px"
          }}>
            <span style={{
              fontSize: 28, fontWeight: 600, letterSpacing: 6, color: "#2B9EC3",
              fontFamily: "monospace"
            }}>
              {school.invite_code}
            </span>
            <button
              onClick={handleCopy}
              style={{
                padding: "8px 16px", fontSize: 13,
                background: copied ? "#4CAF82" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              {copied ? "✓ Copiado!" : "Copiar"}
            </button>
          </div>

          {/* Dica de como compartilhar */}
          <p style={{ fontSize: 12, color: "#1a6e8a", marginTop: 12, marginBottom: 0 }}>
            💡 Dica: envie pelo WhatsApp — "Para se cadastrar na InclusivAula, acesse www.inclusivaula.com.br/cadastro e use o código <strong>{school.invite_code}</strong>"
          </p>
        </div>

        {/* Lista de professores da escola */}
        <div style={{
          background: "#fff", border: "0.5px solid #d3d1c7",
          borderRadius: 12, padding: "1.5rem",
          boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", marginBottom: 16 }}>
            👩‍🏫 Professores cadastrados ({teachers.length})
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