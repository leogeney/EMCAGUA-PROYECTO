/**
 * Administración: inventario de materiales, egresos y cierres de caja. Datos de demostración en memoria.
 */

/* ------------------------------ Inventario ------------------------------ */

export type CategoriaMaterial = 'Medidores' | 'Tubería y accesorios' | 'Químicos de planta' | 'Dotación y herramientas'
export type Material = { id: string; nombre: string; categoria: CategoriaMaterial; unidad: string; stock: number; minimo: number; costo: number }
export type Movimiento = { id: string; ts: number; materialId: string; tipo: 'Entrada' | 'Salida' | 'Ajuste'; cantidad: number; motivo: string; usuario: string }

export const MATERIALES_DEMO: Material[] = [
  { id: 'M01', nombre: 'Medidor volumétrico ½"', categoria: 'Medidores', unidad: 'und', stock: 6, minimo: 5, costo: 145000 },
  { id: 'M02', nombre: 'Medidor inteligente ½" (telemetría)', categoria: 'Medidores', unidad: 'und', stock: 2, minimo: 3, costo: 420000 },
  { id: 'M03', nombre: 'Tubo PVC presión ½"', categoria: 'Tubería y accesorios', unidad: 'tubo 6 m', stock: 24, minimo: 10, costo: 18500 },
  { id: 'M04', nombre: 'Tubo PVC presión 2"', categoria: 'Tubería y accesorios', unidad: 'tubo 6 m', stock: 8, minimo: 4, costo: 96000 },
  { id: 'M05', nombre: 'Codo PVC ½"', categoria: 'Tubería y accesorios', unidad: 'und', stock: 40, minimo: 20, costo: 1200 },
  { id: 'M06', nombre: 'Unión de reparación 2"', categoria: 'Tubería y accesorios', unidad: 'und', stock: 3, minimo: 4, costo: 38000 },
  { id: 'M07', nombre: 'Llave de paso ½"', categoria: 'Tubería y accesorios', unidad: 'und', stock: 15, minimo: 8, costo: 14500 },
  { id: 'M08', nombre: 'Sello / precinto de corte', categoria: 'Tubería y accesorios', unidad: 'und', stock: 30, minimo: 15, costo: 2500 },
  { id: 'M09', nombre: 'Cinta teflón', categoria: 'Tubería y accesorios', unidad: 'rollo', stock: 18, minimo: 10, costo: 2000 },
  { id: 'M10', nombre: 'Hipoclorito de calcio 70 %', categoria: 'Químicos de planta', unidad: 'kg', stock: 85, minimo: 60, costo: 14000 },
  { id: 'M11', nombre: 'Sulfato de aluminio', categoria: 'Químicos de planta', unidad: 'bulto 25 kg', stock: 7, minimo: 10, costo: 68000 },
  { id: 'M12', nombre: 'Reactivo DPD (cloro residual)', categoria: 'Químicos de planta', unidad: 'sobre', stock: 120, minimo: 50, costo: 900 },
  { id: 'M13', nombre: 'Botas de caucho', categoria: 'Dotación y herramientas', unidad: 'par', stock: 4, minimo: 3, costo: 42000 },
  { id: 'M14', nombre: 'Guantes de nitrilo', categoria: 'Dotación y herramientas', unidad: 'caja', stock: 2, minimo: 4, costo: 25000 },
]

export const estadoStock = (m: Material) => (m.stock <= 0 ? 'Agotado' : m.stock < m.minimo ? 'Bajo' : 'OK')

/* --------------------------------- Caja --------------------------------- */

export type CategoriaEgreso = 'Químicos y materiales' | 'Combustible y transporte' | 'Energía y servicios' | 'Mantenimiento de planta' | 'Honorarios y asesorías' | 'Papelería y oficina' | 'Impuestos y tasas' | 'Otros'
export const CATEGORIAS_EGRESO: CategoriaEgreso[] = ['Químicos y materiales', 'Combustible y transporte', 'Energía y servicios', 'Mantenimiento de planta', 'Honorarios y asesorías', 'Papelería y oficina', 'Impuestos y tasas', 'Otros']
export type Egreso = { id: string; fecha: string; categoria: CategoriaEgreso; descripcion: string; proveedor: string; valor: number; medio: 'Efectivo (caja)' | 'Transferencia'; soporte?: string; usuario: string; ts: number }
export type CierreCaja = { fecha: string; cajero: string; efectivoSistema: number; efectivoContado: number; egresosEfectivo: number; transferencias: number; enLinea: number; diferencia: number; nota?: string; ts: number }

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Egresos de demostración de los últimos meses. */
export function egresosDemo(hoy = new Date()): Egreso[] {
  const base: [CategoriaEgreso, string, string, number][] = [
    ['Energía y servicios', 'Energía eléctrica planta y bombeo', 'CENS', 1_850_000],
    ['Químicos y materiales', 'Sulfato de aluminio (10 bultos)', 'Químicos del Oriente', 680_000],
    ['Químicos y materiales', 'Hipoclorito de calcio (45 kg)', 'Químicos del Oriente', 630_000],
    ['Combustible y transporte', 'Gasolina moto de cuadrilla', 'EDS El Carmen', 240_000],
    ['Mantenimiento de planta', 'Mantenimiento bomba dosificadora', 'Taller Hidráulico Ocaña', 450_000],
    ['Papelería y oficina', 'Papel e impresión de facturas', 'Papelería Central', 310_000],
    ['Honorarios y asesorías', 'Revisoría fiscal', 'Contador externo', 900_000],
  ]
  const out: Egreso[] = []
  for (let m = 5; m >= 0; m--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - m, 1)
    base.forEach(([cat, desc, prov, val], i) => {
      if (m === 0 && i > 3) return
      const f = new Date(d.getFullYear(), d.getMonth(), Math.min(3 + i * 4, 27))
      if (f > hoy) return
      const valor = Math.round((val * (0.88 + ((m * 7 + i * 3) % 10) / 40)) / 1000) * 1000
      out.push({ id: `EG-${iso(f)}-${i}`, fecha: iso(f), categoria: cat, descripcion: desc, proveedor: prov, valor, medio: valor < 300_000 ? 'Efectivo (caja)' : 'Transferencia', usuario: 'Martha Ascanio', ts: f.getTime() })
    })
  }
  return out.sort((a, b) => b.ts - a.ts)
}
