/**
 * Medidores inteligentes (telemetría). Los medidores envían su lectura acumulada
 * y un perfil horario de caudal; el sistema solo valida y detecta alarmas.
 * En el backend esto llegará por la pasarela (LoRaWAN / NB-IoT) del proveedor de medidores.
 */
import { lecturaMedidor, resumenUsuario } from './billing'
import { revisarLectura } from './lecturas'
import type { Lectura, Usuario } from './types'

export type Telemetria = {
  ultimaComunicacion: number
  senal: number // % de calidad del enlace
  /** Litros por hora de las últimas 24 h (índice = hora del día). */
  perfil24h: number[]
  /** Eventos reportados por el propio equipo. */
  eventos: ('manipulacion' | 'flujo_inverso')[]
}

export type TipoAlarma = 'fuga' | 'sin_comunicacion' | 'manipulacion' | 'atipico' | 'flujo_inverso' | 'sin_consumo'

export const ALARMAS: Record<TipoAlarma, { label: string; ayuda: string; grave: boolean }> = {
  fuga: { label: 'Fuga continua', ayuda: 'El medidor nunca marca cero en la madrugada (1 a 5 a. m.). Casi siempre es una fuga interna: tanque, sanitario o tubería.', grave: true },
  sin_comunicacion: { label: 'Sin comunicación', ayuda: 'No reporta hace más de 24 h. Si no vuelve antes del cierre, un técnico toma la lectura en sitio o se factura por promedio.', grave: true },
  manipulacion: { label: 'Posible manipulación', ayuda: 'El equipo detectó apertura de la tapa o un imán cerca del medidor. Requiere visita.', grave: true },
  atipico: { label: 'Consumo atípico', ayuda: 'El consumo del periodo está muy por encima de su promedio.', grave: false },
  flujo_inverso: { label: 'Flujo inverso', ayuda: 'El agua regresó hacia la red. Puede ser una instalación mal hecha o el medidor al revés.', grave: false },
  sin_consumo: { label: 'Sin consumo', ayuda: 'Cero consumo en el periodo: predio desocupado o medidor detenido.', grave: false },
}

export const HORAS_SIN_COMUNICACION = 24
const H = 3_600_000

function semilla(id: string) {
  let h = 7
  for (const ch of id) h = (h * 131 + ch.charCodeAt(0)) % 100_003
  return h
}

/** Perfil horario típico de un hogar: picos en la mañana y la noche, cero de madrugada. */
function perfil(promedioM3: number, fugaLh: number, s: number) {
  const forma = [0, 0, 0, 0, 0, 2, 9, 12, 8, 5, 4, 5, 7, 5, 3, 3, 4, 6, 9, 10, 7, 4, 2, 1]
  const total = forma.reduce((a, b) => a + b, 0)
  const litrosDia = (promedioM3 * 1000) / 30
  return forma.map((f, i) => Math.round((litrosDia * f) / total * (0.85 + ((s >> i) % 7) / 20) + fugaLh))
}

/** Estado de los medidores de demostración: la mayoría bien, algunos con alarmas. */
export function generarTelemetria(usuarios: Usuario[], ahora = Date.now()): Record<string, Telemetria> {
  const activos = usuarios.filter((u) => u.estado === 'Activo')
  const out: Record<string, Telemetria> = {}
  activos.forEach((u, i) => {
    const s = semilla(u.id)
    const prom = Math.max(6, resumenUsuario(u).consumoPromedio)
    const fuga = i === 4 || i === 17 ? 18 + (s % 15) : 0
    const caido = i === 9 || i === 23 || i === 38
    out[u.id] = {
      ultimaComunicacion: caido ? ahora - (52 + (s % 90)) * H : ahora - ((s % 55) + 2) * 60_000,
      senal: caido ? 0 : 45 + (s % 55),
      perfil24h: caido ? [] : perfil(prom, fuga, s),
      eventos: i === 30 ? ['manipulacion'] : i === 21 ? ['flujo_inverso'] : [],
    }
  })
  return out
}

export const enLinea = (t: Telemetria | undefined, ahora = Date.now()) => !!t && ahora - t.ultimaComunicacion < HORAS_SIN_COMUNICACION * H

/** Lectura que reporta un medidor en línea para el periodo abierto. */
export function lecturaRemota(u: Usuario, t: Telemetria, ahora = Date.now()): Lectura {
  const prom = Math.max(6, resumenUsuario(u).consumoPromedio)
  const fugaM3 = Math.round(((t.perfil24h[3] ?? 0) * 24 * 30) / 1000)
  const consumo = Math.max(0, Math.round(prom + ((semilla(u.id) % 7) - 3) + fugaM3))
  return { valor: lecturaMedidor(u) + consumo, ts: Math.min(ahora, t.ultimaComunicacion), lector: 'Telemetría', origen: 'telemetria' }
}

/** Lecturas automáticas de todos los medidores en línea. */
export function lecturasRemotas(usuarios: Usuario[], medidores: Record<string, Telemetria>, ahora = Date.now()) {
  const out: Record<string, Lectura> = {}
  for (const u of usuarios) {
    const t = medidores[u.id]
    if (u.estado === 'Activo' && enLinea(t, ahora)) out[u.id] = lecturaRemota(u, t, ahora)
  }
  return out
}

export type AlarmaMedidor = { usuario: Usuario; tipo: TipoAlarma; detalle: string }

export function alarmasDe(u: Usuario, t: Telemetria | undefined, l: Lectura | undefined, ahora = Date.now()): AlarmaMedidor[] {
  const out: AlarmaMedidor[] = []
  if (!t) return out
  const horas = Math.round((ahora - t.ultimaComunicacion) / H)
  if (!enLinea(t, ahora)) out.push({ usuario: u, tipo: 'sin_comunicacion', detalle: `Último reporte hace ${horas >= 48 ? `${Math.round(horas / 24)} días` : `${horas} h`}` })
  const madrugada = t.perfil24h.slice(1, 6)
  if (madrugada.length && Math.min(...madrugada) >= 8) out.push({ usuario: u, tipo: 'fuga', detalle: `Caudal mínimo nocturno de ${Math.min(...madrugada)} L/h ≈ ${Math.round((Math.min(...madrugada) * 24 * 30) / 1000)} m³ al mes perdidos` })
  if (t.eventos.includes('manipulacion')) out.push({ usuario: u, tipo: 'manipulacion', detalle: 'Apertura de tapa detectada' })
  if (t.eventos.includes('flujo_inverso')) out.push({ usuario: u, tipo: 'flujo_inverso', detalle: 'Retorno de agua registrado' })
  if (l) {
    const r = revisarLectura(u, l.valor)
    if (r.nivel === 'aviso' && r.consumo === 0) out.push({ usuario: u, tipo: 'sin_consumo', detalle: r.mensaje })
    else if (r.nivel === 'aviso' && !out.some((a) => a.tipo === 'fuga')) out.push({ usuario: u, tipo: 'atipico', detalle: r.mensaje })
  }
  return out
}

const ORDEN: TipoAlarma[] = ['fuga', 'manipulacion', 'sin_comunicacion', 'atipico', 'flujo_inverso', 'sin_consumo']

export function todasLasAlarmas(usuarios: Usuario[], medidores: Record<string, Telemetria>, lecturas: Record<string, Lectura>, ahora = Date.now()) {
  return usuarios
    .filter((u) => u.estado === 'Activo')
    .flatMap((u) => alarmasDe(u, medidores[u.id], lecturas[u.id], ahora))
    .sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo))
}
