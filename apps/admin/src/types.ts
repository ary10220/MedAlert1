// Tipos espejo del schema (init_schema + 0002_drivers_and_extras + 0003_hospital_workflows).
// Las columnas geography(point) se convierten a lat/lon con parsePoint (lib/geo.ts).

export type Rol = 'testigo' | 'hospital_staff' | 'admin'
export type BaseTipo = 'basica' | 'avanzada' | 'uti'
export type EstadoAmbulancia = 'disponible' | 'en_servicio' | 'mantenimiento'
export type EstadoIncidente = 'open' | 'searching' | 'assigned' | 'on_site' | 'completed' | 'cancelled'
export type Prioridad = 'P1' | 'P2' | 'P3'

export interface Profile {
  id: string
  rol: Rol
  nombre: string
  telefono: string | null
  hospital_id: string | null
  activo: boolean
}

export interface Hospital {
  id: string
  nombre: string
  direccion: string | null
  telefono_despacho: string | null
  logo_url: string | null
  lat: number
  lon: number
}

export interface AmbulanceType {
  id: string
  hospital_id: string
  nombre: string
  base_tipo: BaseTipo
  activo: boolean
}

export interface Driver {
  id: string
  hospital_id: string
  nombre: string
  ci: string
  licencia_numero: string | null
  licencia_categoria: string | null
  licencia_vence: string | null
  licencia_documento_url: string | null
  telefono: string | null
  activo: boolean
}

export interface Ambulance {
  id: string
  hospital_id: string
  codigo: string | null
  placa: string | null
  tipo: BaseTipo | null
  type_id: string | null
  driver_id: string | null
  estado: EstadoAmbulancia
  activa: boolean
}

/** ia_output tal como lo guarda triage-ia (respuesta de Gemini validada). */
export interface IaOutput {
  priority: Prioridad
  scene_description: string
  tipo_accidente: string
  cantidad_heridos_estimada: number
  suggested_unit: BaseTipo
  confidence: number
}

export interface Incident {
  id: string
  reporter_id: string | null
  estado: EstadoIncidente
  prioridad: Prioridad | null
  ia_output: IaOutput | null
  ia_suggested_type: BaseTipo | null
  tipo_accidente: string | null
  cantidad_heridos: number | null
  cantidad_heridos_confirmada: number | null
  referencia: string | null
  foto_url: string | null
  assigned_hospital_id: string | null
  assigned_ambulance_id: string | null
  assigned_driver_id: string | null
  assigned_at: string | null
  on_site_at: string | null
  completed_at: string | null
  created_at: string
  lat: number | null
  lon: number | null
}

/** Oferta abierta para el hospital (incident_offers + incidente embebido). */
export interface Offer {
  incident_id: string
  hospital_id: string
  radius_km: number
  distance_km: number
  created_at: string
  incident: Incident
}

/** Respuesta de la Edge Function get-incident. */
export interface IncidentDetail {
  incident: Incident
  reporter: { id: string; nombre: string; telefono: string | null; email: string | null } | null
  hospital: (Pick<Hospital, 'id' | 'nombre' | 'direccion' | 'telefono_despacho'> & { lat: number; lon: number; logo_signed_url: string | null }) | null
  ambulance: Pick<Ambulance, 'id' | 'codigo' | 'placa' | 'tipo' | 'estado'> | null
  driver: Pick<Driver, 'id' | 'nombre' | 'telefono'> | null
  photo_signed_url: string | null
}
