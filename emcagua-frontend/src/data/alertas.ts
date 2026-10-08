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
import { generacionPeriodo, nombrePeriodo } from './billing'
import { useConfig } from './config'
import { useSolicitudes } from './solicitudes'
import { horasDesdeUltima, useRespaldos } from './respaldos'
import { cop, pct } from '../utils/format'
import { puede } from '../utils/session'

export type Alerta = { id: string; nivel: 'alta' | 'media' | 'info'; titulo: string; detalle: string; to: string; accion: string; icono: string; /** Cuándo pasó (eventos: PQR nueva, pago en línea…) */ ts?: number }

export const I = {
  pqr: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  medidor: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  caja: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  plata: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  gota: 'M12 21a7 7 0 007-7c0-4-7-11-7-11S5 10 5 14a7 7 0 007 7z',
  cal: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  ok: 'M5 13l4 4L19 7',
  persona: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  factura: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
}

export function useAlertas(): Alerta[] {
  const { usuarios, pagos, facturas, resumen, alarmas, lecturas, periodoLectura, cierrePeriodo } = useData()
  const { pqrs } = usePqr()
  const { materiales, cierres } = useOperacion()
  const { periodos } = useNomina()
  const conf = useConfig()
  const solicitudes = useSolicitudes()
  const respaldos = useRespaldos()

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
    const sinMed = conf.modoSinMedidores
    const ahora = hoy.getTime()
    const DIA = 86_400_000

    const out: Alerta[] = []
    if (vencidas.length) out.push({ id: `pqr-venc-${vencidas.map((p) => p.radicado).join()}`, nivel: 'alta', titulo: `${vencidas.length} PQR vencida(s)`, detalle: 'Pasaron los 15 días hábiles: aplica silencio administrativo positivo. Respóndelas hoy.', to: '/pqr', accion: 'Responder', icono: I.pqr })
    if (graves.length) out.push({ id: `alarmas-${graves.length}`, nivel: 'alta', titulo: `${graves.length} alarma(s) grave(s) en medidores`, detalle: graves.slice(0, 3).map((a) => `${ALARMAS[a.tipo].label}: ${a.usuario.nombre}`).join(' · '), to: '/lecturas', accion: 'Ver medidores', icono: I.medidor })
    if (porVencer.length) out.push({ id: `pqr-pv-${porVencer.map((p) => p.radicado).join()}`, nivel: 'media', titulo: `${porVencer.length} PQR vencen en 2 días hábiles o menos`, detalle: porVencer.map((p) => p.radicado).join(', '), to: '/pqr', accion: 'Revisar', icono: I.pqr })
    if (cajaAyerAbierta) out.push({ id: `caja-${ayerIso}`, nivel: 'media', titulo: 'La caja de ayer no se cerró', detalle: 'Haz el arqueo para dejar cuadrado el efectivo.', to: '/pagos?tab=caja', accion: 'Cerrar caja', icono: I.caja })
    if (bajos.length) out.push({ id: `stock-${bajos.map((m) => m.id).join()}`, nivel: 'media', titulo: `${bajos.length} material(es) por debajo del mínimo`, detalle: bajos.map((m) => m.nombre).join(', '), to: '/inventario', accion: 'Ver inventario', icono: I.box })
    if (hoy.getDate() >= 24 && (!nominaMes || nominaMes.estado === 'Borrador')) out.push({ id: `nomina-${hoy.getMonth()}`, nivel: 'media', titulo: 'Nómina del mes sin aprobar', detalle: 'Revisa novedades y apruébala antes del pago.', to: '/nomina', accion: 'Ir a nómina', icono: I.plata })
    if (diasCierre >= 0 && diasCierre <= 3 && sinMed) out.push({ id: `cierre-${periodo}`, nivel: 'media', titulo: `${periodo} se factura ${diasCierre === 0 ? 'hoy' : `en ${diasCierre} día(s)`}`, detalle: `Modo sin medidores: se generan ${usuarios.filter((u) => u.estado !== 'Cortado').length} factura(s) de valor fijo.`, to: '/facturacion', accion: 'Ver facturación', icono: I.factura })
    if (diasCierre >= 0 && diasCierre <= 3 && !sinMed) out.push({ id: `cierre-${periodo}`, nivel: 'media', titulo: `${periodo} se factura ${diasCierre === 0 ? 'hoy' : `en ${diasCierre} día(s)`}`, detalle: `Faltan ${Math.max(0, faltan)} lectura(s). Las que no lleguen se facturan por promedio.`, to: '/lecturas', accion: 'Revisar lecturas', icono: I.medidor })
    if (morosos.length) out.push({ id: `mora-${morosos.length}`, nivel: 'info', titulo: `${morosos.length} usuario(s) en mora con servicio activo`, detalle: `Deben ${cop(morosos.reduce((s, u) => s + resumen(u).deuda, 0))}. Envíales un aviso por WhatsApp antes de suspender el servicio.`, to: '/avisos', accion: 'Avisar', icono: I.plata })
    if (ianc > IANC_META) out.push({ id: `ianc-${Math.round(ianc * 100)}`, nivel: 'info', titulo: `Agua no contabilizada en ${pct(ianc, 0)}`, detalle: `Por encima de la meta de ${pct(IANC_META)}. Revisa qué sector pierde más.`, to: '/perdidas', accion: 'Ver pérdidas', icono: I.gota })
    if (!sinMed && faltan > 0 && diasCierre > 3) out.push({ id: `lect-${faltan}`, nivel: 'info', titulo: `Faltan ${faltan} lectura(s) de ${periodo}`, detalle: 'Medidores sin comunicación: tómalas en sitio o se facturan por promedio.', to: '/lecturas', accion: 'Ver', icono: I.medidor })

    /* ----- Eventos (cada uno es una notificación propia) ----- */
    // PQR nuevas sin atender (radicadas y aún sin pasar a trámite)
    for (const p of pqrs.filter((x) => x.estado === 'Radicada' && diasHabilesRestantes(x.vence) >= 0).sort((a, b) => b.radicadaEn - a.radicadaEn).slice(0, 15)) {
      out.push({ id: `pqr-nueva-${p.radicado}`, nivel: p.tipo === 'Reclamo' || p.tipo === 'Queja' ? 'media' : 'info', titulo: `${p.tipo === "Reclamo" ? "Nuevo" : "Nueva"} ${p.tipo.toLowerCase()} · ${p.radicado}`, detalle: `${p.nombre} (${p.canal}) · ${p.categoria}: ${p.descripcion}`, to: '/pqr', accion: 'Atender', icono: I.pqr, ts: p.radicadaEn })
    }
    // PQR respondidas en los últimos 3 días
    for (const p of pqrs.filter((x) => x.respondidaEn && ahora - x.respondidaEn < 3 * DIA).slice(0, 10)) {
      out.push({ id: `pqr-resp-${p.radicado}`, nivel: 'info', titulo: `PQR ${p.radicado} respondida`, detalle: `${p.nombre}${p.responsable ? ` · por ${p.responsable}` : ''}`, to: '/pqr', accion: 'Ver', icono: I.ok, ts: p.respondidaEn })
    }
    // Pagos hechos por los usuarios desde la oficina virtual (últimos 3 días)
    for (const pg of pagos.filter((x) => x.metodo === 'En línea' && ahora - x.timestamp < 3 * DIA && x.comprobante !== 'SIMULADO').sort((a, b) => b.timestamp - a.timestamp).slice(0, 15)) {
      out.push({ id: `pago-${pg.id}`, nivel: 'info', titulo: `Pago en línea · ${cop(pg.monto)}`, detalle: `${pg.cliente} (predio ${pg.clienteId}) · ${pg.concepto}`, to: '/pagos', accion: 'Ver pagos', icono: I.plata, ts: pg.timestamp })
    }
    // Recaudo de hoy en caja
    const deHoy = pagos.filter((x) => new Date(x.timestamp).toDateString() === hoy.toDateString())
    if (deHoy.length) out.push({ id: `recaudo-${iso(hoy)}-${deHoy.length}`, nivel: 'info', titulo: `Hoy: ${deHoy.length} pago(s) por ${cop(deHoy.reduce((s, x) => s + x.monto, 0))}`, detalle: 'Recaudo del día en caja y en línea.', to: '/pagos', accion: 'Ver caja', icono: I.caja, ts: Math.max(...deHoy.map((x) => x.timestamp)) })
    // Facturas generadas en el último cierre (si fue hace 5 días o menos)
    const ultimaFact = facturas.reduce<{ mes: number; anio: number } | null>((m, f) => (!m || f.anio * 12 + f.mes > m.anio * 12 + m.mes ? { mes: f.mes, anio: f.anio } : m), null)
    if (ultimaFact) {
      const gen = generacionPeriodo(ultimaFact.mes, ultimaFact.anio).getTime()
      if (ahora - gen >= 0 && ahora - gen < 5 * DIA) {
        const del = facturas.filter((f) => f.mes === ultimaFact.mes && f.anio === ultimaFact.anio)
        out.push({ id: `fact-${ultimaFact.anio}-${ultimaFact.mes}`, nivel: 'info', titulo: `Se generaron ${del.length} facturas de ${nombrePeriodo(ultimaFact.mes, ultimaFact.anio)}`, detalle: `Total ${cop(del.reduce((s, f) => s + f.monto, 0))}${del.some((f) => f.fija) ? ` · ${del.filter((f) => f.fija).length} con cobro fijo` : ''}. Ya puedes avisar a los usuarios.`, to: '/facturacion', accion: 'Ver facturas', icono: I.factura, ts: gen })
      }
    }

    // Personas nuevas que se registraron en la oficina virtual
    for (const x of solicitudes.filter((y) => y.estado === 'Pendiente').slice(0, 15)) {
      out.push({ id: `sol-${x.radicado}`, nivel: 'media', titulo: `Solicitud de registro · ${x.nombre}`, detalle: `${x.direccion} · ${x.barrio ? `${x.barrio}, ` : ''}${x.sector} · estrato ${x.estrato}${x.conMedidor ? ' · con medidor' : ''}. Revísala y apruébala para crear el predio.`, to: '/usuarios?solicitudes=1', accion: 'Revisar', icono: I.persona, ts: x.creada })
    }

    // Copias de seguridad (solo el gerente recibe el estado)
    if (respaldos) {
      const h = horasDesdeUltima(respaldos)
      if (respaldos.ultimoError) out.push({ id: `resp-err-${respaldos.ultimoIntento}`, nivel: 'alta', titulo: 'Falló la copia de seguridad', detalle: respaldos.ultimoError, to: '/configuracion', accion: 'Revisar', icono: I.caja, ts: respaldos.ultimoIntento ? new Date(respaldos.ultimoIntento).getTime() : undefined })
      else if (h > 48) out.push({ id: `resp-viejo-${Math.floor(h / 24)}`, nivel: 'media', titulo: h === Infinity ? 'No hay copias de seguridad' : `La última copia de seguridad tiene ${Math.floor(h / 24)} días`, detalle: 'Haz una copia ahora desde Configuración → Copias de seguridad.', to: '/configuracion', accion: 'Hacer copia', icono: I.caja })
    }

    // Orden: primero lo urgente; dentro de cada nivel, lo más reciente arriba
    const peso = { alta: 0, media: 1, info: 2 }
    out.sort((a, b) => peso[a.nivel] - peso[b.nivel] || (b.ts ?? ahora) - (a.ts ?? ahora))
    // Cada funcionario solo ve avisos de los módulos que su rol permite
    return out.filter((a) => puede(a.to.slice(1).split('?')[0]))
  }, [usuarios, pagos, facturas, resumen, alarmas, lecturas, periodoLectura, cierrePeriodo, pqrs, materiales, cierres, periodos, conf, solicitudes, respaldos])
}
