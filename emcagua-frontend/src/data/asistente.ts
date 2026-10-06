/**
 * Asistente: arma un resumen de los datos del sistema y lo envía a un modelo local (Ollama).
 * Si Ollama no está disponible, responde con reglas sencillas sobre los mismos datos.
 * Los datos NO salen del equipo: Ollama corre en el computador de la empresa.
 */
import { BARRIOS, MESES, UMBRAL_ALTO } from './constants'
import { consumosAtipicos, edadCartera, porBarrio, serieMensual } from './analytics'
import { resumenUsuario } from './billing'
import { diasHabilesRestantes } from './pqr'
import type { Lectura, Pago, Pqr, Usuario } from './types'
import { ALARMAS, type AlarmaMedidor } from './telemetria'
import { estadoStock, type Material } from './operacion'
import { cop, num, pct } from '../utils/format'
import { balanceHidrico, IANC_META } from './perdidas'

export type Mensaje = { rol: 'usuario' | 'asistente'; texto: string; fuente?: 'ollama' | 'reglas'; pregunta?: string; escribiendo?: boolean }

export type Contexto = { usuarios: Usuario[]; pagos: Pago[]; pqrs: Pqr[]; lecturas: Record<string, Lectura>; alarmas: AlarmaMedidor[]; materiales?: Material[] }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/**
 * Contexto para el modelo. Para que responda rápido solo se envían las secciones
 * que tienen que ver con la pregunta (menos texto = menos tiempo de lectura del modelo).
 */
export function resumenParaModelo({ usuarios, pagos, pqrs, lecturas, alarmas }: Contexto, pregunta = '') {
  const q = norm(pregunta)
  const todo = !q || /resumen|gerencia|informe|general|como va/.test(q)
  const quiere = (re: RegExp) => todo || re.test(q)
  const serie = serieMensual(usuarios, 6)
  const morosos = usuarios.map((u) => ({ u, r: resumenUsuario(u) })).filter((x) => x.r.vencido).sort((a, b) => b.r.deuda - a.r.deuda)
  const atipicos = consumosAtipicos(usuarios)
  const cartera = edadCartera(usuarios)
  const abiertas = pqrs.filter((p) => p.estado === 'Radicada' || p.estado === 'En trámite')
  const hoy = new Date()
  const secciones: (string | false)[] = [
    `FECHA: ${hoy.toLocaleDateString('es-CO')}. EMPRESA: EMCAGUA APC, acueducto y alcantarillado de El Carmen y Guamalito (Norte de Santander).`,
    `SUSCRIPTORES: ${usuarios.length} (${usuarios.filter((u) => u.estado === 'Activo').length} activos, ${usuarios.filter((u) => u.estado === 'Cortado').length} cortados). Barrios: ${BARRIOS.join(', ')}.`,
    quiere(/factur|recaud|cobr|pag|mes|consum|ingres|plata|dinero/) && [`SERIE MENSUAL (periodo: consumo m³ | facturado | recaudado | pendiente):`, ...serie.map((p) => `- ${p.full}: ${num(p.consumo)} m³ | ${cop(p.facturado)} | ${cop(p.recaudado)} | ${cop(p.pendiente)}`)].join('\n'),
    quiere(/barrio|sector|consum|mora|cartera|centro|guamalito|carmen|esperanza/) && [`POR BARRIO (consumo promedio último periodo, usuarios, en mora, cartera):`, ...porBarrio(usuarios).map((b) => `- ${b.barrio}: ${num(b.consumoPromedio, 1)} m³, ${b.usuarios} usuarios, ${b.morosos} en mora, ${cop(b.cartera)}`)].join('\n'),
    quiere(/cartera|mora|deb|deud|vencid|cort/) && `CARTERA POR EDAD: ${cartera.map((t) => `${t.label} ${cop(t.monto)} (${t.facturas} fact.)`).join('; ')}.`,
    quiere(/mora|deb|deud|cort|quien|usuario/) && `USUARIOS EN MORA (top 10): ${morosos.slice(0, 10).map((x) => `${x.u.nombre} [${x.u.id}, ${x.u.barrio}, ${x.u.estado}] debe ${cop(x.r.deuda)}`).join('; ') || 'ninguno'}.`,
    quiere(/fuga|atipic|consum|alto|perd/) && `CONSUMOS ATÍPICOS (posibles fugas): ${atipicos.slice(0, 8).map((a) => `${a.usuario.nombre} ${a.actual} m³ vs prom ${num(a.promedio, 1)}`).join('; ') || 'ninguno'}. Umbral de consumo alto: ${UMBRAL_ALTO} m³.`,
    quiere(/pag|recaud|hoy|semana|caja/) && `PAGOS: ${pagos.length} registrados; últimos 7 días ${cop(pagos.filter((p) => hoy.getTime() - p.timestamp < 7 * 864e5).reduce((s, p) => s + p.monto, 0))}.`,
    quiere(/pqr|queja|reclam|petici|usuario|atencion/) && `PQR: ${pqrs.length} en total, ${abiertas.length} abiertas, ${abiertas.filter((p) => diasHabilesRestantes(p.vence) < 0).length} vencidas. Por categoría: ${Object.entries(pqrs.reduce<Record<string, number>>((a, p) => ((a[p.categoria] = (a[p.categoria] ?? 0) + 1), a), {})).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
    quiere(/medidor|lectur|alarma|fuga|telemetr/) && `MEDIDORES INTELIGENTES: ${Object.keys(lecturas).length} lecturas recibidas de ${usuarios.filter((u) => u.estado === 'Activo').length} medidores activos.`,
    quiere(/medidor|alarma|fuga|manipul|comunica/) && `ALARMAS DE MEDIDORES: ${alarmas.map((a) => `${ALARMAS[a.tipo].label} - ${a.usuario.nombre} (${a.usuario.barrio}): ${a.detalle}`).join('; ') || 'ninguna'}.`,
  ]
  const lineas = secciones.filter(Boolean) as string[]
  // Pregunta abierta sin tema claro: un resumen corto de todo en vez del detalle completo
  if (lineas.length === 2) {
    const u = serie[serie.length - 1]
    lineas.push(`RESUMEN: ${u ? `${u.full} facturado ${cop(u.facturado)}, recaudado ${cop(u.recaudado)}, consumo ${num(u.consumo)} m³. ` : ''}${morosos.length} usuarios en mora por ${cop(morosos.reduce((t, x) => t + x.r.deuda, 0))}. ${abiertas.length} PQR abiertas. ${alarmas.length} alarmas de medidores (${alarmas.filter((x) => x.tipo === 'fuga').length} fugas). ${atipicos.length} consumos atípicos.`)
  }
  return lineas.join('\n')
}

export const INSTRUCCIONES = `Eres el asistente del sistema de gestión de EMCAGUA APC. Respondes en español de Colombia, claro y breve, a trabajadores operativos y administrativos (no son ingenieros).
Usa SOLO los datos del contexto. Si el dato no está, dilo y sugiere en qué módulo buscarlo (Usuarios, Facturación, Pagos, Analítica, PQR, Medidores, Nómina).
No inventes cifras. Usa pesos colombianos con punto de miles ($1.250.000) y m³ para consumo. Cuando sea útil, termina con una recomendación concreta.`

export async function estadoOllama(url: string): Promise<{ ok: boolean; modelos: string[] }> {
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(2500) })
    if (!r.ok) return { ok: false, modelos: [] }
    const j = await r.json()
    return { ok: true, modelos: (j.models ?? []).map((m: { name: string }) => m.name) }
  } catch {
    return { ok: false, modelos: [] }
  }
}

/** Opciones para responder rápido en un PC sin tarjeta gráfica: contexto corto y respuestas acotadas. */
const OPCIONES = { temperature: 0.2, num_ctx: 4096, num_predict: 450 }

/** Carga el modelo en memoria para que la primera pregunta no espere. Lo mantiene cargado 30 minutos. */
export async function calentarOllama(url: string, modelo: string) {
  try { await fetch(`${url.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: modelo, keep_alive: '30m', prompt: '' }) }) } catch { /* sin IA */ }
}

/** Igual que preguntarOllama, pero entrega el texto a medida que el modelo lo escribe. */
export async function preguntarOllamaStream(url: string, modelo: string, historial: Mensaje[], contexto: string, alEscribir: (parcial: string) => void, signal?: AbortSignal): Promise<string> {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      stream: true,
      keep_alive: '30m',
      options: OPCIONES,
      messages: [
        { role: 'system', content: `${INSTRUCCIONES}\n\nCONTEXTO DE DATOS:\n${contexto}` },
        ...historial.slice(-6).map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
      ],
    }),
  })
  if (!r.ok || !r.body) throw new Error(`Ollama respondió ${r.status}`)
  const lector = r.body.getReader()
  const dec = new TextDecoder()
  let buffer = '', texto = ''
  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    buffer += dec.decode(value, { stream: true })
    const lineas = buffer.split('\n')
    buffer = lineas.pop() ?? ''
    for (const l of lineas) {
      if (!l.trim()) continue
      const j = JSON.parse(l)
      if (j.message?.content) { texto += j.message.content; alEscribir(texto) }
    }
  }
  return texto.trim() || 'No obtuve respuesta del modelo.'
}

export async function preguntarOllama(url: string, modelo: string, historial: Mensaje[], contexto: string): Promise<string> {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      stream: false,
      keep_alive: '30m',
      options: OPCIONES,
      messages: [
        { role: 'system', content: `${INSTRUCCIONES}\n\nCONTEXTO DE DATOS:\n${contexto}` },
        ...historial.slice(-6).map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
      ],
    }),
  })
  if (!r.ok) throw new Error(`Ollama respondió ${r.status}`)
  const j = await r.json()
  return j.message?.content?.trim() || 'No obtuve respuesta del modelo.'
}

/* ------------------------------------------------------------------ */
/* Respuestas sin IA (reglas)                                          */
/* ------------------------------------------------------------------ */


/** Respuesta instantánea con reglas. Devuelve null si la pregunta no encaja en ninguna regla. */
export function respuestaRapida(pregunta: string, { usuarios, pagos, pqrs, lecturas, alarmas, materiales }: Contexto): string | null {
  const q = norm(pregunta)
  const serie = serieMensual(usuarios, 12)
  const ult = serie[serie.length - 1]
  const mesPedido = MESES.findIndex((m) => q.includes(norm(m)))
  const barrioPedido = BARRIOS.find((b) => q.includes(norm(b)))

  if (/urgent|pendiente|hoy que|que hago|prioridad|que hay para hoy|atender/.test(q)) {
    const ab = pqrs.filter((p) => p.estado === 'Radicada' || p.estado === 'En trámite')
    const venc = ab.filter((p) => diasHabilesRestantes(p.vence) < 0)
    const graves = alarmas.filter((a) => ALARMAS[a.tipo].grave)
    const morosos = usuarios.filter((x) => x.estado === 'Activo' && resumenUsuario(x).vencido)
    const bajos = (materiales ?? []).filter((m) => estadoStock(m) !== 'OK')
    const items = [
      venc.length && `- **${venc.length} PQR vencida(s)**: respóndelas hoy (silencio administrativo positivo).`,
      graves.length && `- **${graves.length} alarma(s) grave(s)** en medidores: ${graves.slice(0, 3).map((a) => `${ALARMAS[a.tipo].label.toLowerCase()} de ${a.usuario.nombre}`).join(', ')}.`,
      morosos.length && `- ${morosos.length} usuario(s) en mora con servicio activo: envíales aviso por WhatsApp.`,
      bajos.length && `- ${bajos.length} material(es) bajo el mínimo: ${bajos.map((m) => m.nombre).join(', ')}.`,
    ].filter(Boolean)
    return items.length ? `**Lo más urgente hoy:**\n${items.join('\n')}` : 'No hay nada urgente hoy. 👍'
  }


  if (/perdid|no contabiliz|ianc|pierde/.test(q)) {
    const b = balanceHidrico(usuarios, 2)
    const u0 = b[b.length - 1]
    if (!u0) return 'Aún no hay datos de agua producida.'
    const peor = [...u0.sectores].sort((a, c) => c.ianc - a.ianc)
    return `En **${u0.full}** se perdió el **${pct(u0.ianc, 1)}** del agua producida (${num(u0.perdido)} m³)${u0.ianc > IANC_META ? `, por encima de la meta de ${pct(IANC_META)}` : ''}.\n${peor.map((x) => `- ${x.barrio}: ${pct(x.ianc, 1)} (${num(x.perdido)} m³)`).join('\n')}\nRecomendación: buscar fugas primero en ${peor[0].barrio}.`
  }

  if (/comprar|material|inventario|bodega|stock|agot/.test(q) && materiales) {
    const bajos = materiales.filter((m) => estadoStock(m) !== 'OK')
    return bajos.length ? `Hay **${bajos.length} material(es)** por debajo del mínimo:\n${bajos.map((m) => `- ${m.nombre}: quedan ${m.stock} ${m.unidad} (mínimo ${m.minimo})`).join('\n')}` : 'Todos los materiales están por encima del mínimo.'
  }

  // Usuario específico (por código, cédula o nombre). Si el dueño tiene varias casas, se muestran todas.
  const qd = pregunta.replace(/\D/g, '')
  const u = usuarios.find((x) => q.includes(x.id) || (qd.length >= 6 && x.cedula.replace(/\D/g, '') === qd) || (x.nombre.length > 5 && q.includes(norm(x.nombre))))
  if (u) {
    const casas = usuarios.filter((x) => x.cedula && x.cedula === u.cedula)
    const linea = (x: typeof u) => { const r = resumenUsuario(x); return `- **${x.direccion || x.id}** (código ${x.id}, ${x.barrio}, estrato ${x.estrato}) · ${x.estado.toLowerCase()} · último consumo ${r.consumoActual} m³ · ${r.deuda ? `debe ${cop(r.deuda)}${r.vencido ? ' (**vencida**)' : ''}` : 'al día'}` }
    if (casas.length > 1 && !q.includes(u.id)) {
      const total = casas.reduce((s, x) => s + resumenUsuario(x).deuda, 0)
      return `**${u.nombre}** (C.C. ${u.cedula}) tiene **${casas.length} predios**:\n${casas.map(linea).join('\n')}\n\n${total ? `Debe en total **${cop(total)}**. En Pagos y caja se puede cobrar todo en un solo recibo.` : 'Está al día en todos.'}`
    }
    const r = resumenUsuario(u)
    return `**${u.nombre}** (código ${u.id}, ${u.direccion}, ${u.barrio}, estrato ${u.estrato}) · servicio **${u.estado}**.\n- Último consumo: ${r.consumoActual} m³ (promedio ${num(r.consumoPromedio, 1)} m³).\n- Saldo: ${r.deuda ? `${cop(r.deuda)} en ${r.pagosDebe} factura(s)${r.vencido ? ', **vencida**' : ''}` : 'al día'}.${casas.length > 1 ? `\n- Es propietario de ${casas.length} predios: ${casas.filter((x) => x.id !== u.id).map((x) => `${x.direccion || x.id} (${x.id})`).join(', ')}.` : ''}`
  }

  if (/recaud|cobr|pagar|pagos|ingres/.test(q)) {
    const p = mesPedido >= 0 ? serie.find((s) => s.mes === mesPedido + 1) : ult
    if (!p) return `No tengo datos de ${MESES[mesPedido]} en los últimos 12 meses.`
    const hoy = pagos.filter((x) => new Date(x.timestamp).toDateString() === new Date().toDateString())
    return `En **${p.full}** se facturaron **${cop(p.facturado)}** y se han recaudado **${cop(p.recaudado)}** (${pct(p.facturado ? p.recaudado / p.facturado : 0, 1)}). Quedan pendientes ${cop(p.pendiente)}.\nHoy van ${hoy.length} pagos por ${cop(hoy.reduce((s, x) => s + x.monto, 0))}.`
  }

  if (/mora|deb|deud|cartera|vencid|cortar|corte/.test(q) && !/pqr/.test(q)) {
    const lista = usuarios.map((x) => ({ x, r: resumenUsuario(x) })).filter((y) => y.r.vencido && (!barrioPedido || y.x.barrio === barrioPedido)).sort((a, b) => b.r.deuda - a.r.deuda)
    const total = lista.reduce((s, y) => s + y.r.deuda, 0)
    const paraCorte = lista.filter((y) => y.x.estado === 'Activo')
    return `Hay **${lista.length} usuarios en mora**${barrioPedido ? ` en ${barrioPedido}` : ''} por **${cop(total)}**. ${paraCorte.length === 1 ? '1 sigue activo y está' : `${paraCorte.length} siguen activos y están`} para corte.\n${lista.slice(0, 5).map((y) => `- ${y.x.nombre} (${y.x.barrio}): ${cop(y.r.deuda)}${y.x.estado === 'Activo' ? ' · para corte' : ''}`).join('\n')}`
  }

  if (/fuga|atipic|raro|anomal|disparo|alto consumo|consumo alto/.test(q)) {
    const a = consumosAtipicos(usuarios).filter((y) => !barrioPedido || y.usuario.barrio === barrioPedido)
    const fugas = alarmas.filter((x) => x.tipo === 'fuga' && (!barrioPedido || x.usuario.barrio === barrioPedido))
    const txtFugas = fugas.length ? `Los medidores reportan **${fugas.length} fuga(s) continua(s)** ahora mismo (nunca marcan cero en la madrugada):\n${fugas.map((x) => `- ${x.usuario.nombre} (${x.usuario.barrio}): ${x.detalle}`).join('\n')}\n\n` : ''
    if (!a.length) return txtFugas || 'No veo fugas ni consumos atípicos.'
    return `${txtFugas}En el último periodo facturado encontré **${a.length} consumo(s) atípico(s)** (posibles fugas o errores de lectura):\n${a.slice(0, 6).map((y) => `- ${y.usuario.nombre} (${y.usuario.barrio}): ${y.actual} m³ vs promedio ${num(y.promedio, 1)} m³ (+${pct(y.variacion)})`).join('\n')}\nRecomendación: programar una visita técnica a los primeros de la lista.`
  }

  if (/consumo|agua|m3|metros/.test(q)) {
    if (barrioPedido) {
      const b = porBarrio(usuarios).find((x) => x.barrio === barrioPedido)!
      return `En **${b.barrio}** el consumo promedio del último periodo es **${num(b.consumoPromedio, 1)} m³** por usuario (${b.usuarios} usuarios).`
    }
    const p = mesPedido >= 0 ? serie.find((s) => s.mes === mesPedido + 1) : ult
    return p ? `En **${p.full}** el consumo total fue **${num(p.consumo)} m³**, unos ${num(p.consumo / Math.max(1, p.usuariosConsumo), 1)} m³ por usuario.` : 'No tengo ese periodo.'
  }

  if (/pqr|queja|reclamo|peticion/.test(q)) {
    const ab = pqrs.filter((p) => p.estado === 'Radicada' || p.estado === 'En trámite')
    const venc = ab.filter((p) => diasHabilesRestantes(p.vence) < 0)
    return `Hay **${ab.length} PQR abiertas**, de las cuales **${venc.length} están vencidas**.${venc.length ? `\n${venc.map((p) => `- ${p.radicado} · ${p.categoria} · ${p.nombre}`).join('\n')}\nAtiéndelas ya: al vencer el plazo aplica el silencio administrativo positivo.` : ''}`
  }

  if (/lectur|medidor|alarma|comunica/.test(q)) {
    const activos = usuarios.filter((x) => x.estado === 'Activo').length
    const caidos = alarmas.filter((x) => x.tipo === 'sin_comunicacion')
    return `Han llegado **${Object.keys(lecturas).length} de ${activos}** lecturas automáticas del periodo. Hay **${alarmas.length} alarma(s)** en los medidores${caidos.length ? `, y ${caidos.length} sin comunicación: ${caidos.map((x) => x.usuario.nombre).join(', ')}` : ''}.${alarmas.length ? `\n${alarmas.slice(0, 6).map((x) => `- ${ALARMAS[x.tipo].label}: ${x.usuario.nombre} (${x.usuario.medidor})`).join('\n')}` : ''}\nDetalle en el módulo Medidores.`
  }

  if (/resumen|gerencia|informe|general|como vamos|como va/.test(q)) {
    const morosos = usuarios.filter((x) => resumenUsuario(x).vencido)
    const ab = pqrs.filter((p) => p.estado === 'Radicada' || p.estado === 'En trámite')
    const at = consumosAtipicos(usuarios)
    const top = porBarrio(usuarios).sort((a, b) => b.consumoPromedio - a.consumoPromedio)[0]
    return `**Resumen ${ult?.full ?? ''}**\n- Facturado ${cop(ult?.facturado ?? 0)}, recaudado ${cop(ult?.recaudado ?? 0)} (${pct(ult?.facturado ? ult.recaudado / ult.facturado : 0, 1)}).\n- ${morosos.length} usuarios en mora por ${cop(morosos.reduce((s, x) => s + resumenUsuario(x).deuda, 0))}.\n- Consumo total ${num(ult?.consumo ?? 0)} m³; el barrio con mayor promedio es ${top.barrio} (${num(top.consumoPromedio, 1)} m³).\n- ${at.length} posible(s) fuga(s) por revisar.\n- ${ab.length} PQR abiertas, ${ab.filter((p) => diasHabilesRestantes(p.vence) < 0).length} vencidas.`
  }

  return null
}

/** Reglas con mensaje de ayuda cuando ninguna aplica. */
export function responderSinIA(pregunta: string, ctx: Contexto): string {
  return respuestaRapida(pregunta, ctx) ?? `Puedo responder sobre **recaudo**, **cartera y mora**, **consumo por barrio o mes**, **posibles fugas**, **PQR**, **lecturas** o un **usuario por nombre o ID**.\nEjemplos: "¿cuánto se recaudó en agosto?", "¿quiénes deben en Guamalito?", "¿hay posibles fugas?".\n_Para preguntas abiertas activa la IA local en Asistente IA → Configurar._`
}

/** Pide a Ollama un texto (sin historial de chat). */
/** Lee la respuesta de Ollama palabra por palabra (formato NDJSON). */
async function leerStream(r: Response, alEscribir: (parcial: string) => void) {
  if (!r.ok || !r.body) throw new Error(`Ollama respondió ${r.status}`)
  const lector = r.body.getReader()
  const dec = new TextDecoder()
  let buffer = '', texto = ''
  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    buffer += dec.decode(value, { stream: true })
    const lineas = buffer.split('\n')
    buffer = lineas.pop() ?? ''
    for (const l of lineas) {
      if (!l.trim()) continue
      const j = JSON.parse(l)
      if (j.message?.content) { texto += j.message.content; alEscribir(texto) }
    }
  }
  return texto.trim()
}

/**
 * Redacta un texto largo mostrando el avance mientras el modelo escribe.
 * `largo` = tokens máximos (≈ 4 caracteres por token): acotarlo evita esperas innecesarias.
 */
export async function redactarOllamaStream(url: string, modelo: string, sistema: string, pedido: string, alEscribir: (parcial: string) => void, largo = 600, signal?: AbortSignal): Promise<string> {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelo, stream: true, keep_alive: '30m', options: { ...OPCIONES, temperature: 0.4, num_predict: largo }, messages: [{ role: 'system', content: sistema }, { role: 'user', content: pedido }] }),
  })
  return leerStream(r, alEscribir)
}

export async function redactarOllama(url: string, modelo: string, sistema: string, pedido: string, json = false): Promise<string> {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelo, stream: false, keep_alive: '30m', ...(json ? { format: 'json' } : {}), options: { ...OPCIONES, temperature: 0.4, num_predict: json ? 350 : 700 }, messages: [{ role: 'system', content: sistema }, { role: 'user', content: pedido }] }),
  })
  if (!r.ok) throw new Error(`Ollama respondió ${r.status}`)
  const j = await r.json()
  return String(j.message?.content ?? '').trim()
}

/**
 * JSON corto con streaming (piezas de redes): contexto pequeño y pocas palabras = respuesta rápida.
 * `alEscribir` recibe el JSON a medias para ir mostrando cada campo apenas aparece.
 */
export async function redactarJsonStream(url: string, modelo: string, sistema: string, pedido: string, alEscribir: (parcial: string) => void, signal?: AbortSignal): Promise<string> {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelo, stream: true, format: 'json', keep_alive: '30m', options: { temperature: 0.5, num_ctx: 2048, num_predict: 320, top_k: 30 }, messages: [{ role: 'system', content: sistema }, { role: 'user', content: pedido }] }),
  })
  return leerStream(r, alEscribir)
}

/** URL y modelo guardados en la pantalla del Asistente. */
export function configOllama() {
  const leer = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
  return { url: leer('emc_ollama_url', 'http://localhost:11434'), modelo: leer('emc_ollama_modelo', '') }
}

/* ------------------------------------------------------------------ */
/* Navegación por voz/texto: "llévame a pagos", "abre PQR"             */
/* ------------------------------------------------------------------ */

const DESTINOS: [RegExp, string, string][] = [
  [/mi dia|inicio/, '/mi-dia', 'Mi día'],
  [/dashboard|tablero/, '/dashboard', 'Dashboard'],
  [/analitica|grafic/, '/analitica', 'Analítica'],
  [/reporte sui|sui|superservicios/, '/sui', 'Reportes SUI'],
  [/reporte|informe/, '/reporte', 'Reportes'],
  [/usuario|suscriptor/, '/usuarios', 'Usuarios'],
  [/medidor|lectura/, '/lecturas', 'Medidores'],
  [/factura/, '/facturacion', 'Facturación'],
  [/caja|pago|cobr/, '/pagos', 'Pagos y caja'],
  [/pqr|queja|reclamo/, '/pqr', 'PQR'],
  [/perdida|no contabiliz/, '/perdidas', 'Pérdidas de agua'],
  [/inventario|material|bodega/, '/inventario', 'Inventario'],
  [/documento|certificado|carta|oficio|memorando/, '/documentos', 'Documentos'],
  [/redes|publicacion|post|imagen/, '/redes', 'Redes sociales'],
  [/whatsapp|aviso/, '/avisos', 'Avisos WhatsApp'],
  [/tarifa/, '/tarifas', 'Tarifas'],
  [/nomina|empleado|sueldo/, '/nomina', 'Nómina'],
]

/** Si la frase pide ir a un módulo, devuelve a cuál. */
export function destinoNavegacion(pregunta: string): { ruta: string; nombre: string } | null {
  const q = norm(pregunta)
  if (!/^(ir a|ve a|vamos a|llevame|llévame|abre|abrir|muestrame|mostrar|entra a|entrar a)\b/.test(q)) return null
  const d = DESTINOS.find(([re]) => re.test(q))
  return d ? { ruta: d[1], nombre: d[2] } : null
}

/** Preguntas sugeridas según la pantalla en la que está el gerente. */
export function sugerenciasPara(ruta: string): string[] {
  const m: Record<string, string[]> = {
    '/mi-dia': ['¿Qué es lo más urgente hoy?', 'Dame un resumen para la gerencia'],
    '/dashboard': ['Dame un resumen para la gerencia', '¿Cuánto se recaudó el último mes?'],
    '/analitica': ['¿Qué barrio consume más agua?', '¿Cuánto se recaudó el último mes?'],
    '/usuarios': ['¿Quiénes deben más?', '¿Hay posibles fugas?'],
    '/lecturas': ['¿Qué medidores tienen alarma?', '¿Hay posibles fugas?'],
    '/facturacion': ['¿Cuánto se facturó el último mes?', '¿Quiénes deben más?'],
    '/pagos': ['¿Cuánto se recaudó el último mes?', '¿Quiénes deben más?'],
    '/pqr': ['¿Cómo van las PQR?', '¿Qué es lo más urgente hoy?'],
    '/perdidas': ['¿Qué barrio pierde más agua?', '¿Hay posibles fugas?'],
    '/inventario': ['¿Qué materiales hay que comprar?'],
    '/nomina': ['¿Qué es lo más urgente hoy?'],
  }
  return ['¿Qué me recomiendas?', ...(m[ruta] ?? ['¿Qué es lo más urgente hoy?', 'Dame un resumen para la gerencia']).slice(0, 2)]
}
