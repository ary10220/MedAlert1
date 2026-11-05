// Llamadas a Edge Functions (contratos en docs/api-contracts.md).
// supabase.functions.invoke agrega el JWT de la sesión en Authorization.
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** Códigos de error del backend → mensaje para el operador. */
const MENSAJES: Record<string, string> = {
  already_taken: 'Otro hospital ya tomó esta alerta.',
  not_offered: 'Esta alerta ya no está ofrecida a tu hospital.',
  offer_unavailable: 'La oferta ya fue cerrada.',
  not_searching: 'La alerta ya no está buscando hospital.',
  ambulance_unavailable: 'La ambulancia ya no está disponible.',
  driver_unavailable: 'El chofer no está activo o su licencia está vencida.',
  driver_busy: 'El chofer está atendiendo otro caso.',
  ambulance_busy: 'La ambulancia está atendiendo un caso; esperá a que termine.',
  invalid_transition: 'Ese cambio de estado no está permitido ahora.',
  already_reported: 'Tu hospital ya reportó este incidente como falsa alarma.',
  invalid_type: 'El tipo de ambulancia no es válido o está inactivo.',
  invalid_driver: 'El chofer no es válido o está inactivo.',
  missing_fields: 'Faltan datos obligatorios.',
  hospital_unavailable: 'El hospital no está activo.',
  forbidden: 'No tenés permiso para esta acción.',
  Forbidden: 'No tenés permiso para esta acción.',
  not_found: 'No se encontró el registro.',
  'Invalid placa': 'Placa inválida. Formato 1234-SCZ.',
  'Ambulance code or plate already exists': 'Ya existe una ambulancia con ese código o placa.',
  'Driver CI already exists for hospital': 'Ya existe un chofer con ese CI en tu hospital.',
  'Driver CI already exists': 'Ya existe un chofer con ese CI.',
  'Type already exists': 'Ya existe un tipo con ese nombre.',
  'Type name already exists': 'Ya existe un tipo con ese nombre.',
  'Type is used by active ambulances': 'El tipo está en uso por ambulancias activas.',
  'Invalid session': 'Tu sesión expiró. Volvé a ingresar.',
  'Authentication required': 'Tu sesión expiró. Volvé a ingresar.',
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(MENSAJES[code] ?? (status === 0 ? code : `Error del servidor (${code})`))
    this.status = status
    this.code = code
  }
}

export async function callFunction<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: payload })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response
      let code = res.statusText || 'error'
      try {
        const json = (await res.json()) as { error?: string }
        if (json.error) code = json.error
      } catch {
        /* cuerpo no JSON */
      }
      throw new ApiError(res.status, code)
    }
    throw new ApiError(0, 'No se pudo contactar al servidor. Revisá tu conexión.')
  }
  return data as T
}

/** Mensaje legible para cualquier error (ApiError, PostgrestError, Error). */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return 'Ocurrió un error inesperado.'
}
