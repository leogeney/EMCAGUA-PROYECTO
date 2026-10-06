/** Códigos QR reales (librería qrcode-generator, MIT). */
import qrcode from 'qrcode-generator'

/** Matriz de módulos del QR (true = cuadro oscuro). Corrección de errores M: se lee aunque esté algo arrugado. */
export function matrizQr(texto: string): boolean[][] {
  const q = qrcode(0, 'M')
  q.addData(texto)
  q.make()
  const n = q.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)))
}

/** PNG del QR (para meterlo en el Word). */
export async function qrPng(texto: string, px = 360): Promise<Uint8Array> {
  const m = matrizQr(texto)
  const borde = 4, n = m.length + borde * 2
  const celda = Math.max(1, Math.floor(px / n))
  const c = document.createElement('canvas')
  c.width = c.height = n * celda
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#111'
  m.forEach((fila, r) => fila.forEach((on, k) => { if (on) g.fillRect((k + borde) * celda, (r + borde) * celda, celda, celda) }))
  const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}
