import { hashStr } from '../../utils/format'

// Tintes suaves derivados de la marca (fondo / texto)
const TINTES = [
  ['#E3F1EF', '#0F5F57'],
  ['#EEF6E2', '#4A6E1C'],
  ['#E6EEF8', '#24508A'],
  ['#F7ECE4', '#8A4B22'],
  ['#F1EAF6', '#5F3C7E'],
  ['#F6F1DF', '#7A6216'],
]

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')

type Props = { nombre: string; size?: number; estado?: 'Activo' | 'Cortado' | 'Alerta' }

export default function Avatar({ nombre, size = 40, estado }: Props) {
  const [bg, fg] = TINTES[hashStr(nombre) % TINTES.length]
  const dot = estado === 'Cortado' ? 'bg-red-500' : estado === 'Alerta' ? 'bg-amber-400' : 'bg-green-500'
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span className="rounded-full flex items-center justify-center font-bold w-full h-full" style={{ background: bg, color: fg, fontSize: size * 0.36 }}>
        {iniciales(nombre)}
      </span>
      {estado && <span className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-white ${dot}`} style={{ width: size * 0.3, height: size * 0.3 }} />}
    </span>
  )
}
