import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import { MODULOS } from './data/cuentas'
import { cuentaActual, isLoggedIn, logout, puede } from './utils/session'

const Portal = lazy(() => import('./pages/Portal'))
const Verificar = lazy(() => import('./pages/Verificar'))

/** Cada módulo protegido por permiso del rol. La clave es el id del módulo (= ruta). */
const PAGINAS: Record<string, LazyExoticComponent<ComponentType>> = {
  'mi-dia': lazy(() => import('./pages/MiDia')),
  dashboard: lazy(() => import('./pages/Dashboard')),
  analitica: lazy(() => import('./pages/Analitica')),
  asistente: lazy(() => import('./pages/Asistente')),
  reporte: lazy(() => import('./pages/Reporte')),
  usuarios: lazy(() => import('./pages/Users')),
  lecturas: lazy(() => import('./pages/Lecturas')),
  facturacion: lazy(() => import('./pages/Facturacion')),
  pagos: lazy(() => import('./pages/Pagos')),
  pqr: lazy(() => import('./pages/Pqr')),
  perdidas: lazy(() => import('./pages/Perdidas')),
  inventario: lazy(() => import('./pages/Inventario')),
  documentos: lazy(() => import('./pages/Documentos')),
  redes: lazy(() => import('./pages/Redes')),
  avisos: lazy(() => import('./pages/Avisos')),
  tarifas: lazy(() => import('./pages/Tarifas')),
  sui: lazy(() => import('./pages/Sui')),
  nomina: lazy(() => import('./pages/Nomina')),
  configuracion: lazy(() => import('./pages/Configuracion')),
  cuentas: lazy(() => import('./pages/Cuentas')),
}

/** Primer módulo que el rol puede ver (para redirigir). */
const inicio = () => `/${MODULOS.find((m) => PAGINAS[m.id] && puede(m.id))?.id ?? 'mi-dia'}`

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  // La cuenta pudo ser desactivada o borrada: se cierra la sesión
  if (!cuentaActual()) { logout(); return <Navigate to="/login" replace /> }
  return <>{children}</>
}

function Permiso({ modulo, children }: { modulo: string; children: React.ReactNode }) {
  if (!puede(modulo)) return <Navigate to={inicio()} replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  if (isLoggedIn() && cuentaActual()) return <Navigate to={inicio()} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {Object.entries(PAGINAS).map(([id, Pagina]) => (
          <Route key={id} path={`/${id}`} element={<Permiso modulo={id}><Pagina /></Permiso>} />
        ))}
        <Route path="/caja" element={<Navigate to="/pagos?tab=caja" replace />} />
      </Route>
      <Route path="/portal" element={<Suspense fallback={null}><Portal /></Suspense>} />
      <Route path="/verificar" element={<Suspense fallback={null}><Verificar /></Suspense>} />
      <Route path="*" element={<Navigate to="/mi-dia" replace />} />
    </Routes>
  )
}
