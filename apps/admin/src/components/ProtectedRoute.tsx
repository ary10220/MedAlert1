import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/** Solo deja pasar a staff hospitalario activo con hospital cargado; el resto va a /login. */
export default function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)
  const needsPassword = useAuthStore((s) => s.needsPassword)
  const location = useLocation()
  if (status === 'ready' && needsPassword) return <Navigate to="/set-password" replace />
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night" role="status">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-pulse" aria-hidden />
        <span className="sr-only">Cargando sesión…</span>
      </div>
    )
  }
  if (status !== 'ready') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
