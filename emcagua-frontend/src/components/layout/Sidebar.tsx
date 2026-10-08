import { Link, useLocation } from 'react-router-dom'
import Logo from '../Logo'
import Icon from '../ui/Icon'
import { getUsername, logout, puede, cuentaActual, rolActual, tokenApi } from '../../utils/session'

type SidebarProps = { isOpen: boolean; onClose: () => void }

type Item = { label: string; path: string; d: string; badge?: string; externo?: boolean }

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: 'General',
    items: [
      { label: 'Mi día', path: '/mi-dia', d: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
      { label: 'Dashboard', path: '/dashboard', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { label: 'Analítica', path: '/analitica', d: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
      { label: 'Asistente IA', path: '/asistente', badge: 'IA', d: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
      { label: 'Reportes', path: '/reporte', d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      { label: 'Usuarios', path: '/usuarios', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { label: 'Medidores', path: '/lecturas', d: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
      { label: 'Facturación', path: '/facturacion', d: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
      { label: 'Pagos y caja', path: '/pagos', d: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
      { label: 'PQR', path: '/pqr', d: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
      { label: 'Pérdidas de agua', path: '/perdidas', d: 'M12 21a7 7 0 007-7c0-4-7-11-7-11S5 10 5 14a7 7 0 007 7zM9 14l2 2 4-4' },
      { label: 'Inventario', path: '/inventario', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    ],
  },
  {
    titulo: 'Comunicación',
    items: [
      { label: 'Documentos', path: '/documentos', d: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
      { label: 'Redes sociales', path: '/redes', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' },
      { label: 'Avisos WhatsApp', path: '/avisos', d: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
      { label: 'Portal del usuario', path: '/portal', externo: true, d: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { label: 'Tarifas', path: '/tarifas', d: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
      { label: 'Reportes SUI', path: '/sui', d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { label: 'Nómina', path: '/nomina', d: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
      { label: 'Configuración', path: '/configuracion', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { label: 'Cuentas y roles', path: '/cuentas', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const username = cuentaActual()?.nombre ?? getUsername()

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[272px] bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.04)] lg:shadow-none transform transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[64px] flex items-center px-6 border-b border-gray-100">
          <Logo size={36} />
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {GRUPOS.map((g) => ({ ...g, items: g.items.filter((it) => it.externo || puede(it.path.slice(1))) })).filter((g) => g.items.length).map((g) => (
            <div key={g.titulo} className="mb-3">
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-gray-400 uppercase">{g.titulo}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = location.pathname === item.path
                  return (
                    <Link key={item.path} to={item.path} onClick={onClose} target={item.externo ? '_blank' : undefined} className={`group flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium transition-all no-underline ${active ? 'bg-dark text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-gray-600 hover:bg-gray-50 hover:text-dark'}`}>
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center border ${active ? 'bg-white/15 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-500 group-hover:border-gray-200'}`}><Icon d={item.d} className="w-4 h-4" strokeWidth={1.6} /></span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${active ? 'bg-white/15 text-white border-white/10' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{item.badge}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-sm font-bold text-dark">{username.charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark truncate leading-none">{username}</p>
              <p className="text-xs text-gray-500 truncate">{rolActual()?.nombre ?? 'Funcionario'}</p>
            </div>
            <span title={tokenApi() ? 'Conectado a la base de datos' : 'Modo demostración (datos del navegador)'} className={`h-2 w-2 rounded-full ${tokenApi() ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
          </div>
          <button onClick={() => { logout(); window.location.assign('/login') }} className="group mt-3 w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-gray-100 bg-white text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600 focus-visible:bg-red-50 focus-visible:border-red-200 focus-visible:text-red-600 active:bg-red-100">
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
