// Tipos espejo del schema SQL (services/supabase/supabase/migrations/*_init_schema.sql).
// Las columnas geography(point) se representan como lat/lon para el frontend.

export type Rol = 'testigo' | 'hospital_staff' | 'admin'
export type Tier = 'basic' | 'premium'
export type TipoAmbulancia = 'basica' | 'avanzada' | 'uti'
export type EstadoAmbulancia = 'disponible' | 'en_servicio' | 'mantenimiento'
export type EstadoIncidente = 'open' | 'searching' | 'assigned' | 'on_site' | 'completed' | 'cancelled'
export type Prioridad = 'P1' | 'P2' | 'P3'

export interface Hospital {
  id: string
  nombre: string
  direccion: string
  lat: number
  lon: number
  telefono_despacho: string
  tier: Tier
  activo: boolean
  created_at: string
}

export interface Profile {
  id: string
  rol: Rol
  nombre: string
  ci: string
  telefono: string
  /** Vive en auth.users, no en profiles. Se trae por join/vista cuando se conecte Supabase. */
  email: string
  hospital_id: string | null
  activo: boolean
  created_at: string
}

export interface Ambulance {
  id: string
  hospital_id: string
  placa: string
  tipo: TipoAmbulancia
  estado: EstadoAmbulancia
  activa: boolean
  /** Código interno de la unidad (UTI-1, AV-1…). No existe aún en el schema. */
  codigo: string
  /** Chofer titular. No existe aún en el schema (pedir columna o tabla de turnos). */
  chofer: string
}

export interface IaOutput {
  descripcion: string
  confianza: number
  victimas_estimadas: number
}

export interface Incident {
  id: string
  reporter_id: string
  lat: number
  lon: number
  /** Referencia legible (geocoding inverso). No existe aún en el schema. */
  referencia: string
  foto_url: string
  estado: EstadoIncidente
  prioridad: Prioridad | null
  ia_output: IaOutput | null
  ia_suggested_type: TipoAmbulancia | null
  assigned_hospital_id: string | null
  assigned_ambulance_id: string | null
  dispatched_by: string | null
  assigned_at: string | null
  on_site_at: string | null
  completed_at: string | null
  created_at: string
}
