import { hashStr } from '../utils/format'

/** Patrón tipo QR determinista (decorativo hasta integrar un QR real de validación). */
export default function QrFalso({ value, size = 64 }: { value: string; size?: number }) {
  const n = 9
  let h = hashStr(value)
  const cells: boolean[] = []
  for (let i = 0; i < n * n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
    cells.push((h & 1) === 1)
  }
  const finder = (x: number, y: number) => (x < 3 && y < 3) || (x > n - 4 && y < 3) || (x < 3 && y > n - 4)
  const c = size / n
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-md bg-white border border-gray-200 p-1 shrink-0" aria-hidden="true">
      {cells.map((on, i) => {
        const x = i % n
        const y = Math.floor(i / n)
        const f = finder(x, y)
        const fill = f || on
        return fill ? <rect key={i} x={x * c} y={y * c} width={c} height={c} fill="#1E2A1E" /> : null
      })}
    </svg>
  )
}
