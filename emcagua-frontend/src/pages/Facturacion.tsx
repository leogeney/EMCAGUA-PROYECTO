import { useState, useMemo } from 'react'
import { getGenerationDate, getNextCutoff, formatCutoff } from '../utils/cutoff'

type FacturaRow = {
 id: string
 cliente: string
 clienteId: string
 barrio: string
 estrato: number
 periodo: string
 mes: number
 anio: number
 consumo: number
 monto: number
 vencimiento: string
 estado: 'Pagada' | 'Pendiente'
}

const tarifa: Record<number, number> = { 1: 1800, 2: 2600, 3: 3400 }
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const hoy = new Date()
const mesesFiltro = ['Todos', ...meses.slice(0, hoy.getMonth() + 1)]
const aniosFiltro = ['Todos', '2024', '2025', '2026']

const base = [
 { id: '10234', nombre: 'Juan Pérez', barrio: 'Centro', estrato: 2, base: 18, pagos: 0 },
 { id: '10235', nombre: 'María López', barrio: 'Guamalito', estrato: 1, base: 32, pagos: 1 },
 { id: '10236', nombre: 'Carlos Ruiz', barrio: 'El Carmen', estrato: 3, base: 12, pagos: 0 },
 { id: '10237', nombre: 'Ana Torres', barrio: 'Centro', estrato: 2, base: 45, pagos: 1 },
 { id: '10238', nombre: 'Jorge Gómez', barrio: 'La Esperanza', estrato: 1, base: 8, pagos: 0 },
 { id: '10239', nombre: 'Lucía Martínez', barrio: 'Guamalito', estrato: 2, base: 28, pagos: 1 },
 { id: '10240', nombre: 'Pedro Díaz', barrio: 'Centro', estrato: 3, base: 15, pagos: 0 },
 { id: '10241', nombre: 'Sofía Ramírez', barrio: 'La Esperanza', estrato: 2, base: 38, pagos: 1 },
 { id: '10242', nombre: 'Andrés Castro', barrio: 'El Carmen', estrato: 1, base: 22, pagos: 0 },
 { id: '10243', nombre: 'Diana Herrera', barrio: 'Centro', estrato: 3, base: 14, pagos: 0 },
 { id: '10244', nombre: 'Fernando Ortiz', barrio: 'Guamalito', estrato: 2, base: 41, pagos: 1 },
 { id: '10245', nombre: 'Valentina Ríos', barrio: 'La Esperanza', estrato: 1, base: 9, pagos: 1 },
 { id: '10246', nombre: 'Ejemplo Deuda Marzo', barrio: 'Centro', estrato: 2, base: 22, pagos: 1 },
 { id: '10247', nombre: 'Usuario WhatsApp', barrio: 'Centro', estrato: 2, base: 19, pagos: 0 },
 { id: '10248', nombre: 'Mariana Muñoz', barrio: 'Centro', estrato: 2, base: 21, pagos: 0 },
 { id: '10249', nombre: 'Alto Consumo Al Día', barrio: 'La Esperanza', estrato: 2, base: 52, pagos: 0 },
]

function genFacturas(): FacturaRow[] {
 const rows: FacturaRow[] = []
 base.forEach((u) => {
  for (let i = 11; i >= 0; i--) {
   const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
   const m = d.getMonth() + 1
   const a = d.getFullYear()
   const esDeuda = u.pagos === 1 && i === 0
   const consumo = esDeuda ? u.base : u.base === 22 && u.id === '10246' && (a > 2026 || (a === 2026 && m > 3)) ? 0 : Math.max(6, u.base + Math.floor(Math.random() * 6 - 3))
   const pagada = !esDeuda
   rows.push({
    id: `FAC-${a}-${String(m).padStart(2, '0')}-${u.id.slice(-4)}`,
    cliente: u.nombre,
    clienteId: u.id,
    barrio: u.barrio,
    estrato: u.estrato,
    periodo: `${meses[m - 1]} ${a}`,
    mes: m,
    anio: a,
    consumo: pagada ? consumo : u.base,
    monto: (pagada ? consumo : u.base) * tarifa[u.estrato],
    vencimiento: `05/${String(m).padStart(2, '0')}/${a}`,
    estado: pagada ? 'Pagada' : 'Pendiente',
   })
  }
 })
 return rows.reverse()
}

const todasFacturas = genFacturas()

export default function Facturacion() {
 const [search, setSearch] = useState('')
 const [estado, setEstado] = useState<'Todos' | 'Pagada' | 'Pendiente'>('Todos')
 const [mes, setMes] = useState(meses[hoy.getMonth()])
 const [anio, setAnio] = useState(String(hoy.getFullYear()))
 const [pagina, setPagina] = useState(1)
 const [facturaSel, setFacturaSel] = useState<FacturaRow | null>(null)
 const porPagina = 10

 const filtradas = useMemo(() => {
  return todasFacturas.filter((f) => {
   const matchSearch = f.cliente.toLowerCase().includes(search.toLowerCase()) || f.id.toLowerCase().includes(search.toLowerCase()) || f.clienteId.includes(search)
   const matchEstado = estado === 'Todos' || f.estado === estado
   const matchMes = mes === 'Todos' || meses[f.mes - 1] === mes
   const matchAnio = anio === 'Todos' || String(f.anio) === anio
   return matchSearch && matchEstado && matchMes && matchAnio
  })
 }, [search, estado, mes, anio])

  const nextCutoff = getNextCutoff()
  const nextGeneration = getGenerationDate(nextCutoff)
  const hoyDate = new Date()
  const yaGenerado = hoyDate >= nextGeneration
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina))
  const paginaRows = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina)
  const totalMonto = filtradas.reduce((s, f) => s + f.monto, 0)
  const pagadas = filtradas.filter((f) => f.estado === 'Pagada').length
  const pendientes = filtradas.filter((f) => f.estado === 'Pendiente').length
  const recaudado = filtradas.filter((f) => f.estado === 'Pagada').reduce((s, f) => s + f.monto, 0)
  const porCobrar = filtradas.filter((f) => f.estado === 'Pendiente').reduce((s, f) => s + f.monto, 0)

  const exportarExcel = () => {
    const titulo = `EMCAGUA APC - Facturación ${mes} ${anio} - ${new Date().toLocaleDateString('es-CO')}`
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>td{font-family:Arial;font-size:11pt} .hdr{background:#156D6D;color:#FFFFFF;font-weight:bold;text-align:center;border:1px solid #0F4F4F} .row0{background:#FFFFFF} .row1{background:#F8F9F7} .num{text-align:right} .center{text-align:center} .title{font-size:14pt;font-weight:bold;color:#156D6D} .sub{font-size:9pt;color:#666}</style></head><body>`
    html += `<table><tr><td colspan="10" class="title">EMCAGUA APC — Empresa de El Carmen y Guamalito</td></tr><tr><td colspan="10" class="sub">Administración Pública Cooperativa · El Carmen, Norte de Santander · NIT 900.123.456-7</td></tr><tr><td colspan="10" class="sub">${titulo} — ${filtradas.length} facturas · Total $${totalMonto.toLocaleString('es-CO')}</td></tr><tr><td></td></tr>`
    html += `<tr><td class="hdr" style="width:140px">Factura</td><td class="hdr" style="width:160px">Cliente</td><td class="hdr" style="width:80px">ID</td><td class="hdr" style="width:110px">Barrio</td><td class="hdr" style="width:60px">Estrato</td><td class="hdr" style="width:110px">Periodo</td><td class="hdr" style="width:80px">Consumo</td><td class="hdr" style="width:100px">Monto</td><td class="hdr" style="width:90px">Vencimiento</td><td class="hdr" style="width:80px">Estado</td></tr>`
    filtradas.forEach((f, i) => {
      const cls = i % 2 === 0 ? 'row0' : 'row1'
      const estadoColor = f.estado === 'Pagada' ? '#DCFCE7' : '#FEE2E2'
      const estadoText = f.estado === 'Pagada' ? '#166534' : '#991B1B'
      html += `<tr>
        <td class="${cls}" style="border:1px solid #EDEEF0;font-family:Courier">${f.id}</td>
        <td class="${cls}" style="border:1px solid #EDEEF0;font-weight:bold">${f.cliente}</td>
        <td class="${cls} center" style="border:1px solid #EDEEF0">${f.clienteId}</td>
        <td class="${cls}" style="border:1px solid #EDEEF0">${f.barrio}</td>
        <td class="${cls} center" style="border:1px solid #EDEEF0">E${f.estrato}</td>
        <td class="${cls} center" style="border:1px solid #EDEEF0">${f.periodo}</td>
        <td class="${cls} num" style="border:1px solid #EDEEF0">${f.consumo} m³</td>
        <td class="${cls} num" style="border:1px solid #EDEEF0;font-weight:bold">$${f.monto.toLocaleString('es-CO')}</td>
        <td class="${cls} center" style="border:1px solid #EDEEF0">${f.vencimiento}</td>
        <td class="${cls} center" style="border:1px solid #EDEEF0;background:${estadoColor};color:${estadoText};font-weight:bold">${f.estado}</td>
      </tr>`
    })
    html += `</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `EMCAGUA-Facturas-${mes}-${anio}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

 return (
  <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark">Facturación</h1>
            <p className="text-sm text-gray-500 mt-1">Todas las facturas de todos los clientes — {todasFacturas.length} registros</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <div className={`inline-flex items-center gap-2 border rounded-full px-3 py-1.5 text-xs ${yaGenerado ? 'bg-green-50 border-green-200' : 'bg-primary/10 border-primary/20'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${yaGenerado ? 'bg-green-500' : 'bg-primary'}`} />
                <span className={`font-bold ${yaGenerado ? 'text-green-700' : 'text-dark'}`}>{yaGenerado ? '✓ Generadas este mes' : 'Generación automática'}</span>
                <span className="text-gray-600">· 2 semanas antes del primer viernes</span>
                <span className={`font-bold px-2 py-0.5 rounded-full border ${yaGenerado ? 'bg-green-500 text-white border-green-600' : 'bg-white border-primary/20 text-primary'}`}>{yaGenerado ? `Generado ${formatCutoff(nextGeneration)}` : `Próx: ${formatCutoff(nextGeneration)}`}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-3 py-1.5 text-xs">
                <span className="w-2 h-2 bg-secondary rounded-full" />
                <span className="font-bold text-secondary">Corte: {formatCutoff(nextCutoff)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportarExcel} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-dark shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recaudado</p>
          <p className="text-lg font-extrabold text-green-600 mt-1">${recaudado.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-500">{pagadas} pagadas · {((pagadas / Math.max(1, filtradas.length)) * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Se espera (total)</p>
          <p className="text-lg font-extrabold text-dark mt-1">${totalMonto.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-500">{filtradas.length} facturas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Por cobrar (deben)</p>
          <p className="text-lg font-extrabold text-red-600 mt-1">${porCobrar.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-500">{pendientes} pendientes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Periodo</p>
          <p className="text-sm font-bold text-dark mt-1">{mes !== 'Todos' ? mes : 'Todos'} {anio !== 'Todos' ? anio : ''}</p>
          <p className="text-xs text-gray-500">{filtradas.length} facturas filtradas</p>
        </div>
      </div>

   <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
     <div className="md:col-span-5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Buscar factura o cliente</label>
      <div className="relative">
       <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
       <input value={search} onChange={(e) => { setSearch(e.target.value); setPagina(1) }} placeholder="Ej: FAC-2026-08-10234 o Juan Pérez" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white" />
      </div>
     </div>
     <div className="md:col-span-2">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
      <select value={estado} onChange={(e) => { setEstado(e.target.value as never); setPagina(1) }} className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white">
       <option value="Todos">Todos</option>
       <option value="Pagada">Pagada</option>
       <option value="Pendiente">Pendiente</option>
      </select>
     </div>
     <div className="md:col-span-2">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mes</label>
      <select value={mes} onChange={(e) => { setMes(e.target.value); setPagina(1) }} className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white">
       {mesesFiltro.map((m) => (<option key={m} value={m}>{m}</option>))}
      </select>
     </div>
     <div className="md:col-span-3">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Año</label>
      <select value={anio} onChange={(e) => { setAnio(e.target.value); setPagina(1) }} className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white">
       {aniosFiltro.map((a) => (<option key={a} value={a}>{a}</option>))}
      </select>
     </div>
    </div>
   </div>

   <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
     <table className="w-full">
      <thead>
       <tr className="bg-gray-50">
        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Factura</th>
        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Cliente</th>
        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Periodo</th>
        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Consumo</th>
        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Monto</th>
        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Vencimiento</th>
        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Estado</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
       {paginaRows.length === 0 ? (
        <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No hay facturas con los filtros</td></tr>
       ) : (
        paginaRows.map((f) => (
         <tr key={f.id} onClick={() => setFacturaSel(f)} className="hover:bg-gray-50/60 cursor-pointer">
          <td className="px-5 py-3.5 text-xs font-mono font-medium text-dark">{f.id}</td>
          <td className="px-5 py-3.5">
           <p className="text-sm font-medium text-dark">{f.cliente}</p>
           <p className="text-xs text-gray-400">{f.clienteId} · {f.barrio} · E{f.estrato}</p>
          </td>
          <td className="px-5 py-3.5 text-sm text-gray-600">{f.periodo}</td>
          <td className="px-5 py-3.5 text-sm font-medium text-dark">{f.consumo} m³</td>
          <td className="px-5 py-3.5 text-sm font-bold text-dark">${f.monto.toLocaleString('es-CO')}</td>
          <td className="px-5 py-3.5 text-xs text-gray-500">{f.vencimiento}</td>
          <td className="px-5 py-3.5"><span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${f.estado === 'Pagada' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{f.estado}</span></td>
         </tr>
        ))
       )}
      </tbody>
     </table>
    </div>
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-white">
     <span className="text-xs text-gray-500">Mostrando {(pagina - 1) * porPagina + 1}-{Math.min(pagina * porPagina, filtradas.length)} de {filtradas.length}</span>
     <div className="flex items-center gap-1">
      <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="h-8 px-3 rounded-xl border border-gray-200 text-xs font-medium text-dark hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Anterior</button>
      {Array.from({ length: totalPaginas }, (_, i) => i + 1).slice(0, 6).map((n) => (
       <button key={n} onClick={() => setPagina(n)} className={`h-8 w-8 rounded-xl text-xs font-bold border ${pagina === n ? 'bg-dark text-white border-dark' : 'bg-white text-dark border-gray-200 hover:bg-gray-50'}`}>{n}</button>
      ))}
      <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="h-8 px-3 rounded-xl border border-gray-200 text-xs font-medium text-dark hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Siguiente</button>
     </div>
    </div>
   </div>

   {facturaSel && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
     <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFacturaSel(null)} />
     <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
       <div className="flex items-center gap-2">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Factura oficial · EMCAGUA APC</p>
        <span className="bg-dark text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SOLO ADMIN</span>
       </div>
       <button onClick={() => setFacturaSel(null)} className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
      </div>

      <div id="factura-print" className="px-6 py-6">
       <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
        <div className="flex gap-3">
         <img src="/logo_circulo.png" alt="EMCAGUA" className="h-14 w-14 object-contain rounded-full border border-gray-100" />
         <div>
          <p className="text-sm font-extrabold tracking-tight text-dark leading-none">EMCAGUA APC</p>
          <p className="text-[11px] font-semibold tracking-wide text-secondary uppercase">Empresa de El Carmen y Guamalito</p>
          <p className="text-[11px] text-gray-500">Administración Pública Cooperativa</p>
          <p className="text-[11px] text-gray-400">NIT 900.123.456-7 · El Carmen, Norte de Santander</p>
          <p className="text-[11px] text-gray-400">Tel: (607) 123 4567 · info@emcagua.gov.co</p>
         </div>
        </div>
        <div className="text-right">
         <p className="text-[11px] font-bold tracking-widest text-white bg-dark px-2.5 py-1 rounded-full">FACTURA DE SERVICIO PÚBLICO</p>
         <p className="text-xs font-mono font-bold text-dark mt-2">{facturaSel.id}</p>
         <p className="text-[11px] text-gray-500">CUFE: {facturaSel.id.replace(/-/g, '')} • {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} {new Date().toLocaleDateString('es-CO')}</p>
         <span className={`inline-block mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full border ${facturaSel.estado === 'Pagada' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{facturaSel.estado.toUpperCase()}</span>
        </div>
       </div>

       <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
         <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Suscriptor</p>
         <p className="text-sm font-bold text-dark mt-1">{facturaSel.cliente}</p>
         <p className="text-xs text-gray-600">CC {facturaSel.clienteId} · {facturaSel.barrio} · Estrato {facturaSel.estrato}</p>
         <p className="text-xs text-gray-500">MED-{facturaSel.clienteId} · El Carmen</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
         <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Periodo facturado</p>
         <p className="text-sm font-bold text-dark mt-1">{facturaSel.periodo}</p>
         <p className="text-xs text-gray-600">Vencimiento: <span className="font-bold text-dark">{facturaSel.vencimiento}</span> (primer viernes)</p>
         <p className="text-xs text-gray-500">Generada: {new Date().toLocaleDateString('es-CO')} {new Date().toLocaleTimeString('es-CO')}</p>
        </div>
       </div>

       <div className="mt-5 rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
         <p className="text-xs font-bold tracking-wide text-dark uppercase">Detalle de consumo</p>
         <span className="text-[11px] text-gray-500">Tarifa E{facturaSel.estrato} ${tarifa[facturaSel.estrato].toLocaleString('es-CO')}/m³</span>
        </div>
        <div className="divide-y divide-gray-100">
         <div className="grid grid-cols-3 px-4 py-3 text-xs">
          <span className="text-gray-500">Lectura anterior</span>
          <span className="text-center font-mono text-dark">{Math.max(0, facturaSel.consumo - 5)} m³</span>
          <span className="text-right text-gray-400">{((facturaSel.consumo - 5) * 1000).toLocaleString('es-CO')} L</span>
         </div>
         <div className="grid grid-cols-3 px-4 py-3 text-xs">
          <span className="text-gray-500">Lectura actual</span>
          <span className="text-center font-mono font-bold text-dark">{facturaSel.consumo} m³</span>
          <span className="text-right text-gray-400">{(facturaSel.consumo * 1000).toLocaleString('es-CO')} L</span>
         </div>
         <div className="grid grid-cols-3 px-4 py-3 bg-primary/5 text-sm">
          <span className="font-bold text-dark">Consumo del periodo</span>
          <span className="text-center font-extrabold text-dark">{facturaSel.consumo} m³</span>
          <span className="text-right font-bold text-dark">${facturaSel.monto.toLocaleString('es-CO')}</span>
         </div>
         <div className="grid grid-cols-3 px-4 py-2 text-xs bg-white">
          <span className="text-gray-500">Cargo fijo acueducto</span>
          <span className="text-center text-gray-400">—</span>
          <span className="text-right text-gray-600">$4.500</span>
         </div>
         <div className="grid grid-cols-3 px-4 py-2 text-xs bg-white">
          <span className="text-gray-500">Subsidio/contribución E{facturaSel.estrato}</span>
          <span className="text-center text-gray-400">{facturaSel.estrato === 1 ? '-40%' : facturaSel.estrato === 2 ? '-20%' : '+20%'}</span>
          <span className={`text-right font-medium ${facturaSel.estrato === 3 ? 'text-red-600' : 'text-green-600'}`}>{facturaSel.estrato === 3 ? '+$' : '-$'}{Math.round(facturaSel.monto * 0.2).toLocaleString('es-CO')}</span>
         </div>
        </div>
       </div>

       <div className="mt-4 bg-dark rounded-xl p-4 flex items-center justify-between text-white">
        <div>
         <p className="text-xs tracking-widest text-white/60 uppercase">Total a pagar</p>
         <p className="text-[11px] text-white/60">Incluye cargo fijo y ajuste estrato</p>
        </div>
        <p className="text-xl font-extrabold">${(facturaSel.monto + 4500 + (facturaSel.estrato === 3 ? Math.round(facturaSel.monto * 0.2) : -Math.round(facturaSel.monto * (facturaSel.estrato === 1 ? 0.4 : 0.2)))).toLocaleString('es-CO')} <span className="text-xs font-normal text-white/60">COP</span></p>
       </div>

       <div className="mt-5">
        <p className="text-xs font-bold tracking-wide text-dark uppercase mb-2">Últimos 6 meses de consumo</p>
        <div className="grid grid-cols-6 gap-2">
         {Array.from({ length: 6 }, (_, i) => {
          const d = new Date(facturaSel.anio, facturaSel.mes - 1 - (5 - i), 1)
          const m = d.getMonth() + 1
          const a = d.getFullYear()
          const baseUser = base.find((b) => b.id === facturaSel.clienteId)
          const baseVal = baseUser ? baseUser.base : facturaSel.consumo
          const val = Math.max(6, baseVal + Math.floor(Math.random() * 6 - 3))
          const esActual = m === facturaSel.mes && a === facturaSel.anio
          return (
           <div key={`${a}-${m}`} className={`rounded-xl border p-2 text-center ${esActual ? 'bg-primary/10 border-primary/20' : 'bg-white border-gray-100'}`}>
            <p className="text-[11px] font-semibold text-gray-500">{meses[m - 1].slice(0, 3)} {a}</p>
            <p className={`text-xs font-bold mt-1 ${esActual ? 'text-primary' : 'text-dark'}`}>{esActual ? facturaSel.consumo : val} m³</p>
            <p className="text-[10px] text-gray-400">{esActual ? 'Actual' : ''}</p>
           </div>
          )
         })}
        </div>
       </div>

       <div className="mt-5 flex gap-4">
        <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 p-3">
         <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Código QR — Validación DIAN</p>
         <div className="mt-2 flex gap-3">
          <div className="h-20 w-20 bg-white border border-gray-200 rounded-lg grid grid-cols-5 gap-0.5 p-1">
           {Array.from({ length: 25 }).map((_, i) => (<div key={i} className={`${Math.random() > 0.5 ? 'bg-dark' : 'bg-white'} rounded-[1px]`} />))}
          </div>
          <div className="text-[11px] text-gray-500 leading-relaxed">
           <p className="font-mono text-dark font-bold">{facturaSel.id}</p>
           <p>CUFE validado</p>
           <p>{new Date().toISOString().slice(0, 19)}</p>
           <p className="text-primary font-medium">www.emcagua.gov.co/validar</p>
          </div>
         </div>
        </div>
        <div className="flex-1 bg-secondary/5 rounded-xl border border-secondary/10 p-3">
         <p className="text-[11px] font-bold tracking-widest text-secondary uppercase">Información de pago</p>
         <p className="text-xs font-bold text-dark mt-2">Se podrá pagar en las oficinas de EMCAGUA</p>
         <p className="text-xs text-gray-600">El Carmen, Norte de Santander · Lun-Vie 8am-4pm</p>
         <p className="text-xs text-gray-600 mt-1">Vence: <span className="font-bold text-dark">{facturaSel.vencimiento}</span> (primer viernes)</p>
         <p className="text-[11px] text-gray-500 mt-1">Si vence, corte. Reactivación $30.000. Solo admin ve esta factura.</p>
         <p className="text-[11px] text-gray-400 mt-2">Generada por: <span className="font-medium text-dark">{(() => { try { const u = localStorage.getItem('emcagua_user'); return u ? JSON.parse(u).username : 'Trabajador' } catch { return 'Trabajador' } })()}</span> · {new Date().toLocaleString('es-CO')}</p>
        </div>
       </div>

       <div className="flex gap-3 mt-6">
        <button onClick={() => setFacturaSel(null)} className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-dark hover:bg-gray-50">Cerrar</button>
        <button onClick={() => window.print()} className="flex-1 h-10 rounded-xl bg-dark text-white text-sm font-semibold hover:bg-black flex items-center justify-center gap-2">⎙ Imprimir / Guardar PDF</button>
       </div>
       <p className="text-center text-[11px] text-gray-400 mt-3">EMCAGUA APC · El Carmen, Norte de Santander · Resolución DIAN 187600001</p>
      </div>
     </div>
    </div>
   )}
  </div>
 )
}
