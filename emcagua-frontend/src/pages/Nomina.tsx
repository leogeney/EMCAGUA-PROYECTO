import { useMemo, useState, type ReactNode } from 'react'
import { claveNomina, useNomina, type EstadoNomina } from '../data/NominaContext'
import { ARL_CLASES, ARL_TARIFA, NOVEDAD_VACIA, calendarioObligaciones, horaExtraDiurnaMinima, liquidar, prestaciones, revisar, type Empleado, type Liquidacion, type Novedad, type Parametros } from '../data/nomina'
import { MESES } from '../data/constants'
import Modal, { ConfirmDialog } from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import Ico from '../components/ui/Icon'
import StatTile from '../components/ui/StatTile'
import { useToast } from '../components/ui/Toast'
import { cop, copCompacto, fecha, hora, num } from '../utils/format'
import { exportarXls } from '../utils/excel'
import NominaAnalisis from './NominaAnalisis'

type Tab = 'liquidacion' | 'analisis' | 'prestaciones' | 'empleados' | 'parametros'

const D = {
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  check: 'M5 13l4 4L19 7',
  warn: 'M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  x: 'M6 18L18 6M6 6l12 12',
  down: 'M12 10v6m0 0l-3-3m3 3l3-3M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  plus: 'M12 4v16m8-8H4',
  cal: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  undo: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
}

const ESTADO_UI: Record<EstadoNomina, { cls: string; dot: string; texto: string }> = {
  Borrador: { cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', texto: 'Borrador · editable' },
  Aprobada: { cls: 'bg-secondary/10 text-secondary border-secondary/20', dot: 'bg-secondary', texto: 'Aprobada · bloqueada' },
  Pagada: { cls: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500', texto: 'Pagada' },
}

export default function Nomina() {
  const { parametros, empleados, periodos, obtenerPeriodo, setNovedad, cambiarEstado } = useNomina()
  const toast = useToast()
  const hoy = new Date()
  const [tab, setTab] = useState<Tab>('liquidacion')
  const [clave, setClave] = useState(claveNomina(hoy.getFullYear(), hoy.getMonth() + 1))
  const [anio, mes] = clave.split('-').map(Number)
  const periodo = obtenerPeriodo(anio, mes)
  const editable = periodo.estado === 'Borrador'

  const [editando, setEditando] = useState<string | null>(null)
  const [desprendible, setDesprendible] = useState<Liquidacion | null>(null)
  const [confirmar, setConfirmar] = useState<null | 'aprobar' | 'pagar' | 'reabrir'>(null)

  const opcionesPeriodo = useMemo(() => {
    const set = new Set(Object.keys(periodos))
    set.add(claveNomina(hoy.getFullYear(), hoy.getMonth() + 1))
    return [...set].sort().reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodos])

  const liqs = useMemo(
    () => empleados.filter((e) => periodo.novedades[e.id]).map((e) => liquidar(e, periodo.novedades[e.id], parametros)),
    [empleados, periodo, parametros],
  )

  const anterior = useMemo(() => {
    const d = new Date(anio, mes - 2, 1)
    const p = periodos[claveNomina(d.getFullYear(), d.getMonth() + 1)]
    if (!p) return undefined
    return new Map(empleados.filter((e) => p.novedades[e.id]).map((e) => [e.id, liquidar(e, p.novedades[e.id], parametros).neto]))
  }, [periodos, anio, mes, empleados, parametros])

  const alertas = useMemo(() => revisar(liqs, parametros, anterior), [liqs, parametros, anterior])
  const errores = alertas.filter((a) => a.nivel === 'error')
  const sum = (f: (l: Liquidacion) => number) => liqs.reduce((s, l) => s + f(l), 0)
  const tot = {
    devengado: sum((l) => l.devengado),
    deducciones: sum((l) => l.deducciones),
    neto: sum((l) => l.neto),
    empleador: sum((l) => l.empleador.total),
    provisiones: sum((l) => l.provisiones.total),
    costo: sum((l) => l.costoTotal),
  }

  const exportar = () =>
    exportarXls(
      `EMCAGUA-Nomina-${clave}`,
      `EMCAGUA APC — Nómina ${MESES[mes - 1]} ${anio}`,
      `Estado: ${periodo.estado} · ${liqs.length} empleados · neto ${cop(tot.neto)} · generado ${new Date().toLocaleString('es-CO')}`,
      ['Cédula', 'Empleado', 'Cargo', 'Días', 'Básico', 'Auxilio transporte', 'Extras y recargos', 'Comisiones', 'Bonificación', 'Devengado', 'IBC', 'Salud 4%', 'Pensión 4%', 'FSP', 'Otros descuentos', 'Deducciones', 'Neto a pagar'],
      liqs.map((l) => [l.empleado.cedula, l.empleado.nombre, l.empleado.cargo, l.novedad.dias, l.basico, l.auxilio, l.totalExtras, l.comisiones, l.bonificacion, l.devengado, l.ibc, l.salud, l.pension, l.fsp, l.otrosDescuentos, l.deducciones, l.neto]),
      [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    )

  const ejecutar = () => {
    if (confirmar === 'aprobar') { cambiarEstado(clave, 'Aprobada'); toast('Nómina aprobada', 'Quedó bloqueada para edición') }
    if (confirmar === 'pagar') { cambiarEstado(clave, 'Pagada'); toast('Nómina marcada como pagada', `${cop(tot.neto)} · ${liqs.length} empleados`) }
    if (confirmar === 'reabrir') { cambiarEstado(clave, 'Borrador'); toast('Nómina devuelta a borrador', 'Ya puedes corregir novedades', 'warning') }
    setConfirmar(null)
  }

  const ui = ESTADO_UI[periodo.estado]
  const liqEditando = liqs.find((l) => l.empleado.id === editando)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2 flex items-center gap-1.5"><Ico d={D.lock} className="w-3.5 h-3.5" /> Solo administrador</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Nómina</h1>
          <p className="text-sm text-gray-500 mt-2">Liquidación mensual, prestaciones sociales y aportes · parámetros legales {parametros.anio}</p>
        </div>
        {(tab === 'liquidacion') && (
          <div className="flex flex-wrap items-center gap-2 order-last">
            <label className="relative inline-flex items-center h-10 rounded-xl border border-gray-200 bg-white hover:border-gray-300">
              <span className="pl-3 text-xs text-gray-400">Periodo</span>
              <select value={clave} onChange={(e) => setClave(e.target.value)} className="appearance-none bg-transparent pl-1.5 pr-8 h-full text-sm font-semibold text-dark focus:outline-none cursor-pointer">
                {opcionesPeriodo.map((k) => { const [a, m] = k.split('-').map(Number); return <option key={k} value={k}>{MESES[m - 1]} {a}</option> })}
              </select>
              <svg className="pointer-events-none absolute right-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </label>
            <span className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border text-xs font-semibold ${ui.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />{ui.texto}</span>
            <button onClick={exportar} className="btn-secondary"><Ico d={D.down} /> Excel</button>
            {periodo.estado === 'Borrador' && (
              <button onClick={() => setConfirmar('aprobar')} disabled={errores.length > 0} title={errores.length ? 'Corrige los errores antes de aprobar' : ''} className="btn-primary"><Ico d={D.check} /> Aprobar nómina</button>
            )}
            {periodo.estado === 'Aprobada' && (
              <>
                <button onClick={() => setConfirmar('reabrir')} className="btn-secondary"><Ico d={D.undo} /> Reabrir</button>
                <button onClick={() => setConfirmar('pagar')} className="btn bg-green-600 text-white hover:bg-green-700 shadow-sm"><Ico d={D.check} /> Marcar como pagada</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-x-1 border-b border-gray-200 mb-6">
        {([
          ['liquidacion', 'Liquidación del mes'],
          ['analisis', 'Análisis y gráficas'],
          ['prestaciones', 'Prestaciones sociales'],
          ['empleados', `Empleados (${empleados.filter((e) => e.activo).length})`],
          ['parametros', 'Parámetros legales'],
        ] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`relative px-4 h-11 text-sm font-semibold whitespace-nowrap transition-colors ${tab === k ? 'text-dark' : 'text-gray-400 hover:text-gray-600'}`}>
            {l}
            {tab === k && <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-dark" />}
          </button>
        ))}
      </div>

      {tab === 'liquidacion' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <StatTile label="Neto a pagar" value={copCompacto(tot.neto)} sub={`${liqs.length} empleados · ${cop(tot.neto)}`} tone="primary" />
            <StatTile label="Total devengado" value={copCompacto(tot.devengado)} sub={`Deducciones ${cop(tot.deducciones)}`} />
            <StatTile label="Aportes empleador" value={copCompacto(tot.empleador)} sub="Salud, pensión, ARL y parafiscales" />
            <StatTile label="Costo total empresa" value={copCompacto(tot.costo)} sub={`Incluye ${cop(tot.provisiones)} de provisiones`} />
          </div>

          {/* Revisión automática */}
          <section className={`rounded-2xl border p-4 sm:p-5 mb-5 ${errores.length ? 'border-red-200 bg-red-50/50' : alertas.length ? 'border-amber-200 bg-amber-50/40' : 'border-green-200 bg-green-50/50'}`}>
            <div className="flex items-start gap-3">
              <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${errores.length ? 'bg-red-100 text-red-600' : alertas.length ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                <Ico d={errores.length || alertas.length ? D.warn : D.shield} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-dark">
                  {errores.length ? `Revisión automática: ${errores.length} error(es) que impiden aprobar` : alertas.length ? `Revisión automática: ${alertas.length} aviso(s) para confirmar` : 'Revisión automática: sin errores'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Antes de aprobar, el sistema revisa salario mínimo, días, descuentos, horas extra y cambios bruscos frente al mes anterior.</p>
                {alertas.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {alertas.slice(0, 8).map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${a.nivel === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className="text-gray-700 flex-1">{a.mensaje}</span>
                        {a.empleadoId && editable && <button onClick={() => setEditando(a.empleadoId!)} className="text-xs font-semibold text-secondary hover:underline shrink-0">Corregir</button>}
                      </li>
                    ))}
                    {alertas.length > 8 && <li className="text-xs text-gray-400 pl-3.5">+{alertas.length - 8} más</li>}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Tabla */}
          <section className="card overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-gray-soft">
                    <th className="th">Empleado</th>
                    <th className="th text-right">Días</th>
                    <th className="th text-right">Básico + aux.</th>
                    <th className="th text-right">Extras, recargos y comisiones</th>
                    <th className="th text-right">Deducciones</th>
                    <th className="th text-right">Neto a pagar</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {liqs.map((l) => {
                    const alerta = alertas.find((a) => a.empleadoId === l.empleado.id)
                    return (
                      <tr key={l.empleado.id} className="hover:bg-gray-soft/60">
                        <td className="td">
                          <div className="flex items-center gap-3">
                            <Avatar nombre={l.empleado.nombre} size={36} />
                            <div className="min-w-0">
                              <p className="font-semibold text-dark truncate flex items-center gap-1.5">
                                {l.empleado.nombre}
                                {alerta && <span title={alerta.mensaje} className={`h-2 w-2 rounded-full ${alerta.nivel === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{l.empleado.cargo}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`td text-right tabular-nums ${l.novedad.dias < 30 ? 'text-amber-700 font-semibold' : 'text-gray-600'}`}>{l.novedad.dias}</td>
                        <td className="td text-right tabular-nums">{cop(l.basico)}{l.auxilio > 0 && <p className="text-[11px] text-gray-400">+ aux. {cop(l.auxilio)}</p>}</td>
                        <td className="td text-right tabular-nums">{l.totalExtras + l.comisiones ? cop(l.totalExtras + l.comisiones) : <span className="text-gray-300">Sin extras</span>}{l.extras.length > 0 && <p className="text-[11px] text-gray-400">{l.extras.reduce((s, x) => s + x.horas, 0)} h extra/recargo</p>}{l.bonificacion > 0 && <p className="text-[11px] text-gray-400">+ bonif. {cop(l.bonificacion)}</p>}</td>
                        <td className="td text-right tabular-nums text-red-600">−{cop(l.deducciones)}</td>
                        <td className="td text-right tabular-nums font-bold text-dark">{cop(l.neto)}</td>
                        <td className="td">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditando(l.empleado.id)} title={editable ? 'Editar novedades' : 'Ver detalle'} aria-label={editable ? 'Novedades' : 'Ver'} className="h-8 w-8 rounded-lg text-gray-400 hover:text-dark hover:bg-gray-100 flex items-center justify-center"><Ico d={editable ? D.edit : D.doc} /></button>
                            <button onClick={() => setDesprendible(l)} title="Desprendible de pago" className="h-8 w-8 rounded-lg text-gray-400 hover:text-dark hover:bg-gray-100 flex items-center justify-center"><Ico d={D.doc} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-soft font-bold text-dark">
                    <td className="td">Totales</td>
                    <td className="td" />
                    <td className="td text-right tabular-nums">{cop(sum((l) => l.basico + l.auxilio))}</td>
                    <td className="td text-right tabular-nums">{cop(sum((l) => l.totalExtras + l.comisiones + l.bonificacion))}</td>
                    <td className="td text-right tabular-nums text-red-600">−{cop(tot.deducciones)}</td>
                    <td className="td text-right tabular-nums">{cop(tot.neto)}</td>
                    <td className="td" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <section className="card p-5">
              <h3 className="text-[15px] font-bold text-dark">Aportes del empleador</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">Lo que paga EMCAGUA además del salario (PILA)</p>
              <Lista filas={[
                ['Salud 8,5%', sum((l) => l.empleador.salud)],
                ['Pensión 12%', sum((l) => l.empleador.pension)],
                ['ARL (según riesgo)', sum((l) => l.empleador.arl)],
                ['Caja de compensación 4%', sum((l) => l.empleador.caja)],
                ['ICBF 3%', sum((l) => l.empleador.icbf)],
                ['SENA 2%', sum((l) => l.empleador.sena)],
              ]} total={tot.empleador} />
              <ArlBoton className="mt-3" />
            </section>
            <section className="card p-5">
              <h3 className="text-[15px] font-bold text-dark">Provisiones del mes</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">Dinero que se debe apartar para prestaciones</p>
              <Lista filas={[
                ['Cesantías 8,33%', sum((l) => l.provisiones.cesantias)],
                ['Intereses cesantías 1%', sum((l) => l.provisiones.intereses)],
                ['Prima de servicios 8,33%', sum((l) => l.provisiones.prima)],
                ['Vacaciones 4,17%', sum((l) => l.provisiones.vacaciones)],
              ]} total={tot.provisiones} />
            </section>
            <section className="card p-5">
              <h3 className="text-[15px] font-bold text-dark">Historial de cambios</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">Quién hizo qué en esta nómina</p>
              {periodo.log.length === 0 ? <p className="text-sm text-gray-400">Sin movimientos aún.</p> : (
                <ol className="relative border-l border-gray-200 ml-1.5 space-y-3 max-h-64 overflow-y-auto">
                  {[...periodo.log].reverse().map((ev, i) => (
                    <li key={i} className="pl-4">
                      <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-secondary" />
                      <p className="text-sm text-dark">{ev.accion}</p>
                      <p className="text-[11px] text-gray-400">{ev.usuario} · {fecha(ev.ts)} {hora(ev.ts)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}

      {tab === 'prestaciones' && <TabPrestaciones />}
      {tab === 'empleados' && <TabEmpleados />}
      {tab === 'parametros' && <TabParametros />}
      {tab === 'analisis' && <NominaAnalisis />}

      {liqEditando && (
        <NovedadesModal
          liq={liqEditando}
          parametros={parametros}
          editable={editable}
          onClose={() => setEditando(null)}
          onSave={(n) => { setNovedad(clave, liqEditando.empleado.id, n); toast('Novedades guardadas', liqEditando.empleado.nombre); setEditando(null) }}
        />
      )}
      {desprendible && <Desprendible liq={desprendible} periodo={`${MESES[mes - 1]} ${anio}`} onClose={() => setDesprendible(null)} />}

      <ConfirmDialog
        open={!!confirmar}
        tone={confirmar === 'reabrir' ? 'danger' : 'primary'}
        title={confirmar === 'aprobar' ? `¿Aprobar la nómina de ${MESES[mes - 1]}?` : confirmar === 'pagar' ? '¿Confirmas que la nómina ya fue pagada?' : '¿Reabrir la nómina?'}
        message={
          confirmar === 'aprobar' ? <>Neto total <b>{cop(tot.neto)}</b> para {liqs.length} empleados. {alertas.length > 0 && `Hay ${alertas.length} aviso(s) sin errores bloqueantes. `}Después de aprobar no se puede editar.</>
          : confirmar === 'pagar' ? <>Se registrará el pago de <b>{cop(tot.neto)}</b>. El sistema no permitirá pagar este periodo otra vez.</>
          : 'Volverá a quedar en borrador para corregir novedades. Quedará registrado en el historial.'
        }
        confirmLabel={confirmar === 'aprobar' ? 'Aprobar' : confirmar === 'pagar' ? 'Sí, ya se pagó' : 'Reabrir'}
        onCancel={() => setConfirmar(null)}
        onConfirm={ejecutar}
      />
    </div>
  )
}

function Lista({ filas, total }: { filas: [string, number][]; total: number }) {
  return (
    <div className="space-y-2 text-sm">
      {filas.map(([k, v]) => (
        <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span className="tabular-nums text-dark">{cop(v)}</span></div>
      ))}
      <div className="flex justify-between pt-2.5 mt-1 border-t border-gray-100 font-bold"><span className="text-dark">Total</span><span className="tabular-nums text-dark">{cop(total)}</span></div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Novedades                                                           */
/* ------------------------------------------------------------------ */

function NovedadesModal({ liq, parametros, editable, onClose, onSave }: { liq: Liquidacion; parametros: Parametros; editable: boolean; onClose: () => void; onSave: (n: Novedad) => void }) {
  const [n, setN] = useState<Novedad>({ ...NOVEDAD_VACIA, ...liq.novedad })
  const [conExtras, setConExtras] = useState(liq.novedad.hed + liq.novedad.hen + liq.novedad.heddf + liq.novedad.hendf + liq.novedad.rn + liq.novedad.rdf > 0)
  const prev = liquidar(liq.empleado, n, parametros)
  const campo = (k: keyof Novedad, label: string, sufijo: string, ayuda?: string) => (
    <div>
      <label className="text-xs font-semibold text-gray-600" htmlFor={`n-${k}`}>{label}</label>
      <div className="relative mt-1">
        {sufijo === '$' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>}
        <input
          id={`n-${k}`}
          inputMode="numeric"
          disabled={!editable}
          value={(n[k] as number) ? (n[k] as number).toLocaleString('es-CO') : ''}
          placeholder="0"
          onChange={(e) => setN({ ...n, [k]: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          className={`field tabular-nums ${sufijo === '$' ? 'pl-7' : 'pr-10'} disabled:bg-gray-soft disabled:text-gray-500`}
        />
        {sufijo !== '$' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{sufijo}</span>}
      </div>
      {ayuda && <p className="text-[11px] text-gray-400 mt-1">{ayuda}</p>}
    </div>
  )
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`Novedades · ${liq.empleado.nombre}`}
      subtitle={`${liq.empleado.cargo} · básico ${cop(liq.empleado.salario)} · valor hora ${cop(prev.valorHora)}`}
      footer={editable ? (
        <>
          <button onClick={() => setN({ ...NOVEDAD_VACIA })} className="btn-secondary">Limpiar</button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => onSave(n)} className="btn-primary">Guardar · neto {cop(prev.neto)}</button>
        </>
      ) : <button onClick={onClose} className="btn-secondary flex-1">Cerrar</button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        <div className="lg:col-span-3 px-6 py-5 space-y-5 border-b lg:border-b-0 lg:border-r border-gray-100">
          {!editable && <p className="rounded-xl bg-gray-soft px-3 py-2 text-xs text-gray-600 flex items-center gap-2"><Ico d={D.lock} className="w-3.5 h-3.5" /> Esta nómina ya fue aprobada o pagada; solo lectura.</p>}
          <SeccionTitulo n="1" titulo="Devengados" sub="Lo que gana el trabajador este mes" />
          <div className="rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-soft px-3 py-2.5">
              <div>
                <p className="text-xs text-gray-500">Salario básico acordado en el contrato</p>
                <p className="text-base font-extrabold text-dark tabular-nums">{cop(liq.empleado.salario)}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Valor hora ordinaria</p>
                <p className="font-bold text-dark tabular-nums">{cop(prev.valorHora)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {campo('dias', 'Días laborados', 'días', 'Máximo 30 (mes comercial)')}
              <div>
                <label className="text-xs font-semibold text-gray-600" htmlFor="n-nota">Nota / motivo</label>
                <input id="n-nota" disabled={!editable} value={n.nota ?? ''} onChange={(e) => setN({ ...n, nota: e.target.value })} placeholder="Ej: licencia no remunerada" className="field mt-1 disabled:bg-gray-soft" />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-dark">¿Trabajó horas extra o recargos este mes?</p>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-soft rounded-xl mt-2 max-w-xs">
                {([true, false] as const).map((v) => (
                  <button key={String(v)} type="button" disabled={!editable} onClick={() => { setConExtras(v); if (!v) setN({ ...n, hed: 0, hen: 0, heddf: 0, hendf: 0, rn: 0, rdf: 0 }) }} className={`h-9 rounded-lg text-sm font-semibold transition-all ${conExtras === v ? 'bg-white text-dark shadow-sm' : 'text-gray-500 hover:text-dark'}`}>
                    {v ? 'Sí' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {conExtras && (
              <div className="space-y-3 animate-[pop_.15s_ease-out]">
                <div className="rounded-xl border border-secondary/15 bg-secondary/5 px-3 py-2.5 text-xs text-gray-600">
                  Hora extra diurna de este trabajador: <b className="text-dark">{cop(prev.valorHora * parametros.heDiurna)}</b>.
                  Valor mínimo legal desde el 15 de julio de 2026: <b className="text-dark">{cop(horaExtraDiurnaMinima(parametros))}</b> (salario mínimo ÷ {parametros.horasMes} h × {parametros.heDiurna}).
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {campo('hed', 'Extra diurna', 'h', `${cop(prev.valorHora * parametros.heDiurna)} c/u`)}
                  {campo('hen', 'Extra nocturna', 'h', `${cop(prev.valorHora * parametros.heNocturna)} c/u`)}
                  {campo('heddf', 'Extra diurna dom./fest.', 'h', `${cop(prev.valorHora * (parametros.heDiurna + parametros.recargoDominical))} c/u`)}
                  {campo('hendf', 'Extra nocturna dom./fest.', 'h', `${cop(prev.valorHora * (parametros.heNocturna + parametros.recargoDominical))} c/u`)}
                  {campo('rn', 'Recargo nocturno', 'h', `+${cop(prev.valorHora * parametros.recargoNocturno)} c/u · 7 p. m.–6 a. m.`)}
                  {campo('rdf', 'Recargo dom./festivo', 'h', `+${cop(prev.valorHora * parametros.recargoDominical)} c/u`)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {campo('comisiones', 'Comisiones', '$', 'Salarial: suma para salud, pensión y prestaciones')}
              {campo('bonificacion', 'Bonificación no salarial', '$', 'No suma para prestaciones')}
            </div>
          </div>

          <SeccionTitulo n="2" titulo="Deducciones" sub="Lo que se descuenta del pago" />
          <div className="rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-soft px-3 py-2.5">
                <p className="text-xs text-gray-500">Aporte a salud del trabajador (4%)</p>
                <p className="text-sm font-bold text-red-600 tabular-nums">−{cop(prev.salud)}</p>
                <p className="text-[11px] text-gray-400">Automático · IBC {cop(prev.ibc)}</p>
              </div>
              <div className="rounded-xl bg-gray-soft px-3 py-2.5">
                <p className="text-xs text-gray-500">Aporte a pensión del trabajador (4%)</p>
                <p className="text-sm font-bold text-red-600 tabular-nums">−{cop(prev.pension)}</p>
                <p className="text-[11px] text-gray-400">Automático · IBC {cop(prev.ibc)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {campo('prestamo', 'Préstamo empresa', '$')}
              {campo('libranza', 'Libranza', '$')}
              {campo('retencion', 'Retención en la fuente', '$', 'Según cálculo del contador')}
              {campo('otrosDescuentos', 'Otros descuentos', '$')}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 px-6 py-5 bg-gray-soft/50">
          <p className="field-label">Vista previa del cálculo</p>
          <Calculo l={prev} />
        </div>
      </div>
    </Modal>
  )
}

function SeccionTitulo({ n, titulo, sub }: { n: string; titulo: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-7 w-7 rounded-lg bg-dark text-white text-xs font-bold flex items-center justify-center">{n}</span>
      <div><p className="text-sm font-bold text-dark leading-tight">{titulo}</p><p className="text-xs text-gray-500">{sub}</p></div>
    </div>
  )
}

function Fila({ k, v, sub, neg }: { k: string; v: number; sub?: string; neg?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <span className="text-gray-600">{k}{sub && <span className="block text-[11px] text-gray-400">{sub}</span>}</span>
      <span className={`tabular-nums whitespace-nowrap ${neg ? 'text-red-600' : 'text-dark'}`}>{neg ? '−' : ''}{cop(v)}</span>
    </div>
  )
}

function Calculo({ l }: { l: Liquidacion }) {
  return (
    <div className="text-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">Devengados</p>
      <Fila k={`Salario básico (${l.novedad.dias} días)`} v={l.basico} sub={`Acordado en el contrato: ${cop(l.empleado.salario)}`} />
      {l.auxilio > 0 && <Fila k="Auxilio de transporte" v={l.auxilio} sub="Salario ≤ 2 SMMLV" />}
      {l.extras.length === 0 ? <Fila k="Horas extra y recargos" v={0} sub="No trabajó horas extra este mes" /> : l.extras.map((x) => <Fila key={x.concepto} k={x.concepto} v={x.valor} sub={`${x.horas} h × ${cop(l.valorHora)} × ${x.factor}`} />)}
      {l.comisiones > 0 && <Fila k="Comisiones" v={l.comisiones} />}
      {l.bonificacion > 0 && <Fila k="Bonificación no salarial" v={l.bonificacion} />}
      <div className="flex justify-between py-2 border-t border-gray-200 mt-1 font-semibold"><span>Total devengado</span><span className="tabular-nums">{cop(l.devengado)}</span></div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-3">Deducciones · IBC {cop(l.ibc)}</p>
      <Fila k="Aporte a salud del trabajador (4%)" v={l.salud} neg />
      <Fila k="Aporte a pensión del trabajador (4%)" v={l.pension} neg />
      {l.fsp > 0 && <Fila k={`Fondo de solidaridad ${(l.tasaFsp * 100).toFixed(1)}%`} v={l.fsp} neg />}
      {l.otrosDescuentos > 0 && <Fila k="Préstamos, libranzas y otros" v={l.otrosDescuentos} neg />}
      <div className="flex justify-between py-2 border-t border-gray-200 mt-1 font-semibold"><span>Total deducciones</span><span className="tabular-nums text-red-600">−{cop(l.deducciones)}</span></div>
      <div className="flex justify-between items-center mt-3 rounded-xl bg-dark text-white px-4 py-3">
        <span className="font-semibold">Neto a pagar</span>
        <span className="text-lg font-extrabold tabular-nums">{cop(l.neto)}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Desprendible                                                        */
/* ------------------------------------------------------------------ */

function Desprendible({ liq: l, periodo, onClose }: { liq: Liquidacion; periodo: string; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Desprendible de pago"
      subtitle={`${l.empleado.nombre} · ${periodo}`}
      footer={<><button onClick={onClose} className="btn-secondary flex-1">Cerrar</button><button onClick={() => window.print()} className="btn flex-1 bg-dark text-white hover:bg-black">Imprimir / PDF</button></>}
    >
      <div className="print-area px-6 py-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex gap-3">
            <img src="/logo_circulo.png" alt="" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-sm font-extrabold text-dark leading-none">EMCAGUA APC</p>
              <p className="text-[11px] text-gray-500 mt-1">Comprobante de nómina · {periodo}</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p className="font-bold text-dark text-sm">{l.empleado.nombre}</p>
            <p>C.C. {l.empleado.cedula}</p>
            <p>{l.empleado.cargo}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          {[['Salario básico', cop(l.empleado.salario)], ['Días', String(l.novedad.dias)], ['EPS', l.empleado.eps], ['Pensión', l.empleado.pension]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-gray-soft px-3 py-2"><p className="text-gray-400">{k}</p><p className="font-semibold text-dark mt-0.5">{v}</p></div>
          ))}
        </div>
        <div className="mt-4"><Calculo l={l} /></div>
        <div className="grid grid-cols-2 gap-6 mt-8 text-[11px] text-gray-400">
          <p className="border-t border-gray-300 pt-1">Firma empleador</p>
          <p className="border-t border-gray-300 pt-1">Firma trabajador</p>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Prestaciones sociales                                               */
/* ------------------------------------------------------------------ */

function TabPrestaciones() {
  const { empleados, parametros } = useNomina()
  const hoy = new Date()
  const [corte, setCorte] = useState(hoy.toISOString().slice(0, 10))
  const [abierto, setAbierto] = useState<string | null>(null)
  const fCorte = new Date(corte + 'T00:00:00')
  const filas = empleados.filter((e) => e.activo).map((e) => prestaciones(e, fCorte, parametros))
  const t = (f: (x: (typeof filas)[number]) => number) => filas.reduce((s, x) => s + f(x), 0)
  const cal = calendarioObligaciones(hoy).filter((c) => c.dias >= -15).slice(0, 4)

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <section className="card p-5 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-dark">Prestaciones causadas a la fecha de corte</h3>
              <p className="text-xs text-gray-500 mt-1">Días comerciales (año de 360). Toca un empleado para ver la fórmula paso a paso.</p>
            </div>
            <label className="text-xs text-gray-500">Fecha de corte
              <input type="date" value={corte} onChange={(e) => setCorte(e.target.value)} className="field mt-1 h-9 py-0 w-44" />
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[['Prima de servicios', t((x) => x.prima.valor)], ['Cesantías', t((x) => x.cesantias.valor)], ['Intereses cesantías', t((x) => x.intereses.valor)], ['Vacaciones pendientes', t((x) => x.vacaciones.valor)]].map(([k, v]) => (
              <div key={k as string} className="rounded-2xl bg-gray-soft px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{k}</p>
                <p className="text-lg font-extrabold text-dark tabular-nums mt-1">{copCompacto(v as number)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h3 className="text-[15px] font-bold text-dark flex items-center gap-2"><Ico d={D.cal} /> Próximas fechas legales</h3>
          <ul className="mt-4 space-y-3">
            {cal.map((c) => (
              <li key={c.titulo + c.fecha.toISOString()} className="flex items-center gap-3">
                <span className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center leading-none shrink-0 ${c.dias < 0 ? 'bg-gray-100 text-gray-400' : c.dias <= 30 ? 'bg-red-50 text-red-600' : 'bg-secondary/10 text-secondary'}`}>
                  <span className="text-sm font-extrabold">{c.fecha.getDate()}</span>
                  <span className="text-[9px] font-bold uppercase">{MESES[c.fecha.getMonth()].slice(0, 3)}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark">{c.titulo}</p>
                  <p className="text-xs text-gray-500">{c.dias < 0 ? 'Vencida' : c.dias === 0 ? 'Hoy' : `Faltan ${c.dias} días`} · {c.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-gray-soft">
                <th className="th">Empleado</th>
                <th className="th text-right">Base (salario + aux.)</th>
                <th className="th text-right">Prima</th>
                <th className="th text-right">Cesantías</th>
                <th className="th text-right">Intereses</th>
                <th className="th text-right">Vacaciones</th>
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((x) => (
                <FilaPrest key={x.empleado.id} x={x} abierto={abierto === x.empleado.id} onToggle={() => setAbierto(abierto === x.empleado.id ? null : x.empleado.id)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-soft font-bold text-dark">
                <td className="td">Totales</td>
                <td className="td" />
                <td className="td text-right tabular-nums">{cop(t((x) => x.prima.valor))}</td>
                <td className="td text-right tabular-nums">{cop(t((x) => x.cesantias.valor))}</td>
                <td className="td text-right tabular-nums">{cop(t((x) => x.intereses.valor))}</td>
                <td className="td text-right tabular-nums">{cop(t((x) => x.vacaciones.valor))}</td>
                <td className="td text-right tabular-nums">{cop(t((x) => x.total))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      <p className="text-xs text-gray-400 mt-3">Cálculo sobre el salario actual. Si el salario cambió en el periodo o hay pagos variables, usa el promedio. Valida siempre con el contador antes de pagar.</p>
    </>
  )
}

function FilaPrest({ x, abierto, onToggle }: { x: ReturnType<typeof prestaciones>; abierto: boolean; onToggle: () => void }) {
  return (
    <>
      <tr onClick={onToggle} className="hover:bg-gray-soft/60 cursor-pointer">
        <td className="td">
          <div className="flex items-center gap-3">
            <Avatar nombre={x.empleado.nombre} size={32} />
            <div>
              <p className="font-semibold text-dark">{x.empleado.nombre}</p>
              <p className="text-xs text-gray-400">Ingreso {fecha(new Date(x.empleado.fechaIngreso + 'T00:00:00'))}</p>
            </div>
          </div>
        </td>
        <td className="td text-right tabular-nums text-gray-600">{cop(x.base)}</td>
        <td className="td text-right tabular-nums">{cop(x.prima.valor)}<p className="text-[11px] text-gray-400">{x.prima.dias} días</p></td>
        <td className="td text-right tabular-nums">{cop(x.cesantias.valor)}<p className="text-[11px] text-gray-400">{x.cesantias.dias} días</p></td>
        <td className="td text-right tabular-nums">{cop(x.intereses.valor)}</td>
        <td className="td text-right tabular-nums">{cop(x.vacaciones.valor)}<p className="text-[11px] text-gray-400">{num(x.vacaciones.diasPendientes, 1)} días háb.</p></td>
        <td className="td text-right tabular-nums font-bold text-dark">{cop(x.total)}</td>
      </tr>
      {abierto && (
        <tr className="bg-secondary/5">
          <td colSpan={7} className="px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                ['Prima de servicios', `Desde ${fecha(x.prima.desde)}`, x.prima.formula, x.prima.valor],
                ['Cesantías', `Desde ${fecha(x.cesantias.desde)}`, x.cesantias.formula, x.cesantias.valor],
                ['Intereses a las cesantías', '12% anual', x.intereses.formula, x.intereses.valor],
                ['Vacaciones', `${num(x.vacaciones.diasCausados, 1)} días causados − ${x.empleado.diasVacacionesDisfrutados} disfrutados`, x.vacaciones.formula, x.vacaciones.valor],
              ].map(([k, sub, f, v]) => (
                <div key={k as string} className="rounded-xl bg-white border border-secondary/10 px-3 py-2.5">
                  <div className="flex justify-between"><span className="font-semibold text-dark">{k}</span><span className="font-bold tabular-nums">{cop(v as number)}</span></div>
                  <p className="text-gray-400 mt-0.5">{sub}</p>
                  <p className="font-mono text-secondary mt-1">{f}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Empleados                                                           */
/* ------------------------------------------------------------------ */

function TabEmpleados() {
  const { empleados, guardarEmpleado, parametros } = useNomina()
  const toast = useToast()
  const [edit, setEdit] = useState<Empleado | null>(null)
  const nuevo = (): Empleado => ({ id: `E${String(empleados.length + 1).padStart(2, '0')}`, nombre: '', cedula: '', cargo: '', area: 'Operativa', salario: parametros.smmlv, fechaIngreso: new Date().toISOString().slice(0, 10), contrato: 'Indefinido', riesgoArl: 1, eps: '', pension: '', diasVacacionesDisfrutados: 0, activo: true })
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 rounded-2xl border border-secondary/15 bg-secondary/5 px-4 py-2.5 text-sm text-gray-600">
          <span className="h-8 w-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0"><Ico d={D.shield} /></span>
          <span>Cada empleado tiene una <b className="text-dark">clase de riesgo ARL</b> según sus funciones. La paga 100% la empresa.</span>
          <ArlBoton />
        </div>
        <button onClick={() => setEdit(nuevo())} className="btn-primary shrink-0"><Ico d={D.plus} /> Nuevo empleado</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {empleados.map((e) => (
          <div key={e.id} className={`card p-4 ${e.activo ? '' : 'opacity-60'}`}>
            <div className="flex items-start gap-3">
              <Avatar nombre={e.nombre} size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-dark truncate">{e.nombre}</p>
                <p className="text-xs text-gray-500">{e.cargo} · {e.area}</p>
              </div>
              <button onClick={() => setEdit(e)} className="h-8 w-8 rounded-lg text-gray-400 hover:text-dark hover:bg-gray-100 flex items-center justify-center" aria-label="Editar"><Ico d={D.edit} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <Dato k="Salario" v={cop(e.salario)} />
              <Dato k="Ingreso" v={fecha(new Date(e.fechaIngreso + 'T00:00:00'))} />
              <Dato k="Contrato" v={e.contrato} />
              <Dato k="Riesgo ARL" v={<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ARL_CLASES[e.riesgoArl - 1].color }} />Clase {e.riesgoArl} · {ARL_CLASES[e.riesgoArl - 1].nivel}</span>} />
            </div>
            {!e.activo && <span className="badge-muted mt-3">Inactivo</span>}
          </div>
        ))}
      </div>
      {edit && <EmpleadoModal e={edit} onClose={() => setEdit(null)} onSave={(x) => { guardarEmpleado(x); toast('Empleado guardado', x.nombre); setEdit(null) }} />}
    </>
  )
}

const Dato = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="rounded-lg bg-gray-soft px-2.5 py-1.5"><p className="text-gray-400">{k}</p><p className="font-semibold text-dark truncate">{v}</p></div>
)

function EmpleadoModal({ e, onClose, onSave }: { e: Empleado; onClose: () => void; onSave: (e: Empleado) => void }) {
  const { parametros } = useNomina()
  const [f, setF] = useState(e)
  const bajoMinimo = f.salario < parametros.smmlv
  const txt = (k: keyof Empleado, label: string, type = 'text') => (
    <div>
      <label className="field-label" htmlFor={`e-${k}`}>{label}</label>
      <input id={`e-${k}`} type={type} value={String(f[k] ?? '')} onChange={(ev) => setF({ ...f, [k]: ev.target.value })} className="field" />
    </div>
  )
  return (
    <Modal open onClose={onClose} title={e.nombre ? 'Editar empleado' : 'Nuevo empleado'} footer={<><button onClick={onClose} className="btn-secondary flex-1">Cancelar</button><button disabled={!f.nombre || !f.cedula || bajoMinimo} onClick={() => onSave(f)} className="btn-primary flex-1">Guardar</button></>}>
      <div className="px-6 py-5 grid grid-cols-2 gap-4">
        <div className="col-span-2">{txt('nombre', 'Nombre completo')}</div>
        {txt('cedula', 'Cédula')}
        {txt('cargo', 'Cargo')}
        <div>
          <label className="field-label" htmlFor="e-sal">Salario básico</label>
          <input id="e-sal" inputMode="numeric" value={f.salario.toLocaleString('es-CO')} onChange={(ev) => setF({ ...f, salario: Number(ev.target.value.replace(/\D/g, '')) || 0 })} className={`field ${bajoMinimo ? 'border-red-300' : ''}`} />
          {bajoMinimo && <p className="text-[11px] text-red-600 mt-1">No puede ser menor a {cop(parametros.smmlv)}</p>}
        </div>
        {txt('fechaIngreso', 'Fecha de ingreso', 'date')}
        <div>
          <label className="field-label">Contrato</label>
          <select value={f.contrato} onChange={(ev) => setF({ ...f, contrato: ev.target.value as Empleado['contrato'] })} className="field"><option>Indefinido</option><option>Término fijo</option></select>
        </div>
        <div>
          <label className="field-label">Área</label>
          <select value={f.area} onChange={(ev) => setF({ ...f, area: ev.target.value as Empleado['area'] })} className="field"><option>Administrativa</option><option>Operativa</option></select>
        </div>
        <div>
          <label className="field-label" htmlFor="e-vac">Días de vacaciones disfrutados</label>
          <input id="e-vac" inputMode="numeric" value={f.diasVacacionesDisfrutados} onChange={(ev) => setF({ ...f, diasVacacionesDisfrutados: Number(ev.target.value.replace(/\D/g, '')) || 0 })} className="field" />
        </div>
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="field-label !mb-0">Clase de riesgo ARL</p>
            <ArlBoton />
          </div>
          <ArlSelector value={f.riesgoArl} salario={f.salario} onChange={(c) => setF({ ...f, riesgoArl: c })} />
        </div>
        {txt('eps', 'EPS')}
        {txt('pension', 'Fondo de pensión')}
        <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={f.activo} onChange={(ev) => setF({ ...f, activo: ev.target.checked })} className="accent-secondary w-4 h-4" /> Empleado activo (entra en la nómina)</label>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Parámetros                                                          */
/* ------------------------------------------------------------------ */

function TabParametros() {
  const { parametros: p, setParametros } = useNomina()
  const toast = useToast()
  const [f, setF] = useState(p)
  const money = (k: keyof Parametros, label: string, ayuda: string) => (
    <div>
      <label className="field-label">{label}</label>
      <input inputMode="numeric" value={(f[k] as number).toLocaleString('es-CO')} onChange={(e) => setF({ ...f, [k]: Number(e.target.value.replace(/\D/g, '')) || 0 })} className="field tabular-nums" />
      <p className="text-[11px] text-gray-400 mt-1">{ayuda}</p>
    </div>
  )
  const pct = (k: keyof Parametros, label: string) => (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input inputMode="decimal" value={String(+((f[k] as number) * 100).toFixed(3))} onChange={(e) => setF({ ...f, [k]: (Number(e.target.value.replace(',', '.')) || 0) / 100 })} className="field pr-8 tabular-nums" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
      </div>
    </div>
  )
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <section className="card p-5 lg:col-span-2 space-y-6">
        <div>
          <h3 className="text-[15px] font-bold text-dark">Valores {f.anio}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            {money('smmlv', 'Salario mínimo (SMMLV)', 'Decreto salario mínimo 2026')}
            {money('auxilioTransporte', 'Auxilio de transporte', 'Para salarios ≤ 2 SMMLV')}
            {money('horasMes', 'Horas mes (divisor)', '42 h/semana desde 15-jul-2026 → 210')}
          </div>
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-dark">Seguridad social y parafiscales</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            {pct('saludEmpleado', 'Salud empleado')}
            {pct('pensionEmpleado', 'Pensión empleado')}
            {pct('saludEmpleador', 'Salud empleador')}
            {pct('pensionEmpleador', 'Pensión empleador')}
            {pct('caja', 'Caja compensación')}
            {pct('icbf', 'ICBF')}
            {pct('sena', 'SENA')}
          </div>
          <label className="flex items-start gap-2.5 mt-4 text-sm text-gray-600">
            <input type="checkbox" checked={f.exoneradoParafiscales} onChange={(e) => setF({ ...f, exoneradoParafiscales: e.target.checked })} className="accent-secondary w-4 h-4 mt-0.5" />
            <span>Exonerada de salud del empleador, SENA e ICBF (art. 114-1 E.T.) para trabajadores que ganan menos de 10 SMMLV. <b>Confirmar con el contador si aplica a EMCAGUA APC.</b></span>
          </label>
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-dark">Horas extra y recargos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            {pct('recargoNocturno', 'Recargo nocturno')}
            {pct('recargoDominical', 'Recargo dom./festivo')}
            <div>
              <label className="field-label">Factor extra diurna</label>
              <input inputMode="decimal" value={f.heDiurna} onChange={(e) => setF({ ...f, heDiurna: Number(e.target.value.replace(',', '.')) || 0 })} className="field" />
            </div>
            <div>
              <label className="field-label">Factor extra nocturna</label>
              <input inputMode="decimal" value={f.heNocturna} onChange={(e) => setF({ ...f, heNocturna: Number(e.target.value.replace(',', '.')) || 0 })} className="field" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setF(p)} className="btn-secondary">Descartar</button>
          <button onClick={() => { setParametros(f); toast('Parámetros actualizados', 'Se recalculan todas las nóminas en borrador') }} className="btn-primary">Guardar parámetros</button>
        </div>
      </section>
      <section className="card p-5 h-fit">
        <h3 className="text-[15px] font-bold text-dark">Notas legales 2026</h3>
        <ul className="mt-3 space-y-2.5 text-sm text-gray-600 list-disc pl-4">
          <li>Salario mínimo 2026: $1.750.905; auxilio de transporte: $249.095.</li>
          <li>Ley 2466 de 2025: la jornada nocturna empieza a las 7:00 p. m.; recargo dominical/festivo 90% desde el 1 de julio de 2026 (100% desde julio de 2027).</li>
          <li>Jornada máxima de 42 horas semanales desde el 15 de julio de 2026 (divisor 210 h). Hora extra diurna mínima: <b>{cop(horaExtraDiurnaMinima(f))}</b>.</li>
          <li>La retención en la fuente se registra manualmente según el cálculo del contador.</li>
          <li>Estos parámetros son una ayuda de cálculo; la responsabilidad final es del contador de la empresa.</li>
        </ul>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ayuda: riesgo ARL                                                   */
/* ------------------------------------------------------------------ */

function ArlSelector({ value, salario, onChange }: { value: Empleado['riesgoArl']; salario: number; onChange: (c: Empleado['riesgoArl']) => void }) {
  return (
    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
      {ARL_CLASES.map((c) => {
        const on = value === c.clase
        return (
          <button type="button" key={c.clase} onClick={() => onChange(c.clase)} className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${on ? 'bg-secondary/5' : 'hover:bg-gray-soft'}`}>
            <span className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${on ? 'border-secondary' : 'border-gray-300'}`}>{on && <span className="h-2 w-2 rounded-full bg-secondary" />}</span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-dark">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                Clase {c.clase} · {c.nivel}
                <span className="text-xs font-normal text-gray-400">{(ARL_TARIFA[c.clase] * 100).toFixed(3).replace('.', ',')}%</span>
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">{c.ejemplos}</span>
            </span>
            <span className="text-right shrink-0">
              <span className="block text-sm font-bold text-dark tabular-nums">{cop(salario * ARL_TARIFA[c.clase])}</span>
              <span className="block text-[10px] text-gray-400">al mes</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ArlBoton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline whitespace-nowrap ${className}`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        ¿Qué es el riesgo ARL?
      </button>
      {open && <ArlAyuda onClose={() => setOpen(false)} />}
    </>
  )
}

function ArlAyuda({ onClose }: { onClose: () => void }) {
  const { empleados } = useNomina()
  const activos = empleados.filter((e) => e.activo)
  return (
    <Modal open onClose={onClose} size="lg" title="¿Qué es el riesgo ARL?" subtitle="Guía rápida para clasificar a los empleados" footer={<button onClick={onClose} className="btn-primary flex-1">Entendido</button>}>
      <div className="px-6 py-5 space-y-5 text-sm text-gray-600">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['Qué es', 'La ARL (Administradora de Riesgos Laborales) cubre accidentes de trabajo y enfermedades laborales: atención médica, incapacidades e indemnizaciones.'],
            ['Quién la paga', 'El 100% lo paga la empresa. Al trabajador no se le descuenta nada de su salario.'],
            ['Cómo se calcula', 'Salario (IBC) × la tarifa de la clase de riesgo del trabajador. Entre más peligroso el trabajo, más alta la tarifa.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-gray-soft p-3">
              <p className="text-xs font-bold text-dark">{t}</p>
              <p className="text-xs mt-1 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm font-bold text-dark mb-2">Las 5 clases de riesgo</p>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-soft">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Clase</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Tarifa</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Ejemplos en EMCAGUA</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-500">Empleados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ARL_CLASES.map((c) => (
                  <tr key={c.clase}>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5 font-semibold text-dark"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.clase} · {c.nivel}</span></td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold text-dark">{(ARL_TARIFA[c.clase] * 100).toFixed(3).replace('.', ',')}%</td>
                    <td className="px-3 py-2.5">{c.ejemplos}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{activos.filter((e) => e.riesgoArl === c.clase).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-secondary/15 bg-secondary/5 p-3">
          <p className="text-xs font-bold text-dark">Ejemplo</p>
          <p className="text-xs mt-1">Un fontanero que gana $1.950.000 está en clase IV: la empresa paga $1.950.000 × 4,35% = <b className="text-dark">$84.825 al mes</b> a la ARL.</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex gap-2.5">
          <Ico d={D.warn} className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900">La clase <b>no la escoge libremente la empresa</b>: la define la ARL según la actividad económica y las funciones reales del cargo. Afiliar a alguien en una clase más baja para pagar menos puede dejarlo sin cobertura en un accidente. Confirma la clase de cada cargo con el contador o la ARL de EMCAGUA.</p>
        </div>
      </div>
    </Modal>
  )
}
