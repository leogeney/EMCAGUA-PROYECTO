import { useState, useMemo, useEffect } from 'react'

type Pago = {
  id: string
  facturaId: string
  cliente: string
  clienteId: string
  monto: number
  metodo: 'Efectivo' | 'Transferencia'
  recibido?: number
  vueltos?: number
  comprobante?: string
  fecha: string
  hora: string
  timestamp: number
}

type FacturaPendiente = {
  id: string
  cliente: string
  clienteId: string
  periodo: string
  monto: number
}

const pendientesInicial: FacturaPendiente[] = [
  { id: 'FAC-2026-08-10235', cliente: 'María López', clienteId: '10235', periodo: 'Agosto 2026', monto: 57600 },
  { id: 'FAC-2026-08-10237', cliente: 'Ana Torres', clienteId: '10237', periodo: 'Agosto 2026', monto: 117000 },
  { id: 'FAC-2026-08-10241', cliente: 'Sofía Ramírez', clienteId: '10241', periodo: 'Agosto 2026', monto: 98800 },
  { id: 'FAC-2026-08-10244', cliente: 'Fernando Ortiz', clienteId: '10244', periodo: 'Agosto 2026', monto: 106600 },
  { id: 'FAC-2026-08-10246', cliente: 'Ejemplo Deuda Marzo', clienteId: '10246', periodo: 'Marzo 2026', monto: 57200 },
]

const pagosHoyInicial: Pago[] = [
  { id: 'PAG-001', facturaId: 'FAC-2026-08-10234', cliente: 'Juan Pérez', clienteId: '10234', monto: 46800, metodo: 'Efectivo', fecha: new Date().toLocaleDateString('es-CO'), hora: '09:32', timestamp: Date.now() - 1000 * 60 * 30 },
  { id: 'PAG-002', facturaId: 'FAC-2026-07-10236', cliente: 'Carlos Ruiz', clienteId: '10236', monto: 40800, metodo: 'Transferencia', fecha: new Date().toLocaleDateString('es-CO'), hora: '10:15', timestamp: Date.now() - 1000 * 60 * 90 },
]

export default function Pagos() {
  const [pendientes, setPendientes] = useState<FacturaPendiente[]>(pendientesInicial)
  const [pagos, setPagos] = useState<Pago[]>(pagosHoyInicial)
  const [filtroPago, setFiltroPago] = useState('')
  const [recibo, setRecibo] = useState<Pago | null>(null)
  const [filtroHistorial, setFiltroHistorial] = useState('')

  const pagar = (f: FacturaPendiente, metodo: Pago['metodo'] = 'Efectivo') => {
    let recibido: number | undefined
    let vueltos: number | undefined
    const crearPago = (comp?: string) => {
      const ahora = new Date()
      const nuevo: Pago = {
        id: `PAG-${String(pagos.length + pendientes.length + 3).padStart(3, '0')}`,
        facturaId: f.id,
        cliente: f.cliente,
        clienteId: f.clienteId,
        monto: f.monto,
        metodo,
        recibido,
        vueltos,
        comprobante: comp,
        fecha: ahora.toLocaleDateString('es-CO'),
        hora: ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
      }
      setPagos([nuevo, ...pagos])
      setPendientes(pendientes.filter((p) => p.id !== f.id))
    }
    if (metodo === 'Efectivo') {
      const input = prompt(`Factura ${f.id}\nMonto a pagar: $${f.monto.toLocaleString('es-CO')}\n\n¿Cuánto recibió en efectivo?`, String(f.monto))
      if (input === null) return
      recibido = Number(input.replace(/\D/g, ''))
      if (!recibido || recibido < f.monto) {
        alert(`Debe recibir al menos $${f.monto.toLocaleString('es-CO')}`)
        return
      }
      vueltos = recibido - f.monto
      if (vueltos > 0 && !confirm(`Recibido: $${recibido.toLocaleString('es-CO')}\nA pagar: $${f.monto.toLocaleString('es-CO')}\n\nVueltos a entregar: $${vueltos.toLocaleString('es-CO')}\n\n¿Confirmar pago?`)) return
      if (vueltos === 0) alert(`Pago exacto recibido. Sin vueltos.`)
      crearPago()
      return
    } else {
      if (!confirm(`Transferencia — Factura ${f.id} $${f.monto.toLocaleString('es-CO')}\n\n¿Deseas adjuntar foto del comprobante?`)) {
        crearPago()
        return
      }
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = 'image/*'
      fileInput.onchange = () => {
        const file = fileInput.files?.[0]
        if (!file) { crearPago(); return }
        const reader = new FileReader()
        reader.onload = () => crearPago(reader.result as string)
        reader.readAsDataURL(file)
      }
      fileInput.click()
      return
    }
    const ahora = new Date()
    const nuevo: Pago = {
      id: `PAG-${String(pagos.length + pendientes.length + 3).padStart(3, '0')}`,
      facturaId: f.id,
      cliente: f.cliente,
      clienteId: f.clienteId,
      monto: f.monto,
      metodo,
      recibido,
      vueltos,
      fecha: ahora.toLocaleDateString('es-CO'),
      hora: ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
    }
    setPagos([nuevo, ...pagos])
    setPendientes(pendientes.filter((p) => p.id !== f.id))
  }

  const [showCierre, setShowCierre] = useState(false)
  const [ahora, setAhora] = useState(new Date())
  const horaActual = ahora.getHours()
  const cierrePermitido = horaActual >= 17 || horaActual < 7
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  const cajaHoy = useMemo(() => pagos.filter((p) => p.fecha === new Date().toLocaleDateString('es-CO')).reduce((s, p) => s + p.monto, 0), [pagos])
  const cajaSemana = useMemo(() => pagos.reduce((s, p) => s + p.monto, 0), [pagos])
  const filtradosPendientes = pendientes.filter((p) => p.cliente.toLowerCase().includes(filtroPago.toLowerCase()) || p.id.toLowerCase().includes(filtroPago.toLowerCase()))
  const filtradosPagos = pagos.filter((p) => p.cliente.toLowerCase().includes(filtroHistorial.toLowerCase()) || p.facturaId.toLowerCase().includes(filtroHistorial.toLowerCase()) || p.clienteId.includes(filtroHistorial))

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Pagos</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de pagos por factura, historial por cliente y caja diaria/semanal con hora exacta</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setShowCierre(true)}
            disabled={!cierrePermitido}
            className={`h-10 px-5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 ${cierrePermitido ? 'bg-dark hover:bg-black text-white' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'}`}
            title={cierrePermitido ? 'Hacer cierre de caja' : 'Disponible desde las 5:00 PM hasta las 7:00 AM'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Cierre de caja
          </button>
          <span className={`text-[11px] ${cierrePermitido ? 'text-green-600' : 'text-gray-400'}`}>
            {cierrePermitido ? `✓ Disponible ahora (${ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})` : `Disponible desde las 5:00 PM (ahora ${ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}) · Activa 7:00 AM`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Caja diaria — Hoy</p>
          <p className="text-xl font-extrabold text-green-600 mt-1">${cajaHoy.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-500">{pagos.filter((p) => p.fecha === new Date().toLocaleDateString('es-CO')).length} pagos hoy</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Caja semanal</p>
          <p className="text-xl font-extrabold text-dark mt-1">${cajaSemana.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-500">{pagos.length} pagos registrados</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pendientes por cobrar</p>
          <p className="text-xl font-extrabold text-red-600 mt-1">{pendientes.length}</p>
          <p className="text-xs text-gray-500">${pendientes.reduce((s, p) => s + p.monto, 0).toLocaleString('es-CO')} por recaudar</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Último pago</p>
          <p className="text-sm font-bold text-dark mt-1">{pagos[0]?.cliente || '—'}</p>
          <p className="text-xs text-gray-500">{pagos[0]?.hora || ''} · {pagos[0]?.fecha || ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-dark">Registrar pago — Facturas pendientes</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input value={filtroPago} onChange={(e) => setFiltroPago(e.target.value)} placeholder="Buscar factura o cliente" className="pl-9 pr-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white w-64" />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button
              onClick={() => {
                const header = ['Factura', 'Cliente', 'ID', 'Periodo', 'Monto', 'Estado']
                const rows = filtradosPendientes.map((f) => [f.id, f.cliente, f.clienteId, f.periodo, String(f.monto), 'Pendiente'])
                let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>td{font-family:Arial;font-size:11pt} .hdr{background:#156D6D;color:#FFFFFF;font-weight:bold;text-align:center;border:1px solid #0F4F4F} .row0{background:#FFFFFF} .row1{background:#F8F9F7}</style></head><body>`
                html += `<table><tr><td colspan="6" style="font-size:14pt;font-weight:bold;color:#156D6D">EMCAGUA APC — Facturas Pendientes — ${new Date().toLocaleDateString('es-CO')}</td></tr>`
                html += `<tr>${header.map((h) => `<td class="hdr">${h}</td>`).join('')}</tr>`
                rows.forEach((r, i) => { const cls = i % 2 === 0 ? 'row0' : 'row1'; html += `<tr>${r.map((c) => `<td class="${cls}" style="border:1px solid #EDEEF0">${c}</td>`).join('')}</tr>` })
                html += `</table></body></html>`
                const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `EMCAGUA-Pendientes-${new Date().toISOString().slice(0, 10)}.xls`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-medium text-dark shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              Excel pendientes
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Factura</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Periodo</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Monto</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradosPendientes.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">No hay facturas pendientes con ese filtro</td></tr>
              ) : (
                filtradosPendientes.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 text-xs font-mono font-medium text-dark">{f.id}</td>
                    <td className="px-5 py-3.5"><p className="text-sm font-medium text-dark">{f.cliente}</p><p className="text-xs text-gray-400">{f.clienteId}</p></td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{f.periodo}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-dark">${f.monto.toLocaleString('es-CO')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => pagar(f, 'Efectivo')} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-sm">Efectivo</button>
                        <button onClick={() => pagar(f, 'Transferencia')} className="h-8 px-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-dark">Transferencia</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-dark">Historial por cliente — Con hora exacta del pago</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input value={filtroHistorial} onChange={(e) => setFiltroHistorial(e.target.value)} placeholder="Filtrar por cliente o factura" className="pl-9 pr-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white w-64" />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button
              onClick={() => {
                const header = ['Recibo', 'Cliente', 'ID', 'Factura', 'Monto', 'Método', 'Recibido', 'Vueltos', 'Fecha', 'Hora']
                const rows = filtradosPagos.map((p) => [p.id, p.cliente, p.clienteId, p.facturaId, String(p.monto), p.metodo, p.recibido ? String(p.recibido) : '', p.vueltos ? String(p.vueltos) : '0', p.fecha, p.hora])
                let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>td{font-family:Arial;font-size:11pt} .hdr{background:#156D6D;color:#FFFFFF;font-weight:bold;text-align:center;border:1px solid #0F4F4F} .row0{background:#FFFFFF} .row1{background:#F8F9F7} .num{text-align:right}</style></head><body>`
                html += `<table><tr><td colspan="10" style="font-size:14pt;font-weight:bold;color:#156D6D">EMCAGUA APC — Historial de Pagos — ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}</td></tr><tr><td colspan="10" style="font-size:9pt;color:#666">Caja diaria $${cajaHoy.toLocaleString('es-CO')} · Semanal $${cajaSemana.toLocaleString('es-CO')} · ${filtradosPagos.length} pagos</td></tr><tr><td></td></tr>`
                html += `<tr>${header.map((h) => `<td class="hdr">${h}</td>`).join('')}</tr>`
                rows.forEach((r, i) => { const cls = i % 2 === 0 ? 'row0' : 'row1'; html += `<tr>${r.map((c, j) => `<td class="${cls} ${j >= 4 && j <= 7 ? 'num' : ''}" style="border:1px solid #EDEEF0">${c}</td>`).join('')}</tr>` })
                html += `</table></body></html>`
                const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `EMCAGUA-Pagos-${new Date().toISOString().slice(0, 10)}.xls`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-medium text-dark shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              Excel pagos
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Recibo</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Factura</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Monto</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Método</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Fecha y hora</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradosPagos.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Sin pagos con ese filtro</td></tr>
              ) : (
                filtradosPagos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 text-xs font-mono font-bold text-dark">{p.id}</td>
                    <td className="px-5 py-3.5"><p className="text-sm font-medium text-dark">{p.cliente}</p><p className="text-xs text-gray-400">{p.clienteId}</p></td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-600">{p.facturaId}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-green-600">${p.monto.toLocaleString('es-CO')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 w-fit">{p.metodo}</span>
                        {p.metodo === 'Efectivo' && p.recibido !== undefined && (
                          <span className="text-[11px] text-gray-500">Recibido ${p.recibido.toLocaleString('es-CO')} {p.vueltos !== undefined && p.vueltos > 0 ? `· Vueltos $${p.vueltos.toLocaleString('es-CO')}` : '· Sin vueltos'}</span>
                        )}
                        {p.comprobante && <span className="text-[11px] font-medium text-primary">📷 Comprobante adjunto</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-dark">{p.fecha}</p>
                      <p className="text-xs font-mono text-gray-500">{p.hora}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setRecibo(p)} className="h-8 px-3 rounded-xl bg-dark hover:bg-black text-white text-xs font-semibold">Ver recibo</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCierre(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-dark to-secondary" />
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-dark flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m-2 6h2m-4 0h2m-6-4h12M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-dark">Cierre de caja</p>
                  <p className="text-xs text-gray-500">{new Date().toLocaleDateString('es-CO')} · {new Date().toLocaleTimeString('es-CO')}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Caja diaria (hoy)</span><span className="font-extrabold text-green-600">${cajaHoy.toLocaleString('es-CO')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Pagos hoy</span><span className="font-bold text-dark">{pagos.filter((p) => p.fecha === new Date().toLocaleDateString('es-CO')).length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Caja semanal</span><span className="font-bold text-dark">${cajaSemana.toLocaleString('es-CO')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Efectivo</span><span className="font-medium text-dark">${pagos.filter((p) => p.metodo === 'Efectivo' && p.fecha === new Date().toLocaleDateString('es-CO')).reduce((s, p) => s + p.monto, 0).toLocaleString('es-CO')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Transferencia</span><span className="font-medium text-dark">${pagos.filter((p) => p.metodo === 'Transferencia' && p.fecha === new Date().toLocaleDateString('es-CO')).reduce((s, p) => s + p.monto, 0).toLocaleString('es-CO')}</span></div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Cierre disponible desde las 5:00 PM. Se activa a las 7:00 AM del día siguiente. Guardará el arqueo de hoy.</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowCierre(false)} className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-dark hover:bg-gray-50">Cancelar</button>
                <button
                  onClick={() => {
                    alert(`Cierre de caja registrado: $${cajaHoy.toLocaleString('es-CO')} · ${new Date().toLocaleString('es-CO')}`)
                    setShowCierre(false)
                  }}
                  className="flex-1 h-10 rounded-xl bg-dark text-white text-sm font-bold hover:bg-black"
                >
                  Confirmar cierre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {recibo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRecibo(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Recibo oficial · EMCAGUA APC</p>
              <button onClick={() => setRecibo(null)} className="h-8 w-8 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-400">✕</button>
            </div>
            <div id="recibo-print" className="px-6 py-6">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
                <div className="flex gap-3">
                  <img src="/logo_circulo.png" alt="EMCAGUA" className="h-12 w-12 object-contain rounded-full border border-gray-100" />
                  <div>
                    <p className="text-sm font-extrabold tracking-tight text-dark leading-none">EMCAGUA APC</p>
                    <p className="text-[11px] font-semibold tracking-wide text-secondary uppercase">Empresa de El Carmen y Guamalito</p>
                    <p className="text-[11px] text-gray-500">Administración Pública Cooperativa</p>
                    <p className="text-[11px] text-gray-400">NIT 900.123.456-7 · El Carmen, Norte de Santander</p>
                    <p className="text-[11px] text-gray-400">Tel: (607) 123 4567 · info@emcagua.gov.co</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold tracking-widest text-white bg-dark px-2.5 py-1 rounded-full">RECIBO DE CAJA</p>
                  <p className="text-sm font-mono font-bold text-dark mt-2">{recibo.id}</p>
                  <p className="text-[11px] text-gray-500">{recibo.fecha} · {recibo.hora}</p>
                  <span className="inline-block mt-2 bg-green-50 text-green-700 border border-green-200 text-[11px] font-bold px-2.5 py-1 rounded-full">PAGADO</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Recibo</p>
                  <p className="text-sm font-mono font-bold text-dark mt-1">{recibo.id}</p>
                  <p className="text-xs text-gray-500">Consecutivo interno</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Factura cancelada</p>
                  <p className="text-sm font-mono font-bold text-dark mt-1">{recibo.facturaId}</p>
                  <p className="text-xs text-gray-500">Periodo facturado</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Suscriptor</p>
                  <p className="text-sm font-bold text-dark mt-1">{recibo.cliente}</p>
                  <p className="text-xs text-gray-600">CC {recibo.clienteId}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Método de pago</p>
                  <p className="text-sm font-bold text-dark mt-1">{recibo.metodo}</p>
                  <p className="text-xs text-gray-500">Ventanilla / Cajero</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <p className="text-xs font-bold tracking-wide text-dark uppercase">Detalle del pago</p>
                  <span className="text-[11px] text-gray-500">{recibo.fecha} · {recibo.hora} · {recibo.metodo}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between px-4 py-3 text-sm">
                    <span className="text-gray-500">Valor factura</span>
                    <span className="font-bold text-dark">${recibo.monto.toLocaleString('es-CO')}</span>
                  </div>
                  {recibo.metodo === 'Efectivo' && recibo.recibido !== undefined && (
                    <>
                      <div className="flex justify-between px-4 py-3 text-sm">
                        <span className="text-gray-500">Recibido en efectivo</span>
                        <span className="font-medium text-dark">${recibo.recibido.toLocaleString('es-CO')}</span>
                      </div>
                      <div className={`flex justify-between px-4 py-3 text-sm ${recibo.vueltos && recibo.vueltos > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                        <span className={`font-bold ${recibo.vueltos && recibo.vueltos > 0 ? 'text-orange-700' : 'text-green-700'}`}>{recibo.vueltos && recibo.vueltos > 0 ? 'Vueltos a entregar' : 'Sin vueltos'}</span>
                        <span className={`font-extrabold ${recibo.vueltos && recibo.vueltos > 0 ? 'text-orange-700' : 'text-green-700'}`}>{recibo.vueltos && recibo.vueltos > 0 ? `$${recibo.vueltos.toLocaleString('es-CO')}` : '$0'}</span>
                      </div>
                    </>
                  )}
                  {recibo.comprobante && (
                    <div className="px-4 py-3 bg-primary/5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Comprobante adjunto</p>
                      <img src={recibo.comprobante} alt="Comprobante" className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-white" />
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 text-sm">
                    <span className="text-gray-500">Recargo / Mora</span>
                    <span className="font-medium text-gray-400">$0</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-green-50">
                    <span className="font-bold text-dark">Total pagado</span>
                    <span className="font-extrabold text-green-700 text-base">${recibo.monto.toLocaleString('es-CO')} COP</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-4">
                <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 flex gap-3">
                  <div className="h-16 w-16 bg-white border border-gray-200 rounded-lg grid grid-cols-5 gap-0.5 p-1 shrink-0">
                    {Array.from({ length: 25 }).map((_, i) => (<div key={i} className={`${Math.random() > 0.5 ? 'bg-dark' : 'bg-white'} rounded-[1px]`} />))}
                  </div>
                  <div className="text-[11px] text-gray-500 leading-relaxed">
                    <p className="font-mono text-dark font-bold">{recibo.id}</p>
                    <p>Validación recibo</p>
                    <p>{recibo.fecha} {recibo.hora}</p>
                    <p className="text-primary font-medium">www.emcagua.gov.co/validar</p>
                  </div>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Atendido por</p>
                  <p className="text-sm font-bold text-dark mt-1">{(() => { try { const u = localStorage.getItem('emcagua_user'); return u ? JSON.parse(u).username : 'Cajero' } catch { return 'Cajero' } })()} · Caja principal</p>
                  <p className="text-xs text-gray-500">El Carmen — Oficinas EMCAGUA</p>
                  <p className="text-[11px] text-gray-400 mt-2">Firma cajero: ___________________</p>
                  <p className="text-[11px] text-gray-400">Firma usuario: __________________</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setRecibo(null)} className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-dark hover:bg-gray-50">Cerrar</button>
                <button onClick={() => window.print()} className="flex-1 h-10 rounded-xl bg-dark text-white text-sm font-semibold hover:bg-black flex items-center justify-center gap-2">⎙ Imprimir / Guardar PDF</button>
              </div>
              <p className="text-center text-[11px] text-gray-400 mt-3">EMCAGUA APC · El Carmen, Norte de Santander · Recibo válido como soporte de pago</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
