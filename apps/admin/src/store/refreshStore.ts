// Contador global de "datos cambiaron": lo incrementan Realtime, el refresco periódico
// y las acciones del operador. Cada consulta (useQuery) se vuelve a pedir cuando cambia.
import { create } from 'zustand'

interface RefreshState {
  tick: number
  live: 'connecting' | 'live' | 'offline'
  bump: () => void
  setLive: (s: RefreshState['live']) => void
}

export const useRefreshStore = create<RefreshState>((set) => ({
  tick: 0,
  live: 'connecting',
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  setLive: (live) => set({ live }),
}))

export const bumpData = () => useRefreshStore.getState().bump()
