import { useNavigate } from "react-router-dom";
import icone from "../assets/icone.png";

export default function PageHeader({ action }) {
  const navigate = useNavigate();
  return (
    <header style={{
      background: "#fff", borderBottom: "0.5px solid #d3d1c7",
      padding: "10px 16px"
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ fontSize: 13, background: "none", border: "none", cursor: "pointer", color: "#5f5e5a", padding: "4px 0" }}
          >
            ← Voltar
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 28 }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "7px 14px", fontSize: 13, cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </header>
  );
}
