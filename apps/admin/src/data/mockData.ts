// Datos de prueba del panel hospitalario (basados en lib/data/mock_hospital.dart de la ficha).
// Respetan la forma de las tablas del schema para que reemplazarlos por Supabase sea directo.
import type { Ambulance, Hospital, Incident, Prioridad, Profile, TipoAmbulancia, EstadoIncidente } from '../types'

const MIN = 60_000
const DAY = 24 * 60 * MIN
const NOW = Date.now()
const iso = (ms: number) => new Date(ms).toISOString()

export const mockHospital: Hospital = {
  id: 'h-foianini',
  nombre: 'Clínica Foianini',
  direccion: 'Av. Irala 468, Santa Cruz',
  lat: -17.7833,
  lon: -63.1808,
  telefono_despacho: '77000001',
  tier: 'premium',
  activo: true,
  created_at: iso(NOW - 40 * DAY),
}

export const mockStaff: Profile = {
  id: 'u-s1',
  rol: 'hospital_staff',
  nombre: 'Dra. Carla Méndez',
  ci: '6543210',
  telefono: '71234567',
  email: 'cmendez@foianini.bo',
  hospital_id: mockHospital.id,
  activo: true,
  created_at: iso(NOW - 39 * DAY),
}

// Flota de la ficha + una Avanzada extra en servicio para que haya 2 casos activos.
export const mockAmbulances: Ambulance[] = [
  { id: 'a-1', hospital_id: mockHospital.id, codigo: 'UTI-1', placa: '1234-SCZ', tipo: 'uti', estado: 'disponible', chofer: 'Dr. Pérez', activa: true },
  { id: 'a-2', hospital_id: mockHospital.id, codigo: 'UTI-2', placa: '5678-SCZ', tipo: 'uti', estado: 'en_servicio', chofer: 'Dr. Vargas', activa: true },
  { id: 'a-3', hospital_id: mockHospital.id, codigo: 'AV-1', placa: '9012-SCZ', tipo: 'avanzada', estado: 'disponible', chofer: 'Lic. Rojas', activa: true },
  { id: 'a-4', hospital_id: mockHospital.id, codigo: 'BAS-1', placa: '3456-SCZ', tipo: 'basica', estado: 'mantenimiento', chofer: '-', activa: true },
  { id: 'a-5', hospital_id: mockHospital.id, codigo: 'AV-2', placa: '7890-SCZ', tipo: 'avanzada', estado: 'en_servicio', chofer: 'Lic. Salvatierra', activa: true },
]

export const LUGARES = [
  { ref: 'Av. Cristo Redentor, 4to anillo', lat: -17.7690, lon: -63.1720 },
  { ref: '2do anillo entre Alemana y Beni', lat: -17.7745, lon: -63.1700 },
  { ref: 'Av. Alemana, 3er anillo', lat: -17.7700, lon: -63.1640 },
  { ref: 'Av. Santos Dumont, 3er anillo', lat: -17.8030, lon: -63.1740 },
  { ref: 'Av. Grigotá, 3er anillo', lat: -17.8040, lon: -63.1930 },
  { ref: 'Av. Roca y Coronado, 3er anillo', lat: -17.7880, lon: -63.2050 },
  { ref: 'Av. Piraí, 3er anillo', lat: -17.7900, lon: -63.1990 },
  { ref: 'Av. Mutualista, 3er anillo', lat: -17.7640, lon: -63.1610 },
  { ref: 'Av. Busch, 2do anillo', lat: -17.7720, lon: -63.1850 },
  { ref: 'Av. Irala y Ejército', lat: -17.7860, lon: -63.1840 },
] as const

export const DESCRIPCIONES: Record<Prioridad, string[]> = {
  P1: ['Choque múltiple visible. 2 vehículos. Posible atrapamiento.', 'Vuelco de vehículo liviano. Víctima inconsciente en la vía.', 'Atropello a peatón. Sangrado abundante visible.'],
  P2: ['Atropello de motociclista. Víctima consciente.', 'Colisión frontal leve. Conductor con dolor torácico.', 'Caída de motocicleta. Posible fractura de extremidad.'],
  P3: ['Choque por alcance. Ocupantes caminando, contusiones leves.', 'Colisión lateral a baja velocidad. Sin lesionados aparentes.', 'Caída de ciclista. Raspaduras, víctima consciente.'],
}
export const TIPO_POR_PRIORIDAD: Record<Prioridad, TipoAmbulancia> = { P1: 'uti', P2: 'avanzada', P3: 'basica' }

interface Seed {
  id: string
  lugar: number
  prioridad: Prioridad
  desc: number
  estado: EstadoIncidente
  /** Minutos desde el reporte. */
  hace: number
  ambulancia?: string
  /** Minutos reporte→asignación, asignación→en lugar, en lugar→cierre. */
  tiempos?: [number, number, number]
}

function buildIncident(s: Seed): Incident {
  const lugar = LUGARES[s.lugar]
  const created = NOW - s.hace * MIN
  const [tA, tL, tC] = s.tiempos ?? [1.5, 8, 35]
  const assigned = s.estado !== 'searching' && s.estado !== 'open' && !!s.ambulancia
  const assignedAt = created + tA * MIN
  const onSiteAt = assignedAt + tL * MIN
  const closedAt = onSiteAt + tC * MIN
  return {
    id: s.id,
    reporter_id: 'u-testigo',
    lat: lugar.lat,
    lon: lugar.lon,
    referencia: lugar.ref,
    foto_url: `https://picsum.photos/seed/${s.id}/640/400`,
    estado: s.estado,
    prioridad: s.prioridad,
    ia_output: { descripcion: DESCRIPCIONES[s.prioridad][s.desc], confianza: 0.91, victimas_estimadas: s.prioridad === 'P3' ? 1 : 2 },
    ia_suggested_type: TIPO_POR_PRIORIDAD[s.prioridad],
    assigned_hospital_id: assigned ? mockHospital.id : null,
    assigned_ambulance_id: assigned ? s.ambulancia! : null,
    dispatched_by: assigned ? mockStaff.id : null,
    assigned_at: assigned ? iso(assignedAt) : null,
    on_site_at: s.estado === 'on_site' || s.estado === 'completed' ? iso(onSiteAt) : null,
    completed_at: s.estado === 'completed' ? iso(closedAt) : s.estado === 'cancelled' ? iso(created + 12 * MIN) : null,
    created_at: iso(created),
  }
}

const H = 60
const D = 24 * H
const SEEDS: Seed[] = [
  // UC-12 · alertas entrantes (estado searching: la IA ya clasificó y se busca hospital)
  { id: 'inc-A1', lugar: 0, prioridad: 'P1', desc: 0, estado: 'searching', hace: 1 },
  { id: 'inc-A2', lugar: 1, prioridad: 'P2', desc: 0, estado: 'searching', hace: 5 },
  { id: 'inc-A3', lugar: 9, prioridad: 'P3', desc: 0, estado: 'searching', hace: 9 },
  // UC-16 · casos activos en estados distintos
  { id: 'inc-B1', lugar: 3, prioridad: 'P1', desc: 1, estado: 'assigned', hace: 6, ambulancia: 'a-2', tiempos: [1.2, 9, 0] },
  { id: 'inc-B2', lugar: 8, prioridad: 'P2', desc: 2, estado: 'on_site', hace: 22, ambulancia: 'a-5', tiempos: [2, 7, 0] },
  // UC-17 · historial (10 casos)
  { id: 'inc-0110', lugar: 2, prioridad: 'P2', desc: 1, estado: 'completed', hace: 5 * H, ambulancia: 'a-3', tiempos: [1.8, 7.5, 42] },
  { id: 'inc-0109', lugar: 4, prioridad: 'P1', desc: 0, estado: 'completed', hace: 11 * H, ambulancia: 'a-1', tiempos: [0.9, 6.2, 55] },
  { id: 'inc-0108', lugar: 6, prioridad: 'P3', desc: 2, estado: 'cancelled', hace: D + 2 * H },
  { id: 'inc-0107', lugar: 5, prioridad: 'P2', desc: 2, estado: 'completed', hace: D + 7 * H, ambulancia: 'a-3', tiempos: [2.4, 9.1, 38] },
  { id: 'inc-0106', lugar: 7, prioridad: 'P1', desc: 2, estado: 'completed', hace: 2 * D + 3 * H, ambulancia: 'a-2', tiempos: [1.1, 8.4, 61] },
  { id: 'inc-0105', lugar: 1, prioridad: 'P3', desc: 0, estado: 'completed', hace: 3 * D + 5 * H, ambulancia: 'a-4', tiempos: [3.2, 11.5, 24] },
  { id: 'inc-0104', lugar: 0, prioridad: 'P2', desc: 0, estado: 'completed', hace: 4 * D + H, ambulancia: 'a-5', tiempos: [1.6, 7.9, 47] },
  { id: 'inc-0103', lugar: 3, prioridad: 'P1', desc: 1, estado: 'completed', hace: 6 * D + 8 * H, ambulancia: 'a-1', tiempos: [1.0, 7.1, 66] },
  { id: 'inc-0102', lugar: 9, prioridad: 'P3', desc: 1, estado: 'cancelled', hace: 9 * D + 4 * H },
  { id: 'inc-0101', lugar: 8, prioridad: 'P2', desc: 1, estado: 'completed', hace: 12 * D + 2 * H, ambulancia: 'a-3', tiempos: [2.1, 6.8, 33] },
]

export const mockIncidents: Incident[] = SEEDS.map(buildIncident)
