// UC-14 · Seleccionar unidad: flota del hospital, sugerencia IA destacada, unidades ocupadas deshabilitadas.
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Badge, Button } from '../components/ui'
import { PriorityBadge } from '../components/IncidentBits'
import { ESTADO_AMBULANCIA, TIPO_AMBULANCIA } from '../lib/format'
import type { Ambulance, Incident } from '../types'

const TIPO_RANK = { uti: 3, avanzada: 2, basica: 1 } as const

/** Recomendada = primera unidad disponible del tipo que sugiere la IA; si no hay, la disponible de mayor nivel. */
function recommend(incident: Incident, flota: Ambulance[]): Ambulance | undefined {
  const libres = flota.filter((a) => a.activa && a.estado === 'disponible')
  return libres.find((a) => a.tipo === incident.ia_suggested_type) ?? [...libres].sort((a, b) => TIPO_RANK[b.tipo] - TIPO_RANK[a.tipo])[0]
}

export default function SelectUnitPage() {
  const { id } = useParams()
  const { incidents, ambulances, dispatch } = useDataStore()
  const incident = incidents.find((i) => i.id === id)

  const flota = useMemo(() => ambulances.filter((a) => a.activa), [ambulances])
  const recomendada = incident ? recommend(incident, flota) : undefined
  const [selected, setSelected] = useState<string | null>(recomendada?.id ?? null)
  const [justDispatched, setJustDispatched] = useState(false)

  // Orden: recomendada primero, luego disponibles, luego ocupadas / mantenimiento.
  const ordenada = useMemo(
    () =>
      [...flota].sort((a, b) => {
        const score = (x: Ambulance) => (x.id === recomendada?.id ? 0 : x.estado === 'disponible' ? 1 : 2)
        return score(a) - score(b)
      }),
    [flota, recomendada],
  )

  if (!incident) return <Navigate to="/" replace />
  // Recién despachada desde esta pantalla → confirmación (UC-15). Ya atendida por otra vía → detalle.
  if (incident.estado !== 'searching') {
    return <Navigate to={justDispatched ? `/alerts/${incident.id}/dispatched` : `/alerts/${incident.id}`} replace />
  }

  const despachar = () => {
    if (!selected) return
    setJustDispatched(true)
    dispatch(incident.id, selected)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/alerts/${incident.id}`} className="mb-4 inline-block text-sm font-semibold text-white/55 hover:text-white">← Detalle de la alerta</Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Seleccionar unidad</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/60">
        <PriorityBadge prioridad={incident.prioridad} size="sm" />
        <span>{incident.referencia}</span>
        {incident.ia_suggested_type && <span>· IA sugiere <strong className="text-white">{TIPO_AMBULANCIA[incident.ia_suggested_type]}</strong></span>}
      </div>

      <fieldset className="mt-6">
        <legend className="sr-only">Ambulancias del hospital</legend>
        <ul className="flex flex-col gap-3">
          {ordenada.map((a) => {
            const disponible = a.estado === 'disponible'
            const esRecomendada = a.id === recomendada?.id
            const checked = selected === a.id
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
                    onChange={() => setSelected(a.id)}
                    className="h-4 w-4 accent-[#E63946]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-semibold">{a.codigo}</span>
                      <span className="text-sm text-white/60">{TIPO_AMBULANCIA[a.tipo]}</span>
                      {esRecomendada && (
                        <span className="rounded bg-mint px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-night">★ Recomendado</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-white/50">
                      {a.placa} · Chofer de turno: {a.chofer}
                    </div>
                  </div>
                  <Badge tone={ESTADO_AMBULANCIA[a.estado].tone}>{ESTADO_AMBULANCIA[a.estado].label}</Badge>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {!recomendada && (
        <p role="alert" className="mt-4 rounded-lg bg-pulse/10 px-4 py-3 text-sm text-red-200">
          No hay unidades disponibles. Rechazá la alerta para que se ofrezca a otro hospital.
        </p>
      )}

      <Button className="mt-6 w-full py-3 text-base" disabled={!selected} onClick={despachar}>
        DESPACHAR {selected ? ambulances.find((a) => a.id === selected)?.codigo : ''}
      </Button>
    </div>
  )
}
