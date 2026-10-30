final mockUsuario = {
  'nombre': 'Ariany Claure',
  'ci': '12345678',
  'telefono': '75684006',
  'email': 'ariany@medalert.bo',
};

final mockReportes = [
  {
    'id': 'inc-001',
    'fecha': '2026-10-28 14:23',
    'estado': 'completed',
    'ubicacion': 'Av. Cristo Redentor 4to anillo',
    'hospital_asignado': 'Clínica Foianini',
    'eta_min': 5,
    'foto_url': 'https://picsum.photos/seed/acc1/400/300',
    'prioridad': 'P1',
  },
  {
    'id': 'inc-002',
    'fecha': '2026-10-25 08:15',
    'estado': 'completed',
    'ubicacion': 'Av. Banzer km 3',
    'hospital_asignado': 'Hospital Japonés',
    'eta_min': 8,
    'foto_url': 'https://picsum.photos/seed/acc2/400/300',
    'prioridad': 'P2',
  },
  {
    'id': 'inc-003',
    'fecha': '2026-10-30 12:40',
    'estado': 'on_route',
    'ubicacion': 'Av. Alemana 3er anillo',
    'hospital_asignado': 'Caja Petrolera',
    'eta_min': 4,
    'foto_url': 'https://picsum.photos/seed/acc3/400/300',
    'prioridad': 'P1',
  },
];

final estadosFlujo = [
  'Reportado',
  'Buscando ambulancia',
  'Asignada',
  'En camino',
  'En el lugar',
  'Completado',
];
