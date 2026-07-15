import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { importStudents } from "../services/mapiClient";
import icone from "../assets/icone.png";

// Mapeamento tolerante de cabeçalhos — planilha de secretaria nunca vem padronizada
const COLUNAS = {
  full_name: ["nome", "nome do aluno", "nome completo", "aluno", "estudante", "nome do estudante"],
  birth_date: ["nascimento", "data de nascimento", "data nascimento", "data nasc", "dt nascimento", "dt nasc", "nasc"],
  grade: ["serie", "série", "ano", "ano/serie", "ano/série", "serie/ano", "ano escolar"],
  turma: ["turma", "classe", "sala"],
  disability_type: ["nee", "deficiencia", "deficiência", "tipo de deficiencia", "tipo de deficiência", "necessidade", "necessidade especial", "laudo", "condicao", "condição"],
  guardian_name: ["responsavel", "responsável", "nome do responsavel", "nome do responsável", "pai/mae", "pai/mãe", "mae", "mãe", "pai"],
  guardian_phone: ["telefone", "telefone do responsavel", "telefone do responsável", "celular", "contato", "fone", "whatsapp"],
  notes: ["observacoes", "observações", "observacao", "observação", "obs", "notas", "anotacoes", "anotações"]
};

// Converte data serial do Excel (dias desde 1900) para dd/mm/aaaa
function converterDataExcel(valor) {
  const s = String(valor || "").trim();
  if (!/^\d+([.,]\d+)?$/.test(s)) return s; // não é serial — devolve como veio
  const serial = parseFloat(s.replace(",", "."));
  if (serial < 1000 || serial > 80000) return s; // fora da faixa de datas plausíveis
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getUTCFullYear()}`;
}

function normalizarCabecalho(h) {
  return String(h || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function mapearColunas(cabecalhos) {
  const mapa = {};
  cabecalhos.forEach((h, idx) => {
    const norm = normalizarCabecalho(h);
    for (const [campo, sinonimos] of Object.entries(COLUNAS)) {
      if (mapa[campo] === undefined && sinonimos.some(s => normalizarCabecalho(s) === norm)) {
        mapa[campo] = idx;
      }
    }
  });
  return mapa;
}

const MODELO_CSV = "Nome do aluno;Data de nascimento;Série;Turma;NEE;Responsável;Telefone;Observações\nMaria Souza;12/03/2016;3º ano;A;Autismo;Joana Souza;(96) 99999-0000;Usa comunicação alternativa\nJoão Lima;05/08/2015;4º ano;B;TDAH;;;";

export default function ImportStudents() {
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState(null);
  const [marcadas, setMarcadas] = useState([]); // índices das linhas que serão importadas
  const [mapa, setMapa] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erro, setErro] = useState(null);
  const [lgpd, setLgpd] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  function baixarModelo() {
    const blob = new Blob(["﻿" + MODELO_CSV], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modelo-importacao-alunos.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setResultado(null);
    setNomeArquivo(file.name);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array", raw: false, cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const matriz = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
        if (matriz.length < 2) { setErro("A planilha precisa ter um cabeçalho e pelo menos uma linha de aluno."); return; }

        const m = mapearColunas(matriz[0]);
        if (m.full_name === undefined) {
          setErro(`Não encontrei a coluna com o nome do aluno. Cabeçalhos lidos: ${matriz[0].join(", ")}. Renomeie a coluna para "Nome do aluno" ou baixe o modelo.`);
          return;
        }

        const dados = matriz.slice(1)
          .filter(row => String(row[m.full_name] || "").trim())
          .map(row => ({
            full_name: String(row[m.full_name] || "").trim(),
            birth_date: m.birth_date !== undefined ? converterDataExcel(String(row[m.birth_date] || "").trim()) : "",
            grade: m.grade !== undefined ? String(row[m.grade] || "").trim() : "",
            turma: m.turma !== undefined ? String(row[m.turma] || "").trim() : "",
            disability_type: m.disability_type !== undefined ? String(row[m.disability_type] || "").trim() : "",
            guardian_name: m.guardian_name !== undefined ? String(row[m.guardian_name] || "").trim() : "",
            guardian_phone: m.guardian_phone !== undefined ? String(row[m.guardian_phone] || "").trim() : "",
            notes: m.notes !== undefined ? String(row[m.notes] || "").trim() : ""
          }));

        if (dados.length === 0) { setErro("Nenhuma linha com nome de aluno encontrada."); return; }
        if (dados.length > 500) { setErro(`A planilha tem ${dados.length} alunos — o limite é 500 por importação. Divida em arquivos menores.`); return; }
        setLinhas(dados);
        setMarcadas(dados.map((_, i) => i)); // todas selecionadas por padrão
        setMapa(m);
      } catch {
        setErro("Não consegui ler o arquivo. Use .xlsx, .xls ou .csv.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImportar() {
    if (!lgpd) { setErro("Confirme a declaração de base legal (LGPD) para prosseguir."); return; }
    const paraImportar = linhas.filter((_, i) => marcadas.includes(i));
    if (paraImportar.length === 0) { setErro("Marque pelo menos um aluno para importar."); return; }
    setErro(null);
    setEnviando(true);
    try {
      const res = await importStudents(paraImportar, true);
      setResultado(res.data);
      setLinhas(null);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function baixarRejeitados() {
    const csv = "﻿Linha;Nome;Motivo\n" + resultado.rejeitados.map(r => `${r.linha};${r.nome};${r.motivo}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "alunos-rejeitados.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const camposDetectados = mapa
    ? Object.keys(COLUNAS).filter(c => mapa[c] !== undefined)
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      <header style={{ background: "#fff", borderBottom: "0.5px solid #d3d1c7", padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate("/alunos")} style={{ fontSize: 13 }}>← Alunos</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span></span>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>📥 Importar alunos por planilha</h1>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Aceita Excel (.xlsx, .xls) e CSV — inclusive a planilha que a secretaria já usa.
          Nada é gravado antes de você revisar a pré-visualização.
        </p>

        {erro && (
          <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
            {erro}
          </div>
        )}

        {/* Resultado da importação */}
        {resultado && (
          <div style={{ background: "#fff", border: "1px solid #4CAF82", borderRadius: 12, padding: "1.5rem", marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, color: "#0F6E56", margin: "0 0 8px" }}>✅ Importação concluída</h2>
            <p style={{ fontSize: 14, margin: "0 0 4px" }}><strong>{resultado.inseridos}</strong> aluno(s) cadastrado(s).</p>
            {resultado.rejeitados.length > 0 && (
              <>
                <p style={{ fontSize: 14, color: "#BA7517", margin: "8px 0" }}>
                  ⚠️ {resultado.rejeitados.length} linha(s) não importada(s):
                </p>
                <ul style={{ fontSize: 13, color: "#5f5e5a", margin: "0 0 12px", paddingLeft: 20, maxHeight: 180, overflowY: "auto" }}>
                  {resultado.rejeitados.slice(0, 20).map((r, i) => (
                    <li key={i}>Linha {r.linha} — {r.nome}: {r.motivo}</li>
                  ))}
                  {resultado.rejeitados.length > 20 && <li>... e mais {resultado.rejeitados.length - 20}</li>}
                </ul>
                <button onClick={baixarRejeitados} style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #BA7517", color: "#BA7517", background: "#fff", cursor: "pointer" }}>
                  ⬇️ Baixar rejeitados (CSV) para corrigir
                </button>
              </>
            )}
            <div style={{ marginTop: 14 }}>
              <button onClick={() => navigate("/alunos")} style={{ fontSize: 14, padding: "10px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", cursor: "pointer" }}>
                Ver alunos cadastrados →
              </button>
            </div>
          </div>
        )}

        {/* Passo 1 — arquivo */}
        {!resultado && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>1. Escolha a planilha</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 13, padding: "10px 16px", borderRadius: 8, background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", cursor: "pointer" }}>
                📄 Selecionar arquivo
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleArquivo} style={{ display: "none" }} />
              </label>
              {nomeArquivo && <span style={{ fontSize: 13, color: "#5f5e5a" }}>{nomeArquivo}</span>}
              <button onClick={baixarModelo} style={{ fontSize: 12, background: "none", border: "none", color: "#2B9EC3", cursor: "pointer", textDecoration: "underline" }}>
                Baixar planilha modelo
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#9b9a96", margin: "10px 0 0" }}>
              Colunas reconhecidas automaticamente: nome, data de nascimento, série, turma, NEE/deficiência, responsável, telefone e observações — mesmo com nomes diferentes.
              Não inclua CPF nem dados que o sistema não usa (princípio de minimização da LGPD).
            </p>
          </div>
        )}

        {/* Passo 2 — pré-visualização */}
        {linhas && !resultado && (
          <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem" }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>
              2. Confira antes de importar — {linhas.length} aluno(s)
            </p>
            <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
              Campos detectados: {camposDetectados.length ? camposDetectados.join(", ") : "—"}.
              Duplicados e datas inválidas serão apontados na importação, sem travar as demais linhas.
            </p>

            <div style={{ overflowX: "auto", maxHeight: 320, border: "0.5px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f1efe8", position: "sticky", top: 0 }}>
                    <th style={{ padding: "6px 10px" }}>
                      <input type="checkbox"
                        checked={marcadas.length === linhas.length}
                        onChange={e => setMarcadas(e.target.checked ? linhas.map((_, i) => i) : [])}
                        aria-label="Selecionar todos"
                        style={{ accentColor: "#2B9EC3" }} />
                    </th>
                    {["#", "Nome", "Nascimento", "Série", "Turma", "NEE", "Responsável", "Telefone"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.slice(0, 100).map((l, i) => (
                    <tr key={i} style={{ borderTop: "0.5px solid #eee", opacity: marcadas.includes(i) ? 1 : 0.45 }}>
                      <td style={{ padding: "5px 10px" }}>
                        <input type="checkbox"
                          checked={marcadas.includes(i)}
                          onChange={e => setMarcadas(prev => e.target.checked ? [...prev, i] : prev.filter(x => x !== i))}
                          aria-label={`Importar ${l.full_name}`}
                          style={{ accentColor: "#2B9EC3" }} />
                      </td>
                      <td style={{ padding: "5px 10px", color: "#9b9a96" }}>{i + 2}</td>
                      <td style={{ padding: "5px 10px" }}>{l.full_name}</td>
                      <td style={{ padding: "5px 10px" }}>{l.birth_date || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{l.grade || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{l.turma || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{l.disability_type || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{l.guardian_name || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{l.guardian_phone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {linhas.length > 100 && (
              <p style={{ fontSize: 12, color: "#9b9a96", margin: "6px 0 0" }}>Mostrando as 100 primeiras — as demais seguem marcadas e serão importadas junto.</p>
            )}

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#5f5e5a", lineHeight: 1.5, cursor: "pointer", margin: "16px 0" }}>
              <input type="checkbox" checked={lgpd} onChange={e => setLgpd(e.target.checked)} style={{ marginTop: 2, accentColor: "#2B9EC3" }} />
              <span>
                Declaro que a escola possui base legal (LGPD, art. 7º e 11) para o tratamento destes dados de alunos,
                realizado no âmbito da execução de políticas públicas de educação e do dever legal de oferta do AEE.
                Esta declaração fica registrada em auditoria.
              </span>
            </label>

            <button onClick={handleImportar} disabled={enviando} style={{
              fontSize: 15, fontWeight: 500, padding: "12px 24px", borderRadius: 8, border: "none",
              background: enviando ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", cursor: enviando ? "not-allowed" : "pointer"
            }}>
              {enviando ? "Importando..." : `✅ Importar ${marcadas.length} de ${linhas.length} aluno(s)`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
