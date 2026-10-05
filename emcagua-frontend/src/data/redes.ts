/**
 * Piezas gráficas para redes sociales (Facebook, Instagram, estados de WhatsApp).
 * La imagen se dibuja en un <canvas> con la marca de EMCAGUA; la IA local escribe los textos.
 */
import { vencimientoPeriodo } from './billing'
import { MESES } from './constants'
import { cfg } from './config'

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

export type Tema = { fondo: [string, string]; acento: string; texto: string; suave: string }

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

const VERDE: Tema = { fondo: ['#0F4F4F', '#156D6D'], acento: '#8AC43A', texto: '#FFFFFF', suave: 'rgba(255,255,255,0.78)' }
const ALERTA: Tema = { fondo: ['#7A1F12', '#C2410C'], acento: '#FCD34D', texto: '#FFFFFF', suave: 'rgba(255,255,255,0.82)' }
const AZUL: Tema = { fondo: ['#0B3B5C', '#0E7490'], acento: '#7DD3FC', texto: '#FFFFFF', suave: 'rgba(255,255,255,0.8)' }
const CLARO: Tema = { fondo: ['#F3F8EC', '#E3F1D3'], acento: '#156D6D', texto: '#0F2E2E', suave: 'rgba(15,46,46,0.72)' }

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

export const SISTEMA_REDES = `Eres el community manager de EMCAGUA APC, empresa de acueducto y alcantarillado de El Carmen y Guamalito (Norte de Santander, Colombia).
Escribes piezas para Facebook, Instagram y estados de WhatsApp: lenguaje sencillo, cercano y claro, en español de Colombia, tuteando.
Responde SOLO con un JSON con esta forma exacta:
{"etiqueta": "máx. 3 palabras en MAYÚSCULAS", "titular": "máx. 7 palabras", "subtitulo": "máx. 10 palabras", "detalles": [{"icono": "fecha|hora|lugar|pago|info|telefono", "texto": "máx. 8 palabras"}], "mensaje": "una frase de máx. 20 palabras", "cta": "máx. 5 palabras", "caption": "texto de la publicación, 1 a 3 frases, con 1 o 2 emojis y 2 o 3 hashtags"}
Reglas: máximo 4 detalles. No inventes fechas, horarios, barrios, teléfonos ni cifras que el usuario no haya dado: si faltan, omite ese detalle. Usa el año y la fecha de hoy como referencia: `

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

export type Opciones = { formato: Formato; tipo: TipoPieza; pieza: Pieza; logo?: HTMLImageElement; imagen?: HTMLImageElement; esFoto?: boolean; contacto?: string }

const FUENTE = 'Inter, "Segoe UI", Arial, sans-serif'

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
function ajustar(ctx: CanvasRenderingContext2D, texto: string, peso: number, tam: number, ancho: number, maxLineas: number) {
  let t = tam
  for (; t > tam * 0.5; t -= 2) {
    ctx.font = `${peso} ${t}px ${FUENTE}`
    if (envolver(ctx, texto, ancho).length <= maxLineas) break
  }
  ctx.font = `${peso} ${t}px ${FUENTE}`
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

export function dibujar(ctx: CanvasRenderingContext2D, o: Opciones) {
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
