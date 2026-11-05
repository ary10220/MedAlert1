// UC-11 · Sesión real con Supabase Auth. Sin registro: las cuentas de staff las crea el admin
// (create-staff envía una invitación por email y el operador define su contraseña en /set-password).
import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { authLinkType, supabase, supabaseConfigError } from '../lib/supabase'
import { fetchHospital, fetchProfile } from '../lib/queries'
import { errorMessage } from '../lib/api'
import type { Hospital, Profile } from '../types'

type Status = 'loading' | 'signedOut' | 'ready'

interface AuthState {
  status: Status
  session: Session | null
  profile: Profile | null
  hospital: Hospital | null
  /** Motivo por el que una sesión válida no puede usar el panel (rol, cuenta inactiva…). */
  blocked: string | null
  /** Entró por un enlace de invitación o recuperación: debe definir contraseña antes de seguir. */
  needsPassword: boolean
  init: () => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  setPassword: (password: string) => Promise<void>
}

let initialized = false

/** Carga perfil + hospital y valida que la cuenta pueda usar el panel hospitalario. */
async function loadAccount(session: Session): Promise<Pick<AuthState, 'profile' | 'hospital' | 'blocked'>> {
  const profile = await fetchProfile(session.user.id)
  if (!profile) return { profile: null, hospital: null, blocked: 'Tu usuario no tiene perfil en MedAlert. Contactá al administrador.' }
  if (!profile.activo) return { profile, hospital: null, blocked: 'Tu cuenta está desactivada. Contactá al administrador.' }
  if (profile.rol === 'admin') {
    return { profile, hospital: null, blocked: 'Esta cuenta es de administrador MedAlert. El panel de admin todavía no está disponible en esta versión.' }
  }
  if (profile.rol !== 'hospital_staff' || !profile.hospital_id) {
    return { profile, hospital: null, blocked: 'Este panel es solo para personal hospitalario.' }
  }
  const hospital = await fetchHospital(profile.hospital_id)
  return { profile, hospital, blocked: null }
}

const SIGNED_OUT = { status: 'signedOut' as const, session: null, profile: null, hospital: null }

export const useAuthStore = create<AuthState>((set, get) => {
  const apply = async (session: Session | null) => {
    if (!session) {
      set(SIGNED_OUT)
      return
    }
    try {
      const account = await loadAccount(session)
      if (account.blocked) {
        set({ ...SIGNED_OUT, blocked: account.blocked, needsPassword: false })
        await supabase.auth.signOut()
      } else {
        set({ status: 'ready', session, ...account })
      }
    } catch (err) {
      set({ ...SIGNED_OUT, blocked: errorMessage(err) })
    }
  }

  return {
    status: supabaseConfigError ? 'signedOut' : 'loading',
    session: null,
    profile: null,
    hospital: null,
    blocked: null,
    needsPassword: authLinkType !== null,

    init: () => {
      if (initialized || supabaseConfigError) return
      initialized = true
      supabase.auth.getSession().then(({ data }) => apply(data.session))
      supabase.auth.onAuthStateChange((event, session) => {
        // INITIAL_SESSION lo cubre getSession; SIGNED_IN lo maneja login() o el enlace de email.
        if (event === 'SIGNED_OUT') set(SIGNED_OUT)
        else if (event === 'TOKEN_REFRESHED' && session) set({ session })
        else if (event === 'PASSWORD_RECOVERY') set({ needsPassword: true })
      })
    },

    login: async (email, password) => {
      if (supabaseConfigError) throw new Error(supabaseConfigError)
      set({ blocked: null })
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : error.message)
      await apply(data.session)
      const { blocked } = get()
      if (blocked) throw new Error(blocked)
    },

    logout: async () => {
      await supabase.auth.signOut()
      set({ ...SIGNED_OUT, blocked: null, needsPassword: false })
    },

    requestPasswordReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/set-password` })
      if (error) throw error
    },

    setPassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      set({ needsPassword: false })
    },
  }
})
