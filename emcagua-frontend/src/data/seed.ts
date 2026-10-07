/**
 * Datos de demostración DETERMINISTAS (misma semilla => mismos datos en cada recarga).
 * Se reemplazará por la API de Django cuando exista el backend.
 */
import { SECTORES_INICIALES } from './zonas'
/** Los datos de ejemplo usaban otros nombres de zona: se pasan a los 5 sectores reales. */
const SECTOR_DEMO: Record<string, string> = { Centro: 'Centro', Guamalito: 'Líbano', 'El Carmen': 'Pique Tierra', 'La Esperanza': 'Calle Nueva' }
import { generacionPeriodo, periodosRecientes, vencimientoPeriodo, facturaId, montoPeriodo, nombrePeriodo } from './billing'
import type { Pago, Periodo, Usuario } from './types'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Estacionalidad: meses secos (ene-mar, jul-ago) consumen más.
const FACTOR_MES = [1.08, 1.12, 1.1, 0.98, 0.94, 0.96, 1.05, 1.1, 1.02, 0.95, 0.92, 1.0]

type Semilla = {
  id: string
  nombre: string
  barrio: string
  estrato: 1 | 2 | 3
  telefono: string
  base: number
  /** Periodos atrás (0 = último) desde que debe. null = al día */
  debeDesde: number | null
  cortado: boolean
  /** Pico de consumo en el último periodo (posible fuga) */
  pico?: number
  /** Para propietarios con varios predios: misma cédula que su otro predio */
  cedula?: string
  direccion?: string
  ocupante?: { nombre: string; telefono: string }
}

/** Cédula y dirección de demostración, fijas para cada ID (no gastan números aleatorios). */
const h = (s: string) => { let x = 2166136261; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0; x ^= x >>> 13; return Math.imul(x, 2654435761) >>> 0 }
const cedulaDemo = (id: string) => String(88_000_000 + (h(id) % 9_000_000))
const CALLES: Record<string, string> = { Centro: 'Calle', Guamalito: 'Carrera', 'El Carmen': 'Calle', 'La Esperanza': 'Carrera' }
const direccionDemo = (id: string, barrio: string) => { const x = h(id + barrio); return `${CALLES[barrio] ?? 'Calle'} ${2 + (x % 12)} # ${1 + ((x >>> 4) % 15)}-${10 + ((x >>> 8) % 80)}` }

// Propietarios con más de un predio (casos de prueba)
const CASAS_EXTRA: Semilla[] = [
  { id: '10294', nombre: 'Juan Pérez', cedula: cedulaDemo('10234'), barrio: 'Guamalito', estrato: 1, telefono: '310 456 7890', base: 14, debeDesde: null, cortado: false, ocupante: { nombre: 'Rosa Bayona', telefono: '311 902 3344' } },
  { id: '10295', nombre: 'Fernando Ortiz', cedula: cedulaDemo('10244'), barrio: 'Centro', estrato: 2, telefono: '314 333 4455', base: 24, debeDesde: 2, cortado: false, ocupante: { nombre: 'Camilo Durán', telefono: '320 455 1290' } },
  { id: '10296', nombre: 'Diana Herrera', cedula: cedulaDemo('10243'), barrio: 'El Carmen', estrato: 3, telefono: '317 888 9900', base: 11, debeDesde: null, cortado: false },
  { id: '10297', nombre: 'Diana Herrera', cedula: cedulaDemo('10243'), barrio: 'Centro', estrato: 3, telefono: '317 888 9900', base: 6, debeDesde: 1, cortado: false, ocupante: { nombre: 'Local comercial (bajos)', telefono: '317 888 9900' } },
]

// Usuarios originales del prototipo (se conservan los casos de prueba).
const ORIGINALES: Semilla[] = [
  { id: '10234', nombre: 'Juan Pérez', barrio: 'Centro', estrato: 2, telefono: '310 456 7890', base: 18, debeDesde: null, cortado: false },
  { id: '10235', nombre: 'María López', barrio: 'Guamalito', estrato: 1, telefono: '312 234 5678', base: 32, debeDesde: 1, cortado: true },
  { id: '10236', nombre: 'Carlos Ruiz', barrio: 'El Carmen', estrato: 3, telefono: '315 678 9012', base: 12, debeDesde: null, cortado: false },
  { id: '10237', nombre: 'Ana Torres', barrio: 'Centro', estrato: 2, telefono: '320 111 2233', base: 45, debeDesde: 1, cortado: true },
  { id: '10238', nombre: 'Jorge Gómez', barrio: 'La Esperanza', estrato: 1, telefono: '318 444 5566', base: 8, debeDesde: null, cortado: false },
  { id: '10239', nombre: 'Lucía Martínez', barrio: 'Guamalito', estrato: 2, telefono: '311 777 8899', base: 28, debeDesde: 2, cortado: true },
  { id: '10240', nombre: 'Pedro Díaz', barrio: 'Centro', estrato: 3, telefono: '316 999 0011', base: 15, debeDesde: null, cortado: false },
  { id: '10241', nombre: 'Sofía Ramírez', barrio: 'La Esperanza', estrato: 2, telefono: '313 222 3344', base: 38, debeDesde: 1, cortado: true },
  { id: '10242', nombre: 'Andrés Castro', barrio: 'El Carmen', estrato: 1, telefono: '319 555 6677', base: 22, debeDesde: null, cortado: false },
  { id: '10243', nombre: 'Diana Herrera', barrio: 'Centro', estrato: 3, telefono: '317 888 9900', base: 14, debeDesde: null, cortado: false },
  { id: '10244', nombre: 'Fernando Ortiz', barrio: 'Guamalito', estrato: 2, telefono: '314 333 4455', base: 41, debeDesde: 1, cortado: false },
  { id: '10245', nombre: 'Valentina Ríos', barrio: 'La Esperanza', estrato: 1, telefono: '322 666 7788', base: 9, debeDesde: 1, cortado: true },
  { id: '10246', nombre: 'Ejemplo Deuda Marzo', barrio: 'Centro', estrato: 2, telefono: '300 123 4567', base: 22, debeDesde: 6, cortado: true },
  { id: '10247', nombre: 'Usuario WhatsApp', barrio: 'Centro', estrato: 2, telefono: '312 324 4168', base: 19, debeDesde: null, cortado: false },
  { id: '10248', nombre: 'Mariana Muñoz', barrio: 'Centro', estrato: 2, telefono: '313 468 5430', base: 21, debeDesde: null, cortado: false },
  { id: '10249', nombre: 'Alto Consumo Al Día', barrio: 'La Esperanza', estrato: 2, telefono: '315 999 8877', base: 52, debeDesde: null, cortado: false },
]

const NOMBRES = ['Luis', 'Carmen', 'José', 'Rosa', 'Miguel', 'Elena', 'Javier', 'Gloria', 'Ricardo', 'Patricia', 'Héctor', 'Luz', 'Óscar', 'Marta', 'Camilo', 'Yolanda', 'Edwin', 'Sandra', 'Wilson', 'Claudia', 'Hernán', 'Paola', 'Iván', 'Nelly']
const APELLIDOS = ['Quintero', 'Sánchez', 'Rincón', 'Pacheco', 'Navarro', 'Vergel', 'Bayona', 'Pallares', 'Ascanio', 'Carrascal', 'Galvis', 'Velásquez', 'Ovallos', 'Jaime', 'Arévalo', 'Durán', 'Picón', 'Claro']

function generarSemillas(rnd: () => number, n: number): Semilla[] {
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]
  const out: Semilla[] = []
  for (let i = 0; i < n; i++) {
    const r = rnd()
    const estrato: 1 | 2 | 3 = r < 0.45 ? 1 : r < 0.85 ? 2 : 3
    const alto = rnd() < 0.08
    const base = alto ? 34 + Math.round(rnd() * 16) : Math.max(6, Math.round(10 + rnd() * 16 + (estrato - 1) * 2))
    const d = rnd()
    let debeDesde: number | null = null
    let cortado = false
    if (d < 0.1) { debeDesde = 1; cortado = true }
    else if (d < 0.16) { debeDesde = 1; cortado = false } // vencido, pendiente de corte
    else if (d < 0.19) { debeDesde = 2 + Math.floor(rnd() * 2); cortado = true }
    out.push({
      id: String(10250 + i),
      nombre: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
      barrio: pick(SECTORES_INICIALES),
      estrato,
      telefono: `3${Math.floor(rnd() * 3 + 1)}${Math.floor(rnd() * 10)} ${String(Math.floor(rnd() * 900 + 100))} ${String(Math.floor(rnd() * 9000 + 1000))}`,
      base,
      debeDesde,
      cortado,
      pico: rnd() < 0.05 ? 2 + rnd() * 0.6 : undefined,
    })
  }
  return out
}

function horaLaboral(rnd: () => number, dia: Date) {
  const d = new Date(dia)
  d.setHours(8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0)
  return d
}

export function crearDatosDemo(hoy = new Date()): { usuarios: Usuario[]; pagos: Pago[] } {
  const rnd = mulberry32(20260930)
  const semillas = [...ORIGINALES, ...generarSemillas(rnd, 44), ...CASAS_EXTRA]
  const periodos = periodosRecientes(12, hoy)
  const ultimoIdx = periodos.length - 1

  const usuarios: Usuario[] = semillas.map((s) => {
    const idxDeuda = s.debeDesde === null ? null : ultimoIdx - s.debeDesde
    const historial: Periodo[] = periodos.map(({ mes, anio }, idx) => {
      const ruido = Math.round(rnd() * 6 - 3)
      let consumo = Math.max(4, Math.round(s.base * FACTOR_MES[mes - 1]) + ruido)
      if (s.pico && idx === ultimoIdx) consumo = Math.round(s.base * s.pico)

      // Después de la deuda: si está cortado no consume ni se factura
      if (idxDeuda !== null && idx > idxDeuda && s.cortado) return { mes, anio, consumo: 0, estado: 'Suspendido' as const }
      if (idxDeuda !== null && idx >= idxDeuda) return { mes, anio, consumo, estado: 'Pendiente' as const }

      // Pagos: entre la generación de la factura y el vencimiento (o hoy, si aún no vence)
      const gen = generacionPeriodo(mes, anio)
      const venc = vencimientoPeriodo(mes, anio)
      const limite = venc < hoy ? venc : hoy
      if (idx === ultimoIdx && venc >= hoy && rnd() < 0.42) return { mes, anio, consumo, estado: 'Pendiente' as const } // aún no paga (no vencida)
      const span = Math.max(0, limite.getTime() - gen.getTime())
      let pagoDia = new Date(gen.getTime() + rnd() * span)
      if (idx === ultimoIdx && rnd() < 0.12) pagoDia = new Date(hoy) // algunos pagaron hoy
      let ts = horaLaboral(rnd, pagoDia).getTime()
      if (ts > hoy.getTime()) ts = hoy.getTime() - Math.floor(rnd() * 3_600_000)
      return { mes, anio, consumo, estado: 'Pagada' as const, fechaPago: ts }
    })
    return {
      id: s.id,
      nombre: s.nombre,
      cedula: s.cedula ?? cedulaDemo(s.id),
      direccion: s.direccion ?? direccionDemo(s.id, s.barrio),
      ...(s.ocupante ? { ocupante: s.ocupante } : {}),
      sector: SECTOR_DEMO[s.barrio] ?? s.barrio,
      barrio: '',
      conMedidor: true, // la demostración simula medidores inteligentes
      estrato: s.estrato,
      medidor: `MED-${s.id}`,
      telefono: s.telefono,
      estado: s.cortado ? 'Cortado' : 'Activo',
      historial,
    }
  })

  // Historial de pagos (últimos 2 periodos) a partir de las facturas pagadas
  const desde = periodos[Math.max(0, ultimoIdx - 1)]
  const pagos: Pago[] = usuarios
    .flatMap((u) =>
      u.historial
        .filter((p) => p.estado === 'Pagada' && p.fechaPago && p.anio * 12 + p.mes >= desde.anio * 12 + desde.mes)
        .map((p) => {
          const monto = montoPeriodo(p.consumo, u.estrato, p.mes, p.anio)
          const efectivo = rnd() < 0.65
          const recibido = efectivo ? Math.ceil(monto / 10000) * 10000 : undefined
          return {
            id: '',
            clienteId: u.id,
            cliente: u.nombre,
            facturaIds: [facturaId(u.id, p.mes, p.anio)],
            concepto: `Factura ${nombrePeriodo(p.mes, p.anio)}`,
            monto,
            metodo: efectivo ? ('Efectivo' as const) : ('Transferencia' as const),
            cajero: rnd() < 0.7 ? 'Yaneth Quintero' : 'Diana Carrascal',
            recibido,
            vueltos: recibido !== undefined ? recibido - monto : undefined,
            timestamp: p.fechaPago!,
          }
        }),
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((p, i) => ({ ...p, id: `PAG-${String(i + 1).padStart(5, '0')}` }))
    .reverse()

  return { usuarios, pagos }
}
