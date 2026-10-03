import { UMBRAL_ALTO } from './constants'
import { lecturaMedidor, resumenUsuario } from './billing'
import type { Usuario } from './types'
import { num } from '../utils/format'

/** Revisión de una lectura antes de guardarla (detección de anomalías). */
export function revisarLectura(u: Usuario, valor: number) {
  const anterior = lecturaMedidor(u)
  const consumo = valor - anterior
  const promedio = resumenUsuario(u).consumoPromedio
  if (!valor) return { consumo: 0, nivel: 'vacio' as const, mensaje: '' }
  if (consumo < 0) return { consumo, nivel: 'error' as const, mensaje: `La lectura no puede ser menor que la anterior (${num(anterior)} m³). Revisa el número o reporta el medidor.` }
  if (consumo === 0) return { consumo, nivel: 'aviso' as const, mensaje: 'Sin consumo este mes. ¿Predio desocupado o medidor detenido?' }
  if (promedio > 0 && consumo > Math.max(promedio * 2, promedio + 15)) return { consumo, nivel: 'aviso' as const, mensaje: `Consumo atípico: ${consumo} m³ frente a un promedio de ${num(promedio, 1)} m³. Posible fuga o error de lectura.` }
  if (consumo > UMBRAL_ALTO) return { consumo, nivel: 'info' as const, mensaje: `Consumo alto (> ${UMBRAL_ALTO} m³), dentro de lo habitual para este usuario.` }
  return { consumo, nivel: 'ok' as const, mensaje: '' }
}
