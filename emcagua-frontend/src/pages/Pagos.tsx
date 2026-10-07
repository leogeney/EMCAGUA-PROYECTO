import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import type { Factura, Pago } from '../data/types'
import PagoDialog from '../components/PagoDialog'
import Modal from '../components/ui/Modal'
import Paginacion from '../components/ui/Paginacion'
import StatTile from '../components/ui/StatTile'
import Qr from '../components/Qr'
import { codigoRecibo, urlVerificacion } from '../data/verificacion'
import { useToast } from '../components/ui/Toast'
import { cop, copCompacto, fecha, fechaCorta, hora, mismoDia } from '../utils/format'
import { exportarXls } from '../utils/excel'
import { getUsername, puede } from '../utils/session'
import { CajaDia, Gastos, ResumenCaja } from './CajaTabs'
import { usePagina } from '../hooks'
import { limpiarCedula } from '../data/propietarios'

type Tab = 'cobrar' | 'caja' | 'gastos' | 'mes'
const POR_PAGINA = 10
const SIETE_DIAS = 7 * 86_400_000

export default function Pagos() {
  const { pagos, facturas, usuarios, pagarFactura, pagarFacturas } = useData()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [filtroPend, setFiltroPend] = useState(() => params.get('q') ?? '')
  const [filtroHist, setFiltroHist] = useState('')
  const [cobrando, setCobrando] = useState<Factura | null>(null)
  const [cobrandoTodo, setCobrandoTodo] = useState<Factura[] | null>(null)
  const [recibo, setRecibo] = useState<Pago | null>(null)
  const admin = puede('gastos')
  const tab = (['cobrar', 'caja', 'gastos', 'mes'].includes(params.get('tab') ?? '') ? params.get('tab') : 'cobrar') as Tab
  const setTab = (t: Tab) => setParams(t === 'cobrar' ? {} : { tab: t }, { replace: true })
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const pagosHoy = useMemo(() => pagos.filter((p) => mismoDia(p.timestamp, ahora)), [pagos, ahora])
  const cajaHoy = pagosHoy.reduce((s, p) => s + p.monto, 0)
  const cajaSemana = useMemo(() => pagos.filter((p) => ahora.getTime() - p.timestamp < SIETE_DIAS).reduce((s, p) => s + p.monto, 0), [pagos, ahora])
  const estadoServicio = useMemo(() => new Map(usuarios.map((u) => [u.id, u.estado])), [usuarios])
  const predio = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios])
  const cedulaDe = (clienteId: string) => limpiarCedula(predio.get(clienteId)?.cedula ?? '')
  // Facturas pendientes de cada propietario (todas sus casas)
  const pendPorDueno = useMemo(() => {
    const m = new Map<string, Factura[]>()
    for (const f of facturas) {
      if (f.estado !== 'Pendiente') continue
      const k = limpiarCedula(predio.get(f.clienteId)?.cedula ?? '') || f.clienteId
      m.set(k, [...(m.get(k) ?? []), f])
    }
    return m
  }, [facturas, predio])

  const pendientes = useMemo(() => {
    const q = filtroPend.trim().toLowerCase()
    return facturas
      .filter((f) => f.estado === 'Pendiente')
      .filter((f) => !q || f.cliente.toLowerCase().includes(q) || f.id.toLowerCase().includes(q) || f.clienteId.includes(q) || (q.replace(/\D/g, '').length >= 4 && limpiarCedula(predio.get(f.clienteId)?.cedula ?? '').includes(q.replace(/\D/g, ''))))
      .sort((a, b) => Number(b.vencida) - Number(a.vencida) || a.vencimiento.getTime() - b.vencimiento.getTime())
  }, [facturas, filtroPend, predio])
  const totalPend = facturas.filter((f) => f.estado === 'Pendiente')

  const historial = useMemo(() => {
    const q = filtroHist.trim().toLowerCase()
    return pagos.filter((p) => !q || p.cliente.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.clienteId.includes(q) || p.facturaIds.some((f) => f.toLowerCase().includes(q)))
  }, [pagos, filtroHist])

  const [paginaPend, setPaginaPend] = usePagina(filtroPend)
  const [paginaHist, setPaginaHist] = usePagina(filtroHist)

  const totPagPend = Math.max(1, Math.ceil(pendientes.length / POR_PAGINA))
  const totPagHist = Math.max(1, Math.ceil(historial.length / POR_PAGINA))
  const pPend = Math.min(paginaPend, totPagPend)
  const pHist = Math.min(paginaHist, totPagHist)

  const confirmarCobro = async (datos: Parameters<typeof pagarFactura>[1]) => {
    if (!cobrando) return
    const p = await pagarFactura(cobrando.id, datos)
    if (p) {
      const cortado = estadoServicio.get(cobrando.clienteId) === 'Cortado'
      toast('Pago registrado', `${p.id} · ${cop(p.monto)}${p.vueltos ? ` · vueltos ${cop(p.vueltos)}` : ''}${cortado ? ' · el servicio sigue cortado: reactívalo en Usuarios' : ''}`)
      setRecibo(p)
    }
    setCobrando(null)
  }

  const confirmarTodo = async (datos: Parameters<typeof pagarFacturas>[1]) => {
    if (!cobrandoTodo) return
    const p = await pagarFacturas(cobrandoTodo.map((f) => f.id), datos)
    if (p) { toast('Pago registrado', `${p.id} · ${cop(p.monto)} · ${p.facturaIds.length} facturas${p.vueltos ? ` · vueltos ${cop(p.vueltos)}` : ''}`); setRecibo(p) }
    setCobrandoTodo(null)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-dark">Pagos y caja</h1>
          <p className="text-sm text-gray-500 mt-1">Cobro de facturas, arqueo y cierre de caja{admin ? ', gastos y resumen para el contador' : ''}.</p>
        </div>
        <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
          {([['cobrar', 'Cobrar'], ['caja', 'Caja del día'], ...(admin ? [['gastos', 'Gastos'], ['mes', 'Resumen mensual']] : [])] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 h-9 rounded-lg text-sm font-semibold whitespace-nowrap ${tab === k ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>{l}</button>
          ))}
        </div>
      </div>

      {tab === 'cobrar' && (<>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile label="Caja de hoy" value={copCompacto(cajaHoy)} sub={`${pagosHoy.length} pagos · ${cop(pagosHoy.filter((p) => p.metodo === 'Efectivo').reduce((s, p) => s + p.monto, 0))} en efectivo`} tone="primary" />
        <StatTile label="Últimos 7 días" value={copCompacto(cajaSemana)} sub={`${pagos.filter((p) => ahora.getTime() - p.timestamp < SIETE_DIAS).length} pagos`} />
        <StatTile label="Por cobrar" value={copCompacto(totalPend.reduce((s, f) => s + f.monto, 0))} sub={`${totalPend.length} facturas · ${totalPend.filter((f) => f.vencida).length} vencidas`} tone="danger" />
        <StatTile label="Último pago" value={<span className="text-lg">{pagos[0]?.cliente ?? '—'}</span>} sub={pagos[0] ? `${cop(pagos[0].monto)} · ${mismoDia(pagos[0].timestamp, ahora) ? 'hoy' : fecha(pagos[0].timestamp)} ${hora(pagos[0].timestamp)}` : ''} />
      </div>

      {/* Pendientes */}
      <section className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-dark">Cobrar facturas pendientes</h3>
            <p className="text-xs text-gray-500 mt-0.5">Primero las vencidas</p>
          </div>
          <div className="flex items-center gap-2">
            <SearchBox value={filtroPend} onChange={setFiltroPend} placeholder="Cliente, cédula, código o factura" />
            <button
              className="btn-sm"
              onClick={() => exportarXls(`EMCAGUA-Pendientes-${new Date().toISOString().slice(0, 10)}`, 'EMCAGUA APC — Facturas pendientes', `Generado ${new Date().toLocaleString('es-CO')} · ${pendientes.length} facturas`, ['Factura', 'Cliente', 'ID', 'Periodo', 'Monto', 'Vence', 'Estado'], pendientes.map((f) => [f.id, f.cliente, f.clienteId, f.periodo, f.monto, fechaCorta(f.vencimiento), f.vencida ? 'Vencida' : 'Por vencer']), [4])}
            >
              Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-soft">
                <th className="th">Factura</th>
                <th className="th">Cliente</th>
                <th className="th">Periodo</th>
                <th className="th text-right">Monto</th>
                <th className="th">Vence</th>
                <th className="th text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendientes.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No hay facturas pendientes{filtroPend && ' con ese filtro'} 🎉</td></tr>
              ) : (
                pendientes.slice((pPend - 1) * POR_PAGINA, pPend * POR_PAGINA).map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/60">
                    <td className="td font-mono text-xs text-gray-600">{f.id}</td>
                    <td className="td">
                      <p className="font-semibold text-dark">{f.cliente}</p>
                      <p className="text-[11px] text-gray-400">{f.clienteId} · {f.barrio}{estadoServicio.get(f.clienteId) === 'Cortado' && <span className="ml-1.5 text-red-600 font-semibold">· Cortado</span>}</p>
                    </td>
                    <td className="td text-gray-600 whitespace-nowrap">{f.periodo}</td>
                    <td className="td text-right font-bold text-dark tabular-nums">{cop(f.monto)}</td>
                    <td className="td"><span className={f.vencida ? 'badge-bad' : 'badge-warn'}>{f.vencida ? 'Vencida' : fechaCorta(f.vencimiento)}</span></td>
                    <td className="td text-right whitespace-nowrap">
                      {(() => {
                        const todas = pendPorDueno.get(cedulaDe(f.clienteId) || f.clienteId) ?? []
                        const casas = new Set(todas.map((x) => x.clienteId)).size
                        return todas.length > 1 && <button onClick={() => setCobrandoTodo(todas)} title={casas > 1 ? `Todas las facturas de sus ${casas} predios` : 'Todas sus facturas pendientes'} className="h-8 px-3 mr-1.5 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/5 text-xs font-semibold">Todo ({todas.length}{casas > 1 ? ` · ${casas} casas` : ''})</button>
                      })()}
                      <button onClick={() => setCobrando(f)} className="h-8 px-4 rounded-lg bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-sm transition-colors">Cobrar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={pPend} total={totPagPend} items={pendientes.length} porPagina={POR_PAGINA} onChange={setPaginaPend} />
      </section>

      {/* Historial */}
      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-dark">Historial de pagos</h3>
            <p className="text-xs text-gray-500 mt-0.5">Con fecha y hora exacta · {pagos.length} registros</p>
          </div>
          <div className="flex items-center gap-2">
            <SearchBox value={filtroHist} onChange={setFiltroHist} placeholder="Cliente, recibo o factura" />
            <button
              className="btn-sm"
              onClick={() => exportarXls(`EMCAGUA-Pagos-${new Date().toISOString().slice(0, 10)}`, 'EMCAGUA APC — Historial de pagos', `Caja hoy ${cop(cajaHoy)} · últimos 7 días ${cop(cajaSemana)} · ${historial.length} pagos`, ['Recibo', 'Cliente', 'ID', 'Concepto', 'Facturas', 'Monto', 'Método', 'Recibido', 'Vueltos', 'Fecha', 'Hora'], historial.map((p) => [p.id, p.cliente, p.clienteId, p.concepto, p.facturaIds.join(' '), p.monto, p.metodo, p.recibido ?? '', p.vueltos ?? '', fecha(p.timestamp), hora(p.timestamp)]), [5, 7, 8])}
            >
              Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-soft">
                <th className="th">Recibo</th>
                <th className="th">Cliente</th>
                <th className="th">Concepto</th>
                <th className="th text-right">Monto</th>
                <th className="th">Método</th>
                <th className="th">Fecha y hora</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historial.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">Sin pagos con ese filtro</td></tr>
              ) : (
                historial.slice((pHist - 1) * POR_PAGINA, pHist * POR_PAGINA).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="td font-mono text-xs font-semibold text-dark">{p.id}</td>
                    <td className="td"><p className="font-semibold text-dark whitespace-nowrap">{p.cliente}</p><p className="text-[11px] text-gray-400">{p.clienteId}</p></td>
                    <td className="td text-xs text-gray-500">{p.concepto}</td>
                    <td className="td text-right font-bold text-dark tabular-nums">{cop(p.monto)}</td>
                    <td className="td">
                      <span className="badge-muted">{p.metodo}</span>
                      {p.metodo === 'Efectivo' && p.vueltos !== undefined && p.vueltos > 0 && <p className="text-[11px] text-gray-400 mt-1">Vueltos {cop(p.vueltos)}</p>}
                      {p.comprobante && <p className="text-[11px] text-secondary font-medium mt-1">Con comprobante</p>}
                    </td>
                    <td className="td whitespace-nowrap"><p className="text-dark">{mismoDia(p.timestamp, ahora) ? 'Hoy' : fecha(p.timestamp)}</p><p className="text-[11px] font-mono text-gray-400">{hora(p.timestamp)}</p></td>
                    <td className="td text-right"><button onClick={() => setRecibo(p)} className="btn-sm">Recibo</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={pHist} total={totPagHist} items={historial.length} porPagina={POR_PAGINA} onChange={setPaginaHist} />
      </section>

      </>)}
      {tab === 'caja' && <CajaDia />}
      {tab === 'gastos' && admin && <Gastos />}
      {tab === 'mes' && admin && <ResumenCaja />}

      {cobrando && <PagoDialog
        open
        onClose={() => setCobrando(null)}
        titulo="Cobrar factura"
        cliente={cobrando ? `${cobrando.cliente} · ID ${cobrando.clienteId}` : ''}
        lineas={cobrando ? [{ label: `Factura ${cobrando.periodo} · ${cobrando.consumo} m³`, sub: cobrando.id, monto: cobrando.monto }] : []}
        onConfirm={confirmarCobro}
      />}
      {cobrandoTodo && <PagoDialog
        open
        onClose={() => setCobrandoTodo(null)}
        titulo="Cobrar todo en un solo recibo"
        cliente={`${cobrandoTodo[0].cliente} · ${new Set(cobrandoTodo.map((f) => f.clienteId)).size} predio(s)`}
        lineas={cobrandoTodo.map((f) => ({ label: `${predio.get(f.clienteId)?.direccion || `Predio ${f.clienteId}`} · ${f.periodo}`, sub: f.id, monto: f.monto }))}
        confirmLabel={`Cobrar ${cobrandoTodo.length} facturas`}
        onConfirm={confirmarTodo}
      />}


      {recibo && <Recibo pago={recibo} onClose={() => setRecibo(null)} />}
    </div>
  )
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 pl-9 pr-3 w-full md:w-60 rounded-lg border border-gray-200 bg-white text-xs text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary" />
    </div>
  )
}

function Recibo({ pago: p, onClose }: { pago: Pago; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Recibo de caja"
      subtitle={p.id}
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
            <img src="/logo_circulo.png" alt="EMCAGUA" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-sm font-extrabold text-dark leading-none">EMCAGUA APC</p>
              <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide mt-1">Empresa de El Carmen y Guamalito</p>
              <p className="text-[11px] text-gray-400">El Carmen, Norte de Santander</p>
            </div>
          </div>
          <div className="text-right">
            <span className="badge-ok">PAGADO</span>
            <p className="text-sm font-mono font-bold text-dark mt-2">{p.id}</p>
            <p className="text-[11px] text-gray-500">{fecha(p.timestamp)} · {hora(p.timestamp)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-gray-soft rounded-xl p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Suscriptor</p>
            <p className="text-sm font-bold text-dark mt-1">{p.cliente}</p>
            <p className="text-xs text-gray-500">ID {p.clienteId}</p>
          </div>
          <div className="bg-gray-soft rounded-xl p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Método</p>
            <p className="text-sm font-bold text-dark mt-1">{p.metodo}</p>
            <p className="text-xs text-gray-500">Atendió: {p.cajero ?? getUsername('Cajero')}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
          <div className="px-4 py-2.5">
            <p className="text-dark font-medium">{p.concepto}</p>
            <p className="text-[11px] text-gray-400 font-mono">{p.facturaIds.join(' · ')}</p>
          </div>
          {p.recibido !== undefined && (
            <>
              <div className="flex justify-between px-4 py-2.5"><span className="text-gray-500">Recibido en efectivo</span><span className="font-medium tabular-nums">{cop(p.recibido)}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-gray-500">Vueltos</span><span className="font-medium tabular-nums">{cop(p.vueltos ?? 0)}</span></div>
            </>
          )}
          {p.comprobante && (
            <div className="px-4 py-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Comprobante</p>
              <img src={p.comprobante} alt="Comprobante" className="w-full max-h-48 object-contain rounded-lg border border-gray-100" />
            </div>
          )}
          <div className="flex justify-between px-4 py-3 bg-green-50"><span className="font-bold text-dark">Total pagado</span><span className="text-lg font-extrabold text-green-700 tabular-nums">{cop(p.monto)}</span></div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Qr value={urlVerificacion(p.id, codigoRecibo(p))} size={100} />
          <div className="text-[11px] text-gray-500 leading-relaxed">
            <p className="font-mono font-bold text-dark">{p.id}</p>
            <p>Escanee para verificar que el pago es real · código <b className="font-mono text-dark">{codigoRecibo(p)}</b></p>
            <p>Firma cajero: ______________________</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
