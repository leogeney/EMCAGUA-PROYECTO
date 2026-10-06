import { useMemo } from 'react'
import { matrizQr } from '../utils/qr'

/** QR real que se puede escanear con la cámara del celular. */
export default function Qr({ value, size = 96, className = '' }: { value: string; size?: number; className?: string }) {
  const m = useMemo(() => matrizQr(value), [value])
  const n = m.length + 4 // margen de 2 módulos a cada lado
  const d = m.flatMap((fila, r) => fila.map((on, c) => (on ? `M${c + 2} ${r + 2}h1v1h-1z` : ''))).join('')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" className={`bg-white rounded-md shrink-0 ${className}`} role="img" aria-label="Código QR de verificación">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#111" />
    </svg>
  )
}
