// UC-14 · Seleccionar unidad y chofer, y despachar con accept-incident (reserva atómica en el backend).
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useFleet, useLayoutData } from '../hooks/useLayoutData'
import { callFunction, errorMessage, ApiError } from '../lib/api'
import { availableDrivers as listAvailableDrivers, recommendUnit } from '../lib/dispatch'
import { bumpData } from '../store/refreshStore'
import { Badge, Button, Card, EmptyState, ErrorBox, SelectField, Spinner } from '../components/ui'
import { PriorityBadge } from '../components/IncidentBits'
import Icon from '../components/Icon'
import { ESTADO_AMBULANCIA, TIPO_AMBULANCIA } from '../lib/format'
import type { Ambulance } from '../types'

export default function SelectUnitPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { offers } = useLayoutData()
  const fleet = useFleet()
  const offer = offers.data?.find((o) => o.incident_id === id)
  const incident = offer?.incident

  const [selected, setSelected] = useState<string | null>(null)
  const [driverId, setDriverId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ text: string; terminal: boolean } | null>(null)

  const data = fleet.data
  const typeName = (a: Ambulance) => data?.types.find((t) => t.id === a.type_id)?.nombre ?? (a.tipo ? TIPO_AMBULANCIA[a.tipo] : '—')
  const availableDrivers = useMemo(() => (data ? listAvailableDrivers(data) : []), [data])
  const recomendada = useMemo(() => (data ? recommendUnit(data, incident?.ia_suggested_type ?? null) : undefined), [data, incident?.ia_suggested_type])

  const ordenada = useMemo(() => {
    if (!data) return []
    const score = (x: Ambulance) => (x.id === recomendada?.id ? 0 : x.estado === 'disponible' ? 1 : 2)
    return data.ambulances.filter((a) => a.activa).sort((a, b) => score(a) - score(b))
  }, [data, recomendada])

  // Unidad y chofer por defecto: la recomendada y su chofer titular si está libre.
  const ambulanceId = selected ?? recomendada?.id ?? null
  const ambulance = data?.ambulances.find((a) => a.id === ambulanceId)
  const titular = ambulance?.driver_id ? availableDrivers.find((d) => d.id === ambulance.driver_id) : undefined
  const chofer = driverId ? availableDrivers.find((d) => d.id === driverId) : (titular ?? availableDrivers[0])

  if (!offers.data || !data) {
    if (offers.error || fleet.error) return <ErrorBox message={(offers.error ?? fleet.error)!} onRetry={() => { offers.refetch(); fleet.refetch() }} />
    return <Card><Spinner label="Cargando flota…" /></Card>
  }
  if (!incident) {
    return (
      <Card>
        <EmptyState>
          Esta alerta ya no está ofrecida a tu hospital. <Link to="/" className="font-semibold text-white underline">Volver a alertas</Link>
        </EmptyState>
      </Card>
    )
  }

  const despachar = async () => {
    if (!ambulance || !chofer) return
    setSaving(true)
    setError(null)
    try {
      await callFunction('accept-incident', { incident_id: incident.id, ambulance_id: ambulance.id, driver_id: chofer.id })
      bumpData()
      navigate(`/alerts/${incident.id}/dispatched`, { replace: true })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      setError({ text: errorMessage(err), terminal: code === 'already_taken' || code === 'not_offered' })
      if (code === 'ambulance_unavailable' || code === 'driver_unavailable' || code === 'driver_busy') fleet.refetch()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/alerts/${incident.id}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-white/65 hover:text-white">
        <Icon name="back" className="h-4 w-4" /> Detalle de la alerta
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Elegir unidad y chofer</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/70">
        <PriorityBadge prioridad={incident.prioridad} size="sm" />
        <span className="first-letter:uppercase">{incident.referencia || incident.tipo_accidente || 'Ubicación por GPS'}</span>
        {incident.ia_suggested_type && <span>· IA sugiere <strong className="text-white">{TIPO_AMBULANCIA[incident.ia_suggested_type]}</strong></span>}
      </div>

      {ordenada.length === 0 ? (
        <Card className="mt-6"><EmptyState>Tu hospital no tiene ambulancias activas. <Link to="/fleet" className="font-semibold text-white underline">Ir a Flota</Link></EmptyState></Card>
      ) : (
        <fieldset className="mt-6">
          <legend className="sr-only">Ambulancias del hospital</legend>
          <ul className="flex flex-col gap-3">
            {ordenada.map((a) => {
              const disponible = a.estado === 'disponible'
              const esRecomendada = a.id === recomendada?.id
              const checked = ambulanceId === a.id
              const tit = data.drivers.find((d) => d.id === a.driver_id)
              return (
                <li key={a.id}>
                  <label
                    className={`flex items-center gap-4 rounded-xl border px-4 py-4 transition-colors ${
                      !disponible
                        ? 'cursor-not-allowed border-white/5 bg-night-700/50 opacity-50'
                        : checked
                          ? 'cursor-pointer border-pulse bg-pulse/10'
                          : 'cursor-pointer border-white/10 bg-night-700 hover:border-white/25'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ambulancia"
                      value={a.id}
                      checked={checked}
                      disabled={!disponible}
                      onChange={() => {
                        setSelected(a.id)
                        setDriverId(null)
                      }}
                      className="h-4 w-4 accent-[#E63946]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-semibold">{a.codigo ?? a.placa}</span>
                        <span className="text-sm text-white/60">{typeName(a)}</span>
                        {esRecomendada && <span className="rounded bg-mint px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-night">★ Recomendado</span>}
                      </div>
                      <div className="mt-0.5 text-sm text-white/60">
                        {a.placa} · Chofer titular: {tit?.nombre ?? 'sin asignar'}
                      </div>
                    </div>
                    <Badge tone={ESTADO_AMBULANCIA[a.estado].tone}>{ESTADO_AMBULANCIA[a.estado].label}</Badge>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}

      {ambulance && (
        <div className="mt-5">
          {availableDrivers.length === 0 ? (
            <ErrorBox message="No hay choferes disponibles (activos, con licencia vigente y sin otro caso). Revisá la pestaña Choferes en Flota." />
          ) : (
            <SelectField label="Chofer para este despacho" value={chofer?.id ?? ''} onChange={(e) => setDriverId(e.target.value)}>
              {availableDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}{d.id === ambulance.driver_id ? ' (titular)' : ''}{d.licencia_vence ? ` · lic. vence ${d.licencia_vence}` : ''}
                </option>
              ))}
            </SelectField>
          )}
        </div>
      )}

      {!recomendada && ordenada.length > 0 && (
        <p role="alert" className="mt-4 rounded-lg bg-pulse/10 px-4 py-3 text-sm text-red-200">
          No hay unidades disponibles. Volvé al detalle y rechazá la alerta para que se ofrezca a otro hospital.
        </p>
      )}
      {error && (
        <div className="mt-4">
          <ErrorBox message={error.text} />
          {error.terminal && <Link to="/" className="mt-2 inline-block text-sm font-semibold underline">Volver a alertas</Link>}
        </div>
      )}

      <div className="sticky bottom-[72px] mt-6 md:bottom-4">
        <Button size="lg" className="w-full shadow-xl" disabled={!ambulance || !chofer || saving || error?.terminal} onClick={despachar}>
          {saving ? 'Despachando…' : ambulance && chofer ? `Despachar ${ambulance.codigo ?? ''} con ${chofer.nombre}` : 'Elegí una unidad disponible'}
        </Button>
      </div>
    </div>
  )
}
