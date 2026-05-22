import { useNavigate } from "react-router-dom";

export default function History() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3" }}>
      <header style={{
        background: "#fff",
        borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        gap: 16
      }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>
          ← Voltar
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Histórico de aulas</h1>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{
          background: "#fff",
          border: "0.5px solid #d3d1c7",
          borderRadius: 12,
          padding: "2rem",
          textAlign: "center",
          color: "#5f5e5a"
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <p style={{ fontSize: 15 }}>
            Histórico será exibido aqui após a integração com o Supabase.
          </p>
          <button
            onClick={() => navigate("/gerar")}
            style={{ marginTop: 16 }}
          >
            Gerar primeira aula
          </button>
        </div>
      </main>
    </div>
  );
}