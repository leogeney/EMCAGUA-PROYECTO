import type { CategoriaPqr, Pqr, TipoPqr, Usuario } from './types'

/** Plazo legal para responder PQR en servicios públicos (Ley 142 de 1994, art. 158). */
export const PLAZO_DIAS_HABILES = 15

/** Festivos de Colombia 2026 (Ley 51 de 1983). Agregar los de cada año nuevo. */
const FESTIVOS = new Set([
  '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15',
  '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
])

const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const esHabil = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6 && !FESTIVOS.has(clave(d))

/** Fecha que resulta de sumar `n` días hábiles (el día de radicación no cuenta). */
export function sumarDiasHabiles(desde: Date, n: number) {
  const d = new Date(desde)
  d.setHours(23, 59, 59, 0)
  let c = 0
  while (c < n) {
    d.setDate(d.getDate() + 1)
    if (esHabil(d)) c++
  }
  return d
}

/** Días hábiles entre hoy y la fecha límite (negativo si ya venció). */
export function diasHabilesRestantes(vence: number, hoy = new Date()) {
  const a = new Date(hoy); a.setHours(0, 0, 0, 0)
  const b = new Date(vence); b.setHours(0, 0, 0, 0)
  const signo = b >= a ? 1 : -1
  const [ini, fin] = signo > 0 ? [a, b] : [b, a]
  let c = 0
  const d = new Date(ini)
  while (d < fin) { d.setDate(d.getDate() + 1); if (esHabil(d)) c++ }
  return signo * c
}

export function diasHabilesEntre(desde: number, hasta: number) {
  return Math.max(0, diasHabilesRestantes(hasta, new Date(desde)))
}

/** Clasificación automática por palabras clave (primer paso antes de la IA). */
const REGLAS: [CategoriaPqr, RegExp][] = [
  ['Daño o fuga', /fuga|daño|dañad|tubo|tuber|roto|rota|escape|inund|alcantarill|desbord|hueco|alcantarilla|manhole|tapa/i],
  ['Calidad del agua', /turbia|sucia|color|olor|sabor|barro|potable|cloro|amarill|marr[oó]n/i],
  ['Corte y reconexión', /corte|cortaron|reconex|suspend|sin agua|no llega|no hay agua|presi[oó]n/i],
  ['Facturación', /factura|cobro|cobraron|valor|precio|consumo|lectura|medidor|pago|deuda|tarifa|estrato|caro/i],
  ['Atención', /atenci[oó]n|trato|grosero|demora|esper|funcionario|oficina|llam/i],
]

export function sugerirCategoria(texto: string): CategoriaPqr {
  for (const [cat, re] of REGLAS) if (re.test(texto)) return cat
  return 'Otro'
}

export const PLANTILLAS: Record<CategoriaPqr, string> = {
  'Facturación': 'Revisamos el consumo y la lectura del medidor del periodo reclamado. [Resultado de la revisión]. En consecuencia, [se ajusta / se confirma] el valor facturado.',
  'Daño o fuga': 'Nuestro equipo técnico atendió el reporte el [fecha] y [describir la reparación]. El servicio quedó normalizado.',
  'Calidad del agua': 'Se tomaron muestras en su sector el [fecha]. Los resultados [cumplen / no cumplen] los parámetros de agua potable y se realizó [acción].',
  'Corte y reconexión': 'Verificamos el estado de su cuenta y del servicio. [Explicación]. La reconexión se programó para el [fecha].',
  'Atención': 'Lamentamos lo ocurrido. Tomamos las siguientes medidas: [acciones]. Agradecemos su reporte.',
  'Otro': 'Damos respuesta a su solicitud de la siguiente manera: [respuesta].',
}

/* ------------------------------------------------------------------ */
/* Datos de demostración                                               */
/* ------------------------------------------------------------------ */

const CASOS: { tipo: TipoPqr; texto: string; diasAtras: number; estado: Pqr['estado']; responsable?: string; canal: Pqr['canal'] }[] = [
  { tipo: 'Reclamo', texto: 'La factura de este mes llegó muy cara, el consumo no corresponde a lo que gastamos en la casa.', diasAtras: 2, estado: 'Radicada', canal: 'Presencial' },
  { tipo: 'Queja', texto: 'Hay una fuga de agua en la esquina desde hace tres días y nadie ha venido a revisar.', diasAtras: 1, estado: 'En trámite', responsable: 'Álvaro Pacheco', canal: 'WhatsApp' },
  { tipo: 'Petición', texto: 'Solicito copia de las facturas de los últimos seis meses para un trámite.', diasAtras: 6, estado: 'En trámite', responsable: 'Diana Carrascal', canal: 'Correo' },
  { tipo: 'Reclamo', texto: 'El agua está saliendo turbia y con olor desde el lunes.', diasAtras: 9, estado: 'En trámite', responsable: 'Luis Vergel', canal: 'Teléfono' },
  { tipo: 'Reclamo', texto: 'Me cobraron reconexión pero yo había pagado a tiempo, tengo el recibo.', diasAtras: 13, estado: 'Radicada', canal: 'Presencial' },
  { tipo: 'Queja', texto: 'Llevamos dos días sin agua en el sector y no hay presión en las mañanas.', diasAtras: 15, estado: 'En trámite', responsable: 'Jhon Navarro', canal: 'WhatsApp' },
  { tipo: 'Reclamo', texto: 'La lectura del medidor está mal tomada, el número no coincide con el que aparece en la factura.', diasAtras: 21, estado: 'Radicada', canal: 'Presencial' },
  { tipo: 'Queja', texto: 'El funcionario de la oficina me atendió con mal trato y me hizo esperar mucho.', diasAtras: 4, estado: 'Radicada', canal: 'Presencial' },
  { tipo: 'Sugerencia', texto: 'Sería bueno poder pagar la factura por transferencia y enviar el comprobante por WhatsApp.', diasAtras: 11, estado: 'Respondida', responsable: 'Yaneth Quintero', canal: 'WhatsApp' },
  { tipo: 'Reclamo', texto: 'Tubo roto frente a la casa, se está desperdiciando mucha agua.', diasAtras: 18, estado: 'Cerrada', responsable: 'Álvaro Pacheco', canal: 'Teléfono' },
  { tipo: 'Petición', texto: 'Solicito revisión del estrato asignado a mi predio para el cobro.', diasAtras: 25, estado: 'Respondida', responsable: 'Martha Ascanio', canal: 'Presencial' },
  { tipo: 'Reclamo', texto: 'El cobro del mes pasado incluyó un valor que no reconozco.', diasAtras: 30, estado: 'Cerrada', responsable: 'Martha Ascanio', canal: 'Presencial' },
  { tipo: 'Queja', texto: 'La alcantarilla de la calle está destapada y es un peligro para los niños.', diasAtras: 8, estado: 'Respondida', responsable: 'Jhon Navarro', canal: 'Teléfono' },
  { tipo: 'Recurso', texto: 'Presento recurso de reposición contra la respuesta al reclamo por facturación del consumo.', diasAtras: 5, estado: 'Radicada', canal: 'Correo' },
]

export function crearPqrDemo(usuarios: Usuario[], hoy = new Date()): Pqr[] {
  return CASOS.map((c, i) => {
    const u = usuarios[(i * 7 + 3) % usuarios.length]
    const rad = new Date(hoy)
    let k = 0
    while (k < c.diasAtras) { rad.setDate(rad.getDate() - 1); if (esHabil(rad)) k++ }
    rad.setHours(8 + (i % 8), (i * 13) % 60, 0, 0)
    const vence = sumarDiasHabiles(rad, PLAZO_DIAS_HABILES).getTime()
    const categoria = sugerirCategoria(c.texto)
    const respondida = c.estado === 'Respondida' || c.estado === 'Cerrada'
    const respondidaEn = respondida ? sumarDiasHabiles(rad, Math.min(c.diasAtras - 1, 4 + (i % 6))).getTime() - 6 * 3_600_000 : undefined
    const historial: Pqr['historial'] = [{ ts: rad.getTime(), usuario: 'Diana Carrascal', accion: `Radicada por ${c.canal.toLowerCase()}` }]
    if (c.responsable) historial.push({ ts: rad.getTime() + 3_600_000, usuario: 'admin', accion: `Asignada a ${c.responsable}` })
    if (respondidaEn) historial.push({ ts: respondidaEn, usuario: c.responsable ?? 'admin', accion: 'Respuesta enviada al usuario' })
    if (c.estado === 'Cerrada') historial.push({ ts: (respondidaEn ?? rad.getTime()) + 86_400_000, usuario: 'admin', accion: 'Caso cerrado' })
    return {
      radicado: `PQR-${hoy.getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      tipo: c.tipo,
      categoria,
      canal: c.canal,
      suscriptorId: u.id,
      nombre: u.nombre,
      telefono: u.telefono,
      barrio: u.barrio,
      descripcion: c.texto,
      estado: c.estado,
      radicadaEn: rad.getTime(),
      vence,
      responsable: c.responsable,
      respuesta: respondida ? PLANTILLAS[categoria].replace(/\[[^\]]+\]/g, '…') : undefined,
      respondidaEn,
      historial,
    }
  }).reverse()
}
