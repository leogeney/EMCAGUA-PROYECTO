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
import { cop, num, pct } from '../utils/format'

export type Mensaje = { rol: 'usuario' | 'asistente'; texto: string; fuente?: 'ollama' | 'reglas' }

export type Contexto = { usuarios: Usuario[]; pagos: Pago[]; pqrs: Pqr[]; lecturas: Record<string, Lectura>; alarmas: AlarmaMedidor[] }

/** Resumen compacto (texto) que se le entrega al modelo como contexto. */
export function resumenParaModelo({ usuarios, pagos, pqrs, lecturas, alarmas }: Contexto) {
  const serie = serieMensual(usuarios, 12)
  const morosos = usuarios.map((u) => ({ u, r: resumenUsuario(u) })).filter((x) => x.r.vencido).sort((a, b) => b.r.deuda - a.r.deuda)
  const atipicos = consumosAtipicos(usuarios)
  const cartera = edadCartera(usuarios)
  const abiertas = pqrs.filter((p) => p.estado === 'Radicada' || p.estado === 'En trámite')
  const hoy = new Date()
  return [
    `FECHA: ${hoy.toLocaleDateString('es-CO')}. EMPRESA: EMCAGUA APC, acueducto y alcantarillado de El Carmen y Guamalito (Norte de Santander).`,
    `SUSCRIPTORES: ${usuarios.length} (${usuarios.filter((u) => u.estado === 'Activo').length} activos, ${usuarios.filter((u) => u.estado === 'Cortado').length} cortados). Barrios: ${BARRIOS.join(', ')}.`,
    `SERIE MENSUAL (periodo: consumo m³ | facturado | recaudado | pendiente):`,
    ...serie.map((p) => `- ${p.full}: ${num(p.consumo)} m³ | ${cop(p.facturado)} | ${cop(p.recaudado)} | ${cop(p.pendiente)}`),
    `POR BARRIO (consumo promedio último periodo, usuarios, en mora, cartera):`,
    ...porBarrio(usuarios).map((b) => `- ${b.barrio}: ${num(b.consumoPromedio, 1)} m³, ${b.usuarios} usuarios, ${b.morosos} en mora, ${cop(b.cartera)}`),
    `CARTERA POR EDAD: ${cartera.map((t) => `${t.label} ${cop(t.monto)} (${t.facturas} fact.)`).join('; ')}.`,
    `USUARIOS EN MORA (top 10): ${morosos.slice(0, 10).map((x) => `${x.u.nombre} [${x.u.id}, ${x.u.barrio}, ${x.u.estado}] debe ${cop(x.r.deuda)}`).join('; ') || 'ninguno'}.`,
    `CONSUMOS ATÍPICOS (posibles fugas): ${atipicos.slice(0, 8).map((a) => `${a.usuario.nombre} ${a.actual} m³ vs prom ${num(a.promedio, 1)}`).join('; ') || 'ninguno'}. Umbral de consumo alto: ${UMBRAL_ALTO} m³.`,
    `PAGOS: ${pagos.length} registrados; últimos 7 días ${cop(pagos.filter((p) => hoy.getTime() - p.timestamp < 7 * 864e5).reduce((s, p) => s + p.monto, 0))}.`,
    `PQR: ${pqrs.length} en total, ${abiertas.length} abiertas, ${abiertas.filter((p) => diasHabilesRestantes(p.vence) < 0).length} vencidas. Por categoría: ${Object.entries(pqrs.reduce<Record<string, number>>((a, p) => ((a[p.categoria] = (a[p.categoria] ?? 0) + 1), a), {})).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
    `MEDIDORES INTELIGENTES (lectura automática por telemetría): ${Object.keys(lecturas).length} lecturas recibidas de ${usuarios.filter((u) => u.estado === 'Activo').length} medidores activos.`,
    `ALARMAS DE MEDIDORES: ${alarmas.map((a) => `${ALARMAS[a.tipo].label} - ${a.usuario.nombre} (${a.usuario.barrio}, ${a.usuario.medidor}): ${a.detalle}`).join('; ') || 'ninguna'}.`,
  ].join('\n')
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

export async function preguntarOllama(url: string, modelo: string, historial: Mensaje[], contexto: string): Promise<string> {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      stream: false,
      options: { temperature: 0.2 },
      messages: [
        { role: 'system', content: `${INSTRUCCIONES}\n\nCONTEXTO DE DATOS:\n${contexto}` },
        ...historial.slice(-8).map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
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

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function responderSinIA(pregunta: string, { usuarios, pagos, pqrs, lecturas, alarmas }: Contexto): string {
  const q = norm(pregunta)
  const serie = serieMensual(usuarios, 12)
  const ult = serie[serie.length - 1]
  const mesPedido = MESES.findIndex((m) => q.includes(norm(m)))
  const barrioPedido = BARRIOS.find((b) => q.includes(norm(b)))

  // Usuario específico
  const u = usuarios.find((x) => q.includes(x.id) || (x.nombre.length > 5 && q.includes(norm(x.nombre))))
  if (u) {
    const r = resumenUsuario(u)
    return `**${u.nombre}** (ID ${u.id}, ${u.barrio}, estrato ${u.estrato}) · servicio **${u.estado}**.\n- Último consumo: ${r.consumoActual} m³ (promedio ${num(r.consumoPromedio, 1)} m³).\n- Saldo: ${r.deuda ? `${cop(r.deuda)} en ${r.pagosDebe} factura(s)${r.vencido ? ', **vencida**' : ''}` : 'al día'}.`
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

  return `Puedo responder sobre **recaudo**, **cartera y mora**, **consumo por barrio o mes**, **posibles fugas**, **PQR**, **lecturas** o un **usuario por nombre o ID**.\nEjemplos: "¿cuánto se recaudó en agosto?", "¿quiénes deben en Guamalito?", "¿hay posibles fugas?".\n_Para preguntas abiertas conecta Ollama (panel de la derecha)._`
}

/** Pide a Ollama un texto (sin historial de chat). */
export async function redactarOllama(url: string, modelo: string, sistema: string, pedido: string, json = false): Promise<string> {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelo, stream: false, ...(json ? { format: 'json' } : {}), options: { temperature: 0.4 }, messages: [{ role: 'system', content: sistema }, { role: 'user', content: pedido }] }),
  })
  if (!r.ok) throw new Error(`Ollama respondió ${r.status}`)
  const j = await r.json()
  return String(j.message?.content ?? '').trim()
}

/** URL y modelo guardados en la pantalla del Asistente. */
export function configOllama() {
  const leer = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
  return { url: leer('emc_ollama_url', 'http://localhost:11434'), modelo: leer('emc_ollama_modelo', '') }
}
