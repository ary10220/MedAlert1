// UC-16 · Casos activos: mini mapa, estado, tiempo desde el despacho y
// "Actualizar estado" (update-incident-status: En ruta → En el lugar → Completado).
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useFleet, useLayoutData } from '../hooks/useLayoutData'
import { useHospital } from '../hooks/useHospitalData'
import { useNow } from '../hooks/useNow'
import { callFunction, errorMessage } from '../lib/api'
import { bumpData } from '../store/refreshStore'
import { confirmDialog, toast } from '../store/feedbackStore'
import Icon from '../components/Icon'
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '../components/ui'
import { PriorityBadge } from '../components/IncidentBits'
import { FalseAlarmModal } from '../components/IncidentActions'
import IncidentMap from '../components/IncidentMap'
import { ESTADO_INCIDENTE, TIPO_AMBULANCIA, fmtTime } from '../lib/format'
import { fmtDuration } from '../lib/hospital'
import type { Incident } from '../types'

const PASOS = ['En ruta', 'En el lugar', 'Completado'] as const
const NEXT: Partial<Record<Incident['estado'], { estado: 'on_site' | 'completed'; label: string }>> = {
  assigned: { estado: 'on_site', label: 'Marcar en el lugar' },
  on_site: { estado: 'completed', label: 'Marcar completado' },
}

export default function ActiveCasesPage() {
  const { active } = useLayoutData()
  const fleet = useFleet()
  const hospital = useHospital()
  const now = useNow(30_000)
  const { hash } = useLocation()
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [falseAlarm, setFalseAlarm] = useState<string | null>(null)

  // "Ver seguimiento" (UC-15) llega con #id: llevar la card a la vista.
  useEffect(() => {
    if (hash && active.data) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [hash, active.data])

  const avanzar = async (c: Incident) => {
    const next = NEXT[c.estado]
    if (!next) return
    const amb = fleet.data?.ambulances.find((a) => a.id === c.assigned_ambulance_id)
    if (next.estado === 'completed') {
      const ok = await confirmDialog({
        title: 'Cerrar el caso',
        body: `Se marcará como completado y ${amb?.codigo ?? 'la unidad'} volverá a estar disponible para nuevos despachos.`,
        confirmLabel: 'Marcar completado',
      })
      if (!ok) return
    }
    setBusy(c.id)
    setErrors(({ [c.id]: _omit, ...rest }) => rest)
    try {
      await callFunction('update-incident-status', { incident_id: c.id, nuevo_estado: next.estado })
      bumpData()
      toast.success(next.estado === 'on_site' ? 'Unidad en el lugar. Se avisó al testigo.' : 'Caso completado. La unidad quedó libre.')
    } catch (err) {
      setErrors((e) => ({ ...e, [c.id]: errorMessage(err) }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader title="Casos activos" subtitle={active.data ? `${active.data.length} caso(s) en atención por ${hospital.nombre}` : undefined} />
      {active.error && <div className="mb-4"><ErrorBox message={active.error} onRetry={active.refetch} /></div>}

      {!active.data ? (
        active.loading ? (
          <div className="grid gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Cargando casos">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : null
      ) : active.data.length === 0 ? (
        <Card><EmptyState icon="pulse" title="No hay casos en atención" action={<Link to="/" className="font-semibold underline">Ver alertas entrantes</Link>}>Los incidentes que despache tu hospital aparecerán acá para seguirlos hasta cerrarlos.</EmptyState></Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {active.data.map((c) => {
            const amb = fleet.data?.ambulances.find((a) => a.id === c.assigned_ambulance_id)
            const chofer = fleet.data?.drivers.find((d) => d.id === c.assigned_driver_id)
            const step = c.estado === 'assigned' ? 0 : 1
            const transcurrido = (now - new Date(c.assigned_at ?? c.created_at).getTime()) / 60_000
            const highlighted = hash === `#${c.id}`
            const next = NEXT[c.estado]
            return (
              <li key={c.id} id={c.id} className={`overflow-hidden rounded-xl border bg-surface shadow-card ${highlighted ? 'border-pulse/60' : 'border-line'}`}>
                {c.lat != null && c.lon != null ? (
                  <IncidentMap incident={[c.lat, c.lon]} hospital={[hospital.lat, hospital.lon]} compact className="h-40 rounded-none" />
                ) : (
                  <div className="flex h-16 items-center justify-center bg-line text-xs text-muted">Sin ubicación GPS</div>
                )}
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <PriorityBadge prioridad={c.prioridad} size="sm" />
                        <Badge tone={ESTADO_INCIDENTE[c.estado].tone}>{ESTADO_INCIDENTE[c.estado].label}</Badge>
                      </div>
                      <Link to={`/alerts/${c.id}`} className="mt-2 block truncate font-semibold text-ink hover:text-pulse hover:underline">
                        {c.referencia || c.tipo_accidente || 'Ubicación por GPS'}
                      </Link>
                      <div className="text-xs text-muted">
                        {amb ? `${amb.codigo ?? amb.placa} · ${amb.tipo ? TIPO_AMBULANCIA[amb.tipo] : ''}` : 'Unidad'} · {chofer?.nombre ?? 'chofer'}
                        {chofer?.telefono && <> · <a href={`tel:${chofer.telefono}`} className="text-pulse underline">{chofer.telefono}</a></>}
                      </div>
                      {/* Bits del incidente: heridos y testigo, visibles sin abrir el detalle. */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {(() => {
                          const n = c.cantidad_heridos_confirmada ?? c.ia_output?.cantidad_heridos_estimada ?? c.cantidad_heridos
                          if (n == null) return null
                          return (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose px-2 py-1 font-semibold text-pulse-dark ring-1 ring-inset ring-pulse/20">
                              <Icon name="heart" className="h-3.5 w-3.5" /> {n} {n === 1 ? 'herido' : 'heridos'}{c.cantidad_heridos_confirmada != null ? ' · confirmado' : ' · estimado'}
                            </span>
                          )
                        })()}
                        <span className="inline-flex items-center gap-1 rounded-md bg-wash px-2 py-1 font-medium text-muted ring-1 ring-inset ring-line">
                          <Icon name="user" className="h-3.5 w-3.5" /> {c.reporter_id ? 'Testigo registrado' : 'Reporte anónimo'}
                        </span>
                        <Link to={`/alerts/${c.id}`} className="inline-flex items-center gap-1 rounded-md bg-navy px-2 py-1 font-semibold text-white hover:bg-navy-2">
                          Ver detalles <Icon name="chevron" className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`font-display text-2xl font-semibold tabular-nums ${c.estado === 'assigned' && transcurrido >= 15 ? 'text-amber' : 'text-ink'}`}>{fmtDuration(transcurrido)}</div>
                      <div className="text-xs text-muted">desde despacho · {c.assigned_at ? fmtTime(c.assigned_at) : '—'}</div>
                    </div>
                  </div>

                  <ol className="grid grid-cols-3 gap-1" aria-label="Progreso del caso">
                    {PASOS.map((p, i) => (
                      <li key={p} className="flex flex-col gap-1.5">
                        <span className={`h-1.5 rounded-full ${i <= step ? 'bg-mint' : 'bg-wash'}`} aria-hidden />
                        <span className={`text-xs ${i <= step ? 'font-semibold text-ink' : 'text-muted'}`}>
                          {p}
                          <span className="sr-only">{i <= step ? ' (hecho)' : ' (pendiente)'}</span>
                        </span>
                      </li>
                    ))}
                  </ol>

                  {errors[c.id] && <ErrorBox message={errors[c.id]} />}
                  <div className="flex flex-wrap gap-2">
                    {next && (
                      <Button size="lg" className="flex-1" disabled={busy === c.id} onClick={() => avanzar(c)}>
                        <Icon name="check" className="h-5 w-5" />
                        {busy === c.id ? 'Actualizando…' : next.label}
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setFalseAlarm(c.id)} aria-label="Reportar posible falsa alarma" title="Reportar posible falsa alarma">
                      <Icon name="flag" className="h-4 w-4" /> Falsa alarma
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {falseAlarm && (
        <FalseAlarmModal
          incidentId={falseAlarm}
          assigned
          open
          onClose={() => setFalseAlarm(null)}
          onDone={() => {
            setFalseAlarm(null)
            toast.success('Despacho cancelado y reporte enviado al administrador.')
          }}
        />
      )}
    </>
  )
}
