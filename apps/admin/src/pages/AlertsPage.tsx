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
import type { Prioridad } from '../types'

/** Una alerta se marca como NUEVA durante su primer minuto. */
const NEW_MS = 60_000
const EDGE: Record<Prioridad, string> = { P1: 'before:bg-pulse', P2: 'before:bg-amber', P3: 'before:bg-mint' }

/** Tiempo esperando respuesta: ámbar desde 2 min, rojo desde 5 (cada minuto cuenta). */
function WaitChip({ since, now }: { since: string; now: number }) {
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000))
  const tone = mins >= 5 ? 'bg-pulse/20 text-red-100' : mins >= 2 ? 'bg-amber/20 text-amber-100' : 'bg-white/10 text-white/80'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${tone}`}>
      <Icon name="clock" className="h-3.5 w-3.5" />
      {mins < 1 ? 'Recién llegada' : `Esperando ${mins} min`}
    </span>
  )
}

function AlertSkeleton() {
  return (
    <li className="flex overflow-hidden rounded-xl border border-white/10 bg-night-700">
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
        subtitle={offers.data ? (n ? `${n} ${n === 1 ? 'incidente espera' : 'incidentes esperan'} respuesta de ${hospital.nombre}. Las críticas (P1) van primero.` : undefined) : 'Cargando…'}
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
            return (
              <li key={a.id}>
                <Link
                  to={`/alerts/${a.id}`}
                  aria-label={`Revisar alerta ${a.prioridad ?? ''} en ${lugar}, a ${fmtKm(distance_km)}`}
                  className={`group relative flex h-full overflow-hidden rounded-xl border bg-night-700 transition-colors before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-1 hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse ${
                    a.prioridad ? EDGE[a.prioridad] : 'before:bg-white/20'
                  } ${isNew ? 'border-pulse/60 shadow-[0_0_0_3px_rgba(230,57,70,0.18)]' : 'border-white/10'}`}
                >
                  <IncidentPhoto src={a.foto_url ? photos[a.foto_url] : null} alt="" className="w-32 shrink-0 sm:w-40" />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <PriorityBadge prioridad={a.prioridad} />
                      <div className="flex flex-col items-end gap-1">
                        {isNew && <span className="rounded bg-pulse px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Nueva</span>}
                        <WaitChip since={created_at} now={now} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold first-letter:uppercase">{lugar}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/70">
                        <span><strong className="text-white">{fmtKm(distance_km)}</strong></span>
                        <span>ETA <strong className="text-white">{etaMinutes(distance_km)} min</strong></span>
                        {a.ia_suggested_type && <span>IA sugiere <strong className="text-white">{TIPO_AMBULANCIA[a.ia_suggested_type]}</strong></span>}
                      </div>
                      <div className="mt-1 text-xs text-white/55">Reportado {fmtTime(a.created_at)}</div>
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
