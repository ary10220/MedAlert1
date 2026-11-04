import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Mensaje para la pantalla de login si faltan las variables de entorno. */
export const supabaseConfigError: string | null =
  !url || !anonKey
    ? 'Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en apps/admin/.env.local'
    : null

/**
 * Tipo de enlace de email con el que se abrió la app (invitación de staff o recuperación).
 * Se lee antes de crear el cliente porque supabase-js limpia el hash al procesar la sesión.
 */
function readAuthLinkType(): 'invite' | 'recovery' | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1))
  const type = params.get('type')
  return type === 'invite' || type === 'recovery' ? type : null
}
export const authLinkType = readAuthLinkType()

// Con la config incompleta se crea un cliente "vacío" para no romper los imports;
// la app muestra el error en /login y no hace llamadas.
export const supabase: SupabaseClient = createClient(url || 'http://localhost', anonKey || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})
