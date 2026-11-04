import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '../hooks/useQuery'
import { useAlertSound } from '../hooks/useAlertNotifier'
import { fetchOnDuty } from '../lib/queries'
import { callFunction, errorMessage } from '../lib/api'
import { toast } from '../store/feedbackStore'
import HospitalLogo from './HospitalLogo'
import Icon from './Icon'
import { NAV } from './nav'
import { Toggle } from './ui'


function CountBadge({ n, urgent }: { n: number; urgent: boolean }) {
  if (n <= 0) return null
  return (
    <span className={`min-w-[1.25rem] rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums ${urgent ? 'bg-pulse text-white' : 'bg-white/15 text-white'}`}>
      {n}
    </span>
  )
}

/** Menú lateral (escritorio). En celular la navegación va en MobileTabs. */
export default function Sidebar({ pendientes, activos }: { pendientes: number; activos: number }) {
  const profile = useAuthStore((s) => s.profile)!
  const hospital = useAuthStore((s) => s.hospital)!
  const email = useAuthStore((s) => s.session?.user.email)
  const logout = useAuthStore((s) => s.logout)
  const sound = useAlertSound()
  const navigate = useNavigate()

  // Turno (set-duty): si el hospital usa turnos, solo el personal en turno recibe los push.
  const duty = useQuery(() => fetchOnDuty(profile.id), [profile.id], { live: false })
  const [dutySaving, setDutySaving] = useState(false)
  const toggleDuty = async (on: boolean) => {
    setDutySaving(true)
    try {
      await callFunction('set-duty', { on_duty: on })
      duty.refetch()
      toast.success(on ? 'Turno iniciado: vas a recibir los avisos de alertas.' : 'Turno terminado.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDutySaving(false)
    }
  }

  const salir = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const counts = { alerts: pendientes, active: activos }

  return (
    <aside className="hidden shrink-0 flex-col border-r border-white/10 bg-night px-4 py-6 md:sticky md:top-0 md:flex md:h-screen md:w-64">
      {/* UC-11: logo + nombre del hospital después del login */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <HospitalLogo nombre={hospital.nombre} logoPath={hospital.logo_url} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{hospital.nombre}</div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Med<span className="text-pulse">Alert</span> · Despacho
          </div>
        </div>
      </div>

      <nav aria-label="Principal" className="flex flex-col gap-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon name={item.icon} className="h-5 w-5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && <CountBadge n={counts[item.badge]} urgent={item.badge === 'alerts'} />}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 border-t border-white/10 px-2 pt-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold">En turno</span>
            <span className="block text-xs text-white/55">Recibir avisos push</span>
          </span>
          <Toggle checked={duty.data ?? false} disabled={duty.data === undefined || dutySaving} onChange={toggleDuty} label="Estoy en turno" />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold">Sonido de alertas</span>
            <span className="block text-xs text-white/55">Pitido al llegar una nueva</span>
          </span>
          <Toggle checked={sound.enabled} onChange={sound.setEnabled} label="Sonido de alertas nuevas" />
        </label>
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5">
          <Icon name="user" className="h-5 w-5 shrink-0 text-white/55" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{profile.nombre}</div>
            <div className="truncate text-xs text-white/55">{email}</div>
          </div>
          <button type="button" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

/** Barra de pestañas inferior para celular: los 4 destinos siempre a un toque. */
export function MobileTabs({ pendientes, activos }: { pendientes: number; activos: number }) {
  const counts = { alerts: pendientes, active: activos }
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-[900] grid grid-cols-4 border-t border-white/10 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? 'text-white' : 'text-white/55'}`}
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-pulse" aria-hidden />}
              <span className="relative">
                <Icon name={item.icon} className="h-6 w-6" />
                {item.badge && counts[item.badge] > 0 && (
                  <span className={`absolute -right-2.5 -top-1.5 min-w-[1.1rem] rounded-full px-1 text-center text-[10px] font-bold leading-[1.1rem] ${item.badge === 'alerts' ? 'bg-pulse' : 'bg-white/25'}`}>
                    {counts[item.badge]}
                  </span>
                )}
              </span>
              {item.short}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
