// UC-12 · Alertas entrantes: ofertas abiertas para el hospital (incident_offers + Realtime).
import { Link } from 'react-router-dom'
import { useLayoutData } from '../hooks/useLayoutData'
import { useHospital } from '../hooks/useHospitalData'
import { useNow } from '../hooks/useNow'
import { useSignedPhotos } from '../hooks/useSignedPhotos'
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '../components/ui'
import { IncidentPhoto, PriorityBadge } from '../components/IncidentBits'
import Icon from '../components/Icon'
import { etaMinutes, fmtKm } from '../lib/hospital'
import { TIPO_AMBULANCIA, fmtTime } from '../lib/format'
import type { Incident, Prioridad } from '../types'

/** Una alerta se marca como NUEVA durante su primer minuto. */
const NEW_MS = 60_000
const EDGE: Record<Prioridad, string> = { P1: 'before:bg-pulse', P2: 'before:bg-amber', P3: 'before:bg-mint' }

/** Tiempo esperando respuesta: ámbar desde 2 min, rojo desde 5 (cada minuto cuenta). */
function WaitChip({ since, now }: { since: string; now: number }) {
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000))
  const tone = mins >= 5 ? 'bg-rose text-pulse-dark' : mins >= 2 ? 'bg-amberBg text-amber' : 'bg-wash text-ink'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${tone}`}>
      <Icon name="clock" className="h-3.5 w-3.5" />
      {mins < 1 ? 'Recién llegada' : `Esperando ${mins} min`}
    </span>
  )
}

/** Heridos estimados por IA, con la confirmación del operador si ya existe. */
function heridosLabel(a: Incident): string | null {
  const conf = a.cantidad_heridos_confirmada
  const estim = a.ia_output?.cantidad_heridos_estimada ?? a.cantidad_heridos
  if (conf != null) return `${conf} ${conf === 1 ? 'herido' : 'heridos'} (confirmado)`
  if (estim != null) return `${estim} ${estim === 1 ? 'herido estimado' : 'heridos estimados'}`
  return null
}

function AlertSkeleton() {
  return (
    <li className="flex overflow-hidden rounded-xl border border-line bg-surface">
      <Skeleton className="h-auto w-32 shrink-0 rounded-none sm:w-40" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex justify-between"><Skeleton className="h-12 w-16" /><Skeleton className="h-6 w-28" /></div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-auto h-11 w-full" />
      </div>
    </li>
  )
}

export default function AlertsPage() {
  const { offers } = useLayoutData()
  const hospital = useHospital()
  const now = useNow(10_000)
  const photos = useSignedPhotos(offers.data?.map((o) => o.incident.foto_url) ?? [])
  const n = offers.data?.length ?? 0

  return (
    <>
      <PageHeader
        title="Alertas entrantes"
        subtitle={offers.data ? (n ? `${n} ${n === 1 ? 'incidente espera' : 'incidentes esperan'} respuesta de ${hospital.nombre}. Las críticas van primero.` : undefined) : 'Cargando…'}
      />

      {offers.error && <div className="mb-4"><ErrorBox message={offers.error} onRetry={offers.refetch} /></div>}

      {!offers.data ? (
        offers.loading && (
          <ul className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Cargando alertas">
            <AlertSkeleton />
            <AlertSkeleton />
          </ul>
        )
      ) : n === 0 ? (
        <Card>
          <EmptyState icon="check" title="Sin alertas pendientes">
            Cuando un testigo reporte un accidente cerca, la alerta aparecerá acá al instante y sonará un aviso (si el sonido está activo).
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" aria-live="polite">
          {offers.data.map(({ incident: a, distance_km, created_at }) => {
            const isNew = now - new Date(created_at).getTime() < NEW_MS
            const lugar = a.referencia || a.tipo_accidente || 'Ubicación por GPS'
            const heridos = heridosLabel(a)
            return (
              <li key={a.id}>
                <Link
                  to={`/alerts/${a.id}`}
                  aria-label={`Revisar alerta en ${lugar}, a ${fmtKm(distance_km)}`}
                  className={`group relative flex h-full overflow-hidden rounded-xl border bg-surface shadow-card transition-colors before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-1 hover:border-navy/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse ${
                    a.prioridad ? EDGE[a.prioridad] : 'before:bg-amber'
                  } ${isNew ? 'border-pulse/60 shadow-[0_0_0_3px_rgba(217,21,46,0.15)]' : 'border-line'}`}
                >
                  <IncidentPhoto src={a.foto_url ? photos[a.foto_url] : null} alt="" className="w-32 shrink-0 sm:w-40" />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <PriorityBadge prioridad={a.prioridad} />
                      <div className="flex flex-col items-end gap-1">
                        {isNew && <span className="rounded bg-pulse px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Nueva</span>}
                        <WaitChip since={created_at} now={now} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-ink first-letter:uppercase">{lugar}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                        <span><strong className="text-ink">{fmtKm(distance_km)}</strong></span>
                        <span>ETA <strong className="text-ink">{etaMinutes(distance_km)} min</strong></span>
                        {a.ia_suggested_type && <span>IA sugiere <strong className="text-ink">{TIPO_AMBULANCIA[a.ia_suggested_type]}</strong></span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {heridos && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose px-2 py-1 font-semibold text-pulse-dark ring-1 ring-inset ring-pulse/20">
                            <Icon name="heart" className="h-3.5 w-3.5" /> {heridos}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-md bg-wash px-2 py-1 font-medium text-muted ring-1 ring-inset ring-line">
                          <Icon name="user" className="h-3.5 w-3.5" /> {a.reporter_id ? 'Testigo registrado' : 'Anónimo'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted">Reportado {fmtTime(a.created_at)}</div>
                    </div>
                    <span className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-pulse px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-pulse-dark">
                      Revisar y despachar
                      <Icon name="chevron" className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
