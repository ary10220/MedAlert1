// UC-13 · Detalle de alerta: foto, triage IA, mapa con ruta sugerida, distancia, ETA, rechazar / aceptar.
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { useNow } from '../hooks/useNow'
import { Button, Card, EmptyState } from '../components/ui'
import { IncidentPhoto, PriorityBadge } from '../components/IncidentBits'
import IncidentMap from '../components/IncidentMap'
import { distanceToHospital, etaMinutes, fmtKm } from '../lib/hospital'
import { TIPO_AMBULANCIA, fmtAgo, fmtTime } from '../lib/format'

export default function AlertDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { incidents, hospital, rejectAlert } = useDataStore()
  const now = useNow()
  const alert = incidents.find((i) => i.id === id)

  if (!alert) {
    return (
      <Card>
        <EmptyState>
          No se encontró la alerta. <Link to="/" className="font-semibold text-white underline">Volver a alertas</Link>
        </EmptyState>
      </Card>
    )
  }

  const km = distanceToHospital(alert, hospital)
  const pendiente = alert.estado === 'searching'

  const rechazar = () => {
    if (!confirm('¿Rechazar esta alerta? Se ofrecerá a otro hospital cercano.')) return
    rejectAlert(alert.id)
    navigate('/', { replace: true })
  }

  return (
    <>
      <Link to="/" className="mb-4 inline-block text-sm font-semibold text-white/55 hover:text-white">← Alertas</Link>

      {!pendiente && (
        <div role="status" className="mb-4 rounded-lg border border-mint/40 bg-mint/10 px-4 py-3 text-sm">
          Esta alerta ya fue despachada. <Link to="/active" className="font-semibold underline">Ver casos activos</Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <IncidentPhoto src={alert.foto_url} alt={`Foto del accidente ${alert.id}`} className="aspect-[4/3] w-full rounded-xl" />
          <Card title="Clasificación IA">
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <PriorityBadge prioridad={alert.prioridad} />
                {alert.ia_suggested_type && (
                  <span className="text-sm text-white/70">
                    Unidad sugerida: <strong className="text-white">{TIPO_AMBULANCIA[alert.ia_suggested_type]}</strong>
                  </span>
                )}
              </div>
              <p className="text-base leading-relaxed">“{alert.ia_output?.descripcion ?? 'Sin descripción'}”</p>
              {alert.ia_output && (
                <p className="text-xs text-white/45">
                  {alert.ia_output.victimas_estimadas} víctima(s) estimada(s) · confianza {Math.round(alert.ia_output.confianza * 100)}%
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <IncidentMap incident={[alert.lat, alert.lon]} hospital={[hospital.lat, hospital.lon]} hospitalName={hospital.nombre} className="h-80" />
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Distancia" value={fmtKm(km)} />
            <Stat label="ETA" value={`${etaMinutes(km)} min`} />
            <Stat label="Reportado" value={fmtTime(alert.created_at)} hint={fmtAgo(alert.created_at, now)} />
          </div>
          <Card>
            <div className="p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-white/45">Ubicación</div>
              <div className="mt-1 font-semibold">{alert.referencia}</div>
              <div className="text-xs tabular-nums text-white/45">{alert.lat.toFixed(5)}, {alert.lon.toFixed(5)}</div>
            </div>
          </Card>
        </div>
      </div>

      {pendiente && (
        <div className="sticky bottom-0 -mx-4 mt-6 flex gap-3 border-t border-white/10 bg-night-800/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:p-0">
          <Button variant="secondary" className="flex-1 py-3 md:flex-none md:px-8" onClick={rechazar}>RECHAZAR</Button>
          <Button className="flex-[2] py-3 md:flex-none md:px-8" onClick={() => navigate(`/alerts/${alert.id}/dispatch`)}>ACEPTAR Y DESPACHAR</Button>
        </div>
      )}
    </>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-night-700 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-white/45">{hint}</div>}
    </div>
  )
}
