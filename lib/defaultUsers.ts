import { Usuario } from '@/types/crm';

export const USUARIOS_INICIALES: Usuario[] = [
  {
    uid: 'admin_principal',
    email: 'admin@crmventas.com',
    nombre: 'Carlos Mendoza (Admin)',
    rol: 'Administrador',
    password: 'Admin123*',
    activo: true,
    fecha_creacion: '2026-01-01T00:00:00.000Z',
  },
  {
    uid: 'analista_principal',
    email: 'analista@crmventas.com',
    nombre: 'Lucía Fernández (Analista)',
    rol: 'Analista',
    password: 'Analista123*',
    activo: true,
    fecha_creacion: '2026-01-01T00:00:00.000Z',
  },
  {
    uid: 'consulta_principal',
    email: 'consulta@crmventas.com',
    nombre: 'Mariana Silva (Consulta)',
    rol: 'Consulta',
    password: 'Consulta123*',
    activo: true,
    fecha_creacion: '2026-01-01T00:00:00.000Z',
  },
];
