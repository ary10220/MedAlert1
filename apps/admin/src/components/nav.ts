import type { IconName } from './Icon'

/** Destinos principales del panel (menú lateral y pestañas de celular). */
export const NAV: { to: string; label: string; short: string; icon: IconName; badge: 'alerts' | 'active' | null }[] = [
  { to: '/', label: 'Alertas', short: 'Alertas', icon: 'bell', badge: 'alerts' },
  { to: '/active', label: 'Casos activos', short: 'Activos', icon: 'pulse', badge: 'active' },
  { to: '/history', label: 'Historial', short: 'Historial', icon: 'clock', badge: null },
  { to: '/fleet', label: 'Flota', short: 'Flota', icon: 'truck', badge: null },
]
