import { esc } from './format'

/** Exporta una tabla como .xls (HTML compatible con Excel), con estilo de marca. */
export function exportarXls(nombre: string, titulo: string, subtitulo: string, headers: string[], rows: (string | number)[][], numCols: number[] = []) {
  const n = headers.length
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>td{font-family:Arial;font-size:11pt;border:1px solid #EDEEF0} .hdr{background:#156D6D;color:#FFFFFF;font-weight:bold;text-align:center;border:1px solid #0F4F4F} .r1{background:#F8F9F7} .num{text-align:right} .t{font-size:14pt;font-weight:bold;color:#156D6D;border:none} .s{font-size:9pt;color:#666;border:none}</style></head><body><table>`
  html += `<tr><td colspan="${n}" class="t">${esc(titulo)}</td></tr><tr><td colspan="${n}" class="s">${esc(subtitulo)}</td></tr><tr><td colspan="${n}" style="border:none"></td></tr>`
  html += `<tr>${headers.map((h) => `<td class="hdr">${esc(h)}</td>`).join('')}</tr>`
  rows.forEach((r, i) => {
    html += `<tr>${r.map((c, j) => `<td class="${i % 2 ? 'r1' : ''} ${numCols.includes(j) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`
  })
  html += '</table></body></html>'
  const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.xls`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
