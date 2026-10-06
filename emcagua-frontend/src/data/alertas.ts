/* eslint-disable react-refresh/only-export-components */
/** Avisos del día: los usan la campanita (en todas las pantallas) y Mi día. */
import { useMemo } from 'react'
import { useData } from './DataContext'
import { usePqr } from './PqrContext'
import { useOperacion } from './OperacionContext'
import { useNomina, claveNomina } from './NominaContext'
import { ALARMAS } from './telemetria'
import { diasHabilesRestantes } from './pqr'
import { estadoStock, iso } from './operacion'
import { balanceHidrico, IANC_META } from './perdidas'
import { nombrePeriodo } from './billing'
import { cop, pct } from '../utils/format'
import { puede } from '../utils/session'

export type Alerta = { id: string; nivel: 'alta' | 'media' | 'info'; titulo: string; detalle: string; to: string; accion: string; icono: string }

export const I = {
  pqr: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  medidor: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  caja: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  plata: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  gota: 'M12 21a7 7 0 007-7c0-4-7-11-7-11S5 10 5 14a7 7 0 007 7z',
  cal: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  ok: 'M5 13l4 4L19 7',
}

export function useAlertas(): Alerta[] {
  const { usuarios, pagos, resumen, alarmas, lecturas, periodoLectura, cierrePeriodo } = useData()
  const { pqrs } = usePqr()
  const { materiales, cierres } = useOperacion()
  const { periodos } = useNomina()

  return useMemo(() => {
    const hoy = new Date()
    const abiertas = pqrs.filter((p) => p.estado === 'Radicada' || p.estado === 'En trámite')
    const vencidas = abiertas.filter((p) => diasHabilesRestantes(p.vence) < 0)
    const porVencer = abiertas.filter((p) => { const d = diasHabilesRestantes(p.vence); return d >= 0 && d <= 2 })
    const graves = alarmas.filter((a) => ALARMAS[a.tipo].grave)
    const bajos = materiales.filter((m) => estadoStock(m) !== 'OK')
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1)
    const ayerIso = iso(ayer)
    const cajaAyerAbierta = pagos.some((p) => iso(new Date(p.timestamp)) === ayerIso) && !cierres.some((c) => c.fecha === ayerIso)
    const morosos = usuarios.filter((u) => u.estado === 'Activo' && resumen(u).vencido)
    const faltan = usuarios.filter((u) => u.estado === 'Activo').length - Object.keys(lecturas).length
    const nominaMes = periodos[claveNomina(hoy.getFullYear(), hoy.getMonth() + 1)]
    const diasCierre = Math.ceil((cierrePeriodo.getTime() - hoy.getTime()) / 86_400_000)
    const b = balanceHidrico(usuarios, 2)
    const ianc = b[b.length - 1]?.ianc ?? 0
    const periodo = nombrePeriodo(periodoLectura.mes, periodoLectura.anio)

    const out: Alerta[] = []
    if (vencidas.length) out.push({ id: `pqr-venc-${vencidas.map((p) => p.radicado).join()}`, nivel: 'alta', titulo: `${vencidas.length} PQR vencida(s)`, detalle: 'Pasaron los 15 días hábiles: aplica silencio administrativo positivo. Respóndelas hoy.', to: '/pqr', accion: 'Responder', icono: I.pqr })
    if (graves.length) out.push({ id: `alarmas-${graves.length}`, nivel: 'alta', titulo: `${graves.length} alarma(s) grave(s) en medidores`, detalle: graves.slice(0, 3).map((a) => `${ALARMAS[a.tipo].label}: ${a.usuario.nombre}`).join(' · '), to: '/lecturas', accion: 'Ver medidores', icono: I.medidor })
    if (porVencer.length) out.push({ id: `pqr-pv-${porVencer.map((p) => p.radicado).join()}`, nivel: 'media', titulo: `${porVencer.length} PQR vencen en 2 días hábiles o menos`, detalle: porVencer.map((p) => p.radicado).join(', '), to: '/pqr', accion: 'Revisar', icono: I.pqr })
    if (cajaAyerAbierta) out.push({ id: `caja-${ayerIso}`, nivel: 'media', titulo: 'La caja de ayer no se cerró', detalle: 'Haz el arqueo para dejar cuadrado el efectivo.', to: '/pagos?tab=caja', accion: 'Cerrar caja', icono: I.caja })
    if (bajos.length) out.push({ id: `stock-${bajos.map((m) => m.id).join()}`, nivel: 'media', titulo: `${bajos.length} material(es) por debajo del mínimo`, detalle: bajos.map((m) => m.nombre).join(', '), to: '/inventario', accion: 'Ver inventario', icono: I.box })
    if (hoy.getDate() >= 24 && (!nominaMes || nominaMes.estado === 'Borrador')) out.push({ id: `nomina-${hoy.getMonth()}`, nivel: 'media', titulo: 'Nómina del mes sin aprobar', detalle: 'Revisa novedades y apruébala antes del pago.', to: '/nomina', accion: 'Ir a nómina', icono: I.plata })
    if (diasCierre >= 0 && diasCierre <= 3) out.push({ id: `cierre-${periodo}`, nivel: 'media', titulo: `${periodo} se factura ${diasCierre === 0 ? 'hoy' : `en ${diasCierre} día(s)`}`, detalle: `Faltan ${Math.max(0, faltan)} lectura(s). Las que no lleguen se facturan por promedio.`, to: '/lecturas', accion: 'Revisar lecturas', icono: I.medidor })
    if (morosos.length) out.push({ id: `mora-${morosos.length}`, nivel: 'info', titulo: `${morosos.length} usuario(s) en mora con servicio activo`, detalle: `Deben ${cop(morosos.reduce((s, u) => s + resumen(u).deuda, 0))}. Envíales un aviso por WhatsApp antes de suspender el servicio.`, to: '/avisos', accion: 'Avisar', icono: I.plata })
    if (ianc > IANC_META) out.push({ id: `ianc-${Math.round(ianc * 100)}`, nivel: 'info', titulo: `Agua no contabilizada en ${pct(ianc, 0)}`, detalle: `Por encima de la meta de ${pct(IANC_META)}. Revisa qué sector pierde más.`, to: '/perdidas', accion: 'Ver pérdidas', icono: I.gota })
    if (faltan > 0 && diasCierre > 3) out.push({ id: `lect-${faltan}`, nivel: 'info', titulo: `Faltan ${faltan} lectura(s) de ${periodo}`, detalle: 'Medidores sin comunicación: tómalas en sitio o se facturan por promedio.', to: '/lecturas', accion: 'Ver', icono: I.medidor })
    // Cada funcionario solo ve avisos de los módulos que su rol permite
    return out.filter((a) => puede(a.to.slice(1).split('?')[0]))
  }, [usuarios, pagos, resumen, alarmas, lecturas, periodoLectura, cierrePeriodo, pqrs, materiales, cierres, periodos])
}
