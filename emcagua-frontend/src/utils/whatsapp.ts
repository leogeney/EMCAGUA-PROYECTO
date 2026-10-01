import type { Resumen } from '../data/billing'
import { COSTO_RECONEXION, TARIFA, UMBRAL_ALTO } from '../data/constants'
import type { Usuario } from '../data/types'
import { cop, fechaCorta } from './format'
import { getNextCutoff } from './cutoff'

export function whatsappUrl(u: Usuario, r: Resumen) {
  const tel = u.telefono.replace(/\D/g, '')
  const full = tel.startsWith('57') ? tel : `57${tel}`
  const alto = r.consumoActual > UMBRAL_ALTO
    ? `\n⚠️ Notamos un consumo más alto de lo normal (${r.consumoActual} m³, tope ${UMBRAL_ALTO} m³). ¿Hay alguna fuga o problema que quieras reportarnos?`
    : ''
  const venc = r.pendientes[0] ? fechaCorta(r.pendientes[0].vencimiento) : ''
  let cuerpo: string
  if (u.estado === 'Cortado') {
    cuerpo = `Tu servicio ${u.medidor} está suspendido por ${r.pagosDebe} factura(s) pendiente(s) por ${cop(r.deuda)}${venc ? ` (vencida ${venc})` : ''}.\nPara reactivarlo paga la deuda más la reconexión (${cop(COSTO_RECONEXION)}). 💧`
  } else if (r.vencido) {
    cuerpo = `Tienes ${r.pagosDebe} factura(s) vencida(s) por ${cop(r.deuda)}${venc ? ` (venció ${venc})` : ''}.\nPor favor ponte al día para evitar la suspensión del servicio.`
  } else if (r.pagosDebe > 0) {
    cuerpo = `Tu factura por ${cop(r.deuda)} vence el ${venc}. Puedes pagarla en nuestras oficinas.`
  } else {
    cuerpo = `¡Estás al día con tus pagos! ✅\nTu último consumo: ${r.consumoActual} m³ · ${cop(r.consumoActual * TARIFA[u.estrato])}.\nPróxima fecha de pago: ${fechaCorta(getNextCutoff())}.`
  }
  const msg = `Hola ${u.nombre}, te escribe EMCAGUA APC.\n${cuerpo}${alto}\nEl Carmen, Norte de Santander.`
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`
}
