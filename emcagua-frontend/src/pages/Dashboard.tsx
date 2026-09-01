import { formatCutoff, getNextCutoff } from '../utils/cutoff'

const stats = [
  { label: 'Usuarios', value: '4,820', sub: '+12 este mes', icon: '◐', accent: 'primary' },
  { label: 'Facturas pendientes', value: '312', sub: 'Por recaudar', icon: '◑', accent: 'secondary' },
  { label: 'Pagos hoy', value: '47', sub: '$2.4M recaudado', icon: '⬢', accent: 'primary' },
  { label: 'PQR abiertas', value: '8', sub: '2 urgentes', icon: '⬣', accent: 'secondary' },
]

const recentPayments = [
  { id: 'FAC-2026-001', cliente: 'Juan Pérez', monto: '$ 85.000', estado: 'Pagado', fecha: 'Hoy 09:32' },
  { id: 'FAC-2026-002', cliente: 'María López', monto: '$ 62.000', estado: 'Pendiente', fecha: 'Hoy 08:15' },
  { id: 'FAC-2026-003', cliente: 'Carlos Ruiz', monto: '$ 120.000', estado: 'Pagado', fecha: 'Ayer' },
  { id: 'FAC-2026-004', cliente: 'Ana Torres', monto: '$ 45.000', estado: 'Vencida', fecha: 'Ayer' },
]

export default function Dashboard() {
  const username = (() => {
    try {
      const u = localStorage.getItem('emcagua_user')
      return u ? JSON.parse(u).username : 'Trabajador'
    } catch {
      return 'Trabajador'
    }
  })()
  const nextCutoff = getNextCutoff()

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase mb-2">Panel de control</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Bienvenido, {username}</h1>
        <p className="text-sm text-gray-500 mt-2">EMCAGUA APC · El Carmen, Norte de Santander</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-white border border-gray-100 rounded-full px-3 py-1.5 shadow-sm">
          <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-dark">Corte mensual: primer viernes</span>
          <span className="text-xs text-gray-400">· {formatCutoff(nextCutoff)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_16px_32px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] transition-all">
            <div className="flex items-start justify-between mb-3">
              <span className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold ${s.accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                {s.icon}
              </span>
              <span className="h-6 w-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 text-xs">↗</span>
            </div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-gray-400 uppercase">{s.label}</p>
            <p className="text-[28px] font-extrabold tracking-tight text-dark mt-1 leading-none">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-dark">¿Qué deseas hacer hoy?</h3>
              <p className="text-sm text-gray-500 mt-1">Accesos rápidos para las tareas más comunes</p>
            </div>
            <span className="hidden sm:inline-flex text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">Atajos</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Nuevo Usuario', icon: '+' },
              { label: 'Registrar pago', icon: '$' },
              { label: 'Nueva PQR', icon: '✉' },
              { label: 'Generar reporte', icon: '▤' },
            ].map((a) => (
              <button key={a.label} className="group bg-gray-50 hover:bg-primary/10 border border-gray-100 hover:border-primary/20 rounded-2xl p-4 flex flex-col items-center gap-3 transition-colors">
                <span className="h-10 w-10 rounded-xl bg-white border border-gray-100 group-hover:bg-primary group-hover:text-white group-hover:border-primary text-dark flex items-center justify-center font-bold shadow-sm transition-colors">
                  {a.icon}
                </span>
                <span className="text-xs font-semibold text-dark text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] p-6">
          <h3 className="text-[13px] font-bold tracking-wide text-dark uppercase">Estado del sistema</h3>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Base de datos</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Operativa
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Facturación</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" /> Activa
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Corte mensual</span>
              <span className="text-xs font-medium text-dark bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">{formatCutoff(nextCutoff)}</span>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-gradient-to-br from-orange-50 to-white border border-orange-100 p-3">
            <p className="text-xs font-bold text-orange-700">Para cortar: identifica vencidos</p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">Si pasó el primer viernes y debe 1 pago, aparece <span className="bg-orange-100 text-orange-700 px-1 rounded">VENCIDO</span> en Usuarios. Cámbialo manual con <span className="bg-red-50 text-red-700 border border-red-200 px-1 rounded text-[11px]">Cortar</span>.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-dark">Actividad reciente</h3>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">Últimos pagos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase px-6 py-3">Factura</th>
                <th className="text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase px-6 py-3">Cliente</th>
                <th className="text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase px-6 py-3">Monto</th>
                <th className="text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase px-6 py-3">Estado</th>
                <th className="text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase px-6 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPayments.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-dark">{r.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.cliente}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-dark">{r.monto}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${r.estado === 'Pagado' ? 'bg-green-50 text-green-700 border-green-200' : r.estado === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{r.estado}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{r.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
