import { useMemo, useState } from 'react'
import { usePagina } from '../hooks'
import { useData } from '../data/DataContext'
import { CHART, MESES } from '../data/constants'
import { valorPeriodo } from '../data/tarifa'
import { clavePeriodo, generacionPeriodo, leerPeriodo, nombrePeriodo, periodosFacturados } from '../data/billing'
import type { Factura } from '../data/types'
import Modal from '../components/ui/Modal'
import Paginacion from '../components/ui/Paginacion'
import StatTile from '../components/ui/StatTile'
import Qr from '../components/Qr'
import { codigoFactura, urlVerificacion } from '../data/verificacion'
import { ColumnChart } from '../components/charts/charts'
import { formatCutoff, getNextCutoff, getGenerationDate } from '../utils/cutoff'
import { cop, copCompacto, fecha, fechaCorta, pct } from '../utils/format'
import { exportarXls } from '../utils/excel'
import { getUsername } from '../utils/session'

const POR_PAGINA = 12

export default function Facturacion() {
  const { facturas, usuarios } = useData()
  const periodos = useMemo(() => periodosFacturados(usuarios, 12).reverse(), [usuarios])
  const ult = periodos[0]
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<'Todos' | 'Pagada' | 'Pendiente' | 'Vencida'>('Todos')
  const [periodo, setPeriodo] = useState(`${ult.anio}-${ult.mes}`)
  const [sel, setSel] = useState<Factura | null>(null)

  const nextCutoff = getNextCutoff()
  const nextGeneration = getGenerationDate(nextCutoff)
  const generadas = new Date() >= generacionPeriodo(ult.mes, ult.anio)

  const delPeriodo = useMemo(() => {
    if (periodo === 'Todos') return facturas
    const { anio, mes } = leerPeriodo(periodo)
    return facturas.filter((f) => f.anio === anio && f.mes === mes)
  }, [facturas, periodo])

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    return delPeriodo.filter((f) => {
      if (q && !f.cliente.toLowerCase().includes(q) && !f.id.toLowerCase().includes(q) && !f.clienteId.includes(q)) return false
      if (estado === 'Pagada' && f.estado !== 'Pagada') return false
      if (estado === 'Pendiente' && (f.estado !== 'Pendiente' || f.vencida)) return false
      if (estado === 'Vencida' && !f.vencida) return false
      return true
    })
  }, [delPeriodo, search, estado])

  const [pagina, setPagina] = usePagina([search, estado, periodo].join('|'))

  const total = delPeriodo.reduce((s, f) => s + f.monto, 0)
  const pagadas = delPeriodo.filter((f) => f.estado === 'Pagada')
  const recaudado = pagadas.reduce((s, f) => s + f.monto, 0)
  const pend = delPeriodo.filter((f) => f.estado === 'Pendiente')
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const pag = Math.min(pagina, totalPaginas)
  const etiqueta = periodo === 'Todos' ? 'Últimos 12 meses' : (() => { const { anio, mes } = leerPeriodo(periodo); return nombrePeriodo(mes, anio) })()

  const exportar = () =>
    exportarXls(
      `EMCAGUA-Facturas-${etiqueta.replace(/\s/g, '-')}`,
      'EMCAGUA APC — Facturación',
      `${etiqueta} · ${filtradas.length} facturas · total ${cop(filtradas.reduce((s, f) => s + f.monto, 0))} · generado ${new Date().toLocaleString('es-CO')}`,
      ['Factura', 'Cliente', 'ID', 'Barrio', 'Estrato', 'Periodo', 'Consumo (m³)', 'Monto', 'Vencimiento', 'Estado'],
      filtradas.map((f) => [f.id, f.cliente, f.clienteId, f.barrio, `E${f.estrato}`, f.periodo, f.consumo, f.monto, fechaCorta(f.vencimiento), f.vencida ? 'Vencida' : f.estado]),
      [6, 7],
    )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-dark">Facturación</h1>
          <p className="text-sm text-gray-500 mt-1">{facturas.length} facturas de {usuarios.length} suscriptores en los últimos 12 meses</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={generadas ? 'badge-ok' : 'badge-muted'}>
              {generadas ? `✓ ${nombrePeriodo(ult.mes, ult.anio)} generadas` : 'Generación automática'}
            </span>
            <span className="badge-muted">Próxima generación: {formatCutoff(nextGeneration)}</span>
            <span className="badge bg-secondary/10 text-secondary border-secondary/20">Corte: {formatCutoff(nextCutoff)}</span>
          </div>
        </div>
        <button onClick={exportar} className="btn-secondary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
          Exportar Excel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile label="Facturado" value={copCompacto(total)} sub={`${delPeriodo.length} facturas · ${etiqueta}`} />
        <StatTile label="Recaudado" value={copCompacto(recaudado)} sub={`${pagadas.length} pagadas · ${pct(total ? recaudado / total : 0)} del valor`} tone="primary">
          <div className="h-1.5 rounded-full bg-gray-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: `${total ? (recaudado / total) * 100 : 0}%`, background: CHART.serie1 }} /></div>
        </StatTile>
        <StatTile label="Por cobrar" value={copCompacto(pend.reduce((s, f) => s + f.monto, 0))} sub={`${pend.length} pendientes · ${pend.filter((f) => f.vencida).length} vencidas`} tone="danger" />
        <div className="card p-5">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">Facturas por estado</p>
          <div className="mt-3 space-y-2">
            {[
              { l: 'Pagadas', n: pagadas.length, c: 'bg-green-500' },
              { l: 'Por vencer', n: pend.filter((f) => !f.vencida).length, c: 'bg-amber-400' },
              { l: 'Vencidas', n: pend.filter((f) => f.vencida).length, c: 'bg-red-500' },
            ].map((x) => (
              <button key={x.l} onClick={() => setEstado(x.l === 'Pagadas' ? 'Pagada' : x.l === 'Vencidas' ? 'Vencida' : 'Pendiente')} className="w-full flex items-center gap-2 text-xs group">
                <span className={`h-2 w-2 rounded-full ${x.c}`} />
                <span className="text-gray-600 group-hover:text-dark">{x.l}</span>
                <span className="ml-auto font-bold text-dark tabular-nums">{x.n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label className="field-label" htmlFor="buscar-f">Buscar</label>
            <input id="buscar-f" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Factura, cliente o ID" className="field" />
          </div>
          <div className="md:col-span-3">
            <label className="field-label">Periodo</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="field">
              <option value="Todos">Todos (12 meses)</option>
              {periodos.map((p) => <option key={`${p.anio}-${p.mes}`} value={`${p.anio}-${p.mes}`}>{MESES[p.mes - 1]} {p.anio}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="field-label">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} className="field">
              <option>Todos</option>
              <option value="Pagada">Pagadas</option>
              <option value="Pendiente">Por vencer</option>
              <option value="Vencida">Vencidas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-soft">
                <th className="th">Factura</th>
                <th className="th">Cliente</th>
                <th className="th">Periodo</th>
                <th className="th text-right">Consumo</th>
                <th className="th text-right">Monto</th>
                <th className="th">Vence</th>
                <th className="th">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No hay facturas con estos filtros</td></tr>
              ) : (
                filtradas.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA).map((f) => (
                  <tr key={f.id} onClick={() => setSel(f)} className="hover:bg-gray-50/60 cursor-pointer">
                    <td className="td font-mono text-xs text-gray-600">{f.id}</td>
                    <td className="td"><p className="font-semibold text-dark whitespace-nowrap">{f.cliente}</p><p className="text-[11px] text-gray-400">{f.clienteId} · {f.barrio} · E{f.estrato}</p></td>
                    <td className="td text-gray-600 whitespace-nowrap">{f.periodo}</td>
                    <td className="td text-right tabular-nums">{f.consumo} m³</td>
                    <td className="td text-right font-bold text-dark tabular-nums">{cop(f.monto)}</td>
                    <td className="td text-xs text-gray-500">{fechaCorta(f.vencimiento)}</td>
                    <td className="td">{f.estado === 'Pagada' ? <span className="badge-ok">Pagada</span> : <span className={f.vencida ? 'badge-bad' : 'badge-warn'}>{f.vencida ? 'Vencida' : 'Por vencer'}</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={pag} total={totalPaginas} items={filtradas.length} porPagina={POR_PAGINA} onChange={setPagina} />
      </div>

      {sel && <DetalleFactura factura={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function DetalleFactura({ factura: f, onClose }: { factura: Factura; onClose: () => void }) {
  const { usuarios } = useData()
  const u = usuarios.find((x) => x.id === f.clienteId)
  const hist = (u?.historial ?? []).filter((h) => clavePeriodo(h.mes, h.anio) <= clavePeriodo(f.mes, f.anio)).slice(-6)
  const anterior = u?.historial.find((h) => clavePeriodo(h.mes, h.anio) === clavePeriodo(f.mes, f.anio) - 1)

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Factura de servicio público"
      subtitle={f.id}
      headerExtra={<span className="badge bg-dark text-white border-dark">SOLO ADMIN</span>}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary flex-1">Cerrar</button>
          <button onClick={() => window.print()} className="btn flex-1 bg-dark text-white hover:bg-black">Imprimir / PDF</button>
        </>
      }
    >
      <div className="print-area px-6 py-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex gap-3">
            <img src="/logo_circulo.png" alt="EMCAGUA" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-sm font-extrabold text-dark leading-none">EMCAGUA APC</p>
              <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide mt-1">Empresa de El Carmen y Guamalito</p>
              <p className="text-[11px] text-gray-500">Administración Pública Cooperativa</p>
              <p className="text-[11px] text-gray-400">El Carmen, Norte de Santander</p>
            </div>
          </div>
          <div className="text-right">
            {f.estado === 'Pagada' ? <span className="badge-ok">PAGADA</span> : <span className={f.vencida ? 'badge-bad' : 'badge-warn'}>{f.vencida ? 'VENCIDA' : 'PENDIENTE'}</span>}
            {f.fechaPago && <p className="text-[11px] text-gray-500 mt-2">Pagada el {fecha(f.fechaPago)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-gray-soft rounded-xl p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Suscriptor</p>
            <p className="text-sm font-bold text-dark mt-1">{f.cliente}</p>
            <p className="text-xs text-gray-500">ID {f.clienteId} · {f.barrio} · Estrato {f.estrato}</p>
            <p className="text-xs text-gray-500">{u?.medidor}</p>
          </div>
          <div className="bg-gray-soft rounded-xl p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Periodo facturado</p>
            <p className="text-sm font-bold text-dark mt-1">{f.periodo}</p>
            <p className="text-xs text-gray-500">Vence: <b className="text-dark">{fechaCorta(f.vencimiento)}</b> (primer viernes)</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
          <div className="flex justify-between px-4 py-2.5"><span className="text-gray-500">Consumo del periodo</span><span className="font-semibold tabular-nums">{f.consumo} m³ · {(f.consumo * 1000).toLocaleString('es-CO')} L</span></div>
          {anterior && <div className="flex justify-between px-4 py-2.5"><span className="text-gray-500">Consumo periodo anterior</span><span className="tabular-nums text-gray-600">{anterior.consumo} m³</span></div>}
          {valorPeriodo(f.consumo, f.estrato, f.mes, f.anio).lineas.filter((l) => l.tipo !== 'total').map((l) => (
            <div key={l.concepto} className="flex justify-between px-4 py-2"><span className={l.tipo === 'subsidio' ? 'text-green-700' : 'text-gray-500'}>{l.concepto}{l.cantidad && <span className="text-gray-400"> · {l.cantidad}</span>}</span><span className={`tabular-nums ${l.tipo === 'subsidio' ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>{cop(l.valor)}</span></div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-dark text-white rounded-b-xl"><span className="font-semibold">Total a pagar</span><span className="text-lg font-extrabold tabular-nums">{cop(f.monto)} <span className="text-xs font-normal text-white/60">COP</span></span></div>
        </div>

        {hist.length > 1 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-dark uppercase tracking-wide mb-2">Consumo últimos {hist.length} meses</p>
            <ColumnChart
              data={hist.map((h) => ({ label: MESES[h.mes - 1].slice(0, 3), full: nombrePeriodo(h.mes, h.anio), values: [h.consumo], colors: [h.mes === f.mes && h.anio === f.anio ? CHART.serie1 : '#b9d9d4'] }))}
              series={[{ name: 'Consumo', color: CHART.serie1 }]}
              format={(n) => `${n} m³`}
              axisFormat={(n) => `${n}`}
              showTotals
              height={160}
            />
          </div>
        )}

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-3 items-center bg-gray-soft rounded-xl p-3">
            <Qr value={urlVerificacion(f.id, codigoFactura(f))} size={96} />
            <div className="text-[11px] text-gray-500 leading-relaxed">
              <p className="font-mono font-bold text-dark">{f.id}</p>
              <p>Escanee para verificar la factura y ver si ya está pagada</p>
              <p>Código <b className="font-mono text-dark">{codigoFactura(f)}</b></p>
            </div>
          </div>
          <div className="flex-1 bg-secondary/5 border border-secondary/10 rounded-xl p-3 text-xs text-gray-600">
            <p className="font-bold text-secondary uppercase tracking-wider text-[11px]">Información de pago</p>
            <p className="mt-1">Pago en oficinas de EMCAGUA · Lun–Vie 8 a. m.–4 p. m.</p>
            <p>Si vence, se suspende el servicio. Reconexión $30.000.</p>
            <p className="text-gray-400 mt-1">Consultada por {getUsername()} · {new Date().toLocaleString('es-CO')}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
