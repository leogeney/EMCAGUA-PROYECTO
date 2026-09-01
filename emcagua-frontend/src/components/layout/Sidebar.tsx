import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../Logo'

type SidebarProps = { isOpen: boolean; onClose: () => void }

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: (<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>) },
  { label: 'Usuarios', path: '/usuarios', icon: (<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>) },
  { label: 'Facturación', path: '/facturacion', icon: (<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>), badge: 'Pronto' },
  { label: 'Pagos', path: '/pagos', icon: (<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>), badge: 'Pronto' },
  { label: 'PQR', path: '/pqr', icon: (<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>), badge: 'Pronto' },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const username = (() => {
    try {
      const u = localStorage.getItem('emcagua_user')
      return u ? JSON.parse(u).username : 'Trabajador'
    } catch {
      return 'Trabajador'
    }
  })()

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[272px] bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.04)] lg:shadow-none transform transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[64px] flex items-center px-6 border-b border-gray-100">
          <Logo size={36} />
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.12em] text-gray-400 uppercase">Menú</p>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} onClick={onClose} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all no-underline ${active ? 'bg-dark text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-gray-600 hover:bg-gray-50 hover:text-dark'}`}>
                <span className={`h-8 w-8 rounded-lg flex items-center justify-center border ${active ? 'bg-white/15 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-500 group-hover:border-gray-200'}`}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${active ? 'bg-white/15 text-white border-white/10' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{item.badge}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-sm font-bold text-dark">{username.charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark truncate leading-none">{username}</p>
              <p className="text-xs text-gray-500 truncate">Trabajador EMCAGUA</p>
            </div>
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <button onClick={() => { localStorage.removeItem('emcagua_user'); navigate('/login') }} className="mt-3 w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
