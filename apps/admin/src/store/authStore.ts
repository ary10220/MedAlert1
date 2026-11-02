// UC-11 · Sesión simulada del staff hospitalario (sin signup: las cuentas las crea MedAlert).
// Al conectar Supabase:
//   1. login → supabase.auth.signInWithPassword({ email, password })
//   2. leer profiles (rol + hospital_id) y rechazar si rol !== 'hospital_staff' o activo = false
//   3. logout → supabase.auth.signOut()
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Profile } from '../types'
import { mockStaff } from '../data/mockData'

interface AuthState {
  user: Profile | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

// sessionStorage puede no estar disponible (modo privado, iframes); sin él la sesión
// simplemente no sobrevive a la recarga.
const safeSessionStorage = createJSONStorage(() => {
  try {
    sessionStorage.setItem('__probe', '1')
    sessionStorage.removeItem('__probe')
    return sessionStorage
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
})

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: async (email, password) => {
        await new Promise((r) => setTimeout(r, 600))
        // Mock de la ficha: cualquier credencial entra. Validación mínima: email con @.
        if (!email.includes('@') || !password) throw new Error('Ingresá un email válido y tu contraseña')
        set({ user: { ...mockStaff, email } })
      },
      logout: () => set({ user: null }),
    }),
    { name: 'medalert-hospital-session', storage: safeSessionStorage },
  ),
)
