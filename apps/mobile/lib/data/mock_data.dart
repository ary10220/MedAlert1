// Datos del modo demo. Los estados y hospitales coinciden con el backend
// (services/supabase/seed/hospitals.sql).

final mockUsuario = {
  'nombre': 'Ariany Claure',
  'ci': '12345678',
  'telefono': '75684006',
  'email': 'ariany@medalert.bo',
};

final mockHospitales = {
  'Clínica Foianini': {'direccion': 'Av. Irala 468', 'telefono': '77000001'},
  'Hospital Japonés': {
    'direccion': 'Av. Japón 3er anillo',
    'telefono': '77000002',
  },
  'Caja Petrolera': {'direccion': 'Av. Alemana', 'telefono': '77000003'},
};

final mockReportes = [
  {
    'id': 'inc-001',
    'fecha': '2026-10-28 14:23',
    'estado': 'completed',
    'ubicacion': 'Av. Cristo Redentor 4to anillo',
    'hospital_asignado': 'Clínica Foianini',
    'foto_url': 'https://picsum.photos/seed/acc1/400/300',
  },
  {
    'id': 'inc-002',
    'fecha': '2026-10-25 08:15',
    'estado': 'completed',
    'ubicacion': 'Av. Banzer km 3',
    'hospital_asignado': 'Hospital Japonés',
    'foto_url': 'https://picsum.photos/seed/acc2/400/300',
  },
  {
    'id': 'inc-003',
    'fecha': '2026-10-30 12:40',
    'estado': 'assigned',
    'ubicacion': 'Av. Alemana 3er anillo',
    'hospital_asignado': 'Caja Petrolera',
    'foto_url': 'https://picsum.photos/seed/acc3/400/300',
  },
];
