import { useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import Sidebar, { MobileTabs } from './Sidebar'
import HospitalLogo from './HospitalLogo'
import Icon from './Icon'
import { supabase } from '../lib/supabase'
import { useRefreshStore } from '../store/refreshStore'
import { useAuthStore } from '../store/authStore'
import { useActiveCases, useFleetQuery, useHospital, useOffers } from '../hooks/useHospitalData'
import { useAlertNotifier, useAlertSound } from '../hooks/useAlertNotifier'
import type { LayoutData } from '../hooks/useLayoutData'

/**
 * Respaldo por si Realtime se cae o un evento no llega. Además, cuando otro hospital toma
 * una alerta o se cierra la oferta, la fila deja de ser visible por RLS y Realtime no avisa:
 * el refresco periódico la saca de la lista.
 */
const POLL_MS = 15_000

/** Resumen operativo siempre visible: lo que el operador necesita saber de un vistazo. */
function StatusBar({ pendientes, activos, libres, total }: { pendientes: number; activos: number; libres: number | undefined; total: number | undefined }) {
  const live = useRefreshStore((s) => s.live)
  const hospital = useHospital()
  const sound = useAlertSound()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const chip = 'flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm whitespace-nowrap'

  return (
    <div className="sticky top-0 z-[800] border-b border-line bg-wash/95 backdrop-blur">
      {/* Cabecera compacta en celular (en escritorio el hospital está en el menú lateral) */}
      <div className="flex items-center gap-3 px-4 pt-3 md:hidden">
        <HospitalLogo nombre={hospital.nombre} logoPath={hospital.logo_url} size={32} />
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{hospital.nombre}</span>
        <button type="button" onClick={() => sound.setEnabled(!sound.enabled)} aria-label={sound.enabled ? 'Silenciar alertas' : 'Activar sonido de alertas'} className="rounded-md p-2 text-muted hover:bg-wash">
          <Icon name={sound.enabled ? 'volume' : 'mute'} />
        </button>
        <button
          type="button"
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
          aria-label="Cerrar sesión"
          className="rounded-md p-2 text-muted hover:bg-wash"
        >
          <Icon name="logout" />
        </button>
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3 md:px-8">
        <Link to="/" className={`${chip} ${pendientes > 0 ? 'border-pulse/60 bg-rose' : ''}`}>
          <Icon name="bell" className={`h-4 w-4 ${pendientes > 0 ? 'text-pulse' : 'text-muted'}`} />
          <strong className="tabular-nums">{pendientes}</strong>
          <span className="text-muted">{pendientes === 1 ? 'alerta' : 'alertas'}</span>
        </Link>
        <Link to="/active" className={chip}>
          <Icon name="pulse" className="h-4 w-4 text-muted" />
          <strong className="tabular-nums">{activos}</strong>
          <span className="text-muted">en curso</span>
        </Link>
        <Link to="/fleet" className={`${chip} ${libres === 0 ? 'border-amber/60 bg-amberBg' : ''}`}>
          <Icon name="truck" className="h-4 w-4 text-muted" />
          <span className="tabular-nums"><strong>{libres ?? '–'}</strong><span className="text-muted">/{total ?? '–'}</span></span>
          <span className="text-muted">libres</span>
        </Link>
        <span className={`${chip} ml-auto border-transparent bg-transparent`} title={live === 'offline' ? 'Sin conexión en tiempo real: los datos se refrescan cada 15 s' : undefined}>
          {live === 'offline' ? (
            <Icon name="wifiOff" className="h-4 w-4 text-amber" />
          ) : (
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              {live === 'live' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live === 'live' ? 'bg-mint' : 'bg-amber'}`} />
            </span>
          )}
          <span className="text-xs text-muted">{live === 'live' ? 'En vivo' : live === 'connecting' ? 'Conectando…' : 'Refresco cada 15 s'}</span>
        </span>
      </div>
    </div>
  )
}

export default function Layout() {
  const hospital = useHospital()
  const bump = useRefreshStore((s) => s.bump)
  const setLive = useRefreshStore((s) => s.setLive)
  const offers = useOffers()
  const active = useActiveCases()
  const fleet = useFleetQuery()
  const pendientes = offers.data?.length ?? 0
  const activos = active.data?.length ?? 0
  const flotaActiva = fleet.data?.ambulances.filter((a) => a.activa)
  const libres = flotaActiva?.filter((a) => a.estado === 'disponible').length

  useAlertNotifier(offers.data)

  // Realtime: cambios en ofertas o incidentes visibles (RLS) refrescan las consultas.
  useEffect(() => {
    const channel = supabase
      .channel(`hospital-${hospital.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_offers', filter: `hospital_id=eq.${hospital.id}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, bump)
      .subscribe((status) =>
        setLive(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'offline' : 'connecting'),
      )
    const poll = setInterval(bump, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && bump()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [hospital.id, bump, setLive])

  // Contador en la pestaña para que el operador vea alertas aunque esté en otra pestaña.
  useEffect(() => {
    document.title = pendientes > 0 ? `(${pendientes}) Alertas · MedAlert Hospital` : 'MedAlert Hospital'
  }, [pendientes])

  return (
    <div className="flex min-h-screen bg-wash">
      <Sidebar pendientes={pendientes} activos={activos} />
      <div className="flex min-w-0 flex-1 flex-col">
        <StatusBar pendientes={pendientes} activos={activos} libres={libres} total={flotaActiva?.length} />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
          <div className="mx-auto max-w-6xl">
            <Outlet context={{ offers, active, fleet } satisfies LayoutData} />
          </div>
        </main>
      </div>
      <MobileTabs pendientes={pendientes} activos={activos} />
    </div>
  )
}
