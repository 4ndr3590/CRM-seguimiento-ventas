'use client';

import React, { useState } from 'react';
import { Cliente, Gestion } from '@/types/crm';
import { exportarAExcel, exportarACSV, exportarDashboardAPDF } from '@/lib/exportUtils';
import { useAuth } from '@/context/AuthContext';
import {
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Database,
  Calendar,
} from 'lucide-react';

interface ExportacionDatosProps {
  clientes: Cliente[];
  todasGestiones: Gestion[];
}

export const ExportacionDatos: React.FC<ExportacionDatosProps> = ({ clientes, todasGestiones }) => {
  const { permisos } = useAuth();
  const [descargando, setDescargando] = useState<string | null>(null);

  const handleExportExcel = async () => {
    setDescargando('excel');
    try {
      exportarAExcel(clientes, `CRM_Seguimiento_Ventas_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setDescargando(null);
    }
  };

  const handleExportCSV = async () => {
    setDescargando('csv');
    try {
      exportarACSV(clientes, `CRM_Seguimiento_Ventas_${new Date().toISOString().split('T')[0]}.csv`);
    } finally {
      setDescargando(null);
    }
  };

  if (!permisos.canExportar) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Acceso Restringido</h2>
        <p className="text-xs">
          La Exportación Consolidada está reservada para el perfil <strong>Administrador</strong>.
          Cambia tu perfil en el selector superior para acceder a esta opción.
        </p>
      </div>
    );
  }

  const clientesConGestion = clientes.filter((c) => c.ultima_gestion).length;
  const clientesSinGestion = clientes.filter((c) => !c.ultima_gestion).length;
  const casosCerrados = clientes.filter((c) => c.ultima_gestion?.venta_cerrada === 'Sí').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
          Módulo 6: Centro de Exportación de Información (RN15)
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Descarga la base consolidada con la información más actualizada en formatos estándar de oficina.
        </p>
      </div>

      {/* Snapshot Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Resumen de Datos Disponibles para Exportación:
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-0.5">Total Clientes</span>
            <strong className="text-white text-lg font-mono">{clientes.length}</strong>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-0.5">Con Última Gestión</span>
            <strong className="text-emerald-400 text-lg font-mono">{clientesConGestion}</strong>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-0.5">Sin Gestión (RN05)</span>
            <strong className="text-amber-400 text-lg font-mono">{clientesSinGestion}</strong>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-0.5">Total Gestiones Históricas</span>
            <strong className="text-blue-400 text-lg font-mono">{todasGestiones.length}</strong>
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Option 1: Excel */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-600/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between transition group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Microsoft Excel (.xlsx)</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Base consolidada con todas las columnas de cliente, fecha de carga, y el detalle desnormalizado
              de la última gestión registrada (RN04, RN15), con formato de celdas ajustado automáticamente.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={descargando === 'excel' || clientes.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{descargando === 'excel' ? 'Generando Excel...' : 'Descargar en .xlsx'}</span>
          </button>
        </div>

        {/* Option 2: CSV */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-600/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between transition group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Archivo de Valores (.csv)</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Formato ligero delimitado por comas, codificado en UTF-8 con BOM para perfecta apertura
              en cualquier versión de Excel, Power BI o importadores externos de bases de datos.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={descargando === 'csv' || clientes.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/40 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{descargando === 'csv' ? 'Generando CSV...' : 'Descargar en .csv'}</span>
          </button>
        </div>

        {/* Option 3: PDF Dashboard */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-rose-600/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between transition group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Dashboard Ejecutivo en PDF</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Exportación visual integral del Dashboard con todos los 9 indicadores ejecutivos en tiempo real,
              gráficos de barras, tortas y métricas operativas de productividad para comités de gerencia.
            </p>
          </div>

          <p className="text-[11px] text-slate-500 mb-4 italic">
            * Disponible directamente en la pestaña del Dashboard Ejecutivo mediante el botón "Descargar Dashboard (PDF)".
          </p>
        </div>
      </div>
    </div>
  );
};
