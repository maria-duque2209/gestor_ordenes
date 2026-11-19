-- Datos de ejemplo (clientes). Seguro de ejecutar varias veces.
-- Los usuarios y órdenes de demostración se crean con: npm run seed:demo
insert into public.clients (nombre, documento, telefono, email, direccion, notas)
select * from (values
  ('Audio Car Center',       '900123456-1', '3001234567', 'compras@audiocar.example', 'Cra 10 # 20-30',  'Cliente mayorista'),
  ('Sonido Profesional SAS', '901987654-2', '3109876543', 'info@sonidopro.example',   'Calle 45 # 12-08', null),
  ('Juan Pérez',             '1020304050',  '3204567890', null,                       null,               'Particular, prefiere contacto por WhatsApp')
) as v(nombre, documento, telefono, email, direccion, notas)
where not exists (select 1 from public.clients c where c.documento = v.documento);
