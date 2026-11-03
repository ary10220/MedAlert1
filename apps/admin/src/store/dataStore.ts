// Store en memoria del panel hospitalario. Al conectar Supabase:
//  - alertas entrantes  → realtime sobre incidents (estado 'searching' dentro del radio)
//  - dispatch / advance → update de incidents + ambulances (idealmente vía RPC transaccional)
//  - flota              → CRUD sobre ambulances del hospital
//  - rechazos           → necesitan tabla propia (p. ej. incident_offers); hoy no existe en el schema
import { create } from 'zustand'
import type { Ambulance, Hospital, Incident, Prioridad, TipoAmbulancia } from '../types'
import { DESCRIPCIONES, LUGARES, TIPO_POR_PRIORIDAD, mockAmbulances, mockHospital, mockIncidents, mockStaff } from '../data/mockData'

export type AmbulanceInput = Pick<Ambulance, 'placa' | 'tipo' | 'chofer' | 'codigo'>

interface DataState {
  hospital: Hospital
  incidents: Incident[]
  ambulances: Ambulance[]
  rejectedIds: string[]
  liveSim: boolean
  setLiveSim: (v: boolean) => void
  simulateIncomingAlert: () => void
  rejectAlert: (id: string) => void
  dispatch: (incidentId: string, ambulanceId: string) => void
  advanceCase: (incidentId: string) => void
  createAmbulance: (input: AmbulanceInput) => void
  updateAmbulance: (id: string, input: Partial<AmbulanceInput>) => void
  deleteAmbulance: (id: string) => void
  setMaintenance: (id: string, enMantenimiento: boolean) => void
}

const MAX_PENDIENTES_SIMULADAS = 6
let simSeq = 1

export const useDataStore = create<DataState>((set, get) => ({
  hospital: mockHospital,
  incidents: mockIncidents,
  ambulances: mockAmbulances,
  rejectedIds: [],
  liveSim: true,

  setLiveSim: (v) => set({ liveSim: v }),

  simulateIncomingAlert: () => {
    const { incidents, rejectedIds } = get()
    const pendientes = incidents.filter((i) => i.estado === 'searching' && !rejectedIds.includes(i.id)).length
    if (pendientes >= MAX_PENDIENTES_SIMULADAS) return
    const r = Math.random()
    const prioridad: Prioridad = r < 0.3 ? 'P1' : r < 0.75 ? 'P2' : 'P3'
    const lugar = LUGARES[Math.floor(Math.random() * LUGARES.length)]
    const id = `inc-N${String(simSeq++).padStart(2, '0')}`
    const tipo: TipoAmbulancia = TIPO_POR_PRIORIDAD[prioridad]
    const descs = DESCRIPCIONES[prioridad]
    const nueva: Incident = {
      id,
      reporter_id: 'u-testigo',
      lat: lugar.lat + (Math.random() - 0.5) * 0.004,
      lon: lugar.lon + (Math.random() - 0.5) * 0.004,
      referencia: lugar.ref,
      foto_url: `https://picsum.photos/seed/${id}-${Date.now()}/640/400`,
      estado: 'searching',
      prioridad,
      ia_output: { descripcion: descs[Math.floor(Math.random() * descs.length)], confianza: 0.88, victimas_estimadas: prioridad === 'P3' ? 1 : 2 },
      ia_suggested_type: tipo,
      assigned_hospital_id: null,
      assigned_ambulance_id: null,
      dispatched_by: null,
      assigned_at: null,
      on_site_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
    }
    set({ incidents: [nueva, ...incidents] })
  },

  rejectAlert: (id) => set((s) => ({ rejectedIds: [...s.rejectedIds, id] })),

  dispatch: (incidentId, ambulanceId) => {
    const now = new Date().toISOString()
    set((s) => ({
      incidents: s.incidents.map((i) =>
        i.id === incidentId
          ? { ...i, estado: 'assigned', assigned_hospital_id: s.hospital.id, assigned_ambulance_id: ambulanceId, dispatched_by: mockStaff.id, assigned_at: now }
          : i,
      ),
      ambulances: s.ambulances.map((a) => (a.id === ambulanceId ? { ...a, estado: 'en_servicio' } : a)),
    }))
  },

  advanceCase: (incidentId) => {
    const now = new Date().toISOString()
    const inc = get().incidents.find((i) => i.id === incidentId)
    if (!inc) return
    if (inc.estado === 'assigned') {
      set((s) => ({ incidents: s.incidents.map((i) => (i.id === incidentId ? { ...i, estado: 'on_site', on_site_at: now } : i)) }))
    } else if (inc.estado === 'on_site') {
      set((s) => ({
        incidents: s.incidents.map((i) => (i.id === incidentId ? { ...i, estado: 'completed', completed_at: now } : i)),
        // La unidad vuelve a quedar libre al cerrar el caso.
        ambulances: s.ambulances.map((a) => (a.id === inc.assigned_ambulance_id ? { ...a, estado: 'disponible' } : a)),
      }))
    }
  },

  createAmbulance: (input) => {
    const amb: Ambulance = { ...input, id: `a-${crypto.randomUUID().slice(0, 8)}`, hospital_id: get().hospital.id, estado: 'disponible', activa: true }
    set((s) => ({ ambulances: [...s.ambulances, amb] }))
  },

  updateAmbulance: (id, input) => set((s) => ({ ambulances: s.ambulances.map((a) => (a.id === id ? { ...a, ...input } : a)) })),

  deleteAmbulance: (id) => set((s) => ({ ambulances: s.ambulances.filter((a) => a.id !== id || a.estado === 'en_servicio') })),

  setMaintenance: (id, enMantenimiento) =>
    set((s) => ({
      ambulances: s.ambulances.map((a) =>
        a.id === id && a.estado !== 'en_servicio' ? { ...a, estado: enMantenimiento ? 'mantenimiento' : 'disponible' } : a,
      ),
    })),
}))
