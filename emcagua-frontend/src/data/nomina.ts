/**
 * Cálculo de nómina mensual y prestaciones sociales — Colombia 2026.
 * Todos los valores legales están en PARAMETROS_2026 y se pueden editar desde la pantalla de Parámetros.
 * Verificar siempre con el contador de la empresa antes de pagar.
 */

export type Parametros = {
  anio: number
  smmlv: number
  auxilioTransporte: number
  horasMes: number // divisor del valor hora (42 h/semana desde 15-jul-2026 => 210)
  saludEmpleado: number
  pensionEmpleado: number
  saludEmpleador: number
  pensionEmpleador: number
  caja: number
  icbf: number
  sena: number
  exoneradoParafiscales: boolean // Art. 114-1 E.T.: exonera salud empleador, SENA e ICBF a trabajadores < 10 SMMLV
  recargoNocturno: number // recargo sobre hora ordinaria
  recargoDominical: number // 90% desde 1-jul-2026 (Ley 2466 de 2025)
  heDiurna: number // factor total
  heNocturna: number
  limiteHorasExtraMes: number
}

export const PARAMETROS_2026: Parametros = {
  anio: 2026,
  smmlv: 1_750_905,
  auxilioTransporte: 249_095,
  horasMes: 210,
  saludEmpleado: 0.04,
  pensionEmpleado: 0.04,
  saludEmpleador: 0.085,
  pensionEmpleador: 0.12,
  caja: 0.04,
  icbf: 0.03,
  sena: 0.02,
  exoneradoParafiscales: false,
  recargoNocturno: 0.35,
  recargoDominical: 0.9,
  heDiurna: 1.25,
  heNocturna: 1.75,
  limiteHorasExtraMes: 48, // 2 h diarias / 12 h semanales aprox.
}

export const ARL_TARIFA: Record<number, number> = { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.0435, 5: 0.0696 }

/** Guía de clases de riesgo ARL (Decreto 1295 de 1994 / Decreto 1772 de 1994). Ejemplos orientativos para EMCAGUA. */
export const ARL_CLASES: { clase: 1 | 2 | 3 | 4 | 5; nivel: string; ejemplos: string; color: string }[] = [
  { clase: 1, nivel: 'Mínimo', ejemplos: 'Trabajo de oficina: gerencia, contabilidad, secretaría, caja', color: '#16a34a' },
  { clase: 2, nivel: 'Bajo', ejemplos: 'Trabajo en la calle sin herramientas peligrosas: lectura de medidores, mensajería', color: '#65a30d' },
  { clase: 3, nivel: 'Medio', ejemplos: 'Planta de tratamiento: manejo de cloro y químicos, bombas y maquinaria', color: '#ca8a04' },
  { clase: 4, nivel: 'Alto', ejemplos: 'Fontanería, redes de acueducto y alcantarillado, excavaciones, vigilancia nocturna', color: '#ea580c' },
  { clase: 5, nivel: 'Máximo', ejemplos: 'Trabajo en alturas extremas, espacios confinados permanentes, explosivos', color: '#dc2626' },
]

export type Empleado = {
  id: string
  nombre: string
  cedula: string
  cargo: string
  area: 'Administrativa' | 'Operativa'
  salario: number
  fechaIngreso: string // yyyy-mm-dd
  contrato: 'Indefinido' | 'Término fijo'
  riesgoArl: 1 | 2 | 3 | 4 | 5
  eps: string
  pension: string
  diasVacacionesDisfrutados: number
  activo: boolean
}

export type Novedad = {
  dias: number // días laborados (máx. 30)
  hed: number // horas extra diurnas
  hen: number // horas extra nocturnas
  heddf: number // horas extra diurnas dominicales/festivas
  hendf: number // horas extra nocturnas dominicales/festivas
  rn: number // horas ordinarias nocturnas (recargo)
  rdf: number // horas ordinarias dominicales/festivas (recargo)
  comisiones: number // salarial
  bonificacion: number // no salarial
  prestamo: number
  libranza: number
  retencion: number
  otrosDescuentos: number
  nota?: string
}

export const NOVEDAD_VACIA: Novedad = { dias: 30, hed: 0, hen: 0, heddf: 0, hendf: 0, rn: 0, rdf: 0, comisiones: 0, bonificacion: 0, prestamo: 0, libranza: 0, retencion: 0, otrosDescuentos: 0 }

const r = (n: number) => Math.round(n)

/** Fondo de Solidaridad Pensional según IBC en SMMLV. */
export function tasaFSP(ibc: number, smmlv: number) {
  const s = ibc / smmlv
  if (s < 4) return 0
  if (s < 16) return 0.01
  if (s < 17) return 0.012
  if (s < 18) return 0.014
  if (s < 19) return 0.016
  if (s < 20) return 0.018
  return 0.02
}

export type Liquidacion = {
  empleado: Empleado
  novedad: Novedad
  valorHora: number
  basico: number
  auxilio: number
  extras: { concepto: string; horas: number; factor: number; valor: number }[]
  totalExtras: number
  comisiones: number
  bonificacion: number
  devengado: number
  ibc: number
  salud: number
  pension: number
  fsp: number
  tasaFsp: number
  otrosDescuentos: number
  deducciones: number
  neto: number
  empleador: { salud: number; pension: number; arl: number; caja: number; icbf: number; sena: number; total: number }
  provisiones: { cesantias: number; intereses: number; prima: number; vacaciones: number; total: number }
  costoTotal: number
}

export function liquidar(e: Empleado, n: Novedad, p: Parametros): Liquidacion {
  const dias = Math.max(0, Math.min(30, n.dias))
  const valorHora = e.salario / p.horasMes
  const basico = r((e.salario / 30) * dias)
  const auxilio = e.salario <= 2 * p.smmlv ? r((p.auxilioTransporte / 30) * dias) : 0

  const extras = [
    { concepto: 'Hora extra diurna', horas: n.hed, factor: p.heDiurna },
    { concepto: 'Hora extra nocturna', horas: n.hen, factor: p.heNocturna },
    { concepto: 'Hora extra diurna dominical/festiva', horas: n.heddf, factor: p.heDiurna + p.recargoDominical },
    { concepto: 'Hora extra nocturna dominical/festiva', horas: n.hendf, factor: p.heNocturna + p.recargoDominical },
    { concepto: 'Recargo nocturno', horas: n.rn, factor: p.recargoNocturno },
    { concepto: 'Recargo dominical/festivo', horas: n.rdf, factor: p.recargoDominical },
  ]
    .filter((x) => x.horas > 0)
    .map((x) => ({ ...x, valor: r(valorHora * x.factor * x.horas) }))
  const totalExtras = extras.reduce((s, x) => s + x.valor, 0)

  const comisiones = n.comisiones || 0
  const salarial = basico + totalExtras + comisiones
  // Ley 1393 de 2010: pagos no salariales que superen el 40% del total remunerado entran al IBC
  const totalRem = salarial + n.bonificacion
  const excesoNoSalarial = Math.max(0, n.bonificacion - totalRem * 0.4)
  const ibcMin = r((p.smmlv / 30) * dias)
  const ibc = Math.max(salarial + excesoNoSalarial, dias > 0 ? ibcMin : 0)

  const salud = r(ibc * p.saludEmpleado)
  const pension = r(ibc * p.pensionEmpleado)
  const tf = tasaFSP(ibc, p.smmlv)
  const fsp = r(ibc * tf)
  const otrosDescuentos = n.prestamo + n.libranza + n.retencion + n.otrosDescuentos
  const deducciones = salud + pension + fsp + otrosDescuentos

  const devengado = basico + auxilio + totalExtras + comisiones + n.bonificacion
  const neto = devengado - deducciones

  const exonera = p.exoneradoParafiscales && ibc < 10 * p.smmlv
  const empleador = {
    salud: exonera ? 0 : r(ibc * p.saludEmpleador),
    pension: r(ibc * p.pensionEmpleador),
    arl: r(ibc * ARL_TARIFA[e.riesgoArl]),
    caja: r(ibc * p.caja),
    icbf: exonera ? 0 : r(ibc * p.icbf),
    sena: exonera ? 0 : r(ibc * p.sena),
    total: 0,
  }
  empleador.total = empleador.salud + empleador.pension + empleador.arl + empleador.caja + empleador.icbf + empleador.sena

  const basePrest = salarial + auxilio
  const provisiones = {
    cesantias: r(basePrest * 0.0833),
    intereses: r(basePrest * 0.0833 * 0.12),
    prima: r(basePrest * 0.0833),
    vacaciones: r(basico * 0.0417),
    total: 0,
  }
  provisiones.total = provisiones.cesantias + provisiones.intereses + provisiones.prima + provisiones.vacaciones

  return {
    empleado: e, novedad: n, valorHora, basico, auxilio, extras, totalExtras, comisiones, bonificacion: n.bonificacion, devengado, ibc,
    salud, pension, fsp, tasaFsp: tf, otrosDescuentos, deducciones, neto, empleador, provisiones,
    costoTotal: devengado + empleador.total + provisiones.total,
  }
}

/* ------------------------------------------------------------------ */
/* Validaciones: la idea es atrapar los errores ANTES de pagar.         */
/* ------------------------------------------------------------------ */

export type Alerta = { nivel: 'error' | 'aviso'; empleadoId?: string; mensaje: string }

export function revisar(liqs: Liquidacion[], p: Parametros, anterior?: Map<string, number>): Alerta[] {
  const out: Alerta[] = []
  for (const l of liqs) {
    const { empleado: e, novedad: n } = l
    const nom = e.nombre
    if (e.salario < p.smmlv) out.push({ nivel: 'error', empleadoId: e.id, mensaje: `${nom}: salario básico (${fmt(e.salario)}) es menor al mínimo legal (${fmt(p.smmlv)}).` })
    if (n.dias > 30 || n.dias < 0) out.push({ nivel: 'error', empleadoId: e.id, mensaje: `${nom}: los días laborados deben estar entre 0 y 30.` })
    if (l.neto < 0) out.push({ nivel: 'error', empleadoId: e.id, mensaje: `${nom}: el neto a pagar es negativo. Revisa los descuentos.` })
    const descVol = n.prestamo + n.libranza + n.otrosDescuentos
    if (descVol > l.devengado * 0.5) out.push({ nivel: 'error', empleadoId: e.id, mensaje: `${nom}: los descuentos voluntarios superan el 50% de lo devengado.` })
    const horasExtra = n.hed + n.hen + n.heddf + n.hendf
    if (horasExtra > p.limiteHorasExtraMes) out.push({ nivel: 'aviso', empleadoId: e.id, mensaje: `${nom}: ${horasExtra} horas extra en el mes superan el límite de referencia (${p.limiteHorasExtraMes} h).` })
    if (n.dias < 30 && !n.nota) out.push({ nivel: 'aviso', empleadoId: e.id, mensaje: `${nom}: trabajó ${n.dias} días; agrega una nota con el motivo (licencia, ingreso, retiro…).` })
    const prev = anterior?.get(e.id)
    if (prev && Math.abs(l.neto / prev - 1) > 0.2) out.push({ nivel: 'aviso', empleadoId: e.id, mensaje: `${nom}: el neto cambió ${Math.round((l.neto / prev - 1) * 100)}% frente al mes anterior. Confirma que sea correcto.` })
  }
  return out
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/* ------------------------------------------------------------------ */
/* Prestaciones sociales (liquidación a una fecha de corte)            */
/* ------------------------------------------------------------------ */

/** Días comerciales (año de 360, meses de 30) entre dos fechas, ambas inclusive. */
export function dias360(desde: Date, hasta: Date) {
  if (hasta < desde) return 0
  const d1 = Math.min(desde.getDate(), 30)
  let d2 = Math.min(hasta.getDate(), 30)
  const finFeb = hasta.getMonth() === 1 && hasta.getDate() === new Date(hasta.getFullYear(), 2, 0).getDate()
  if (finFeb) d2 = 30
  return (hasta.getFullYear() - desde.getFullYear()) * 360 + (hasta.getMonth() - desde.getMonth()) * 30 + (d2 - d1) + 1
}

export type Prestaciones = {
  empleado: Empleado
  base: number
  auxilio: number
  prima: { desde: Date; dias: number; valor: number; formula: string }
  cesantias: { desde: Date; dias: number; valor: number; formula: string }
  intereses: { valor: number; formula: string }
  vacaciones: { diasCausados: number; diasPendientes: number; valor: number; formula: string }
  total: number
}

export function prestaciones(e: Empleado, corte: Date, p: Parametros): Prestaciones {
  const ingreso = new Date(e.fechaIngreso + 'T00:00:00')
  const auxilio = e.salario <= 2 * p.smmlv ? p.auxilioTransporte : 0
  const base = e.salario + auxilio
  const max = (a: Date, b: Date) => (a > b ? a : b)

  const inicioSem = new Date(corte.getFullYear(), corte.getMonth() < 6 ? 0 : 6, 1)
  const dPrima = dias360(max(ingreso, inicioSem), corte)
  const vPrima = r((base * dPrima) / 360)

  const inicioAnio = new Date(corte.getFullYear(), 0, 1)
  const dCes = dias360(max(ingreso, inicioAnio), corte)
  const vCes = r((base * dCes) / 360)
  const vInt = r((vCes * dCes * 0.12) / 360)

  const dTot = dias360(ingreso, corte)
  const causados = (dTot * 15) / 360
  const pendientes = Math.max(0, causados - e.diasVacacionesDisfrutados)
  const vVac = r((e.salario / 30) * pendientes)

  const f = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
  return {
    empleado: e,
    base,
    auxilio,
    prima: { desde: max(ingreso, inicioSem), dias: dPrima, valor: vPrima, formula: `${f(base)} × ${dPrima} días ÷ 360` },
    cesantias: { desde: max(ingreso, inicioAnio), dias: dCes, valor: vCes, formula: `${f(base)} × ${dCes} días ÷ 360` },
    intereses: { valor: vInt, formula: `${f(vCes)} × ${dCes} días × 12% ÷ 360` },
    vacaciones: { diasCausados: causados, diasPendientes: pendientes, valor: vVac, formula: `${f(e.salario)} ÷ 30 × ${pendientes.toFixed(1)} días pendientes` },
    total: vPrima + vCes + vInt + vVac,
  }
}

/** Fechas límite legales de prestaciones para el año del corte. */
export function calendarioObligaciones(hoy: Date) {
  const y = hoy.getFullYear()
  const items = [
    { fecha: new Date(y, 0, 31), titulo: 'Pago de intereses a las cesantías', detalle: 'Directo al trabajador' },
    { fecha: new Date(y, 1, 14), titulo: 'Consignación de cesantías', detalle: 'Al fondo de cesantías de cada trabajador' },
    { fecha: new Date(y, 5, 30), titulo: 'Prima de servicios (1.er semestre)', detalle: '15 días de salario' },
    { fecha: new Date(y, 11, 20), titulo: 'Prima de servicios (2.º semestre)', detalle: '15 días de salario' },
    { fecha: new Date(y + 1, 0, 31), titulo: 'Intereses a las cesantías', detalle: 'Del año en curso' },
    { fecha: new Date(y + 1, 1, 14), titulo: 'Consignación de cesantías', detalle: 'Del año en curso' },
  ]
  return items.map((i) => ({ ...i, dias: Math.ceil((i.fecha.getTime() - hoy.getTime()) / 86_400_000) }))
}

/* ------------------------------------------------------------------ */
/* Datos de demostración                                               */
/* ------------------------------------------------------------------ */

export const EMPLEADOS_DEMO: Empleado[] = [
  { id: 'E01', nombre: 'Rodrigo Pallares', cedula: '88.152.430', cargo: 'Gerente', area: 'Administrativa', salario: 4_800_000, fechaIngreso: '2019-02-01', contrato: 'Indefinido', riesgoArl: 1, eps: 'Nueva EPS', pension: 'Colpensiones', diasVacacionesDisfrutados: 105, activo: true },
  { id: 'E02', nombre: 'Martha Ascanio', cedula: '37.325.118', cargo: 'Contadora', area: 'Administrativa', salario: 3_400_000, fechaIngreso: '2020-06-16', contrato: 'Indefinido', riesgoArl: 1, eps: 'Sanitas', pension: 'Porvenir', diasVacacionesDisfrutados: 75, activo: true },
  { id: 'E03', nombre: 'Yaneth Quintero', cedula: '1.091.660.245', cargo: 'Tesorera / Cajera', area: 'Administrativa', salario: 2_150_000, fechaIngreso: '2021-03-01', contrato: 'Indefinido', riesgoArl: 1, eps: 'Nueva EPS', pension: 'Protección', diasVacacionesDisfrutados: 60, activo: true },
  { id: 'E04', nombre: 'Diana Carrascal', cedula: '1.091.672.903', cargo: 'Secretaria', area: 'Administrativa', salario: 1_900_000, fechaIngreso: '2022-08-08', contrato: 'Indefinido', riesgoArl: 1, eps: 'Coosalud', pension: 'Colfondos', diasVacacionesDisfrutados: 30, activo: true },
  { id: 'E05', nombre: 'Kevin Bayona', cedula: '1.004.912.330', cargo: 'Auxiliar administrativo', area: 'Administrativa', salario: 1_750_905, fechaIngreso: '2025-11-03', contrato: 'Término fijo', riesgoArl: 1, eps: 'Nueva EPS', pension: 'Porvenir', diasVacacionesDisfrutados: 0, activo: true },
  { id: 'E06', nombre: 'Álvaro Pacheco', cedula: '13.380.774', cargo: 'Fontanero', area: 'Operativa', salario: 1_950_000, fechaIngreso: '2018-01-15', contrato: 'Indefinido', riesgoArl: 4, eps: 'Nueva EPS', pension: 'Colpensiones', diasVacacionesDisfrutados: 120, activo: true },
  { id: 'E07', nombre: 'Jhon Navarro', cedula: '1.091.655.012', cargo: 'Fontanero', area: 'Operativa', salario: 1_950_000, fechaIngreso: '2020-09-01', contrato: 'Indefinido', riesgoArl: 4, eps: 'Coosalud', pension: 'Porvenir', diasVacacionesDisfrutados: 75, activo: true },
  { id: 'E08', nombre: 'Luis Vergel', cedula: '88.270.551', cargo: 'Operador de planta', area: 'Operativa', salario: 2_050_000, fechaIngreso: '2017-05-02', contrato: 'Indefinido', riesgoArl: 3, eps: 'Sanitas', pension: 'Protección', diasVacacionesDisfrutados: 120, activo: true },
  { id: 'E09', nombre: 'Edwin Galvis', cedula: '1.091.640.880', cargo: 'Operador de planta', area: 'Operativa', salario: 2_050_000, fechaIngreso: '2021-07-12', contrato: 'Indefinido', riesgoArl: 3, eps: 'Nueva EPS', pension: 'Colfondos', diasVacacionesDisfrutados: 60, activo: true },
  { id: 'E10', nombre: 'Wilmer Durán', cedula: '1.004.877.214', cargo: 'Lector de medidores', area: 'Operativa', salario: 1_750_905, fechaIngreso: '2023-02-20', contrato: 'Término fijo', riesgoArl: 2, eps: 'Coosalud', pension: 'Porvenir', diasVacacionesDisfrutados: 30, activo: true },
  { id: 'E11', nombre: 'Óscar Picón', cedula: '13.375.902', cargo: 'Celador', area: 'Operativa', salario: 1_750_905, fechaIngreso: '2016-10-01', contrato: 'Indefinido', riesgoArl: 4, eps: 'Nueva EPS', pension: 'Colpensiones', diasVacacionesDisfrutados: 135, activo: true },
  { id: 'E12', nombre: 'Gloria Arévalo', cedula: '37.330.476', cargo: 'Auxiliar de servicios generales', area: 'Administrativa', salario: 1_750_905, fechaIngreso: '2022-01-10', contrato: 'Indefinido', riesgoArl: 1, eps: 'Coosalud', pension: 'Colpensiones', diasVacacionesDisfrutados: 45, activo: true },
]

/** Valor mínimo legal de la hora extra diurna (salario mínimo ÷ horas mes × 1,25). */
export const horaExtraDiurnaMinima = (p: Parametros) => Math.round((p.smmlv / p.horasMes) * p.heDiurna)

/** Novedades típicas por cargo (determinísticas por mes). */
export function novedadesDemo(empleados: Empleado[], mes: number): Record<string, Novedad> {
  const out: Record<string, Novedad> = {}
  for (const e of empleados) {
    const s = (Number(e.id.slice(1)) * 7 + mes * 3) % 5
    const n: Novedad = { ...NOVEDAD_VACIA }
    if (e.cargo === 'Celador') { n.rn = 120; n.rdf = 32 + s * 2; n.hen = 4 + s }
    if (e.cargo === 'Fontanero') { n.hed = 6 + s * 2; n.hen = s; n.heddf = s > 2 ? 4 : 0 }
    if (e.cargo === 'Operador de planta') { n.rn = 40 + s * 4; n.rdf = 16; n.hed = 4 + s }
    if (e.cargo === 'Lector de medidores') n.hed = 2 + s
    if (e.id === 'E03') n.libranza = 180_000
    if (e.id === 'E06') n.prestamo = 150_000
    if (e.id === 'E08') n.bonificacion = 120_000
    out[e.id] = n
  }
  return out
}
