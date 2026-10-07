/**
 * Piezas gráficas para redes sociales (Facebook, Instagram, estados de WhatsApp).
 * La imagen se dibuja en un <canvas> con la marca de EMCAGUA; la IA local escribe los textos.
 */
import { vencimientoPeriodo } from './billing'
import { MESES } from './constants'
import { cfg } from './config'
import { leerZonas } from './zonas'

export type Formato = { id: string; nombre: string; uso: string; w: number; h: number }
export const FORMATOS: Formato[] = [
  { id: 'post', nombre: 'Publicación', uso: 'Facebook e Instagram', w: 1080, h: 1080 },
  { id: 'historia', nombre: 'Historia / Estado', uso: 'WhatsApp, Instagram y Facebook', w: 1080, h: 1920 },
  { id: 'horizontal', nombre: 'Horizontal', uso: 'Portada o enlace en Facebook', w: 1200, h: 630 },
]

export type Icono = 'fecha' | 'hora' | 'lugar' | 'pago' | 'info' | 'telefono'
export type Detalle = { icono: Icono; texto: string }

export type Pieza = {
  etiqueta: string // franja superior: "AVISO IMPORTANTE"
  titular: string
  subtitulo: string
  detalles: Detalle[]
  mensaje: string
  cta: string // llamado a la acción
  caption: string // texto para pegar en la publicación
}

/** fondo/acento/texto/suave: diseño vibrante. principal/tinte/resalte: diseños claros (elegante y tarjeta). */
export type Tema = { fondo: [string, string]; acento: string; texto: string; suave: string; principal: string; tinte: string; resalte: string }

export type TipoPieza = {
  id: string
  nombre: string
  descripcion: string
  icono: string // path SVG 24x24 (trazo)
  tema: Tema
  /** Ilustración sugerida (ver ilustraciones.ts). */
  ilustracion: string
  base: () => Pieza
  /** Qué debe escribir la IA para este tipo de pieza. */
  guia: string
}

const VERDE: Tema = { fondo: ['#0F4F4F', '#156D6D'], acento: '#8AC43A', texto: '#FFFFFF', suave: 'rgba(255,255,255,0.78)', principal: '#0F4F4F', tinte: '#E6F1EE', resalte: '#4D8A1F' }
const ALERTA: Tema = { fondo: ['#7A1F12', '#C2410C'], acento: '#FCD34D', texto: '#FFFFFF', suave: 'rgba(255,255,255,0.82)', principal: '#7A1F12', tinte: '#FBEDE5', resalte: '#C2410C' }
const AZUL: Tema = { fondo: ['#0B3B5C', '#0E7490'], acento: '#7DD3FC', texto: '#FFFFFF', suave: 'rgba(255,255,255,0.8)', principal: '#0B3B5C', tinte: '#E5F0F5', resalte: '#0E7490' }
const CLARO: Tema = { fondo: ['#F3F8EC', '#E3F1D3'], acento: '#156D6D', texto: '#0F2E2E', suave: 'rgba(15,46,46,0.72)', principal: '#0F4F4F', tinte: '#EDF5E4', resalte: '#4D8A1F' }

const ICONOS = {
  gota: 'M12 21a7 7 0 007-7c0-4-7-11-7-11S5 10 5 14a7 7 0 007 7z',
  alerta: 'M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  llave: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085',
  pago: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  hoja: 'M12 3c4 3 7 6.5 7 10a7 7 0 01-14 0c0-3.5 3-7 7-10zm0 6v12',
  megafono: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  tanque: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  estrella: 'M11.48 3.5a.56.56 0 011.04 0l2.13 5.11a.56.56 0 00.48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.39a.56.56 0 01-.84.61l-4.73-2.89a.56.56 0 00-.59 0l-4.73 2.89a.56.56 0 01-.84-.61l1.28-5.39a.56.56 0 00-.18-.56l-4.2-3.6a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.48-.35z',
}

export const ICONOS_DETALLE: Record<Icono, string> = {
  fecha: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  hora: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  lugar: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  pago: ICONOS.pago,
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  telefono: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.517l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
}

const fechaCorta = (d: Date) => `${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`
const manana = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d }
const vence = () => { const h = new Date(); return vencimientoPeriodo(h.getMonth() + 1, h.getFullYear()) }

export const TIPOS: TipoPieza[] = [
  {
    id: 'corte', ilustracion: 'corte', nombre: 'Suspensión programada', descripcion: 'Corte de agua por trabajos en la red.', icono: ICONOS.alerta, tema: ALERTA,
    base: () => ({
      etiqueta: 'AVISO IMPORTANTE', titular: 'Suspensión del servicio de agua', subtitulo: 'Por trabajos de mejora en la red',
      detalles: [{ icono: 'fecha', texto: fechaCorta(manana()) }, { icono: 'hora', texto: '8:00 a. m. a 2:00 p. m.' }, { icono: 'lugar', texto: 'Barrio Centro' }],
      mensaje: 'Almacena agua para lo necesario y mantén las llaves cerradas.', cta: 'Gracias por tu comprensión',
      caption: '⚠️ AVISO | Mañana se suspenderá el servicio de agua en el barrio Centro de 8:00 a. m. a 2:00 p. m. por trabajos de mejora en la red. Te recomendamos almacenar agua. #EMCAGUA #ElCarmen',
    }),
    guia: 'un aviso de suspensión programada del servicio de agua',
  },
  {
    id: 'mantenimiento', ilustracion: 'fontanero', nombre: 'Mantenimiento de redes', descripcion: 'Trabajos que pueden afectar presión o color del agua.', icono: ICONOS.llave, tema: AZUL,
    base: () => ({
      etiqueta: 'TRABAJAMOS PARA TI', titular: 'Mantenimiento de redes', subtitulo: 'Puede presentarse baja presión',
      detalles: [{ icono: 'fecha', texto: fechaCorta(manana()) }, { icono: 'lugar', texto: 'Guamalito' }],
      mensaje: 'Si el agua sale turbia al volver, déjala correr unos minutos antes de usarla.', cta: 'Mejoramos tu servicio',
      caption: '🔧 Estamos haciendo mantenimiento de redes en Guamalito. Puede presentarse baja presión durante el día. ¡Gracias por tu paciencia! #EMCAGUA',
    }),
    guia: 'un aviso de mantenimiento de redes de acueducto',
  },
  {
    id: 'pago', ilustracion: 'pago', nombre: 'Recordatorio de pago', descripcion: 'Fecha límite de la factura y medios de pago.', icono: ICONOS.pago, tema: VERDE,
    base: () => ({
      etiqueta: 'RECUERDA', titular: 'Paga tu factura a tiempo', subtitulo: 'Evita la suspensión y el cobro de reconexión',
      detalles: [{ icono: 'fecha', texto: `Hasta el ${fechaCorta(vence())}` }, { icono: 'lugar', texto: 'Oficinas de EMCAGUA' }],
      mensaje: 'Estar al día nos ayuda a mantener un buen servicio para todos.', cta: '¡Ponte al día!',
      caption: `💧 Tu factura del agua vence el ${fechaCorta(vence()).toLowerCase()}. Paga a tiempo y evita la suspensión del servicio. #EMCAGUA #PagaATiempo`,
    }),
    guia: 'un recordatorio amable de pago de la factura del agua',
  },
  {
    id: 'ahorro', ilustracion: 'ahorro', nombre: 'Ahorro de agua', descripcion: 'Consejos para cuidar el agua en casa.', icono: ICONOS.gota, tema: CLARO,
    base: () => ({
      etiqueta: 'CUIDEMOS EL AGUA', titular: 'Cada gota cuenta', subtitulo: '3 consejos para ahorrar en casa',
      detalles: [{ icono: 'info', texto: 'Cierra la llave al cepillarte' }, { icono: 'info', texto: 'Revisa fugas en el sanitario' }, { icono: 'info', texto: 'Riega en la mañana o en la noche' }],
      mensaje: 'Un sanitario con fuga puede perder más de 10.000 litros al mes.', cta: 'Ahorra agua, ahorra dinero',
      caption: '💧 Cada gota cuenta. Cierra la llave mientras te cepillas, revisa fugas y riega temprano. Pequeños cambios, gran diferencia. #CuidemosElAgua #EMCAGUA',
    }),
    guia: 'una pieza educativa con consejos para ahorrar agua en casa',
  },
  {
    id: 'calidad', ilustracion: 'tanque', nombre: 'Calidad del agua', descripcion: 'Lavado de tanques, resultados, recomendaciones.', icono: ICONOS.tanque, tema: AZUL,
    base: () => ({
      etiqueta: 'SALUD Y BIENESTAR', titular: 'Lava tu tanque cada 6 meses', subtitulo: 'Agua limpia desde la red hasta tu casa',
      detalles: [{ icono: 'info', texto: 'Vacía y cepilla paredes y fondo' }, { icono: 'info', texto: 'Desinfecta y enjuaga bien' }, { icono: 'info', texto: 'Mantenlo siempre tapado' }],
      mensaje: 'El agua que entregamos es tratada; un tanque sucio la contamina.', cta: 'Tu salud es primero',
      caption: '🚰 ¿Hace cuánto no lavas tu tanque? Hazlo cada 6 meses y mantenlo tapado para que el agua llegue limpia a tu familia. #EMCAGUA #AguaSegura',
    }),
    guia: 'una pieza sobre calidad del agua y lavado de tanques',
  },
  {
    id: 'aviso', ilustracion: 'megafono', nombre: 'Aviso general', descripcion: 'Horarios, nuevos servicios, información a la comunidad.', icono: ICONOS.megafono, tema: VERDE,
    base: () => ({
      etiqueta: 'INFORMACIÓN', titular: 'Nuevo horario de atención', subtitulo: 'Te atendemos en nuestras oficinas',
      detalles: [{ icono: 'hora', texto: cfg().horario }, { icono: 'lugar', texto: cfg().direccion || cfg().ciudad }],
      mensaje: '', cta: '¡Te esperamos!',
      caption: '📢 Conoce nuestro horario de atención. ¡Te esperamos! #EMCAGUA',
    }),
    guia: 'un aviso informativo general a la comunidad',
  },
  {
    id: 'fecha', ilustracion: 'mundo', nombre: 'Fecha especial', descripcion: 'Día del agua, Navidad, aniversarios, felicitaciones.', icono: ICONOS.estrella, tema: CLARO,
    base: () => ({
      etiqueta: '22 DE MARZO', titular: 'Día Mundial del Agua', subtitulo: 'El agua es vida, cuidarla es tarea de todos',
      detalles: [],
      mensaje: 'Gracias a cada familia de El Carmen y Guamalito por usar el agua con responsabilidad.', cta: '#CuidemosElAgua',
      caption: '🌎💧 Hoy celebramos el Día Mundial del Agua. Gracias por cuidarla con nosotros. #DíaMundialDelAgua #EMCAGUA',
    }),
    guia: 'una pieza de saludo o celebración para una fecha especial',
  },
]

export const tipoPieza = (id: string) => TIPOS.find((t) => t.id === id)!

/* ------------------------------ IA local ------------------------------ */

export const SISTEMA_REDES = `Eres el community manager de EMCAGUA APC (acueducto de El Carmen y Guamalito, Norte de Santander). Escribes avisos cortos, cálidos y claros en español de Colombia, tuteando.
Responde solo este JSON:
{"etiqueta":"2-3 PALABRAS","titular":"máx 6 palabras","subtitulo":"máx 9 palabras","detalles":[{"icono":"fecha|hora|lugar|pago|info|telefono","texto":"máx 7 palabras"}],"mensaje":"máx 18 palabras","cta":"máx 4 palabras","caption":"1-2 frases, 1 emoji, 2 hashtags"}
Máximo 3 detalles. No inventes fechas, horas, lugares ni cifras: usa solo los que te den. Hoy es `

/** Lee el JSON aunque esté a medias (mientras la IA escribe) y devuelve lo que ya está completo. */
export function piezaParcial(texto: string, base: Pieza): Pieza {
  const campo = (k: string) => {
    const m = new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(texto)
    // Si el campo todavía se está escribiendo, se muestra lo que va (efecto de escritura en vivo)
    const v = m?.[1] ?? new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)$`).exec(texto)?.[1]
    if (v === undefined) return undefined
    try { return JSON.parse(`"${v.replace(/\\$/, '')}"`) as string } catch { return v }
  }
  const iconos: Icono[] = ['fecha', 'hora', 'lugar', 'pago', 'info', 'telefono']
  const dets: Detalle[] = []
  const re = /\{\s*"icono"\s*:\s*"(\w+)"\s*,\s*"texto"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  for (let m = re.exec(texto); m; m = re.exec(texto)) dets.push({ icono: iconos.includes(m[1] as Icono) ? (m[1] as Icono) : 'info', texto: m[2] })
  const etq = campo('etiqueta')
  return {
    etiqueta: etq ? etq.toUpperCase() : base.etiqueta,
    titular: campo('titular') ?? base.titular,
    subtitulo: campo('subtitulo') ?? base.subtitulo,
    detalles: dets.length ? dets.slice(0, 4) : base.detalles,
    mensaje: campo('mensaje') ?? base.mensaje,
    cta: campo('cta') ?? base.cta,
    caption: campo('caption') ?? base.caption,
  }
}

/* ---------------- Borrador instantáneo (sin IA): fecha, hora, barrio y tipo salen del texto ---------------- */

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const sinTildes = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function horaTexto(n: number, min: number, franja?: string) {
  let h = n
  const f = franja ? sinTildes(franja) : ''
  if (/tarde|noche|pm|p\. ?m/.test(f) && h < 12) h += 12
  if (!f && h >= 1 && h <= 6) h += 12 // "de 7 a 3" → 3 de la tarde
  const ampm = h >= 12 ? 'p. m.' : 'a. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`
}

/** Saca de la idea lo que se puede saber sin IA: así el aviso aparece al instante. */
export function borradorRapido(idea: string): { detalles: Detalle[]; tipo?: string } {
  const q = sinTildes(idea)
  const detalles: Detalle[] = []
  // Fecha
  const hoy = new Date()
  let fecha: Date | undefined
  if (/pasado manana/.test(q)) { fecha = new Date(hoy); fecha.setDate(hoy.getDate() + 2) }
  else if (/\bmanana\b/.test(q.replace(/(de|por|en) la manana/g, ''))) { fecha = new Date(hoy); fecha.setDate(hoy.getDate() + 1) }
  else if (/\bhoy\b/.test(q)) fecha = new Date(hoy)
  const dm = /(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/.exec(q)
  if (dm) { fecha = new Date(hoy.getFullYear(), MESES.findIndex((m) => sinTildes(m) === dm[2]), +dm[1]); if (fecha < hoy && hoy.getTime() - fecha.getTime() > 86_400_000 * 30) fecha.setFullYear(hoy.getFullYear() + 1) }
  else {
    const dia = DIAS.findIndex((d) => new RegExp(`\\b(el |este |proximo )?${d}\\b`).test(q))
    if (dia >= 0) { fecha = new Date(hoy); const diff = (dia - hoy.getDay() + 7) % 7 || 7; fecha.setDate(hoy.getDate() + diff) }
  }
  if (fecha) detalles.push({ icono: 'fecha', texto: fechaCorta(fecha) })
  // Hora: "de 7 de la mañana a 3 de la tarde", "de 8 a 2", "desde las 9:30 am hasta las 4 pm"
  const hr = /(?:de|desde)(?: las?)? (\d{1,2})(?::(\d{2}))?(?: ?(de la manana|de la tarde|de la noche|am|pm|a\. ?m\.|p\. ?m\.))? (?:a|hasta)(?: las?)? (\d{1,2})(?::(\d{2}))?(?: ?(de la manana|de la tarde|de la noche|am|pm|a\. ?m\.|p\. ?m\.))?/.exec(q)
  if (hr && +hr[1] <= 24 && +hr[4] <= 24) detalles.push({ icono: 'hora', texto: `${horaTexto(+hr[1], +(hr[2] ?? 0), hr[3] ?? 'manana')} a ${horaTexto(+hr[4], +(hr[5] ?? 0), hr[6])}` })
  else { const h1 = /(?:a las|desde las) (\d{1,2})(?::(\d{2}))? ?(de la manana|de la tarde|de la noche|am|pm)?/.exec(q); if (h1) detalles.push({ icono: 'hora', texto: `Desde las ${horaTexto(+h1[1], +(h1[2] ?? 0), h1[3])}` }) }
  // Lugar
  // Sectores y barrios nombrados en el aviso
  const sectoresN = leerZonas().map((z) => z.nombre).filter((b) => q.includes(sinTildes(b)))
  const barriosN = leerZonas().flatMap((z) => z.barrios.map((b) => b.nombre)).filter((b) => q.includes(sinTildes(b)))
  const lugares = [...sectoresN, ...barriosN]
  const vereda = /\b(vereda|sector|barrio|calle|carrera) ([a-z0-9#\- ]{2,30}?)(?=[,.]| y | de | por | porque|$)/.exec(q)
  if (lugares.length) {
    const partes = [sectoresN.length ? `${sectoresN.length > 1 ? 'Sectores' : 'Sector'} ${sectoresN.join(' y ')}` : '', barriosN.length ? `${barriosN.length > 1 ? 'barrios' : 'barrio'} ${barriosN.join(' y ')}` : ''].filter(Boolean)
    detalles.push({ icono: 'lugar', texto: sectoresN.length >= 4 ? 'Todo el municipio' : partes.join(' · ').replace(/^b/, 'B') })
  }
  else if (vereda) detalles.push({ icono: 'lugar', texto: `${vereda[1][0].toUpperCase()}${vereda[1].slice(1)} ${vereda[2].replace(/\b\w/g, (c) => c.toUpperCase()).trim()}` })
  // Tipo
  const tipo = /(sin agua|no habra agua|suspen|corte|cortar|no hay servicio)/.test(q) ? 'corte'
    : /(mantenimiento|reparac|arregl|valvula|tuberia|baja presion|turbia)/.test(q) ? 'mantenimiento'
    : /(pago|pagar|factura|vence|recibo|mora)/.test(q) ? 'pago'
    : /(ahorr|cuid(a|e)mos el agua|desperdic|consejo)/.test(q) ? 'ahorro'
    : /(tanque|calidad|potable|clor|lavado)/.test(q) ? 'calidad'
    : /(navidad|dia del agua|feliz|aniversario|madre|padre|celebr)/.test(q) ? 'fecha'
    : /(horario|atencion|oficina|nuevo servicio|informa)/.test(q) ? 'aviso' : undefined
  return { detalles, tipo }
}

export function parsearPieza(texto: string, respaldo: Pieza): Pieza {
  const m = texto.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('La IA no devolvió JSON')
  const j = JSON.parse(m[0])
  const s = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim() : d)
  const iconos: Icono[] = ['fecha', 'hora', 'lugar', 'pago', 'info', 'telefono']
  const detalles: Detalle[] = Array.isArray(j.detalles)
    ? j.detalles.filter((d: { texto?: unknown }) => typeof d?.texto === 'string' && d.texto.trim()).slice(0, 4).map((d: { icono?: string; texto: string }) => ({ icono: iconos.includes(d.icono as Icono) ? (d.icono as Icono) : 'info', texto: d.texto.trim() }))
    : respaldo.detalles
  return {
    etiqueta: s(j.etiqueta, respaldo.etiqueta).toUpperCase(),
    titular: s(j.titular, respaldo.titular),
    subtitulo: s(j.subtitulo, ''),
    detalles,
    mensaje: s(j.mensaje, ''),
    cta: s(j.cta, ''),
    caption: s(j.caption, respaldo.caption),
  }
}

/* ------------------------------ Dibujo ------------------------------ */

export type Estilo = 'elegante' | 'tarjeta' | 'vibrante'
export const ESTILOS: { id: Estilo; nombre: string; descripcion: string }[] = [
  { id: 'elegante', nombre: 'Elegante', descripcion: 'Fondo claro, titular con serifa y franja de color' },
  { id: 'tarjeta', nombre: 'Tarjeta', descripcion: 'Tarjeta blanca flotando sobre un fondo suave' },
  { id: 'vibrante', nombre: 'Vibrante', descripcion: 'Fondo de color completo, para avisos urgentes' },
]
export type Opciones = { formato: Formato; tipo: TipoPieza; pieza: Pieza; logo?: HTMLImageElement; imagen?: HTMLImageElement; esFoto?: boolean; contacto?: string; estilo?: Estilo }

const FUENTE = 'Inter, "Segoe UI", Arial, sans-serif'
const SERIF = 'Fraunces, "Playfair Display", Georgia, "Times New Roman", serif'

function envolver(ctx: CanvasRenderingContext2D, texto: string, ancho: number) {
  const palabras = texto.split(/\s+/)
  const lineas: string[] = []
  let l = ''
  for (const p of palabras) {
    const t = l ? `${l} ${p}` : p
    if (ctx.measureText(t).width > ancho && l) { lineas.push(l); l = p } else l = t
  }
  if (l) lineas.push(l)
  return lineas
}

/** Ajusta el tamaño de fuente para que el texto quepa en `maxLineas`. */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, peso: number | string, tam: number, ancho: number, maxLineas: number, fuente = FUENTE) {
  let t = tam
  for (; t > tam * 0.5; t -= 2) {
    ctx.font = `${peso} ${t}px ${fuente}`
    if (envolver(ctx, texto, ancho).length <= maxLineas) break
  }
  ctx.font = `${peso} ${t}px ${fuente}`
  return { tam: t, lineas: envolver(ctx, texto, ancho) }
}

function icono(ctx: CanvasRenderingContext2D, d: string, x: number, y: number, tam: number, color: string, grosor = 2) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(tam / 24, tam / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = grosor
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(d))
  ctx.restore()
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function dibujarVibrante(ctx: CanvasRenderingContext2D, o: Opciones) {
  const { w, h } = o.formato
  const t = o.tipo.tema
  const pz = o.pieza
  const horizontal = w > h * 1.4
  const u = Math.min(w, h) / 1080 // unidad de escala
  const m = 80 * u // margen

  // Fondo
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, t.fondo[0]); g.addColorStop(1, t.fondo[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // Ondas decorativas abajo
  const ondas = (yBase: number, amp: number, alpha: number, fase: number) => {
    ctx.beginPath(); ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, yBase + Math.sin(x / (180 * u) + fase) * amp)
    ctx.lineTo(w, h); ctx.closePath()
    ctx.fillStyle = t.texto === '#FFFFFF' ? `rgba(255,255,255,${alpha})` : `rgba(21,109,109,${alpha})`
    ctx.fill()
  }
  ondas(h - 150 * u, 22 * u, 0.06, 0)
  ondas(h - 105 * u, 18 * u, 0.08, 2)

  // Ilustración o foto: abajo a la derecha (publicación), abajo al centro (historia) o a la derecha (horizontal)
  const vertical = h > w * 1.4
  const pie = h - 70 * u
  let slot: { x: number; y: number; s: number } | null = null
  if (o.imagen) {
    if (horizontal) { const sz = h * 0.8; slot = { x: w - sz - 30 * u, y: (h - sz) / 2 + 10 * u, s: sz } }
    else if (vertical) { const sz = 760 * u; slot = { x: (w - sz) / 2, y: pie - 100 * u - sz, s: sz } }
    else { const sz = 470 * u; slot = { x: w - sz - 16 * u, y: h - sz - 24 * u, s: sz } }
    const im = o.imagen
    if (o.esFoto) {
      const pad = slot.s * 0.06, x = slot.x + pad, yy = slot.y + pad, sz = slot.s - pad * 2
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 30 * u; ctx.shadowOffsetY = 10 * u
      rect(ctx, x - 10 * u, yy - 10 * u, sz + 20 * u, sz + 20 * u, 44 * u); ctx.fillStyle = '#FFFFFF'; ctx.fill()
      ctx.restore(); ctx.save()
      rect(ctx, x, yy, sz, sz, 36 * u); ctx.clip()
      const r = Math.max(sz / im.width, sz / im.height)
      ctx.drawImage(im, x + (sz - im.width * r) / 2, yy + (sz - im.height * r) / 2, im.width * r, im.height * r)
      ctx.restore()
    } else {
      ctx.drawImage(im, slot.x, slot.y, slot.s, slot.s)
    }
  } else icono(ctx, o.tipo.icono, w - (horizontal ? 430 : 520) * u, (horizontal ? 60 : 120) * u, (horizontal ? 480 : 600) * u, t.texto === '#FFFFFF' ? 'rgba(255,255,255,0.07)' : 'rgba(21,109,109,0.07)', 1.4)

  // Encabezado: logo + nombre
  let y = m
  const tamLogo = 92 * u
  if (o.logo) {
    ctx.save(); ctx.beginPath(); ctx.arc(m + tamLogo / 2, y + tamLogo / 2, tamLogo / 2 + 6 * u, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore()
    const r = Math.min(tamLogo / o.logo.width, tamLogo / o.logo.height)
    ctx.drawImage(o.logo, m + (tamLogo - o.logo.width * r) / 2, y + (tamLogo - o.logo.height * r) / 2, o.logo.width * r, o.logo.height * r)
  }
  ctx.fillStyle = t.texto
  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 ${38 * u}px ${FUENTE}`
  ctx.fillText('EMCAGUA APC', m + tamLogo + 26 * u, y + 46 * u)
  ctx.fillStyle = t.suave
  ctx.font = `500 ${22 * u}px ${FUENTE}`
  ctx.fillText('El Carmen · Guamalito', m + tamLogo + 26 * u, y + 80 * u)
  y += tamLogo + (horizontal ? 40 : 90) * u

  const anchoTit = horizontal ? (slot ? slot.x - m - 20 * u : w * 0.62) : w - m * 2
  const ancho = slot && !vertical ? slot.x - m - 24 * u : anchoTit
  const limite = slot && vertical ? slot.y - 20 * u : pie - 100 * u // el contenido no puede bajar de aquí

  /** Contenido central a escala k. Con pintar=false solo mide y devuelve dónde termina. */
  const bloque = (k: number, y: number, pintar: boolean) => {
    const s = u * k
    if (pz.etiqueta) {
      ctx.font = `800 ${24 * s}px ${FUENTE}`
      const tw = ctx.measureText(pz.etiqueta).width
      if (pintar) {
        rect(ctx, m, y, tw + 44 * s, 50 * s, 25 * s)
        ctx.fillStyle = t.acento; ctx.fill()
        ctx.fillStyle = t.texto === '#FFFFFF' ? t.fondo[0] : '#FFFFFF'
        ctx.fillText(pz.etiqueta, m + 22 * s, y + 34 * s)
      }
      y += 84 * s
    }
    ctx.fillStyle = t.texto
    const tit = ajustar(ctx, pz.titular, 800, (horizontal ? 74 : 96) * s, anchoTit, 3)
    tit.lineas.forEach((l) => { y += tit.tam * 1.02; if (pintar) ctx.fillText(l, m, y) })
    y += 20 * s
    if (pz.subtitulo) {
      ctx.fillStyle = t.acento
      const st = ajustar(ctx, pz.subtitulo, 600, 40 * s, ancho, 2)
      st.lineas.forEach((l) => { y += st.tam * 1.2; if (pintar) ctx.fillText(l, m, y) })
    }
    y += (horizontal ? 30 : 56) * s
    const dets = pz.detalles.filter((d) => d.texto.trim()).slice(0, 4)
    if (dets.length) {
      const fila = 74 * s
      const alto = dets.length * fila + 30 * s
      if (pintar) {
        rect(ctx, m, y, ancho, alto, 32 * s)
        ctx.fillStyle = t.texto === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)'
        ctx.fill()
        let yy = y + 15 * s
        dets.forEach((d) => {
          ctx.beginPath(); ctx.arc(m + 54 * s, yy + fila / 2, 28 * s, 0, Math.PI * 2)
          ctx.fillStyle = t.acento; ctx.fill()
          icono(ctx, ICONOS_DETALLE[d.icono], m + 38 * s, yy + fila / 2 - 16 * s, 32 * s, t.texto === '#FFFFFF' ? t.fondo[0] : '#FFFFFF', 2.2)
          ctx.fillStyle = t.texto
          const dt = ajustar(ctx, d.texto, 600, 34 * s, ancho - 130 * s, 1)
          ctx.fillText(dt.lineas[0], m + 104 * s, yy + fila / 2 + dt.tam * 0.36)
          yy += fila
        })
      }
      y += alto + 44 * s
    }
    if (pz.mensaje) {
      ctx.fillStyle = t.suave
      const ms = ajustar(ctx, pz.mensaje, 500, 32 * s, ancho, horizontal ? 2 : 4)
      ms.lineas.forEach((l) => { y += ms.tam * 1.35; if (pintar) ctx.fillText(l, m, y) })
    }
    return y
  }

  // Busca la escala que cabe (y la agranda en formatos altos), y centra verticalmente lo que sobra.
  let k = vertical && !slot ? 1.3 : 1
  while (k > 0.6 && bloque(k, y, false) > limite) k -= 0.05
  const sobra = limite - bloque(k, y, false)
  bloque(k, y + (vertical ? Math.max(0, sobra / 2) : 0), true)

  // Pie: CTA + contacto
  if (pz.cta) {
    ctx.font = `800 ${34 * u}px ${FUENTE}`
    const cw = ctx.measureText(pz.cta).width + 64 * u
    rect(ctx, m, pie - 62 * u, cw, 76 * u, 38 * u)
    ctx.fillStyle = t.texto === '#FFFFFF' ? '#FFFFFF' : t.acento
    ctx.fill()
    ctx.fillStyle = t.texto === '#FFFFFF' ? t.fondo[0] : '#FFFFFF'
    ctx.fillText(pz.cta, m + 32 * u, pie - 12 * u)
  }
  if (o.contacto) {
    ctx.font = `600 ${24 * u}px ${FUENTE}`
    ctx.fillStyle = t.suave
    ctx.textAlign = 'right'
    ctx.fillText(o.contacto, w - m, pie - 14 * u)
    ctx.textAlign = 'left'
  }
}


/* ------------------------------ Diseños claros ------------------------------ */

export function dibujar(ctx: CanvasRenderingContext2D, o: Opciones) {
  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  if (o.estilo === 'vibrante') dibujarVibrante(ctx, o)
  else if (o.estilo === 'tarjeta') dibujarTarjeta(ctx, o)
  else dibujarElegante(ctx, o)
  ctx.restore()
}

const espaciado = (ctx: CanvasRenderingContext2D, px: number) => { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px` }

/** Arco (rectángulo con la parte de arriba redonda), la forma de una ventana colonial. */
function arco(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = w / 2
  ctx.beginPath()
  ctx.moveTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, 0)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
}

/** Pinta la ilustración o la foto dentro de la forma ya trazada (clip). */
function imagenEn(ctx: CanvasRenderingContext2D, o: Opciones, x: number, y: number, w: number, h: number, forma: () => void, fondo: string) {
  if (!o.imagen) return
  ctx.save()
  forma(); ctx.fillStyle = fondo; ctx.fill()
  forma(); ctx.clip()
  const im = o.imagen
  if (o.esFoto) {
    const r = Math.max(w / im.width, h / im.height)
    ctx.drawImage(im, x + (w - im.width * r) / 2, y + (h - im.height * r) / 2, im.width * r, im.height * r)
  } else {
    const s = Math.max(w * 1.02, h * 0.8)
    ctx.drawImage(im, x + (w - s) / 2, y + h - s * 0.96, s, s)
  }
  ctx.restore()
}

/** Logo + nombre de la empresa. Devuelve la altura usada. */
function marca(ctx: CanvasRenderingContext2D, o: Opciones, x: number, y: number, u: number, color: string, gris: string) {
  const t = 66 * u
  if (o.logo) {
    ctx.save()
    ctx.beginPath(); ctx.arc(x + t / 2, y + t / 2, t / 2 + 4 * u, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill()
    ctx.lineWidth = 2 * u; ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.stroke()
    const r = Math.min(t / o.logo.width, t / o.logo.height)
    ctx.drawImage(o.logo, x + (t - o.logo.width * r) / 2, y + (t - o.logo.height * r) / 2, o.logo.width * r, o.logo.height * r)
    ctx.restore()
  }
  const tx = x + (o.logo ? t + 22 * u : 0)
  ctx.fillStyle = color
  ctx.font = `800 ${27 * u}px ${FUENTE}`
  espaciado(ctx, 2.5 * u)
  ctx.fillText(cfg().nombre.toUpperCase(), tx, y + 32 * u)
  espaciado(ctx, 0.5 * u)
  ctx.fillStyle = gris
  ctx.font = `500 ${19 * u}px ${FUENTE}`
  ctx.fillText('Acueducto de El Carmen y Guamalito', tx, y + 60 * u)
  espaciado(ctx, 0)
  return t
}

type Caja = { x: number; y: number; ancho: number; limite: number }

/**
 * Texto del aviso con jerarquía clara. Mide a escala k (pintar=false) para encontrar el tamaño que cabe.
 * colores: principal (titular, íconos), resalte (etiqueta y línea), texto y gris.
 */
function contenidoClaro(ctx: CanvasRenderingContext2D, o: Opciones, c: Caja, u: number, k: number, pintar: boolean, compacto: boolean) {
  const t = o.tipo.tema, pz = o.pieza
  const s = u * k
  let y = c.y
  if (pz.etiqueta) {
    ctx.font = `700 ${21 * s}px ${FUENTE}`
    espaciado(ctx, 5 * s)
    if (pintar) {
      ctx.fillStyle = t.resalte
      ctx.fillRect(c.x, y + 12 * s, 42 * s, 3 * s)
      ctx.fillText(pz.etiqueta, c.x + 58 * s, y + 21 * s)
    }
    espaciado(ctx, 0)
    y += 58 * s
  }
  ctx.fillStyle = t.principal
  const tit = ajustar(ctx, pz.titular, 600, (compacto ? 66 : 88) * s, c.ancho, compacto ? 2 : 3, SERIF)
  tit.lineas.forEach((l, i) => { y += tit.tam * (i ? 1.04 : 0.9); if (pintar) ctx.fillText(l, c.x, y) })
  if (pz.subtitulo) {
    y += 22 * s
    ctx.fillStyle = '#4B5563'
    const st = ajustar(ctx, pz.subtitulo, 500, 32 * s, c.ancho, 2)
    st.lineas.forEach((l) => { y += st.tam * 1.25; if (pintar) ctx.fillText(l, c.x, y) })
  }
  const dets = pz.detalles.filter((d) => d.texto.trim()).slice(0, 4)
  if (dets.length) {
    y += (compacto ? 26 : 40) * s
    const fila = (compacto ? 56 : 66) * s
    dets.forEach((d, i) => {
      if (pintar) {
        const cy = y + fila / 2
        ctx.beginPath(); ctx.arc(c.x + 24 * s, cy, 24 * s, 0, Math.PI * 2); ctx.fillStyle = t.tinte; ctx.fill()
        icono(ctx, ICONOS_DETALLE[d.icono], c.x + 11 * s, cy - 13 * s, 26 * s, t.principal, 2)
        ctx.fillStyle = '#1F2937'
        const dt = ajustar(ctx, d.texto, 600, 30 * s, c.ancho - 70 * s, 1)
        ctx.fillText(dt.lineas[0], c.x + 66 * s, cy + dt.tam * 0.35)
        if (i < dets.length - 1) { ctx.fillStyle = 'rgba(15,23,42,0.07)'; ctx.fillRect(c.x + 66 * s, y + fila, c.ancho - 66 * s, Math.max(1, 1.5 * s)) }
      }
      y += fila
    })
  }
  if (pz.mensaje) {
    y += (compacto ? 20 : 34) * s
    ctx.fillStyle = '#6B7280'
    const ms = ajustar(ctx, pz.mensaje, 'italic 400', 27 * s, c.ancho, compacto ? 2 : 3)
    ms.lineas.forEach((l) => { y += ms.tam * 1.35; if (pintar) ctx.fillText(l, c.x, y) })
  }
  return y
}

/** Encuentra la escala que cabe y pinta; en formatos altos centra el texto en el espacio que sobra. */
function pintarContenido(ctx: CanvasRenderingContext2D, o: Opciones, c: Caja, u: number, centrar: boolean, compacto: boolean, kMax = 1) {
  let k = kMax
  while (k > 0.55 && contenidoClaro(ctx, o, c, u, k, false, compacto) > c.limite) k -= 0.04
  const sobra = c.limite - contenidoClaro(ctx, o, c, u, k, false, compacto)
  contenidoClaro(ctx, o, { ...c, y: c.y + (centrar ? Math.max(0, sobra / 2) : 0) }, u, k, true, compacto)
}

function dibujarElegante(ctx: CanvasRenderingContext2D, o: Opciones) {
  const { w, h } = o.formato
  const t = o.tipo.tema, pz = o.pieza
  const u = Math.min(w, h) / 1080
  const horizontal = w > h * 1.4, vertical = h > w * 1.4
  const m = (horizontal ? 64 : 84) * u

  // Fondo marfil con un círculo de color muy suave
  ctx.fillStyle = '#FBFAF7'; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = t.tinte
  ctx.beginPath(); ctx.arc(w * (horizontal ? 0.86 : 0.9), h * (vertical ? 0.06 : 0.02), (horizontal ? h * 0.9 : w * 0.5), 0, Math.PI * 2); ctx.fill()

  // Franja inferior con el llamado a la acción
  const altoPie = (horizontal ? 100 : vertical ? 150 : 124) * u
  const yPie = h - altoPie
  ctx.fillStyle = t.principal; ctx.fillRect(0, yPie, w, altoPie)
  ctx.fillStyle = t.resalte; ctx.fillRect(0, yPie, w, 6 * u)

  // Imagen en un arco (como las ventanas de las casas de la región)
  let slot: { x: number; y: number; w: number; h: number } | null = null
  if (o.imagen) {
    if (horizontal) { const ah = yPie - 120 * u; const aw = ah * 0.74; slot = { x: w - m - aw, y: yPie - ah, w: aw, h: ah } }
    else if (vertical) { const aw = 700 * u, ah = 820 * u; slot = { x: (w - aw) / 2, y: yPie - ah, w: aw, h: ah } }
    else { const aw = 400 * u, ah = 560 * u; slot = { x: w - m - aw + 18 * u, y: yPie - ah, w: aw, h: ah } }
    const sl = slot
    // Contorno fino desplazado: detalle elegante
    ctx.save(); arco(ctx, sl.x - 18 * u, sl.y - 18 * u, sl.w, sl.h + 18 * u); ctx.lineWidth = 2.5 * u; ctx.strokeStyle = t.resalte; ctx.globalAlpha = 0.55; ctx.stroke(); ctx.restore()
    imagenEn(ctx, o, sl.x, sl.y, sl.w, sl.h, () => arco(ctx, sl.x, sl.y, sl.w, sl.h), t.tinte)
  }

  // Encabezado
  const altoMarca = marca(ctx, o, m, m, u, t.principal, '#6B7280')
  const yTexto = m + altoMarca + (horizontal ? 44 : vertical ? 110 : 70) * u
  const ancho = slot && !vertical ? slot.x - m - 56 * u : w - m * 2
  const limite = slot && vertical ? slot.y - 50 * u : yPie - (horizontal ? 36 : 56) * u
  pintarContenido(ctx, o, { x: m, y: yTexto, ancho, limite }, u, vertical || horizontal, horizontal, horizontal ? 1.35 : vertical && !slot ? 1.25 : 1)

  // Pie
  const cy = yPie + altoPie / 2 + 3 * u
  if (pz.cta) {
    ctx.fillStyle = '#FFFFFF'
    const ct = ajustar(ctx, pz.cta, 700, 34 * u, w * 0.55, 1)
    ctx.fillText(ct.lineas[0], m, cy + ct.tam * 0.35)
    const cw = ctx.measureText(ct.lineas[0]).width
    ctx.fillStyle = t.resalte === t.principal ? '#FFFFFF' : t.tinte
    ctx.beginPath(); ctx.moveTo(m + cw + 22 * u, cy - 9 * u); ctx.lineTo(m + cw + 38 * u, cy); ctx.lineTo(m + cw + 22 * u, cy + 9 * u); ctx.closePath(); ctx.fill()
  }
  if (o.contacto) {
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.font = `600 ${24 * u}px ${FUENTE}`
    ctx.textAlign = 'right'
    ctx.fillText(o.contacto, w - m, cy + 8 * u)
    ctx.textAlign = 'left'
  }
}

function dibujarTarjeta(ctx: CanvasRenderingContext2D, o: Opciones) {
  const { w, h } = o.formato
  const t = o.tipo.tema, pz = o.pieza
  const u = Math.min(w, h) / 1080
  const horizontal = w > h * 1.4, vertical = h > w * 1.4
  const m = (horizontal ? 56 : 72) * u

  // Fondo suave con formas
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, t.tinte); g.addColorStop(1, '#FFFFFF')
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = t.principal
  ctx.beginPath(); ctx.arc(-w * 0.05, h * 1.02, w * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = t.resalte; ctx.lineWidth = 3 * u
  ctx.beginPath(); ctx.arc(w * 0.97, h * 0.04, (horizontal ? 150 : 200) * u, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
  // Puntos decorativos
  ctx.fillStyle = t.resalte
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(m + i * 22 * u, h - m - j * 22 * u - (horizontal ? 0 : 10 * u), 3.5 * u, 0, Math.PI * 2); ctx.fill() }
  ctx.globalAlpha = 1

  const altoMarca = marca(ctx, o, m, m, u, t.principal, '#6B7280')

  // Tarjeta blanca
  let card: { x: number; y: number; w: number; h: number }
  let circ: { cx: number; cy: number; r: number } | null = null
  if (horizontal) {
    card = { x: m, y: m + altoMarca + 28 * u, w: w * 0.6 - m, h: 0 }
    card.h = h - card.y - m
    if (o.imagen) circ = { cx: w * 0.8, cy: h / 2 + 20 * u, r: Math.min(h * 0.36, w * 0.16) }
  } else if (vertical) {
    if (o.imagen) circ = { cx: w / 2, cy: m + altoMarca + 320 * u, r: 290 * u }
    const top = circ ? circ.cy + circ.r - 60 * u : m + altoMarca + 60 * u
    card = { x: m, y: top, w: w - m * 2, h: h - top - m - 70 * u }
  } else {
    if (o.imagen) circ = { cx: w - m - 175 * u, cy: m + 150 * u, r: 175 * u }
    card = { x: m, y: m + altoMarca + 44 * u, w: w - m * 2, h: 0 }
    card.h = h - card.y - m - 54 * u
  }
  ctx.save()
  ctx.shadowColor = 'rgba(15,40,40,0.16)'; ctx.shadowBlur = 60 * u; ctx.shadowOffsetY = 18 * u
  rect(ctx, card.x, card.y, card.w, card.h, 44 * u); ctx.fillStyle = '#FFFFFF'; ctx.fill()
  ctx.restore()
  ctx.fillStyle = t.resalte; rect(ctx, card.x + 48 * u, card.y, 120 * u, 8 * u, 4 * u); ctx.fill()

  // Ilustración en círculo, montada sobre la tarjeta
  if (circ) {
    const c = circ
    ctx.save(); ctx.shadowColor = 'rgba(15,40,40,0.18)'; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 12 * u
    ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r + 10 * u, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore()
    imagenEn(ctx, o, c.cx - c.r, c.cy - c.r, c.r * 2, c.r * 2, () => { ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2) }, t.tinte)
  }

  // Texto dentro de la tarjeta (dejando libre la esquina del círculo en la publicación)
  const pad = (horizontal ? 44 : 56) * u
  const altoBoton = pz.cta ? 78 * u : 0
  const xTexto = card.x + pad
  const yTexto = card.y + pad + (circ && !horizontal && !vertical ? 0 : 0)
  const anchoTexto = card.w - pad * 2 - (circ && !horizontal && !vertical ? circ.r * 2 - pad + 24 * u : 0)
  const limite = card.y + card.h - pad - (altoBoton ? altoBoton + 28 * u : 0)
  pintarContenido(ctx, o, { x: xTexto, y: yTexto + (circ && !horizontal && !vertical ? 10 * u : 0), ancho: anchoTexto, limite }, u, vertical, horizontal, horizontal ? 1.3 : vertical ? 1.18 : 1)

  // Botón dentro de la tarjeta
  if (pz.cta) {
    ctx.font = `700 ${30 * u}px ${FUENTE}`
    const bw = Math.min(card.w - pad * 2, ctx.measureText(pz.cta).width + 72 * u)
    const by = card.y + card.h - pad - altoBoton
    rect(ctx, xTexto, by, bw, altoBoton, altoBoton / 2); ctx.fillStyle = t.principal; ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    const ct = ajustar(ctx, pz.cta, 700, 30 * u, bw - 60 * u, 1)
    ctx.fillText(ct.lineas[0], xTexto + 36 * u, by + altoBoton / 2 + ct.tam * 0.35)
  }
  if (o.contacto) {
    ctx.fillStyle = t.principal
    ctx.font = `600 ${23 * u}px ${FUENTE}`
    ctx.textAlign = horizontal ? 'right' : 'center'
    if (horizontal) ctx.fillText(o.contacto, w - m, h - m + 6 * u)
    else ctx.fillText(o.contacto, w / 2, h - m + 4 * u)
    ctx.textAlign = 'left'
  }
}
