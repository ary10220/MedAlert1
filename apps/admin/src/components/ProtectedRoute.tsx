import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/** Solo deja pasar a staff hospitalario activo con hospital asignado; el resto va a /login. */
export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (!user || user.rol !== 'hospital_staff' || !user.activo || !user.hospital_id) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
