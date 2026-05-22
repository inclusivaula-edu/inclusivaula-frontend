import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { reset } = useLesson();
  const navigate = useNavigate();

  function handleNova() {
    reset();
    navigate("/gerar");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3" }}>
      <header style={{
        background: "#fff",
        borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>InclusivAula</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#5f5e5a" }}>{user?.email}</span>
          <button onClick={signOut} style={{ fontSize: 13 }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
          Olá, professor
        </h2>
        <p style={{ color: "#5f5e5a", marginBottom: 32 }}>
          O que vamos gerar hoje?
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32
        }}>
          <div style={{
            background: "#fff",
            border: "0.5px solid #d3d1c7",
            borderRadius: 12,
            padding: "1.5rem",
            cursor: "pointer"
          }} onClick={handleNova}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🧠</div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>Gerar nova aula</p>
            <p style={{ fontSize: 13, color: "#5f5e5a" }}>
              Crie uma aula adaptada com o MAPI
            </p>
          </div>

          <div style={{
            background: "#fff",
            border: "0.5px solid #d3d1c7",
            borderRadius: 12,
            padding: "1.5rem",
            cursor: "pointer"
          }} onClick={() => navigate("/historico")}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📚</div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>Histórico</p>
            <p style={{ fontSize: 13, color: "#5f5e5a" }}>
              Veja suas aulas geradas
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}