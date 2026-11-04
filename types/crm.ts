export type TipoVenta = 'Portabilidad' | 'Adición' | 'Migración';
export type EstatusEnrolamiento = 'Enrolado' | 'No Enrolado';
export type EstadoLinea = 'Activo' | 'Inactivo' | 'Predesactivado';
export type EntregaChip = 'CAC' | 'Domicilio';
export type RecibioChip = 'Entregado' | 'Sin registro de entrega' | 'NA';
export type Consumo = 'Sí' | 'No' | 'NA';
export type Contactabilidad =
  | 'Contacto efectivo'
  | 'Contacto no efectivo'
  | 'Venta activa con consumo sin novedad'
  | 'NA';
export type MotivoGestion =
  | 'No contactado'
  | 'No reconoce la venta'
  | 'Pendiente de reclamar SIM'
  | 'Problema en entrega de SIM'
  | 'Desiste / Solicita cancelación'
  | 'Activa y en uso';
export type TareaRealizada =
  | 'Recordatorio de recolección de la SIM'
  | 'Mensaje de bienvenida'
  | 'Seguimiento primera factura';
export type VentaCerrada = 'Sí' | 'No';

export type RolUsuario = 'Administrador' | 'Analista' | 'Consulta';

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  fecha_creacion: string;
}

export interface Gestion {
  id_gestion: string;
  numero_orden: string;
  fecha_hora_gestion: string; // ISO string for easy serialization and display
  estado: EstadoLinea;
  entrega_chip: EntregaChip;
  recibio_chip: RecibioChip;
  consumo: Consumo;
  contactabilidad: Contactabilidad;
  motivo: MotivoGestion;
  tarea_realizada: TareaRealizada;
  venta_cerrada: VentaCerrada;
  observaciones: string; // max 200 chars, mandatory
  usuario_responsable: string;
}

export interface Cliente {
  numero_orden: string; // Unique primary key (doc ID)
  fecha_venta: string;
  dn_venta: string;
  dn_nuevo: string;
  tipo_venta: TipoVenta;
  estatus_enrolamiento: EstatusEnrolamiento;
  fecha_carga: string;
  fecha_actualizacion: string;
  ultima_gestion?: Gestion | null; // Desnormalized latest management (RN04, RN12)
}

export interface AuditoriaEvento {
  id: string;
  fecha_hora: string;
  usuario: string;
  modulo: string;
  accion: string;
  detalle: string;
}

export interface Catalogos {
  tipo_venta: TipoVenta[];
  estatus: EstatusEnrolamiento[];
  estado: EstadoLinea[];
  entrega_chip: EntregaChip[];
  recibio_chip: RecibioChip[];
  consumo: Consumo[];
  contactabilidad: Contactabilidad[];
  motivo: MotivoGestion[];
  tarea_realizada: TareaRealizada[];
  venta_cerrada: VentaCerrada[];
}

export interface CargaResumen {
  totalLeidos: number;
  creados: number;
  actualizados: number;
  errores: { linea: number; razon: string; contenido: string }[];
}
