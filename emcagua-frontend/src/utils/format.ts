export const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/** $2,4 M · $850 mil · $12.000 */
export function copCompacto(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (abs >= 10_000) return `$${Math.round(n / 1000).toLocaleString('es-CO')} mil`
  return cop(n)
}

export const num = (n: number, dec = 0) => n.toLocaleString('es-CO', { maximumFractionDigits: dec, minimumFractionDigits: dec })
export const pct = (n: number, dec = 0) => `${num(n * 100, dec)}%`

export const fecha = (ts: number | Date) => new Date(ts).toLocaleDateString('es-CO')
export const hora = (ts: number | Date) => new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
export const fechaCorta = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

export const mismoDia = (a: number | Date, b: number | Date) => new Date(a).toDateString() === new Date(b).toDateString()

/** Escapa texto para insertarlo en HTML (exportaciones). */
export const esc = (s: string | number) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Hash estable (para patrones visuales deterministas). */
export function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
