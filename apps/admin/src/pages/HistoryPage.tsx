// UC-17 · Historial del hospital: casos completados o cancelados, filtros en el servidor y paginación.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHospital } from '../hooks/useHospitalData'
import { useFleet } from '../hooks/useLayoutData'
import { useQuery } from '../hooks/useQuery'
import { HISTORY_PAGE, fetchHistory, type HistoryFilters } from '../lib/queries'
import { Badge, Button, Card, EmptyState, ErrorBox, FilterSelect, PageHeader, Spinner } from '../components/ui'
import { PriorityBadge } from '../components/IncidentBits'
import { ESTADO_INCIDENTE, TIPO_AMBULANCIA, fmtDateTime } from '../lib/format'
import { fmtDuration, totalMinutes } from '../lib/hospital'
import type { Prioridad } from '../types'

const RANGOS = { all: 'Todo', today: 'Hoy', '7': 'Últimos 7 días', '30': 'Últimos 30 días' } as const
type Rango = keyof typeof RANGOS

function desdeISO(r: Rango): string | null {
  if (r === 'all') return null
  const d = new Date()
  if (r === 'today') d.setHours(0, 0, 0, 0)
  else d.setDate(d.getDate() - Number(r))
  return d.toISOString()
}

export default function HistoryPage() {
  const hospital = useHospital()
  const fleet = useFleet()
  const [rango, setRango] = useState<Rango>('all')
  const [prioridad, setPrioridad] = useState<Prioridad | 'all'>('all')
  const [estado, setEstado] = useState<'completed' | 'cancelled' | 'all'>('all')
  const [ambulancia, setAmbulancia] = useState('all')
  const [page, setPage] = useState(0)

  const filters: HistoryFilters = useMemo(
    () => ({
      desde: desdeISO(rango),
      prioridad: prioridad === 'all' ? null : prioridad,
      estado: estado === 'all' ? null : estado,
      ambulanceId: ambulancia === 'all' ? null : ambulancia,
    }),
    // desdeISO depende de "ahora": se recalcula al cambiar el filtro, no en cada render.
    [rango, prioridad, estado, ambulancia],
  )
  // El historial no cambia segundo a segundo: sin refresco en vivo.
  const q = useQuery(() => fetchHistory(hospital.id, filters, page), [hospital.id, filters, page], { live: false })
  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.total / HISTORY_PAGE)) : 1

  const set = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(0)
  }
  const hayFiltros = rango !== 'all' || prioridad !== 'all' || estado !== 'all' || ambulancia !== 'all'
  const limpiar = () => {
    setRango('all')
    setPrioridad('all')
    setEstado('all')
    setAmbulancia('all')
    setPage(0)
  }

  return (
    <>
      <PageHeader title="Historial" subtitle={q.data ? `${q.data.total} caso(s) cerrados${hayFiltros ? ' con estos filtros' : ''}` : undefined} />

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <FilterSelect label="Fecha" value={rango} onChange={(e) => set(setRango)(e.target.value as Rango)}>
          {(Object.keys(RANGOS) as Rango[]).map((r) => <option key={r} value={r}>{RANGOS[r]}</option>)}
        </FilterSelect>
        <FilterSelect label="Prioridad" value={prioridad} onChange={(e) => set(setPrioridad)(e.target.value as Prioridad | 'all')}>
          <option value="all">Todas</option>
          <option value="P1">P1 · Crítica</option>
          <option value="P2">P2 · Urgente</option>
          <option value="P3">P3 · Leve</option>
        </FilterSelect>
        <FilterSelect label="Estado" value={estado} onChange={(e) => set(setEstado)(e.target.value as typeof estado)}>
          <option value="all">Todos</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </FilterSelect>
        <FilterSelect label="Ambulancia" value={ambulancia} onChange={(e) => set(setAmbulancia)(e.target.value)}>
          <option value="all">Todas</option>
          {fleet.data?.ambulances.map((a) => <option key={a.id} value={a.id}>{a.codigo ?? a.placa}{a.placa && a.codigo ? ` · ${a.placa}` : ''}</option>)}
        </FilterSelect>
        {hayFiltros && <Button variant="ghost" className="px-2 py-1 text-xs" onClick={limpiar}>Limpiar filtros</Button>}
      </div>

      {q.error && <div className="mb-4"><ErrorBox message={q.error} onRetry={q.refetch} /></div>}

      <Card>
        {!q.data ? (
          q.loading ? <Spinner label="Cargando historial…" /> : null
        ) : q.data.rows.length === 0 ? (
          <EmptyState>{hayFiltros ? 'No hay casos con estos filtros.' : 'Todavía no hay casos cerrados.'}</EmptyState>
        ) : (
          <ul className={`divide-y divide-white/5 ${q.loading ? 'opacity-60' : ''}`}>
            {q.data.rows.map((i) => {
              const amb = fleet.data?.ambulances.find((a) => a.id === i.assigned_ambulance_id)
              const chofer = fleet.data?.drivers.find((d) => d.id === i.assigned_driver_id)
              return (
                <li key={i.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 items-center gap-2 sm:w-44 sm:flex-col sm:items-start">
                    <PriorityBadge prioridad={i.prioridad} size="sm" />
                    <Badge tone={ESTADO_INCIDENTE[i.estado].tone}>{ESTADO_INCIDENTE[i.estado].label}</Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/alerts/${i.id}`} className="font-semibold hover:underline">{i.referencia || i.tipo_accidente || 'Incidente'}</Link>
                    {i.ia_output?.scene_description && <div className="line-clamp-2 text-sm text-white/60">{i.ia_output.scene_description}</div>}
                    <div className="mt-1 text-xs text-white/40">{fmtDateTime(i.created_at)}</div>
                  </div>
                  <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-0.5 text-sm sm:w-60">
                    <dt className="text-xs text-white/45">Duración total</dt>
                    <dt className="text-xs text-white/45">Ambulancia</dt>
                    <dd className="font-semibold tabular-nums">{i.estado === 'cancelled' ? '—' : fmtDuration(totalMinutes(i))}</dd>
                    <dd className="font-semibold">
                      {amb ? <>{amb.codigo ?? amb.placa} <span className="text-xs font-normal text-white/45">{amb.tipo ? TIPO_AMBULANCIA[amb.tipo] : ''}</span></> : '—'}
                      {chofer && <div className="text-xs font-normal text-white/45">{chofer.nombre}</div>}
                    </dd>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
        {q.data && q.data.total > HISTORY_PAGE && (
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-sm">
            <Button variant="ghost" disabled={page === 0 || q.loading} onClick={() => setPage((p) => p - 1)}>← Anterior</Button>
            <span className="text-white/50 tabular-nums">Página {page + 1} de {totalPages}</span>
            <Button variant="ghost" disabled={page + 1 >= totalPages || q.loading} onClick={() => setPage((p) => p + 1)}>Siguiente →</Button>
          </div>
        )}
      </Card>
    </>
  )
}
