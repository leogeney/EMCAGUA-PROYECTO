import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Facturacion from './pages/Facturacion'
import Pagos from './pages/Pagos'
import Placeholder from './pages/Placeholder'
import Analitica from './pages/Analitica'
import { isAdmin, isLoggedIn } from './utils/session'
import Nomina from './pages/Nomina'

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
        <Route path="/pqr" element={<Placeholder title="PQR" description="Peticiones, quejas y reclamos" />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
