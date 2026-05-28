import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import icone from "../assets/icone.png";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { reset } = useLesson();
  const navigate = useNavigate();

  function handleNova() {
    reset();
    navigate("/gerar");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff",
        borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 36 }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: "#2B9EC3" }}>
            Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#5f5e5a" }}>{user?.email}</span>
          <button onClick={signOut} style={{ fontSize: 13 }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
          Olá, professor 👋
        </h2>
        <p style={{ color: "#5f5e5a", marginBottom: 32 }}>
          O que vamos fazer hoje?
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
            cursor: "pointer",
            transition: "box-shadow 0.2s",
            boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
          }} onClick={handleNova}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
            <p style={{ fontWeight: 500, marginBottom: 4, color: "#2B9EC3" }}>
              Gerar nova aula
            </p>
            <p style={{ fontSize: 13, color: "#5f5e5a" }}>
              Crie uma aula adaptada com IA
            </p>
          </div>

          <div style={{
            background: "#fff",
            border: "0.5px solid #d3d1c7",
            borderRadius: 12,
            padding: "1.5rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(76,175,130,0.06)"
          }} onClick={() => navigate("/alunos")}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👨‍🎓</div>
            <p style={{ fontWeight: 500, marginBottom: 4, color: "#4CAF82" }}>
              Alunos
            </p>
            <p style={{ fontSize: 13, color: "#5f5e5a" }}>
              Gerencie seus alunos
            </p>
          </div>

          <div style={{
            background: "#fff",
            border: "0.5px solid #d3d1c7",
            borderRadius: 12,
            padding: "1.5rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(76,175,130,0.06)"
          }} onClick={() => navigate("/historico")}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
            <p style={{ fontWeight: 500, marginBottom: 4, color: "#4CAF82" }}>
              Histórico
            </p>
            <p style={{ fontSize: 13, color: "#5f5e5a" }}>
              Veja suas aulas geradas
            </p>
          </div>

          <div style={{
            background: "#fff",
            border: "0.5px solid #d3d1c7",
            borderRadius: 12,
            padding: "1.5rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
          }} onClick={() => navigate("/escola")}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏫</div>
            <p style={{ fontWeight: 500, marginBottom: 4, color: "#2B9EC3" }}>
              Minha escola
            </p>
            <p style={{ fontSize: 13, color: "#5f5e5a" }}>
              Código de convite e professores
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}