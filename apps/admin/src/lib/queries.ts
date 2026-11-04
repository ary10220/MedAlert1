// Lecturas directas con Supabase Auth + RLS (las escrituras van por Edge Functions, ver lib/api.ts).
import { supabase } from './supabase'
import { callFunction } from './api'
import { parsePoint } from './geo'
import type { Ambulance, AmbulanceType, Driver, EstadoIncidente, Hospital, Incident, IncidentDetail, Offer, Prioridad, Profile } from '../types'

const INCIDENT_COLS =
  'id,reporter_id,estado,prioridad,ia_output,ia_suggested_type,tipo_accidente,cantidad_heridos,cantidad_heridos_confirmada,referencia,foto_url,assigned_hospital_id,assigned_ambulance_id,assigned_driver_id,assigned_at,on_site_at,completed_at,created_at,ubicacion'

type IncidentRow = Omit<Incident, 'lat' | 'lon'> & { ubicacion?: unknown }

function toIncident(row: IncidentRow): Incident {
  const { ubicacion, ...rest } = row
  const p = parsePoint(ubicacion)
  return { ...rest, lat: p?.lat ?? null, lon: p?.lon ?? null }
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('id,rol,nombre,telefono,hospital_id,activo').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchHospital(id: string): Promise<Hospital> {
  const { data, error } = await supabase.from('hospitals').select('id,nombre,direccion,telefono_despacho,logo_url,ubicacion').eq('id', id).single()
  if (error) throw error
  const p = parsePoint(data.ubicacion)
  if (!p) throw new Error('El hospital no tiene ubicación válida')
  return { id: data.id, nombre: data.nombre, direccion: data.direccion, telefono_despacho: data.telefono_despacho, logo_url: data.logo_url, lat: p.lat, lon: p.lon }
}

/** UC-12 · Ofertas abiertas para el hospital (RLS: solo propias y sin cerrar). */
export async function fetchOffers(hospitalId: string): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('incident_offers')
    .select(`incident_id,hospital_id,radius_km,distance_km,created_at,incident:incidents!inner(${INCIDENT_COLS})`)
    .eq('hospital_id', hospitalId)
    .is('closed_at', null)
    .eq('incident.estado', 'searching')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const r = row as unknown as Omit<Offer, 'incident'> & { incident: IncidentRow }
    return { ...r, incident: toIncident(r.incident) }
  })
}

/** Oferta abierta de un incidente puntual para este hospital (para la distancia exacta del despacho). */
export async function fetchOffer(incidentId: string, hospitalId: string): Promise<{ distance_km: number; radius_km: number } | null> {
  const { data, error } = await supabase
    .from('incident_offers')
    .select('distance_km,radius_km')
    .eq('incident_id', incidentId)
    .eq('hospital_id', hospitalId)
    .is('closed_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

/** UC-13 / UC-15 · Detalle completo vía Edge Function (foto firmada, reportante, unidad, chofer). */
export function fetchIncidentDetail(incidentId: string): Promise<IncidentDetail> {
  return callFunction<IncidentDetail>('get-incident', { incident_id: incidentId })
}

/** UC-16 · Casos asignados al hospital que siguen en curso. */
export async function fetchActiveCases(hospitalId: string): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select(INCIDENT_COLS)
    .eq('assigned_hospital_id', hospitalId)
    .in('estado', ['assigned', 'on_site'])
    .order('assigned_at', { ascending: true })
  if (error) throw error
  return (data as IncidentRow[]).map(toIncident)
}

export interface HistoryFilters {
  desde: string | null
  prioridad: Prioridad | null
  estado: Extract<EstadoIncidente, 'completed' | 'cancelled'> | null
  ambulanceId: string | null
}
export const HISTORY_PAGE = 25

/** UC-17 · Historial paginado con filtros en el servidor. */
export async function fetchHistory(hospitalId: string, f: HistoryFilters, page: number): Promise<{ rows: Incident[]; total: number }> {
  let q = supabase
    .from('incidents')
    .select(INCIDENT_COLS, { count: 'exact' })
    .eq('assigned_hospital_id', hospitalId)
    .in('estado', f.estado ? [f.estado] : ['completed', 'cancelled'])
  if (f.desde) q = q.gte('created_at', f.desde)
  if (f.prioridad) q = q.eq('prioridad', f.prioridad)
  if (f.ambulanceId) q = q.eq('assigned_ambulance_id', f.ambulanceId)
  const from = page * HISTORY_PAGE
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, from + HISTORY_PAGE - 1)
  if (error) throw error
  return { rows: (data as IncidentRow[]).map(toIncident), total: count ?? 0 }
}

export interface Fleet {
  ambulances: Ambulance[]
  types: AmbulanceType[]
  drivers: Driver[]
  /** Choferes con un caso en curso (no se pueden asignar a otro despacho). */
  busyDriverIds: string[]
}

/** UC-14 / UC-18 · Flota, tipos y choferes del hospital. */
export async function fetchFleet(hospitalId: string): Promise<Fleet> {
  const [amb, types, drivers, busy] = await Promise.all([
    supabase.from('ambulances').select('id,hospital_id,codigo,placa,tipo,type_id,driver_id,estado,activa').eq('hospital_id', hospitalId).order('codigo'),
    supabase.from('ambulance_types').select('id,hospital_id,nombre,base_tipo,activo').eq('hospital_id', hospitalId).order('nombre'),
    supabase
      .from('drivers')
      .select('id,hospital_id,nombre,ci,licencia_numero,licencia_categoria,licencia_vence,licencia_documento_url,telefono,activo')
      .eq('hospital_id', hospitalId)
      .order('nombre'),
    supabase.from('incidents').select('assigned_driver_id').eq('assigned_hospital_id', hospitalId).in('estado', ['assigned', 'on_site']),
  ])
  for (const r of [amb, types, drivers, busy]) if (r.error) throw r.error
  return {
    ambulances: (amb.data ?? []) as Ambulance[],
    types: (types.data ?? []) as AmbulanceType[],
    drivers: (drivers.data ?? []) as Driver[],
    busyDriverIds: (busy.data ?? []).map((r) => r.assigned_driver_id).filter((id): id is string => !!id),
  }
}

/** ¿El operador tiene un turno abierto? (staff_shifts sin ended_at). */
export async function fetchOnDuty(staffId: string): Promise<boolean> {
  const { data, error } = await supabase.from('staff_shifts').select('id').eq('staff_id', staffId).is('ended_at', null).maybeSingle()
  if (error) throw error
  return !!data
}

/** Licencia vigente: sin fecha o con fecha de hoy en adelante (misma regla que accept_incident_atomic). */
export function licenseValid(d: Pick<Driver, 'licencia_vence'>, today = new Date()): boolean {
  if (!d.licencia_vence) return true
  const t = today.toISOString().slice(0, 10)
  return d.licencia_vence >= t
}
