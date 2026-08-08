/**
 * Cabeçalho que agrupa os cards de um painel por tipo de decisão.
 *
 * Os painéis cresceram como uma lista plana de cards, e quem abre não sabe o
 * que olhar primeiro. Agrupar por decisão — "quanto eu tenho", "onde investir",
 * "o que acompanhar" — dá ao gestor uma ordem de leitura em vez de um mural.
 */
export default function SecaoPainel({ titulo, descricao }) {
  return (
    <div style={{ margin: "28px 0 12px" }}>
      <h2 style={{
        fontSize: 13, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase",
        color: "#0F6E56", margin: 0, paddingBottom: 6, borderBottom: "1px solid #d3d1c7"
      }}>
        {titulo}
      </h2>
      {descricao && (
        <p style={{ fontSize: 12, color: "#5f5e5a", margin: "6px 0 0" }}>{descricao}</p>
      )}
    </div>
  );
}
