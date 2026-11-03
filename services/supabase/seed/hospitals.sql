insert into hospitals (nombre, direccion, ubicacion, telefono_despacho, tier) values
  ('Clínica Foianini', 'Av. Irala 468', st_makepoint(-63.1808, -17.7833)::geography, '77000001', 'premium'),
  ('Hospital Japonés', 'Av. Japón 3er anillo', st_makepoint(-63.1934, -17.7678)::geography, '77000002', 'basic'),
  ('Caja Petrolera', 'Av. Alemana', st_makepoint(-63.1753, -17.7889)::geography, '77000003', 'basic');
