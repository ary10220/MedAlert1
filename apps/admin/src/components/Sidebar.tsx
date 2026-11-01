import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useDataStore } from '../store/dataStore'
import { useActiveCases, usePendingAlerts } from '../hooks/useHospitalData'
import HospitalLogo from './HospitalLogo'
import { Toggle } from './ui'

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const hospital = useDataStore((s) => s.hospital)
  const liveSim = useDataStore((s) => s.liveSim)
  const setLiveSim = useDataStore((s) => s.setLiveSim)
  const navigate = useNavigate()
  const pendientes = usePendingAlerts().length
  const activos = useActiveCases().length

  const salir = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const items = [
    { to: '/', label: 'Alertas', count: pendientes, urgent: true },
    { to: '/active', label: 'Casos activos', count: activos, urgent: false },
    { to: '/history', label: 'Historial', count: 0, urgent: false },
    { to: '/fleet', label: 'Flota', count: 0, urgent: false },
  ]

  return (
    <aside className="flex shrink-0 flex-col gap-4 border-b border-white/10 bg-night px-4 py-4 md:sticky md:top-0 md:h-screen md:w-64 md:gap-0 md:border-b-0 md:border-r md:py-6">
      {/* UC-11: logo + nombre del hospital después del login */}
      <div className="flex items-center gap-3 px-2 md:mb-8">
        <HospitalLogo nombre={hospital.nombre} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{hospital.nombre}</div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Med<span className="text-pulse">Alert</span> · Despacho
          </div>
        </div>
        <button type="button" onClick={salir} className="ml-auto rounded-md px-2 py-1 text-xs font-semibold text-white/55 hover:bg-white/5 hover:text-white md:hidden">
          Salir
        </button>
      </div>

      <nav aria-label="Principal" className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:flex-col">
        {items.map(({ to, label, count, urgent }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${urgent ? 'bg-pulse text-white' : 'bg-white/15 text-white'}`}>{count}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="hidden flex-col gap-4 border-t border-white/10 px-2 pt-4 md:mt-auto md:flex">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold">Simulación en vivo</div>
            <div className="text-[11px] text-white/40">Alerta nueva cada 15 s</div>
          </div>
          <Toggle checked={liveSim} onChange={setLiveSim} label="Simulación de alertas en vivo" />
        </div>
        {user && (
          <div>
            <div className="truncate text-sm font-semibold">{user.nombre}</div>
            <div className="truncate text-xs text-white/45">{user.email}</div>
            <button type="button" onClick={salir} className="mt-2 text-xs font-semibold text-white/55 hover:text-white">
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
