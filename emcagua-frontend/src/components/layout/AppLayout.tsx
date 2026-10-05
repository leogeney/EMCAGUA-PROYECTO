import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Campana from './Campana'
import AsistenteFlotante from '../asistente/AsistenteFlotante'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#F4F5F3]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[64px] bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center hover:bg-gray-50" aria-label="Menu">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="hidden sm:flex items-center gap-2 text-xs">
              <span className="h-6 px-2.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 font-medium flex items-center">Portal Interno</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-500">El Carmen, Norte de Santander</span>
              <span className="hidden lg:inline-flex h-5 px-2 rounded-full bg-primary/10 border border-primary/10 text-primary text-[11px] font-bold">EMCAGUA APC</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 text-xs">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              Modo demostración
            </div>
            <Campana />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="p-8 flex justify-center"><span className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-secondary animate-spin" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <AsistenteFlotante />
    </div>
  )
}
