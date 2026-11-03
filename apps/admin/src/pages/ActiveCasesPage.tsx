// UC-16 · Casos activos: mini mapa, estado, tiempo transcurrido y "Actualizar estado" (En ruta → En el lugar → Completado).
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { useActiveCases } from '../hooks/useHospitalData'
import { useNow } from '../hooks/useNow'
import { Badge, Button, Card, EmptyState, PageHeader } from '../components/ui'
import { PriorityBadge } from '../components/IncidentBits'
import IncidentMap from '../components/IncidentMap'
import { ESTADO_INCIDENTE, TIPO_AMBULANCIA, fmtTime } from '../lib/format'
import { fmtDuration } from '../lib/hospital'
import type { Incident } from '../types'

const PASOS = ['En ruta', 'En el lugar', 'Completado'] as const
const NEXT_LABEL: Partial<Record<Incident['estado'], string>> = {
  assigned: 'Marcar en el lugar',
  on_site: 'Marcar completado',
}

export default function ActiveCasesPage() {
  const cases = useActiveCases()
  const { ambulances, hospital, advanceCase } = useDataStore()
  const now = useNow(30_000)
  const { hash } = useLocation()

  // "Ver seguimiento" (UC-15) llega con #id: llevar la card a la vista.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [hash])

  return (
    <>
      <PageHeader title="Casos activos" subtitle={`${cases.length} caso(s) en atención por ${hospital.nombre}`} />

      {cases.length === 0 ? (
        <Card><EmptyState>No hay casos en atención.</EmptyState></Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {cases.map((c) => {
            const amb = ambulances.find((a) => a.id === c.assigned_ambulance_id)
            const step = c.estado === 'assigned' ? 0 : 1
            const transcurrido = (now - new Date(c.assigned_at ?? c.created_at).getTime()) / 60_000
            const highlighted = hash === `#${c.id}`
            const next = NEXT_LABEL[c.estado]
            return (
              <li key={c.id} id={c.id} className={`overflow-hidden rounded-xl border bg-night-700 ${highlighted ? 'border-pulse/60' : 'border-white/10'}`}>
                <IncidentMap incident={[c.lat, c.lon]} hospital={[hospital.lat, hospital.lon]} compact className="h-40 rounded-none" />
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <PriorityBadge prioridad={c.prioridad} size="sm" />
                        <Badge tone={ESTADO_INCIDENTE[c.estado].tone}>{ESTADO_INCIDENTE[c.estado].label}</Badge>
                      </div>
                      <div className="mt-2 truncate font-semibold">{c.referencia}</div>
                      <div className="text-xs text-white/50">
                        {amb ? `${amb.codigo} · ${TIPO_AMBULANCIA[amb.tipo]} · ${amb.chofer}` : 'Sin unidad'}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-display text-2xl font-semibold tabular-nums">{fmtDuration(transcurrido)}</div>
                      <div className="text-[11px] text-white/45">desde despacho · {c.assigned_at ? fmtTime(c.assigned_at) : '—'}</div>
                    </div>
                  </div>

                  <ol className="grid grid-cols-3 gap-1" aria-label="Progreso del caso">
                    {PASOS.map((p, i) => (
                      <li key={p} className="flex flex-col gap-1.5">
                        <span className={`h-1.5 rounded-full ${i <= step ? 'bg-mint' : 'bg-white/10'}`} aria-hidden />
                        <span className={`text-[11px] ${i <= step ? 'font-semibold text-white' : 'text-white/40'}`}>
                          {p}
                          <span className="sr-only">{i <= step ? ' (hecho)' : ' (pendiente)'}</span>
                        </span>
                      </li>
                    ))}
                  </ol>

                  {next && (
                    <Button
                      variant={c.estado === 'on_site' ? 'primary' : 'secondary'}
                      onClick={() => {
                        if (c.estado === 'on_site' && !confirm(`¿Cerrar el caso ${c.id}? La unidad ${amb?.codigo ?? ''} quedará disponible.`)) return
                        advanceCase(c.id)
                      }}
                    >
                      Actualizar estado: {next}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
