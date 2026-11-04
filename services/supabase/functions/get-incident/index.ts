import { body, caller, db, HttpError, reply, requiredUuid, serve } from '../_shared/core.ts'

function photoPath(value: string, projectUrl: string): string {
  if (!/^https?:\/\//i.test(value)) return value.replace(/^incident-photos\//, '')
  const url = new URL(value)
  if (url.origin !== new URL(projectUrl).origin) throw new HttpError(500, 'Invalid stored photo host')
  const match = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/incident-photos\/(.+)$/)
  if (!match) throw new HttpError(500, 'Invalid stored photo URL')
  return decodeURIComponent(match[1])
}

serve(async (req) => {
  const input = await body(req)
  const incidentId = requiredUuid(input.incident_id, 'incident_id')
  const client = db()
  const user = await caller(req, client, ['testigo', 'hospital_staff', 'admin'])
  const { data: incident, error } = await client.from('incidents')
    .select('id,reporter_id,estado,prioridad,ia_output,ia_suggested_type,tipo_accidente,cantidad_heridos,cantidad_heridos_confirmada,referencia,foto_url,assigned_hospital_id,assigned_ambulance_id,assigned_driver_id,assigned_at,on_site_at,completed_at,created_at')
    .eq('id', incidentId).maybeSingle()
  if (error) throw error
  if (!incident) throw new HttpError(404, 'Incident not found')
  if (user.rol === 'testigo' && incident.reporter_id !== user.id) throw new HttpError(403, 'Forbidden')
  if (user.rol === 'hospital_staff') {
    if (!user.hospital_id) throw new HttpError(403, 'Hospital membership required')
    let allowed = incident.assigned_hospital_id === user.hospital_id
    if (!allowed && incident.estado === 'searching') {
      const { data: offer, error: offerError } = await client.from('incident_offers')
        .select('incident_id').eq('incident_id', incidentId)
        .eq('hospital_id', user.hospital_id).is('closed_at', null).maybeSingle()
      if (offerError) throw offerError
      allowed = Boolean(offer)
    }
    if (!allowed) throw new HttpError(403, 'Forbidden')
  }
  const { data: point, error: pointError } = await client.rpc('incident_location', {
    p_incident_id: incidentId,
  }).single()
  if (pointError) throw pointError
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,nombre,ci,telefono').eq('id', incident.reporter_id).maybeSingle()
  if (profileError) throw profileError
  const { data: authUser } = incident.reporter_id
    ? await client.auth.admin.getUserById(incident.reporter_id) : { data: null }
  const reporter = profile ? {
    id: profile.id, nombre: profile.nombre, telefono: profile.telefono,
    email: authUser?.user?.email ?? null,
    ...(user.rol === 'admin' ? { ci: profile.ci } : {}),
  } : null
  let hospital = null
  if (incident.assigned_hospital_id) {
    const { data, error: hospitalError } = await client.from('hospitals')
      .select('id,nombre,direccion,telefono_despacho,logo_url')
      .eq('id', incident.assigned_hospital_id).single()
    if (hospitalError) throw hospitalError
    const { data: location, error: locationError } = await client.rpc('hospital_location', {
      p_hospital_id: incident.assigned_hospital_id,
    }).single()
    if (locationError) throw locationError
    let logoSignedUrl: string | null = null
    if (data.logo_url && data.logo_url.startsWith(`${data.id}/`) && !data.logo_url.includes('..')) {
      const { data: logo } = await client.storage.from('hospital-logos')
        .createSignedUrl(data.logo_url, 300)
      logoSignedUrl = logo?.signedUrl ?? null
    }
    hospital = { ...data, logo_url: undefined, logo_signed_url: logoSignedUrl, ...location }
  }
  let ambulance = null
  if (incident.assigned_ambulance_id) {
    const { data, error: ambulanceError } = await client.from('ambulances')
      .select('id,codigo,placa,tipo,estado').eq('id', incident.assigned_ambulance_id).single()
    if (ambulanceError) throw ambulanceError
    ambulance = data
  }
  let driver = null
  if (incident.assigned_driver_id && user.rol !== 'testigo') {
    const { data, error: driverError } = await client.from('drivers')
      .select('id,nombre,telefono').eq('id', incident.assigned_driver_id).single()
    if (driverError) throw driverError
    driver = data
  }
  let photoSignedUrl: string | null = null
  if (incident.foto_url) {
    const path = photoPath(incident.foto_url, Deno.env.get('SUPABASE_URL') ?? '')
    if (!incident.reporter_id || !path.startsWith(`${incident.reporter_id}/`) || path.includes('..')) {
      throw new HttpError(500, 'Invalid stored photo path')
    }
    const { data, error: photoError } = await client.storage.from('incident-photos')
      .createSignedUrl(path, 300)
    if (!photoError) photoSignedUrl = data.signedUrl
  }
  return reply({
    incident: { ...incident, lat: point.lat, lon: point.lon, foto_url: undefined },
    reporter, hospital, ambulance, driver, photo_signed_url: photoSignedUrl,
  })
})
