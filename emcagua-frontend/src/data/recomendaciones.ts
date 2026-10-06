/* eslint-disable react-refresh/only-export-components */
/**
 * Recomendaciones de Gotita: el sistema revisa los datos solo y propone qué hacer,
 * con el porqué (las cifras) y un botón que lleva directo a hacerlo.
 * Son reglas sobre los datos: salen al instante, sin esperar a la IA.
 */
import { useMemo, useSyncExternalStore } from 'react'
import { useData } from './DataContext'
import { usePqr } from './PqrContext'
import { useOperacion } from './OperacionContext'
import { consumosAtipicos, serieMensual } from './analytics'
import { balanceHidrico, IANC_META } from './perdidas'
import { estadoStock } from './operacion'
import { BARRIOS } from './constants'
import { ALARMAS } from './telemetria'
import { cop, num, pct } from '../utils/format'
import { puede } from '../utils/session'
import { propietarios } from './propietarios'

export type Area = 'Cartera' | 'Medidores' | 'Pérdidas' | 'Compras' | 'Comunidad' | 'Gastos' | 'Atención'
export type Recomendacion = {
  id: string
  area: Area
  prioridad: 1 | 2 | 3 // 1 = hazlo ya
  titulo: string
  porque: string
  accion: { label: string; to: string }
  /** Pantallas donde Gotita la menciona sola. */
  rutas: string[]
}

export const ICONO_AREA: Record<Area, string> = {
  Cartera: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  Medidores: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  Pérdidas: 'M12 21a7 7 0 007-7c0-4-7-11-7-11S5 10 5 14a7 7 0 007 7z',
  Compras: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  Comunidad: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  Gastos: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  Atención: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
}

/* ---------------- "Ya lo hice" / "Ahora no" (se guarda en este computador) ---------------- */

type Marca = { estado: 'hecho' | 'luego'; ts: number }
const CLAVE = 'emcagua_recomendaciones'
const LUEGO_MS = 3 * 86_400_000 // "Ahora no" la esconde 3 días
let marcas: Record<string, Marca> = (() => { try { return JSON.parse(localStorage.getItem(CLAVE) ?? '{}') } catch { return {} } })()
const oyentes = new Set<() => void>()
export function marcarRecomendacion(id: string, estado: Marca['estado']) {
  marcas = { ...marcas, [id]: { estado, ts: Date.now() } }
  try { localStorage.setItem(CLAVE, JSON.stringify(marcas)) } catch { /* sin almacenamiento */ }
  oyentes.forEach((f) => f())
}
const suscribir = (f: () => void) => { oyentes.add(f); return () => oyentes.delete(f) }
const visible = (id: string, ahora: number) => { const m = marcas[id]; return !m || (m.estado === 'luego' && ahora - m.ts > LUEGO_MS) }

/* ------------------------------- Reglas ------------------------------- */

export function useRecomendaciones(): Recomendacion[] {
  const { usuarios, resumen, alarmas, cierrePeriodo } = useData()
  const { pqrs } = usePqr()
  const { materiales, egresos } = useOperacion()
  const m = useSyncExternalStore(suscribir, () => marcas)

  const todas = useMemo(() => {
    const out: Recomendacion[] = []
    const hoy = new Date()
    const activos = usuarios.filter((u) => u.estado === 'Activo')
    const res = new Map(usuarios.map((u) => [u.id, resumen(u)]))

    // 1. Fugas dentro de las casas: el usuario paga agua que no usa y luego reclama.
    const fugas = alarmas.filter((a) => a.tipo === 'fuga')
    if (fugas.length) out.push({
      id: `fugas-${fugas.map((a) => a.usuario.id).join('.')}`, area: 'Medidores', prioridad: 1,
      titulo: `Avisa a ${fugas.length} usuario(s) que tienen una fuga en su casa`,
      porque: `Sus medidores nunca bajan a cero en la madrugada (${fugas.slice(0, 3).map((a) => a.usuario.nombre).join(', ')}${fugas.length > 3 ? '…' : ''}). Si no se enteran, la factura les llega alta y terminan en reclamo.`,
      accion: { label: 'Enviar aviso de fuga', to: '/avisos?segmento=fugas&plantilla=fuga' }, rutas: ['/lecturas', '/usuarios', '/mi-dia', '/avisos'],
    })

    // 2. Posible manipulación del medidor
    const manip = alarmas.filter((a) => a.tipo === 'manipulacion')
    if (manip.length) out.push({
      id: `manip-${manip.map((a) => a.usuario.id).join('.')}`, area: 'Medidores', prioridad: 1,
      titulo: `Programa visita técnica a ${manip.length} medidor(es) con posible manipulación`,
      porque: `${manip.map((a) => `${a.usuario.nombre} (${a.usuario.barrio})`).join(', ')}. Deja constancia con un acta de visita: sirve si luego hay que cobrar o sancionar.`,
      accion: { label: 'Hacer acta de visita', to: '/documentos?plantilla=acta-visita' }, rutas: ['/lecturas', '/mi-dia'],
    })

    // 3. Varios medidores sin señal en el mismo barrio = problema de red/antena, no de cada medidor
    const sinSenal = alarmas.filter((a) => a.tipo === 'sin_comunicacion')
    const porBarrio = BARRIOS.map((b) => ({ b, n: sinSenal.filter((a) => a.usuario.barrio === b).length })).sort((a, c) => c.n - a.n)[0]
    const diasCierre = Math.ceil((cierrePeriodo.getTime() - hoy.getTime()) / 86_400_000)
    if (porBarrio && porBarrio.n >= 2) out.push({
      id: `senal-${porBarrio.b}-${porBarrio.n}`, area: 'Medidores', prioridad: diasCierre <= 7 ? 1 : 2,
      titulo: `Revisa la señal de los medidores en ${porBarrio.b}`,
      porque: `${porBarrio.n} medidores de ese barrio dejaron de comunicar a la vez: puede ser la antena o el concentrador, no los medidores. Faltan ${Math.max(0, diasCierre)} día(s) para facturar; si no vuelven, se cobran por promedio.`,
      accion: { label: 'Ver medidores sin señal', to: '/lecturas' }, rutas: ['/lecturas', '/mi-dia', '/facturacion'],
    })

    // 4. Consumo disparado sin alarma de fuga: visita o aviso preventivo
    const atip = consumosAtipicos(usuarios).filter((a) => !fugas.some((f) => f.usuario.id === a.usuario.id)).slice(0, 5)
    if (atip.length) out.push({
      id: `atip-${atip.map((a) => a.usuario.id).join('.')}`, area: 'Medidores', prioridad: 2,
      titulo: `Revisa ${atip.length} consumo(s) que se dispararon este mes`,
      porque: atip.slice(0, 3).map((a) => `${a.usuario.nombre}: ${num(a.actual)} m³, ${pct(a.variacion, 0)} más que su promedio`).join(' · ') + '. Llamarlos antes de que llegue la factura evita reclamos.',
      accion: { label: 'Ver usuarios', to: '/usuarios' }, rutas: ['/usuarios', '/analitica', '/facturacion'],
    })

    // 5. Cartera: suspensión para los que más deben, recordatorio para los nuevos en mora
    const mora = activos.map((u) => ({ u, r: res.get(u.id)! })).filter((x) => x.r.vencido)
    const graves = mora.filter((x) => x.r.pagosDebe >= 3).sort((a, b) => b.r.deuda - a.r.deuda)
    const leves = mora.filter((x) => x.r.pagosDebe < 3)
    if (graves.length) out.push({
      id: `suspension-${graves.length}-${Math.round(graves.reduce((s, x) => s + x.r.deuda, 0) / 1000)}`, area: 'Cartera', prioridad: 1,
      titulo: `Notifica la suspensión a ${graves.length} usuario(s) con 3 o más facturas vencidas`,
      porque: `Deben ${cop(graves.reduce((s, x) => s + x.r.deuda, 0))} y siguen con el servicio. El que más debe: ${graves[0].u.nombre} (${cop(graves[0].r.deuda)}). La Ley 142 exige avisar antes de suspender.`,
      accion: { label: 'Hacer aviso de suspensión', to: '/documentos?plantilla=aviso-suspension' }, rutas: ['/facturacion', '/pagos', '/usuarios', '/mi-dia', '/documentos'],
    })
    const grandes = graves.filter((x) => x.r.deuda >= 150_000)
    if (grandes.length) out.push({
      id: `acuerdo-${grandes.map((x) => x.u.id).join('.')}`, area: 'Cartera', prioridad: 2,
      titulo: `Ofrece acuerdo de pago a ${grandes.length} usuario(s) con deudas grandes`,
      porque: `Deben más de ${cop(150_000)} cada uno; difícilmente pagan todo de una vez. En cuotas se recupera más que cortando.`,
      accion: { label: 'Hacer acuerdo de pago', to: '/documentos?plantilla=acuerdo-pago' }, rutas: ['/facturacion', '/pagos', '/documentos'],
    })
    if (leves.length) out.push({
      id: `mora-wa-${leves.length}`, area: 'Cartera', prioridad: 2,
      titulo: `Manda un recordatorio por WhatsApp a ${leves.length} usuario(s) que se atrasaron`,
      porque: `Tienen 1 o 2 facturas vencidas por ${cop(leves.reduce((s, x) => s + x.r.deuda, 0))}. Un mensaje a tiempo suele bastar y es gratis.`,
      accion: { label: 'Enviar recordatorio', to: '/avisos?segmento=morosos&plantilla=mora' }, rutas: ['/pagos', '/facturacion', '/avisos', '/mi-dia'],
    })

    // 5b. Dueños de varias casas que deben en más de una: un solo acuerdo por todo
    const variasCasas = [...propietarios(usuarios).values()].map((p) => ({ p, deben: p.predios.filter((u) => res.get(u.id)!.vencido) })).filter((x) => x.deben.length >= 2)
    if (variasCasas.length) out.push({
      id: `duenos-${variasCasas.map((x) => x.p.cedula).join('.')}`, area: 'Cartera', prioridad: 2,
      titulo: `${variasCasas.length === 1 ? `${variasCasas[0].p.nombre} debe` : `${variasCasas.length} propietarios deben`} en varias casas a la vez`,
      porque: variasCasas.slice(0, 3).map((x) => `${x.p.nombre}: ${x.deben.length} de sus ${x.p.predios.length} predios, ${cop(x.deben.reduce((s, u) => s + res.get(u.id)!.deuda, 0))}`).join(' · ') + '. Mejor un solo acuerdo de pago por todo que cortar casa por casa.',
      accion: { label: 'Hacer acuerdo de pago', to: '/documentos?plantilla=acuerdo-pago' }, rutas: ['/usuarios', '/pagos', '/facturacion', '/mi-dia'],
    })

    // 6. Facturas que vencen pronto: recordar antes evita la mora
    const porVencer = activos.filter((u) => { const r = res.get(u.id)!; return r.deuda > 0 && !r.vencido && r.pendientes.some((f) => { const d = (f.vencimiento.getTime() - hoy.getTime()) / 86_400_000; return d >= 0 && d <= 5 }) })
    if (porVencer.length >= 3) out.push({
      id: `porvencer-${hoy.getFullYear()}-${hoy.getMonth()}`, area: 'Cartera', prioridad: 2,
      titulo: `Recuerda el pago a ${porVencer.length} usuarios: su factura vence esta semana`,
      porque: 'Avisar antes del vencimiento es lo que más baja la mora. Puedes mandarlo por WhatsApp y además publicar la pieza en redes.',
      accion: { label: 'Enviar recordatorio', to: '/avisos?segmento=por-vencer&plantilla=recordatorio' }, rutas: ['/pagos', '/avisos', '/redes', '/mi-dia'],
    })

    // 7. Recaudo cayó frente al mes anterior
    const serie = serieMensual(usuarios, 3)
    const [ant, act] = serie.slice(-2)
    if (ant && act && ant.facturado && act.facturado) {
      const ra = ant.recaudado / ant.facturado, rb = act.recaudado / act.facturado
      if (rb < ra - 0.08) out.push({
        id: `recaudo-${act.mes}-${act.anio}`, area: 'Cartera', prioridad: 2,
        titulo: `El recaudo de ${act.full.toLowerCase()} va más lento que el del mes pasado`,
        porque: `Va en ${pct(rb, 0)} de lo facturado contra ${pct(ra, 0)} de ${ant.full.toLowerCase()}. Una publicación con los medios de pago (incluido el pago en línea) ayuda.`,
        accion: { label: 'Crear pieza de pago', to: '/redes?tipo=pago' }, rutas: ['/dashboard', '/pagos', '/analitica', '/redes'],
      })
    }


    // 8. El sector que más agua pierde
    const bal = balanceHidrico(usuarios, 1)[0]
    if (bal) {
      const peor = [...bal.sectores].sort((a, b) => b.ianc - a.ianc)[0]
      if (peor && peor.ianc > IANC_META) out.push({
        id: `perdidas-${peor.barrio}-${bal.mes}-${bal.anio}`, area: 'Pérdidas', prioridad: peor.ianc > IANC_META + 0.1 ? 1 : 2,
        titulo: `Busca fugas en la red de ${peor.barrio}`,
        porque: `Ese sector perdió el ${pct(peor.ianc, 0)} del agua en ${bal.full.toLowerCase()} (${num(peor.perdido)} m³), la meta es ${pct(IANC_META, 0)}. Es donde una cuadrilla rinde más.`,
        accion: { label: 'Ver pérdidas', to: '/perdidas' }, rutas: ['/perdidas', '/dashboard', '/mi-dia', '/inventario'],
      })
    }

    // 9. Una sola compra para todo lo que está bajo el mínimo
    const bajos = materiales.filter((x) => estadoStock(x) !== 'OK')
    if (bajos.length) {
      const costo = bajos.reduce((s, x) => s + (x.minimo * 2 - x.stock) * x.costo, 0)
      out.push({
        id: `compra-${bajos.map((x) => `${x.id}${x.stock}`).join('.')}`, area: 'Compras', prioridad: bajos.some((x) => x.stock === 0) ? 1 : 2,
        titulo: `Haz un solo pedido con los ${bajos.length} materiales que se están acabando`,
        porque: `${bajos.map((x) => x.nombre).join(', ')}. Para dejarlos en el doble del mínimo se necesitan unos ${cop(costo)}. Comprar todo junto ahorra transporte.`,
        accion: { label: 'Ver inventario', to: '/inventario' }, rutas: ['/inventario', '/pagos', '/mi-dia'],
      })
    }

    // 10. Muchas PQR del mismo tema: mejor explicar a todos que responder una por una
    const hace60 = hoy.getTime() - 60 * 86_400_000
    const recientes = pqrs.filter((p) => p.radicadaEn >= hace60)
    const conteo = new Map<string, number>()
    recientes.forEach((p) => conteo.set(p.categoria, (conteo.get(p.categoria) ?? 0) + 1))
    const [tema, n] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
    if (n >= 3) {
      const pieza: Record<string, [string, string]> = {
        'Calidad del agua': ['calidad', 'un comunicado sobre la calidad del agua'],
        'Facturación': ['aviso', 'una pieza que explique cómo leer la factura'],
        'Daño o fuga': ['mantenimiento', 'una pieza con el número para reportar daños'],
        'Corte y reconexión': ['pago', 'una pieza con cómo y dónde pagar para evitar el corte'],
      }
      const [tipo, que] = pieza[tema] ?? ['aviso', 'un aviso general']
      out.push({
        id: `pqr-tema-${tema}-${n}`, area: 'Atención', prioridad: 3,
        titulo: `Publica ${que}`,
        porque: `En los últimos 60 días llegaron ${n} PQR de «${tema}» (${pct(n / recientes.length, 0)} del total). Explicarlo a todos de una vez evita que sigan llegando.`,
        accion: { label: 'Crear publicación', to: `/redes?tipo=${tipo}` }, rutas: ['/pqr', '/redes', '/mi-dia'],
      })
    }

    // 11. El consumo general subió: campaña de ahorro
    if (ant && act && ant.usuariosConsumo && act.usuariosConsumo) {
      const pa = ant.consumo / ant.usuariosConsumo, pb = act.consumo / act.usuariosConsumo
      if (pb > pa * 1.08) out.push({
        id: `ahorro-${act.mes}-${act.anio}`, area: 'Comunidad', prioridad: 3,
        titulo: 'Publica consejos de ahorro de agua',
        porque: `El consumo promedio por casa subió de ${num(pa, 1)} a ${num(pb, 1)} m³ (${pct(pb / pa - 1, 0)}). Si sigue así, la planta se exige más y las facturas suben.`,
        accion: { label: 'Crear pieza de ahorro', to: '/redes?tipo=ahorro' }, rutas: ['/analitica', '/redes', '/dashboard'],
      })
    }

    // 12. Gastos de este mes por encima de lo normal
    const mesClave = (f: string) => f.slice(0, 7)
    const esteMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
    const porCat = new Map<string, { este: number; antes: number[] }>()
    for (const e of egresos) {
      const c = porCat.get(e.categoria) ?? { este: 0, antes: [] }
      if (mesClave(e.fecha) === esteMes) c.este += e.valor
      porCat.set(e.categoria, c)
    }
    const meses = [...new Set(egresos.map((e) => mesClave(e.fecha)).filter((k) => k !== esteMes))]
    for (const [cat, c] of porCat) {
      const prom = meses.length ? egresos.filter((e) => e.categoria === cat && mesClave(e.fecha) !== esteMes).reduce((s, e) => s + e.valor, 0) / meses.length : 0
      if (prom > 0 && c.este > prom * 1.2 && c.este - prom > 100_000) {
        out.push({
          id: `gasto-${cat}-${esteMes}`, area: 'Gastos', prioridad: 3,
          titulo: `Revisa el gasto en ${cat.toLowerCase()}`,
          porque: `Este mes va en ${cop(c.este)}, ${pct(c.este / prom - 1, 0)} más que el promedio de ${cop(prom)}.${cat.startsWith('Energía') ? ' Bombear en horas de menor tarifa puede bajarlo.' : ''}`,
          accion: { label: 'Ver gastos', to: '/pagos?tab=gastos' }, rutas: ['/pagos', '/dashboard'],
        })
        break
      }
    }

    // 13. Predios con cero consumo: desocupados, medidor detenido o conexión por fuera
    const cero = alarmas.filter((a) => a.tipo === 'sin_consumo')
    if (cero.length >= 2) out.push({
      id: `cero-${cero.map((a) => a.usuario.id).join('.')}`, area: 'Medidores', prioridad: 3,
      titulo: `Verifica ${cero.length} predios que no consumen nada`,
      porque: `${ALARMAS.sin_consumo.ayuda} También puede ser una conexión que no pasa por el medidor.`,
      accion: { label: 'Ver medidores', to: '/lecturas' }, rutas: ['/lecturas', '/perdidas'],
    })

    return out
      .filter((r) => puede(r.accion.to.slice(1).split('?')[0]))
      .sort((a, b) => a.prioridad - b.prioridad)
  }, [usuarios, resumen, alarmas, cierrePeriodo, pqrs, materiales, egresos])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => { const ahora = Date.now(); return todas.filter((r) => visible(r.id, ahora)) }, [todas, m])
}

/** Texto corto para la IA y para el chat. */
export const recomendacionesComoTexto = (rs: Recomendacion[], n = 5) =>
  rs.slice(0, n).map((r, i) => `${i + 1}. **${r.titulo}.** ${r.porque}`).join('\n')
