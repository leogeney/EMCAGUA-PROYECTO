import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Users = lazy(() => import('./pages/Users'))
const Facturacion = lazy(() => import('./pages/Facturacion'))
const Pagos = lazy(() => import('./pages/Pagos'))
const Lecturas = lazy(() => import('./pages/Lecturas'))
const PqrPage = lazy(() => import('./pages/Pqr'))
const Asistente = lazy(() => import('./pages/Asistente'))
const Reporte = lazy(() => import('./pages/Reporte'))
const Documentos = lazy(() => import('./pages/Documentos'))
const Redes = lazy(() => import('./pages/Redes'))
const Analitica = lazy(() => import('./pages/Analitica'))
import { isAdmin, isLoggedIn } from './utils/session'
const Nomina = lazy(() => import('./pages/Nomina'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = isLoggedIn()
  if (!isAuth) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuth = isLoggedIn()
  if (isAuth) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/usuarios" element={<Users />} />
        <Route path="/facturacion" element={<Facturacion />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/analitica" element={<Analitica />} />
        <Route path="/nomina" element={<AdminRoute><Nomina /></AdminRoute>} />
        <Route path="/pqr" element={<PqrPage />} />
        <Route path="/lecturas" element={<Lecturas />} />
        <Route path="/asistente" element={<Asistente />} />
        <Route path="/reporte" element={<Reporte />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/redes" element={<Redes />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
