/**
 * Nome de arquivo seguro, espelhando o slugArquivo() do backend.
 *
 * Use apenas para arquivos montados no próprio navegador (CSV, TXT). Quando o
 * arquivo vem da API, prefira o nome do header Content-Disposition — o backend
 * já o monta e duplicar a regra aqui faria os dois lados divergirem.
 *
 * A normalização NFD separa o acento da letra para que ele possa ser removido;
 * sem isso a regex de caracteres seguros descartaria a letra inteira e
 * "Educação" viraria "educa-o".
 */
export function slugArquivo(texto, padrao = "documento") {
  const slug = String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // remove os diacríticos separados pelo NFD
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || padrao;
}
