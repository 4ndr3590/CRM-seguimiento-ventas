import { Catalogos } from '@/types/crm';

export const CATALOGOS_INICIALES: Catalogos = {
  tipo_venta: ['Portabilidad', 'Adición', 'Migración'],
  estatus: ['Enrolado', 'No Enrolado'],
  estado: ['Activo', 'Inactivo', 'Predesactivado'],
  entrega_chip: ['CAC', 'Domicilio'],
  recibio_chip: ['Entregado', 'Sin registro de entrega', 'NA'],
  consumo: ['Sí', 'No', 'NA'],
  contactabilidad: [
    'Contacto efectivo',
    'Contacto no efectivo',
    'Venta activa con consumo sin novedad',
    'NA',
  ],
  motivo: [
    'No contactado',
    'No reconoce la venta',
    'Pendiente de reclamar SIM',
    'Problema en entrega de SIM',
    'Desiste / Solicita cancelación',
    'Activa y en uso',
  ],
  tarea_realizada: [
    'Recordatorio de recolección de la SIM',
    'Mensaje de bienvenida',
    'Seguimiento primera factura',
  ],
  venta_cerrada: ['Sí', 'No'],
};
