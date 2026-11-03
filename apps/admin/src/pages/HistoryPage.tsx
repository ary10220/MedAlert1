// UC-17 · Historial del hospital: casos completados o cancelados, con filtros por fecha, prioridad, estado y ambulancia.
import { useMemo, useState } from 'react'
import { useDataStore } from '../store/dataStore'
import { useNow } from '../hooks/useNow'
import { Badge, Button, Card, EmptyState, FilterSelect, PageHeader } from '../components/ui'
import { PriorityBadge } from '../components/IncidentBits'
import { ESTADO_INCIDENTE, TIPO_AMBULANCIA, fmtDateTime } from '../lib/format'
import { fmtDuration, totalMinutes } from '../lib/hospital'

const RANGOS = { all: 'Todo', today: 'Hoy', '7': 'Últimos 7 días', '30': 'Últimos 30 días' } as const
type Rango = keyof typeof RANGOS

export default function HistoryPage() {
  const { incidents, ambulances, hospital } = useDataStore()
  const now = useNow()
  const [rango, setRango] = useState<Rango>('all')
  const [prioridad, setPrioridad] = useState('all')
  const [estado, setEstado] = useState('all')
  const [ambulancia, setAmbulancia] = useState('all')

  // Los cancelados nunca llegaron a asignarse, así que se identifican por haber sido ofrecidos a este hospital.
  // Con Supabase: filtrar por assigned_hospital_id o por la tabla de ofertas/rechazos.
  const historial = useMemo(
    () =>
      incidents
        .filter((i) => i.estado === 'completed' || i.estado === 'cancelled')
        .filter((i) => i.assigned_hospital_id === hospital.id || i.estado === 'cancelled')
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [incidents, hospital],
  )

  const filtered = useMemo(() => {
    const desde =
      rango === 'all' ? 0 : rango === 'today' ? new Date(now).setHours(0, 0, 0, 0) : now - Number(rango) * 86_400_000
    return historial
      .filter((i) => new Date(i.created_at).getTime() >= desde)
      .filter((i) => prioridad === 'all' || i.prioridad === prioridad)
      .filter((i) => estado === 'all' || i.estado === estado)
      .filter((i) => ambulancia === 'all' || i.assigned_ambulance_id === ambulancia)
  }, [historial, rango, prioridad, estado, ambulancia, now])

  const hayFiltros = rango !== 'all' || prioridad !== 'all' || estado !== 'all' || ambulancia !== 'all'
  const limpiar = () => {
    setRango('all')
    setPrioridad('all')
    setEstado('all')
    setAmbulancia('all')
  }

  return (
    <>
      <PageHeader title="Historial" subtitle={`${filtered.length} de ${historial.length} casos cerrados`} />

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <FilterSelect label="Fecha" value={rango} onChange={(e) => setRango(e.target.value as Rango)}>
          {(Object.keys(RANGOS) as Rango[]).map((r) => <option key={r} value={r}>{RANGOS[r]}</option>)}
        </FilterSelect>
        <FilterSelect label="Prioridad" value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
          <option value="all">Todas</option>
          <option value="P1">P1 · Crítica</option>
          <option value="P2">P2 · Urgente</option>
          <option value="P3">P3 · Leve</option>
        </FilterSelect>
        <FilterSelect label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="all">Todos</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </FilterSelect>
        <FilterSelect label="Ambulancia" value={ambulancia} onChange={(e) => setAmbulancia(e.target.value)}>
          <option value="all">Todas</option>
          {ambulances.map((a) => <option key={a.id} value={a.id}>{a.codigo} · {a.placa}</option>)}
        </FilterSelect>
        {hayFiltros && <Button variant="ghost" className="px-2 py-1 text-xs" onClick={limpiar}>Limpiar filtros</Button>}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState>No hay casos con estos filtros.</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((i) => {
              const amb = ambulances.find((a) => a.id === i.assigned_ambulance_id)
              return (
                <li key={i.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 items-center gap-2 sm:w-44 sm:flex-col sm:items-start">
                    <PriorityBadge prioridad={i.prioridad} size="sm" />
                    <Badge tone={ESTADO_INCIDENTE[i.estado].tone}>{ESTADO_INCIDENTE[i.estado].label}</Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{i.referencia}</div>
                    <div className="text-sm text-white/60">{i.ia_output?.descripcion}</div>
                    <div className="mt-1 text-xs text-white/40">{i.id} · {fmtDateTime(i.created_at)}</div>
                  </div>
                  <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-0.5 text-sm sm:w-56">
                    <dt className="text-xs text-white/45">Duración total</dt>
                    <dt className="text-xs text-white/45">Ambulancia</dt>
                    <dd className="font-semibold tabular-nums">{i.estado === 'cancelled' ? '—' : fmtDuration(totalMinutes(i))}</dd>
                    <dd className="font-semibold">{amb ? <>{amb.codigo} <span className="text-xs font-normal text-white/45">{TIPO_AMBULANCIA[amb.tipo]}</span></> : '—'}</dd>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
