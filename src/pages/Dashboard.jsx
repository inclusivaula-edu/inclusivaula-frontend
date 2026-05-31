import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import icone from "../assets/icone.png";

const CARDS = [
  { emoji: "🧠", label: "Gerar nova aula", desc: "Crie uma aula adaptada com IA", rota: "/gerar", cor: "#2B9EC3" },
  { emoji: "👨‍🎓", label: "Alunos", desc: "Gerencie seus alunos", rota: "/alunos", cor: "#4CAF82" },
  { emoji: "📚", label: "Histórico", desc: "Veja suas aulas geradas", rota: "/historico", cor: "#4CAF82" },
  { emoji: "✏️", label: "Avaliações", desc: "Avaliações por bimestre/semestre", rota: "/avaliacoes", cor: "#534AB7" },
  { emoji: "📅", label: "Frequência", desc: "Registre presenças e faltas", rota: "/frequencia", cor: "#2B9EC3" },
  { emoji: "📄", label: "Relatórios", desc: "Gerar relatórios obrigatórios", rota: "/relatorios", cor: "#BA7517" },
  { emoji: "🗂️", label: "Relatórios salvos", desc: "Acesse relatórios gerados", rota: "/relatorios/salvos", cor: "#0F6E56" },
  { emoji: "🏫", label: "Minha escola", desc: "Código de convite e professores", rota: "/escola", cor: "#2B9EC3" },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { reset } = useLesson();
  const navigate = useNavigate();

  function handleCard(rota) {
    if (rota === "/gerar") reset();
    navigate(rota);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center"
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

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Olá, professor 👋</h2>
        <p style={{ color: "#5f5e5a", marginBottom: 32 }}>O que vamos fazer hoje?</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16, marginBottom: 32
        }}>
          {CARDS.map(card => (
            <div
              key={card.rota}
              onClick={() => handleCard(card.rota)}
              style={{
                background: "#fff", border: "0.5px solid #d3d1c7",
                borderRadius: 12, padding: "1.5rem", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(43,158,195,0.06)",
                transition: "box-shadow 0.2s, transform 0.15s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(43,158,195,0.14)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(43,158,195,0.06)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{card.emoji}</div>
              <p style={{ fontWeight: 500, marginBottom: 4, color: card.cor }}>{card.label}</p>
              <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}