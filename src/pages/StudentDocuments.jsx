import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { extractStudentLegacy } from "../services/mapiClient";
import icone from "../assets/icone.png";

const TIPOS = [
  { value: "pei_antigo", label: "PEI antigo" },
  { value: "laudo", label: "Laudo médico" },
  { value: "relatorio", label: "Relatório escolar" },
  { value: "outro", label: "Outro documento" }
];

async function extrairTextoPDF(file) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let texto = "";
  const maxPaginas = Math.min(pdf.numPages, 30);
  for (let p = 1; p <= maxPaginas; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    texto += content.items.map(i => i.str).join(" ") + "\n";
  }
  return texto.trim();
}

export default function StudentDocuments() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [aluno, setAluno] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [tipo, setTipo] = useState("pei_antigo");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Extração por IA
  const [textoLegado, setTextoLegado] = useState("");
  const [lendoPDF, setLendoPDF] = useState(false);
  const [extraindo, setExtraindo] = useState(false);
  const [extraido, setExtraido] = useState(null);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      setSchoolId(profile?.school_id || null);
      const { data: st } = await supabase.from("students").select("*").eq("id", id).single();
      setAluno(st);
      await carregarDocs();
    }
    if (user) load();
  }, [user, id]);

  async function carregarDocs() {
    const { data } = await supabase.from("student_documents")
      .select("*").eq("student_id", id)
      .order("created_at", { ascending: false });
    const comUrls = await Promise.all((data || []).map(async d => {
      const { data: signed } = await supabase.storage.from("evidencias").createSignedUrl(d.path, 3600);
      return { ...d, url: signed?.signedUrl };
    }));
    setDocs(comUrls);
  }

  function mostrar(msg, tipoMsg = "ok") {
    setFeedback({ msg, tipoMsg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function handleUpload(file) {
    if (!file || !schoolId) return;
    if (file.size > 15 * 1024 * 1024) { setErro("Arquivo acima de 15 MB."); return; }
    setErro(null);
    setEnviando(true);
    try {
      const nomeSeguro = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${schoolId}/${id}/doc-${Date.now()}-${nomeSeguro}`;
      const { error: upErr } = await supabase.storage.from("evidencias").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("student_documents").insert({
        student_id: id, school_id: schoolId, user_id: user.id,
        tipo, descricao: descricao || null, path, mime_type: file.type
      });
      if (insErr) throw insErr;
      setDescricao("");
      await carregarDocs();
      mostrar("✅ Documento anexado.");
    } catch {
      setErro("Erro ao enviar o documento.");
    } finally {
      setEnviando(false);
    }
  }

  async function excluirDoc(d) {
    if (!window.confirm("Excluir este documento?")) return;
    try {
      await supabase.storage.from("evidencias").remove([d.path]);
      await supabase.from("student_documents").delete().eq("id", d.id);
      setDocs(prev => prev.filter(x => x.id !== d.id));
    } catch {
      mostrar("Erro ao excluir.", "erro");
    }
  }

  async function handlePDFParaTexto(file) {
    if (!file) return;
    setErro(null);
    setLendoPDF(true);
    try {
      const texto = await extrairTextoPDF(file);
      if (texto.length < 100) {
        setErro("O PDF parece ser digitalizado (imagem) — não foi possível ler o texto. Cole o conteúdo manualmente no campo abaixo.");
      } else {
        setTextoLegado(texto);
        mostrar(`✅ Texto extraído do PDF (${texto.length.toLocaleString("pt-BR")} caracteres). Revise e clique em Extrair.`);
      }
    } catch {
      setErro("Não consegui ler este PDF. Cole o texto manualmente.");
    } finally {
      setLendoPDF(false);
    }
  }

  async function handleExtrair() {
    if (textoLegado.trim().length < 100) { setErro("Cole ou carregue um texto com pelo menos 100 caracteres."); return; }
    setErro(null);
    setExtraindo(true);
    setExtraido(null);
    try {
      const res = await extractStudentLegacy(id, textoLegado);
      setExtraido(res.data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setExtraindo(false);
    }
  }

  async function aplicarAoCadastro() {
    if (!extraido) return;
    setAplicando(true);
    try {
      const juntar = (atual, novo) => {
        if (!novo) return atual || null;
        if (!atual) return novo;
        return atual.includes(novo.substring(0, 40)) ? atual : `${atual}\n\n[Extraído de documento antigo] ${novo}`;
      };
      const payload = {
        observable_behavior: juntar(aluno.observable_behavior, extraido.comportamento_observavel),
        what_helps: juntar(aluno.what_helps, extraido.o_que_ajuda),
        notes: juntar(aluno.notes, [
          extraido.resumo,
          extraido.barreiras?.length ? `Barreiras: ${extraido.barreiras.join("; ")}` : null,
          extraido.potencialidades?.length ? `Potencialidades: ${extraido.potencialidades.join("; ")}` : null
        ].filter(Boolean).join(" · "))
      };
      if (!aluno.disability_type && extraido.nee_identificada) {
        payload.disability_type = extraido.nee_identificada;
      }
      const { data, error: upErr } = await supabase
        .from("students").update(payload).eq("id", id).select().single();
      if (upErr) throw upErr;
      setAluno(data);
      mostrar("✅ Cadastro do aluno atualizado com os dados extraídos. Revise em Editar aluno.");
      setExtraido(null);
      setTextoLegado("");
    } catch {
      setErro("Erro ao atualizar o cadastro do aluno.");
    } finally {
      setAplicando(false);
    }
  }

  const cardStyle = { background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", marginBottom: 16 };

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
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>
          📎 Documentos {aluno ? `— ${aluno.full_name}` : ""}
        </h1>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Anexe PEIs antigos, laudos e relatórios. Documentos ficam em armazenamento privado,
          visíveis apenas para a sua escola (LGPD — dado de saúde de menor).
        </p>

        {erro && (
          <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
            {erro}
          </div>
        )}
        {feedback && (
          <div role="status" style={{ background: feedback.tipoMsg === "erro" ? "#fcebeb" : "#edfff6", border: "0.5px solid #4CAF82", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#0F6E56", marginBottom: 16 }}>
            {feedback.msg}
          </div>
        )}

        {/* Upload */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Anexar documento</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ fontSize: 13, padding: "8px" }}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Descrição (opcional)" style={{ fontSize: 13, padding: "8px", flex: 1, minWidth: 160 }} />
            <label style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8, background: enviando ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", cursor: enviando ? "not-allowed" : "pointer" }}>
              {enviando ? "Enviando..." : "📄 Enviar arquivo"}
              <input type="file" accept=".pdf,.doc,.docx,image/*" disabled={enviando}
                onChange={e => { handleUpload(e.target.files?.[0]); e.target.value = ""; }}
                style={{ display: "none" }} />
            </label>
          </div>

          {docs.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                  <span style={{ background: "#f1efe8", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>
                    {TIPOS.find(t => t.value === d.tipo)?.label || d.tipo}
                  </span>
                  <a href={d.url} target="_blank" rel="noreferrer" style={{ color: "#2B9EC3", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.descricao || d.path.split("/").pop()}
                  </a>
                  <span style={{ color: "#9b9a96", fontSize: 11 }}>{new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
                  <button onClick={() => excluirDoc(d)} style={{ fontSize: 12, color: "#a32d2d", background: "none", border: "none", cursor: "pointer" }}>Excluir</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Extração por IA */}
        <div style={{ ...cardStyle, border: "1px solid #534AB7" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#534AB7", margin: "0 0 4px" }}>
            🤖 Extrair dados de documento antigo com IA
          </p>
          <p style={{ fontSize: 12, color: "#5f5e5a", margin: "0 0 12px" }}>
            Carregue o PDF de um PEI/relatório antigo (ou cole o texto) e a IA organiza barreiras,
            potencialidades e estratégias para pré-preencher o cadastro do aluno — você revisa antes de aplicar.
            O nome do aluno é pseudonimizado antes do envio à IA (LGPD).
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <label style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8, border: "1px solid #534AB7", color: "#534AB7", cursor: lendoPDF ? "wait" : "pointer" }}>
              {lendoPDF ? "Lendo PDF..." : "📕 Carregar texto de um PDF"}
              <input type="file" accept=".pdf" disabled={lendoPDF}
                onChange={e => { handlePDFParaTexto(e.target.files?.[0]); e.target.value = ""; }}
                style={{ display: "none" }} />
            </label>
          </div>

          <textarea value={textoLegado} onChange={e => setTextoLegado(e.target.value)}
            placeholder="Ou cole aqui o texto do documento (do Word, por exemplo)..."
            rows={6} style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: 10 }} />

          <button onClick={handleExtrair} disabled={extraindo} style={{
            marginTop: 10, fontSize: 14, fontWeight: 500, padding: "10px 20px", borderRadius: 8, border: "none",
            background: extraindo ? "#ccc" : "linear-gradient(135deg, #534AB7, #2B9EC3)",
            color: "#fff", cursor: extraindo ? "not-allowed" : "pointer"
          }}>
            {extraindo ? "Nexus7 extraindo..." : "✨ Extrair dados"}
          </button>

          {extraido && (
            <div style={{ marginTop: 16, background: "#f8f7ff", border: "0.5px solid #d3d1c7", borderRadius: 10, padding: "1rem", fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 8px" }}><strong>Resumo:</strong> {extraido.resumo}</p>
              {extraido.nee_identificada && <p style={{ margin: "0 0 8px" }}><strong>NEE citada no documento:</strong> {extraido.nee_identificada}</p>}
              {extraido.barreiras?.length > 0 && (
                <p style={{ margin: "0 0 8px" }}><strong>Barreiras:</strong> {extraido.barreiras.join("; ")}</p>
              )}
              {extraido.potencialidades?.length > 0 && (
                <p style={{ margin: "0 0 8px" }}><strong>Potencialidades:</strong> {extraido.potencialidades.join("; ")}</p>
              )}
              {extraido.o_que_ajuda && <p style={{ margin: "0 0 8px" }}><strong>O que ajuda:</strong> {extraido.o_que_ajuda}</p>}
              {extraido.objetivos_anteriores?.length > 0 && (
                <p style={{ margin: "0 0 8px" }}><strong>Objetivos anteriores:</strong> {extraido.objetivos_anteriores.join("; ")}</p>
              )}
              {extraido.alertas?.length > 0 && (
                <p style={{ margin: "0 0 8px", color: "#BA7517" }}><strong>⚠️ Revisar:</strong> {extraido.alertas.join("; ")}</p>
              )}
              <button onClick={aplicarAoCadastro} disabled={aplicando} style={{
                marginTop: 8, fontSize: 14, fontWeight: 500, padding: "10px 20px", borderRadius: 8, border: "none",
                background: aplicando ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                color: "#fff", cursor: aplicando ? "not-allowed" : "pointer"
              }}>
                {aplicando ? "Aplicando..." : "✅ Aplicar ao cadastro do aluno"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
