import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Cliente, Gestion } from '@/types/crm';

// Export consolidated dataset to Excel (.xlsx) - RN15
export function exportarAExcel(
  clientes: Cliente[],
  nombreArchivo = 'CRM_Seguimiento_Ventas_Consolidado.xlsx'
) {
  const datos = clientes.map((c, idx) => ({
    '#': idx + 1,
    'Número de Orden': c.numero_orden,
    'Fecha Venta': c.fecha_venta,
    'DN Venta': c.dn_venta,
    'DN Nuevo': c.dn_nuevo,
    'Tipo de Venta': c.tipo_venta,
    'Estatus Enrolamiento': c.estatus_enrolamiento,
    'Ciclo': c.ciclo || '',
    'Consumo Base': c.consumo || '',
    'Entrega Chip Base': c.entrega_chip || '',
    'Tiene Gestión': c.ultima_gestion ? 'Sí' : 'Sin Gestión',
    'Última Gestión - Fecha': c.ultima_gestion?.fecha_hora_gestion
      ? new Date(c.ultima_gestion.fecha_hora_gestion).toLocaleString('es-CO')
      : 'Sin Gestión',
    'Última Gestión - Estado': c.ultima_gestion?.estado || 'Sin Gestión',
    'Última Gestión - Entrega Chip': c.ultima_gestion?.entrega_chip || 'Sin Gestión',
    'Última Gestión - Recibió Chip': c.ultima_gestion?.recibio_chip || 'Sin Gestión',
    'Última Gestión - Consumo': c.ultima_gestion?.consumo || 'Sin Gestión',
    'Última Gestión - Contactabilidad': c.ultima_gestion?.contactabilidad || 'Sin Gestión',
    'Última Gestión - Motivo': c.ultima_gestion?.motivo || 'Sin Gestión',
    'Última Gestión - Tarea Realizada': c.ultima_gestion?.tarea_realizada || 'Sin Gestión',
    'Última Gestión - Venta Cerrada': c.ultima_gestion?.venta_cerrada || 'Sin Gestión',
    'Última Gestión - Responsable': c.ultima_gestion?.usuario_responsable || 'Sin Gestión',
    'Última Gestión - Observaciones': c.ultima_gestion?.observaciones || 'Sin Gestión',
    'Fecha Carga': c.fecha_carga ? new Date(c.fecha_carga).toLocaleString('es-CO') : '',
    'Fecha Última Actualización': c.fecha_actualizacion
      ? new Date(c.fecha_actualizacion).toLocaleString('es-CO')
      : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidado');

  // Auto-width columns
  const maxProps = Object.keys(datos[0] || {}).map((k) => ({
    wch: Math.max(k.length + 4, 14),
  }));
  worksheet['!cols'] = maxProps;

  XLSX.writeFile(workbook, nombreArchivo);
}

// Export consolidated dataset to CSV (.csv)
export function exportarACSV(
  clientes: Cliente[],
  nombreArchivo = 'CRM_Seguimiento_Ventas.csv'
) {
  const datos = clientes.map((c) => ({
    'Numero_Orden': c.numero_orden,
    'Fecha_Venta': c.fecha_venta,
    'DN_Venta': c.dn_venta,
    'DN_Nuevo': c.dn_nuevo,
    'Tipo_Venta': c.tipo_venta,
    'Estatus_Enrolamiento': c.estatus_enrolamiento,
    'Ciclo': c.ciclo || '',
    'Consumo_Base': c.consumo || '',
    'Entrega_Chip_Base': c.entrega_chip || '',
    'Estado_Gestion': c.ultima_gestion?.estado || 'Sin Gestión',
    'Recibio_Chip': c.ultima_gestion?.recibio_chip || 'Sin Gestión',
    'Consumo': c.ultima_gestion?.consumo || 'Sin Gestión',
    'Motivo': c.ultima_gestion?.motivo || 'Sin Gestión',
    'Tarea_Realizada': c.ultima_gestion?.tarea_realizada || 'Sin Gestión',
    'Venta_Cerrada': c.ultima_gestion?.venta_cerrada || 'Sin Gestión',
    'Usuario_Responsable': c.ultima_gestion?.usuario_responsable || 'Sin Gestión',
    'Observaciones': c.ultima_gestion?.observaciones ? `"${c.ultima_gestion.observaciones.replace(/"/g, '""')}"` : '""',
    'Fecha_Gestion': c.ultima_gestion?.fecha_hora_gestion || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(datos);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export full client history to Excel
export function exportarHistorialClienteAExcel(
  cliente: Cliente,
  gestiones: Gestion[]
) {
  const datos = gestiones.map((g, idx) => ({
    '#': idx + 1,
    'ID Gestión': g.id_gestion,
    'Fecha y Hora': new Date(g.fecha_hora_gestion).toLocaleString('es-CO'),
    'Estado': g.estado,
    'Entrega Chip': g.entrega_chip,
    '¿Ya Recibió Chip?': g.recibio_chip,
    'Consumo': g.consumo,
    'Contactabilidad': g.contactabilidad,
    'Motivo': g.motivo,
    'Tarea Realizada': g.tarea_realizada,
    'Venta Cerrada': g.venta_cerrada,
    'Usuario Responsable': g.usuario_responsable,
    'Observaciones': g.observaciones,
  }));

  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Historial_${cliente.numero_orden}`);
  XLSX.writeFile(workbook, `Historial_${cliente.numero_orden}.xlsx`);
}

// Export Executive Dashboard to PDF (using html2canvas + jspdf)
export async function exportarDashboardAPDF(
  elementId: string,
  nombreArchivo = 'Dashboard_Ejecutivo_CRM_Ventas.pdf'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento #${elementId} no encontrado en la vista.`);
  }

  // Generate canvas with optimal scale for high-definition print
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#0f172a', // Dark slate background to match theme
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const ratio = canvasWidth / canvasHeight;

  let width = pdfWidth - 20; // 10mm margins
  let height = width / ratio;

  if (height > pdfHeight - 20) {
    height = pdfHeight - 20;
    width = height * ratio;
  }

  const x = (pdfWidth - width) / 2;
  const y = 10;

  pdf.addImage(imgData, 'PNG', x, y, width, height);
  pdf.save(nombreArchivo);
}
