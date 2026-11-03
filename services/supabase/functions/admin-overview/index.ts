import { body, caller, db, reply, serve } from '../_shared/core.ts'

type Hospital = { id: string; nombre: string; activo: boolean; logo_url: string | null; telefono_despacho: string | null }
type Unit = { id: string; hospital_id: string; estado: string; activa: boolean }
type Shift = { hospital_id: string; staff_id: string }
type Offer = { incident_id: string }
type Incident = { id: string; created_at: string }

serve(async (req) => {
  await body(req)
  const client = db()
  await caller(req, client, ['admin'])
  const [hospitalResult, fleetResult, shiftResult, reportResult, incidentResult, offerResult] =
    await Promise.all([
      client.from('hospitals').select('id,nombre,activo,logo_url,telefono_despacho'),
      client.from('ambulances').select('id,hospital_id,estado,activa'),
      client.from('staff_shifts').select('hospital_id,staff_id').is('ended_at', null),
      client.from('false_alarm_reports')
        .select('id,incident_id,hospital_id,actor_id,reason,created_at')
        .eq('status', 'pending').order('created_at', { ascending: false }).limit(100),
      client.from('incidents').select('id,created_at').eq('estado', 'searching')
        .order('created_at', { ascending: false }).limit(100),
      client.from('incident_offers').select('incident_id').is('closed_at', null),
    ])
  for (const result of [hospitalResult, fleetResult, shiftResult, reportResult, incidentResult, offerResult]) {
    if (result.error) throw result.error
  }
  const hospitals = ((hospitalResult.data ?? []) as Hospital[]).map((hospital) => {
    const units = ((fleetResult.data ?? []) as Unit[]).filter((unit) =>
      unit.hospital_id === hospital.id && unit.activa)
    const available = units.filter((unit) => unit.estado === 'disponible').length
    const onDuty = new Set(((shiftResult.data ?? []) as Shift[]).filter((shift) =>
      shift.hospital_id === hospital.id).map((shift) => shift.staff_id)).size
    return { ...hospital, units_total: units.length, units_available: available,
      staff_on_duty: onDuty,
      operational_status: !hospital.activo ? 'inactive' : available ? 'operational' : 'no_units' }
  })
  const openOfferIds = new Set(((offerResult.data ?? []) as Offer[]).map((offer) => offer.incident_id))
  const unmatched = ((incidentResult.data ?? []) as Incident[]).filter((incident) => !openOfferIds.has(incident.id))
  return reply({
    hospitals,
    pending_false_alarm_reports: reportResult.data ?? [],
    searching_without_open_offer: unmatched,
  })
})
