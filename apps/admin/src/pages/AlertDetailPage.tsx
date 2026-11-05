// UC-13 · Detalle de alerta (get-incident): foto firmada, triage IA, mapa, distancia, ETA,
// datos confirmados por el operador y despacho en un clic con la unidad recomendada.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useHospital } from '../hooks/useHospitalData'
import { useFleet } from '../hooks/useLayoutData'
import { useNow } from '../hooks/useNow'
import { useQuery } from '../hooks/useQuery'
import { fetchIncidentDetail, fetchOffer } from '../lib/queries'
import { ApiError, callFunction, errorMessage } from '../lib/api'
import { defaultDriver, matchesSuggestion, recommendUnit } from '../lib/dispatch'
import { bumpData } from '../store/refreshStore'
import { toast } from '../store/feedbackStore'
import { Button, Card, EmptyState, Skeleton, TextField } from '../components/ui'
import { IncidentPhoto, PriorityBadge } from '../components/IncidentBits'
import { FalseAlarmModal, RejectOfferModal } from '../components/IncidentActions'
import IncidentMap from '../components/IncidentMap'
import Icon from '../components/Icon'
import { distanceToHospital, etaMinutes, fmtKm } from '../lib/hospital'
import { TIPO_AMBULANCIA, fmtAgo, fmtTime } from '../lib/format'
import type { Incident } from '../types'

export default function AlertDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const hospital = useHospital()
  const fleet = useFleet()
  const now = useNow()
  // Sin refresco en vivo: cada llamada firma una URL de foto nueva y la imagen parpadearía.
  const detail = useQuery(() => fetchIncidentDetail(id), [id], { live: false })
  const offer = useQuery(() => fetchOffer(id, hospital.id), [id, hospital.id])
  const [modal, setModal] = useState<'reject' | 'false' | null>(null)
  const [dispatching, setDispatching] = useState(false)

  if (!detail.data) {
    if (detail.loading) return <DetailSkeleton />
    return (
      <Card>
        <EmptyState icon="alert" title="No se pudo abrir la alerta" action={<Link to="/" className="font-semibold underline">Volver a alertas</Link>}>
          {detail.error ?? 'La alerta no existe o ya no está disponible.'}
        </EmptyState>
      </Card>
    )
  }

  const { incident: inc, reporter, photo_signed_url } = detail.data
  const ia = inc.ia_output
  const km = offer.data?.distance_km ?? distanceToHospital(inc, hospital)
  const ofrecida = inc.estado === 'searching' && !!offer.data
  const nuestra = inc.assigned_hospital_id === hospital.id && (inc.estado === 'assigned' || inc.estado === 'on_site')
  const lugar = inc.referencia || inc.tipo_accidente || 'Ubicación por GPS'

  // Despacho en un clic: misma recomendación que la pantalla de selección (UC-14).
  const unidad = fleet.data ? recommendUnit(fleet.data, inc.ia_suggested_type) : undefined
  const chofer = fleet.data ? defaultDriver(fleet.data, unidad) : undefined
  const menorNivel = unidad && !matchesSuggestion(unidad, inc.ia_suggested_type)

  const despacharYa = async () => {
    if (!unidad || !chofer) return
    setDispatching(true)
    try {
      await callFunction('accept-incident', { incident_id: inc.id, ambulance_id: unidad.id, driver_id: chofer.id })
      bumpData()
      navigate(`/alerts/${inc.id}/dispatched`, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
      const code = err instanceof ApiError ? err.code : ''
      if (code === 'already_taken' || code === 'not_offered') offer.refetch()
      else bumpData()
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className={ofrecida ? 'pb-40 md:pb-28' : ''}>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon name="back" className="h-4 w-4" /> Alertas
      </Link>

      {nuestra && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-mint/40 bg-mintBg px-4 py-3 text-sm text-mint">
          <span className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-mint" /> Tu hospital ya despachó esta alerta.</span>
          <Link to={`/active#${inc.id}`} className="font-semibold underline">Ver seguimiento</Link>
        </div>
      )}
      {!ofrecida && !nuestra && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-amber/40 bg-amberBg px-4 py-3 text-sm text-amber">
          <Icon name="info" className="h-4 w-4 shrink-0 text-amber" /> Esta alerta ya no está disponible para tu hospital: otro hospital la tomó o la oferta se cerró.
        </div>
      )}

      {/* Resumen: lo que hay que saber en 3 segundos */}
      <header className="mb-6 flex flex-wrap items-start gap-4">
        <PriorityBadge prioridad={inc.prioridad} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold leading-tight text-navy first-letter:uppercase md:text-3xl">{lugar}</h1>
          <p className="mt-1 text-sm text-muted">
            Reportado {fmtTime(inc.created_at)} · {fmtAgo(inc.created_at, now)}
            {km != null && <> · <strong className="text-ink">{fmtKm(km)}</strong> · ETA <strong className="text-ink">{etaMinutes(km)} min</strong></>}
          </p>
          {/* Datos del reportante en el header para que se vean sin scroll */}
          {reporter && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-wash px-2 py-1 font-medium text-muted ring-1 ring-inset ring-line">
                <Icon name="user" className="h-3.5 w-3.5" /> Testigo: <strong className="text-ink">{reporter.nombre || 'Sin nombre'}</strong>
              </span>
              {(inc.cantidad_heridos_confirmada ?? ia?.cantidad_heridos_estimada) != null && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose px-2 py-1 font-semibold text-pulse-dark ring-1 ring-inset ring-pulse/20">
                  <Icon name="heart" className="h-3.5 w-3.5" /> {inc.cantidad_heridos_confirmada ?? ia?.cantidad_heridos_estimada} {(inc.cantidad_heridos_confirmada ?? ia?.cantidad_heridos_estimada) === 1 ? 'herido' : 'heridos'}{inc.cantidad_heridos_confirmada != null ? ' confirmados' : ' estimados'}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <IncidentPhoto src={photo_signed_url} alt="Foto del accidente enviada por el testigo" className="aspect-[4/3] w-full rounded-xl" />
          <Card title="Lo que ve la IA">
            <div className="flex flex-col gap-3 p-5">
              {ia ? (
                <>
                  <p className="text-base leading-relaxed">“{ia.scene_description}”</p>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div><dt className="text-xs text-muted">Tipo</dt><dd className="font-semibold capitalize">{inc.tipo_accidente ?? '—'}</dd></div>
                    <div><dt className="text-xs text-muted">Heridos estimados</dt><dd className="font-semibold">{ia.cantidad_heridos_estimada}</dd></div>
                    <div><dt className="text-xs text-muted">Unidad sugerida</dt><dd className="font-semibold">{TIPO_AMBULANCIA[ia.suggested_unit]}</dd></div>
                  </dl>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Icon name="info" className="h-3.5 w-3.5" /> Sugerencia con {Math.round(ia.confidence * 100)}% de confianza. La decisión final es tuya.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">La IA todavía no clasificó esta foto. Revisá la imagen antes de despachar.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {inc.lat != null && inc.lon != null ? (
            <IncidentMap incident={[inc.lat, inc.lon]} hospital={[hospital.lat, hospital.lon]} hospitalName={hospital.nombre} className="h-72 md:h-80" />
          ) : (
            <Card><EmptyState icon="map" title="Sin ubicación GPS" /></Card>
          )}
          <Card title="Testigo">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
              <div>
                <div className="font-semibold">{reporter?.nombre ?? 'Sin datos'}</div>
                {reporter?.email && <div className="text-xs text-muted">{reporter.email}</div>}
              </div>
              {reporter?.telefono && (
                <a href={`tel:${reporter.telefono}`} className="inline-flex items-center gap-2 rounded-lg bg-wash px-3 py-2 font-semibold tabular-nums hover:bg-line">
                  <Icon name="phone" className="h-4 w-4" /> {reporter.telefono}
                </a>
              )}
            </div>
          </Card>
          {(ofrecida || nuestra) && (
            <ConfirmDetails key={`${inc.cantidad_heridos_confirmada}|${inc.referencia}`} incident={inc} onSaved={detail.refetch} />
          )}
        </div>
      </div>

      {/* Barra de decisión fija: la acción principal siempre a la vista */}
      {ofrecida && (
        <div className="fixed inset-x-0 bottom-[60px] z-[850] border-t border-line bg-surface/95 shadow-card backdrop-blur md:bottom-0 md:left-64">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-8 md:py-4">
            <div className="min-w-0 flex-1 text-sm">
              {!fleet.data ? (
                <span className="text-muted">Buscando unidad disponible…</span>
              ) : unidad && chofer ? (
                <span className="text-ink/80">
                  Se despacha <strong className="text-ink">{unidad.codigo ?? unidad.placa}</strong> ({unidad.tipo ? TIPO_AMBULANCIA[unidad.tipo] : '—'}) con <strong className="text-ink">{chofer.nombre}</strong>
                  {menorNivel && <span className="ml-1 text-amber">· menor nivel que el sugerido</span>}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-pulse">
                  <Icon name="alert" className="h-4 w-4 shrink-0" /> {unidad ? 'No hay choferes disponibles.' : 'No hay unidades disponibles.'} Considerá rechazar para que la tome otro hospital.
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setModal('false')} title="Reportar posible falsa alarma" aria-label="Reportar posible falsa alarma">
                <Icon name="flag" className="h-4 w-4" /> <span className="hidden sm:inline">Falsa alarma</span>
              </Button>
              <Button variant="secondary" onClick={() => setModal('reject')}>Rechazar</Button>
              <Button variant="secondary" onClick={() => navigate(`/alerts/${inc.id}/dispatch`)} disabled={!fleet.data}>Otra unidad</Button>
              <Button size="lg" className="flex-1 md:flex-none" disabled={!unidad || !chofer || dispatching} onClick={despacharYa}>
                {dispatching ? 'Despachando…' : unidad && chofer ? `Despachar ${unidad.codigo ?? ''}` : 'Despachar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <RejectOfferModal
        incidentId={inc.id}
        open={modal === 'reject'}
        onClose={() => setModal(null)}
        onDone={() => {
          toast.success('Alerta rechazada. Se ofrecerá a otros hospitales.')
          navigate('/', { replace: true })
        }}
      />
      <FalseAlarmModal
        incidentId={inc.id}
        assigned={false}
        open={modal === 'false'}
        onClose={() => setModal(null)}
        onDone={() => {
          toast.success('Reporte enviado. Un administrador lo revisará.')
          navigate('/', { replace: true })
        }}
      />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando alerta">
      <Skeleton className="mb-6 h-14 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/** update-incident-details: el operador confirma heridos y una referencia legible sin tocar la salida de la IA. */
function ConfirmDetails({ incident, onSaved }: { incident: Incident; onSaved: () => void }) {
  const [heridos, setHeridos] = useState(incident.cantidad_heridos_confirmada?.toString() ?? '')
  const [referencia, setReferencia] = useState(incident.referencia ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = heridos !== (incident.cantidad_heridos_confirmada?.toString() ?? '') || referencia !== (incident.referencia ?? '')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = heridos.trim() === '' ? null : Number(heridos)
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 100)) return setError('Número entero entre 0 y 100.')
    setSaving(true)
    setError(null)
    try {
      await callFunction('update-incident-details', { incident_id: incident.id, cantidad_heridos_confirmada: n, referencia: referencia.trim() || null })
      toast.success('Datos del incidente guardados.')
      onSaved()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Confirmar datos (opcional)">
      <form onSubmit={submit} className="flex flex-col gap-3 p-5">
        <p className="text-xs text-muted">Si hablaste con el testigo, corregí lo que la IA no puede ver. No es obligatorio para despachar.</p>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <TextField label="Heridos" inputMode="numeric" value={heridos} onChange={(e) => setHeridos(e.target.value)} placeholder={incident.cantidad_heridos?.toString() ?? '—'} error={error ?? undefined} />
          <TextField label="Referencia del lugar" value={referencia} maxLength={500} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej.: 4to anillo y Av. Banzer, frente al surtidor" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={saving || !dirty}>{saving ? 'Guardando…' : 'Guardar datos'}</Button>
        </div>
      </form>
    </Card>
  )
}
