// UC-15 · Confirmación de despacho con los datos que quedaron guardados (get-incident).
import { Link, Navigate, useParams } from 'react-router-dom'
import { useHospital } from '../hooks/useHospitalData'
import { useQuery } from '../hooks/useQuery'
import { fetchIncidentDetail } from '../lib/queries'
import { distanceToHospital, etaMinutes } from '../lib/hospital'
import { TIPO_AMBULANCIA } from '../lib/format'
import { ErrorBox } from '../components/ui'

export default function DispatchConfirmPage() {
  const { id = '' } = useParams()
  const hospital = useHospital()
  const detail = useQuery(() => fetchIncidentDetail(id), [id], { live: false })

  if (detail.error && !detail.data) return <ErrorBox message={detail.error} onRetry={detail.refetch} />
  if (!detail.data) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center" role="status" aria-live="polite">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-line border-t-pulse" aria-hidden />
        <p className="mt-6 text-lg font-semibold">Confirmando despacho…</p>
        <p className="mt-1 text-sm text-muted">Notificando al testigo</p>
      </div>
    )
  }

  const { incident, ambulance, driver } = detail.data
  if (incident.assigned_hospital_id !== hospital.id || !ambulance) return <Navigate to={`/alerts/${id}`} replace />
  const km = distanceToHospital(incident, hospital)

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md text-center" role="status" aria-live="polite">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-mintBg ring-2 ring-mint" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-12 w-12 text-mint" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold text-navy">Ambulancia {ambulance.codigo ?? ambulance.placa} despachada</h1>
        <dl className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-line bg-surface px-4 py-3">
            <dt className="text-[11px] uppercase tracking-wider text-muted">Chofer</dt>
            <dd className="mt-1 font-semibold">{driver?.nombre ?? '—'}</dd>
            {driver?.telefono && <dd className="text-xs tabular-nums text-muted">{driver.telefono}</dd>}
          </div>
          <div className="rounded-xl border border-line bg-surface px-4 py-3">
            <dt className="text-[11px] uppercase tracking-wider text-muted">ETA</dt>
            <dd className="mt-1 font-display text-xl font-semibold">{km != null ? `${etaMinutes(km)} min` : '—'}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted">
          {ambulance.tipo ? TIPO_AMBULANCIA[ambulance.tipo] : ''} · {ambulance.placa}
          {incident.referencia ? ` → ${incident.referencia}` : ''}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to={`/active#${incident.id}`} className="rounded-lg bg-pulse px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-pulse-dark">
            Ver seguimiento
          </Link>
          <Link to="/" className="rounded-lg border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink hover:bg-wash">
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
