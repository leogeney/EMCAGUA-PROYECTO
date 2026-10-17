import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, MODO_API, mensajeError } from '../data/api'
import Modal from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import Ico from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'
import { fecha, hora } from '../utils/format'

export type LogAuditoria = {
  id: number
  fecha: number
  usuario: string
  nombreUsuario: string
  rol: string
  modulo: string
  accion: string
  descripcion: string
  entidadTipo?: string
  entidadId?: string
  detalle?: string
  ip?: string
}

type ResumenAuditoria = {
  totalHoy: number
  totalGeneral: number
  usuarios: string[]
  modulos: string[]
  acciones: string[]
}

const MODULOS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  caja: { label: 'Caja y Pagos', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  facturacion: { label: 'Facturación', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  pqr: { label: 'PQR', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  cuentas: { label: 'Cuentas y Roles', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  seguridad: { label: 'Seguridad', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  tarifas: { label: 'Tarifas', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  inventario: { label: 'Inventario', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  documentos: { label: 'Documentos', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  gastos: { label: 'Gastos', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  usuarios: { label: 'Usuarios / Predios', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  general: { label: 'General', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
}

const DEMO_LOGS: LogAuditoria[] = [
  {
    id: 1,
    fecha: Date.now() - 1000 * 60 * 12,
    usuario: 'yaneth',
    nombreUsuario: 'Yaneth Quintero',
    rol: 'Cajera',
    modulo: 'caja',
    accion: 'COBRO',
    descripcion: 'Cobro de recibo PAG-00124 por $48.500 para el predio 1004 (Carlos Rodríguez)',
    entidadTipo: 'Pago',
    entidadId: 'PAG-00124',
    detalle: '{"total":48500,"metodo":"EFECTIVO","reconexion":0}',
    ip: '192.168.1.15',
  },
  {
    id: 2,
    fecha: Date.now() - 1000 * 60 * 45,
    usuario: 'admin',
    nombreUsuario: 'Administrador',
    rol: 'Gerente',
    modulo: 'seguridad',
    accion: 'LOGIN',
    descripcion: 'Inicio de sesión exitoso desde oficina principal',
    entidadTipo: 'Cuenta',
    entidadId: 'admin',
    ip: '192.168.1.10',
  },
  {
    id: 3,
    fecha: Date.now() - 1000 * 60 * 110,
    usuario: 'diana',
    nombreUsuario: 'Diana Carrascal',
    rol: 'Atención al usuario',
    modulo: 'pqr',
    accion: 'PQR_RADICAR',
    descripcion: 'Radicó PQR-2026-0045 (RECLAMO - FACTURACION) de María Antonia Gómez',
    entidadTipo: 'Pqr',
    entidadId: 'PQR-2026-0045',
    detalle: '{"predio":"1012","canal":"PRESENCIAL"}',
    ip: '192.168.1.18',
  },
  {
    id: 4,
    fecha: Date.now() - 1000 * 60 * 240,
    usuario: 'admin',
    nombreUsuario: 'Administrador',
    rol: 'Gerente',
    modulo: 'facturacion',
    accion: 'CIERRE_FACTURACION',
    descripcion: 'Cierre mensual de facturación septiembre 2026: facturado $18.420.000 (845 leídos, 12 estimados)',
    entidadTipo: 'Factura',
    entidadId: 'septiembre 2026',
    detalle: '{"totalFacturado":18420000,"leidos":845,"estimados":12,"suspendidos":18}',
    ip: '192.168.1.10',
  },
  {
    id: 5,
    fecha: Date.now() - 1000 * 60 * 380,
    usuario: 'alvaro',
    nombreUsuario: 'Álvaro Pacheco',
    rol: 'Técnico / fontanero',
    modulo: 'inventario',
    accion: 'MOVIMIENTO_INVENTARIO',
    descripcion: 'Movimiento de SALIDA (2 unidad) en Registro de corte 1/2": Reparación fuga calle 4',
    entidadTipo: 'Material',
    entidadId: '3',
    detalle: '{"tipo":"SALIDA","cantidad":2,"stockAnterior":14,"stockNuevo":12}',
    ip: '192.168.1.22',
  },
  {
    id: 6,
    fecha: Date.now() - 1000 * 60 * 60 * 24,
    usuario: 'yaneth',
    nombreUsuario: 'Yaneth Quintero',
    rol: 'Cajera',
    modulo: 'caja',
    accion: 'CIERRE_CAJA',
    descripcion: 'Cierre y arqueo de caja del día: efectivo contado $840.000 (diferencia: $0)',
    entidadTipo: 'CierreCaja',
    entidadId: '2026-10-15',
    detalle: '{"esperado":840000,"contado":840000,"diferencia":0}',
    ip: '192.168.1.15',
  },
]

export default function Auditoria() {
  const toast = useToast()
  const [logs, setLogs] = useState<LogAuditoria[]>(DEMO_LOGS)
  const [resumen, setResumen] = useState<ResumenAuditoria>({
    totalHoy: DEMO_LOGS.filter((l) => Date.now() - l.fecha < 864e5).length,
    totalGeneral: DEMO_LOGS.length,
    usuarios: ['admin', 'yaneth', 'diana', 'alvaro'],
    modulos: ['caja', 'facturacion', 'pqr', 'seguridad', 'inventario', 'cuentas', 'tarifas'],
    acciones: ['COBRO', 'CIERRE_CAJA', 'CIERRE_FACTURACION', 'PQR_RADICAR', 'LOGIN', 'MOVIMIENTO_INVENTARIO'],
  })
  const [cargando, setCargando] = useState(false)
  const [total, setTotal] = useState(DEMO_LOGS.length)
  const [pagina, setPagina] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)

  // Filtros
  const [q, setQ] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [rangoFecha, setRangoFecha] = useState<'todo' | 'hoy' | '7dias' | '30dias'>('todo')
  const [detalleModal, setDetalleModal] = useState<LogAuditoria | null>(null)

  const cargarDatos = useCallback(async () => {
    if (!MODO_API) {
      // Filtrar localmente en modo demo
      let res = [...DEMO_LOGS]
      if (q.trim()) {
        const busq = q.trim().toLowerCase()
        res = res.filter((l) =>
          l.descripcion.toLowerCase().includes(busq) ||
          l.usuario.toLowerCase().includes(busq) ||
          l.nombreUsuario.toLowerCase().includes(busq) ||
          (l.entidadId && l.entidadId.toLowerCase().includes(busq))
        )
      }
      if (filtroUsuario) res = res.filter((l) => l.usuario.toLowerCase() === filtroUsuario.toLowerCase())
      if (filtroModulo) res = res.filter((l) => l.modulo.toLowerCase() === filtroModulo.toLowerCase())
      if (filtroAccion) res = res.filter((l) => l.accion.toLowerCase() === filtroAccion.toLowerCase())
      if (rangoFecha === 'hoy') res = res.filter((l) => Date.now() - l.fecha < 864e5)
      if (rangoFecha === '7dias') res = res.filter((l) => Date.now() - l.fecha < 7 * 864e5)
      if (rangoFecha === '30dias') res = res.filter((l) => Date.now() - l.fecha < 30 * 864e5)

      setLogs(res)
      setTotal(res.length)
      setTotalPaginas(1)
      return
    }

    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (filtroUsuario) params.set('usuario', filtroUsuario)
      if (filtroModulo) params.set('modulo', filtroModulo)
      if (filtroAccion) params.set('accion', filtroAccion)
      params.set('page', String(pagina))
      params.set('size', '50')

      const hoy = new Date()
      if (rangoFecha === 'hoy') {
        const d = hoy.toISOString().slice(0, 10)
        params.set('desde', d)
        params.set('hasta', d)
      } else if (rangoFecha === '7dias') {
        const d = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
        params.set('desde', d)
      } else if (rangoFecha === '30dias') {
        const d = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
        params.set('desde', d)
      }

      const data = await api<{
        logs: LogAuditoria[]
        total: number
        pagina: number
        totalPaginas: number
        resumen: ResumenAuditoria
      }>(`/vista/auditoria?${params.toString()}`)

      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setTotalPaginas(data.totalPaginas || 1)
      if (data.resumen) setResumen(data.resumen)
    } catch (e) {
      toast('Error al consultar auditoría', mensajeError(e), 'warning')
    } finally {
      setCargando(false)
    }
  }, [q, filtroUsuario, filtroModulo, filtroAccion, rangoFecha, pagina, toast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const limpiarFiltros = () => {
    setQ('')
    setFiltroUsuario('')
    setFiltroModulo('')
    setFiltroAccion('')
    setRangoFecha('todo')
    setPagina(0)
  }

  const exportarCsv = () => {
    if (!logs.length) return toast('Sin registros', 'No hay datos de auditoría para exportar.')
    const encabezados = ['ID', 'Fecha', 'Hora', 'Usuario', 'Nombre', 'Rol', 'Módulo', 'Acción', 'Descripción', 'Entidad ID', 'IP']
    const filas = logs.map((l) => [
      l.id,
      fecha(l.fecha),
      hora(l.fecha),
      `"${l.usuario}"`,
      `"${l.nombreUsuario}"`,
      `"${l.rol}"`,
      `"${l.modulo}"`,
      `"${l.accion}"`,
      `"${l.descripcion.replace(/"/g, '""')}"`,
      `"${l.entidadId ?? ''}"`,
      `"${l.ip ?? ''}"`,
    ])

    const csvContent = '\uFEFF' + [encabezados.join(';'), ...filas.map((f) => f.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria_emcagua_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('Reporte exportado', 'Se descargó el archivo CSV con los registros filtrados.')
  }

  // Modulo más activo
  const moduloMasActivo = useMemo(() => {
    if (!logs.length) return '—'
    const counts: Record<string, number> = {}
    logs.forEach((l) => { counts[l.modulo] = (counts[l.modulo] || 0) + 1 })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? (MODULOS_MAP[top[0]]?.label ?? top[0]) : '—'
  }, [logs])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase">Administración</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Trazabilidad en vivo
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Auditoría de operaciones</h1>
          <p className="text-sm text-gray-500 mt-2">
            Historial cronológico de quién hizo qué en cada módulo (cobros, facturación, PQR, inventario y seguridad).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="flex items-center gap-2 px-3.5 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-dark transition shadow-sm"
            title="Refrescar datos"
          >
            <Ico d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={exportarCsv}
            className="flex items-center gap-2 px-4 h-10 rounded-xl bg-dark text-white text-sm font-semibold hover:bg-black transition shadow-sm"
          >
            <Ico d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Registros filtrados</p>
          <p className="text-2xl font-black text-dark mt-1">{total}</p>
          <p className="text-xs text-gray-400 mt-0.5">de {resumen.totalGeneral} en base de datos</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Operaciones hoy</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-emerald-700">{resumen.totalHoy}</p>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Hoy</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">actividad reciente</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Funcionarios registrados</p>
          <p className="text-2xl font-black text-dark mt-1">{resumen.usuarios?.length || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{resumen.usuarios?.join(', ') || 'Sin usuarios'}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Módulo más activo</p>
          <p className="text-xl font-black text-primary-700 mt-1 truncate">{moduloMasActivo}</p>
          <p className="text-xs text-gray-400 mt-0.5">con más eventos registrados</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda general */}
          <div className="relative lg:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Ico d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por descripción, recibo, PQR o predio..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPagina(0) }}
              className="w-full pl-9 pr-3 h-10 rounded-xl border border-gray-200 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Filtro Usuario */}
          <div>
            <select
              value={filtroUsuario}
              onChange={(e) => { setFiltroUsuario(e.target.value); setPagina(0) }}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-gray-700"
            >
              <option value="">Todos los funcionarios</option>
              {resumen.usuarios?.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Filtro Módulo */}
          <div>
            <select
              value={filtroModulo}
              onChange={(e) => { setFiltroModulo(e.target.value); setPagina(0) }}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-gray-700"
            >
              <option value="">Todos los módulos</option>
              {Object.entries(MODULOS_MAP).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          {/* Filtro Período / Fecha */}
          <div>
            <select
              value={rangoFecha}
              onChange={(e) => { setRangoFecha(e.target.value as any); setPagina(0) }}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-gray-700 font-medium"
            >
              <option value="todo">Todo el historial</option>
              <option value="hoy">Solo hoy</option>
              <option value="7dias">Últimos 7 días</option>
              <option value="30dias">Últimos 30 días</option>
            </select>
          </div>
        </div>

        {(q || filtroUsuario || filtroModulo || filtroAccion || rangoFecha !== 'todo') && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>Filtros activos aplicados</span>
            <button
              onClick={limpiarFiltros}
              className="text-primary-700 hover:text-primary-900 font-semibold"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de registros */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Funcionario</th>
                <th className="py-3 px-4">Módulo</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4 min-w-[280px]">Descripción de la operación</th>
                <th className="py-3 px-4">Terminal / IP</th>
                <th className="py-3 px-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-gray-600">No se encontraron operaciones</p>
                    <p className="text-xs mt-1">Prueba cambiando o limpiando los filtros de búsqueda.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const modInfo = MODULOS_MAP[log.modulo.toLowerCase()] ?? MODULOS_MAP.general
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setDetalleModal(log)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-dark text-xs">{fecha(log.fecha)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{hora(log.fecha)}</p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar nombre={log.nombreUsuario || log.usuario} size={30} />
                          <div>
                            <p className="font-semibold text-dark text-xs leading-none">{log.nombreUsuario || log.usuario}</p>
                            <span className="text-[10px] text-gray-400 inline-block mt-0.5">
                              {log.rol || 'Funcionario'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${modInfo.bg} ${modInfo.color} ${modInfo.border}`}>
                          {modInfo.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          {log.accion}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-xs text-gray-800 line-clamp-2 leading-relaxed">
                          {log.descripcion}
                        </p>
                        {log.entidadId && (
                          <span className="text-[10px] font-medium text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                            Ref: {log.entidadId}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-500">
                          {log.ip || '127.0.0.1'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetalleModal(log) }}
                          className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 group-hover:border-primary-300 transition"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Página {pagina + 1} de {totalPaginas} ({total} registros en total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={pagina === 0}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={pagina >= totalPaginas - 1}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      <Modal
        open={!!detalleModal}
        onClose={() => setDetalleModal(null)}
        title="Detalle del registro de auditoría"
        subtitle={detalleModal ? `ID #${detalleModal.id} · ${fecha(detalleModal.fecha)} ${hora(detalleModal.fecha)}` : ''}
        size="lg"
      >
        {detalleModal && (
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar nombre={detalleModal.nombreUsuario || detalleModal.usuario} size={40} />
                <div>
                  <p className="text-sm font-bold text-dark">{detalleModal.nombreUsuario}</p>
                  <p className="text-xs text-gray-500">Usuario: @{detalleModal.usuario} · Rol: {detalleModal.rol}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                  IP: {detalleModal.ip || '127.0.0.1'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <p className="text-gray-400 font-medium">Módulo</p>
                <p className="font-bold text-dark text-sm mt-0.5 uppercase tracking-wide">{detalleModal.modulo}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <p className="text-gray-400 font-medium">Acción realizada</p>
                <p className="font-mono font-bold text-primary-700 text-sm mt-0.5">{detalleModal.accion}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-400 font-medium mb-1">Descripción de la operación</p>
              <p className="text-sm text-dark font-medium leading-relaxed">{detalleModal.descripcion}</p>
            </div>

            {detalleModal.entidadId && (
              <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-400 font-medium mb-1">Entidad afectada</p>
                <p className="text-xs font-mono text-gray-700">
                  Tipo: <span className="font-bold">{detalleModal.entidadTipo || 'Registro'}</span> · ID / Referencia: <span className="font-bold text-primary-700">{detalleModal.entidadId}</span>
                </p>
              </div>
            )}

            {detalleModal.detalle && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Datos estructurados adicionales (JSON)</p>
                <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-48 border border-gray-800">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(detalleModal.detalle), null, 2)
                    } catch {
                      return detalleModal.detalle
                    }
                  })()}
                </pre>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setDetalleModal(null)}
                className="px-4 py-2 bg-dark text-white rounded-xl text-sm font-semibold hover:bg-black transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
