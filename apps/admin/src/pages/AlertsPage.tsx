// UC-12 · Dashboard de alertas entrantes (realtime simulado: llega una nueva cada 15 s).
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { usePendingAlerts } from '../hooks/useHospitalData'
import { useNow } from '../hooks/useNow'
import { Card, EmptyState, PageHeader } from '../components/ui'
import { IncidentPhoto, PriorityBadge } from '../components/IncidentBits'
import { distanceToHospital, etaMinutes, fmtKm } from '../lib/hospital'
import { fmtAgo, fmtTime } from '../lib/format'

/** Una alerta se marca como NUEVA durante sus primeros 20 s. */
const NEW_MS = 20_000

export default function AlertsPage() {
  const alerts = usePendingAlerts()
  const hospital = useDataStore((s) => s.hospital)
  const liveSim = useDataStore((s) => s.liveSim)
  const libres = useDataStore((s) => s.ambulances.filter((a) => a.activa && a.estado === 'disponible').length)
  const now = useNow(5_000)

  return (
    <>
      <PageHeader
        title="Alertas entrantes"
        subtitle={`Accidentes reportados cerca de ${hospital.nombre}`}
        action={
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2 text-white/60">
              <span className={`relative flex h-2.5 w-2.5 ${liveSim ? '' : 'opacity-40'}`} aria-hidden>
                {liveSim && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pulse opacity-60" />}
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pulse" />
              </span>
              {liveSim ? 'En vivo' : 'Pausado'}
            </span>
            <span className="rounded-lg border border-white/10 bg-night-700 px-3 py-1.5 text-white/70">
              <strong className={`tabular-nums ${libres === 0 ? 'text-red-300' : 'text-white'}`}>{libres}</strong> unidades libres
            </span>
          </div>
        }
      />

      {alerts.length === 0 ? (
        <Card>
          <EmptyState>Sin alertas pendientes. Las nuevas aparecerán aquí automáticamente.</EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" aria-live="polite">
          {alerts.map((a) => {
            const km = distanceToHospital(a, hospital)
            const isNew = now - new Date(a.created_at).getTime() < NEW_MS
            return (
              <li
                key={a.id}
                className={`flex overflow-hidden rounded-xl border bg-night-700 transition-shadow ${
                  isNew ? 'border-pulse/60 shadow-[0_0_0_3px_rgba(230,57,70,0.18)]' : 'border-white/10'
                }`}
              >
                <IncidentPhoto src={a.foto_url} alt={`Foto del reporte ${a.id}`} className="w-28 shrink-0 sm:w-36" />
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <PriorityBadge prioridad={a.prioridad} />
                    <div className="text-right">
                      {isNew && <div className="mb-1 inline-block rounded bg-pulse px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Nueva</div>}
                      <div className="text-sm font-semibold tabular-nums">{fmtTime(a.created_at)}</div>
                      <div className="text-xs text-white/45">{fmtAgo(a.created_at, now)}</div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{a.referencia}</div>
                    <div className="mt-0.5 text-xs text-white/50">
                      {fmtKm(km)} · ETA sugerida <strong className="text-white/80">{etaMinutes(km)} min</strong>
                    </div>
                  </div>
                  <Link
                    to={`/alerts/${a.id}`}
                    className="mt-auto inline-flex items-center justify-center rounded-lg bg-pulse px-4 py-2 text-sm font-bold tracking-wide text-white transition-colors hover:bg-pulse-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse"
                  >
                    VER
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
