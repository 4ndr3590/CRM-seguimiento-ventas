'use client';

import React, { useState, useMemo } from 'react';
import { Cliente, EstadoLinea, MotivoGestion, TareaRealizada, TipoVenta, EstatusEnrolamiento } from '@/types/crm';
import { exportarAExcel, exportarACSV } from '@/lib/exportUtils';
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  Eye,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ConsultasFiltrosProps {
  clientes: Cliente[];
  onVerHistorial: (cliente: Cliente) => void;
  onNuevaGestion: (cliente: Cliente) => void;
  filtroInicialSinGestion?: boolean;
}

export const ConsultasFiltros: React.FC<ConsultasFiltrosProps> = ({
  clientes,
  onVerHistorial,
  onNuevaGestion,
  filtroInicialSinGestion = false,
}) => {
  const { permisos } = useAuth();

  // Filters State
  const [orden, setOrden] = useState('');
  const [dnVenta, setDnVenta] = useState('');
  const [dnNuevo, setDnNuevo] = useState('');

  const [estado, setEstado] = useState<string>('todos');
  const [motivo, setMotivo] = useState<string>('todos');
  const [tarea, setTarea] = useState<string>('todos');
  const [ventaCerrada, setVentaCerrada] = useState<string>('todos');

  const [tipoVenta, setTipoVenta] = useState<string>('todos');
  const [enrolamiento, setEnrolamiento] = useState<string>('todos');
  const [soloSinGestion, setSoloSinGestion] = useState<boolean>(filtroInicialSinGestion);

  // Date filters
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [mesAno, setMesAno] = useState(''); // e.g. "2026-10"

  // Advanced filters toggle
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  const limpiarFiltros = () => {
    setOrden('');
    setDnVenta('');
    setDnNuevo('');
    setEstado('todos');
    setMotivo('todos');
    setTarea('todos');
    setVentaCerrada('todos');
    setTipoVenta('todos');
    setEnrolamiento('todos');
    setSoloSinGestion(false);
    setFechaDesde('');
    setFechaHasta('');
    setMesAno('');
  };

  const resultados = useMemo(() => {
    return clientes.filter((c) => {
      // 1. Info Cliente
      if (orden && !c.numero_orden.toLowerCase().includes(orden.toLowerCase().trim())) {
        return false;
      }
      if (dnVenta && !(c.dn_venta || '').includes(dnVenta.trim())) {
        return false;
      }
      if (dnNuevo && !(c.dn_nuevo || '').includes(dnNuevo.trim())) {
        return false;
      }

      // 2. Info Venta
      if (tipoVenta !== 'todos' && c.tipo_venta !== tipoVenta) {
        return false;
      }
      if (enrolamiento !== 'todos' && c.estatus_enrolamiento !== enrolamiento) {
        return false;
      }

      // 3. RN13: Sin Gestión
      if (soloSinGestion && c.ultima_gestion) {
        return false;
      }

      // 4. Info Gestión (evaluates latest gestion - RN04)
      const u = c.ultima_gestion;
      if (estado !== 'todos') {
        if (estado === 'Sin Gestión' && u) return false;
        if (estado !== 'Sin Gestión' && (!u || u.estado !== estado)) return false;
      }
      if (motivo !== 'todos') {
        if (motivo === 'Sin Gestión' && u) return false;
        if (motivo !== 'Sin Gestión' && (!u || u.motivo !== motivo)) return false;
      }
      if (tarea !== 'todos') {
        if (!u || u.tarea_realizada !== tarea) return false;
      }
      if (ventaCerrada !== 'todos') {
        if (!u || u.venta_cerrada !== ventaCerrada) return false;
      }

      // 5. Date filters (evaluates fecha_venta or ultima_gestion.fecha_hora_gestion)
      if (fechaDesde) {
        const fechaEval = u?.fecha_hora_gestion ? u.fecha_hora_gestion.split('T')[0] : c.fecha_venta;
        if (fechaEval < fechaDesde) return false;
      }
      if (fechaHasta) {
        const fechaEval = u?.fecha_hora_gestion ? u.fecha_hora_gestion.split('T')[0] : c.fecha_venta;
        if (fechaEval > fechaHasta) return false;
      }
      if (mesAno) {
        const fechaEval = u?.fecha_hora_gestion ? u.fecha_hora_gestion.split('T')[0] : c.fecha_venta;
        if (!fechaEval.startsWith(mesAno)) return false;
      }

      return true;
    });
  }, [
    clientes,
    orden,
    dnVenta,
    dnNuevo,
    tipoVenta,
    enrolamiento,
    soloSinGestion,
    estado,
    motivo,
    tarea,
    ventaCerrada,
    fechaDesde,
    fechaHasta,
    mesAno,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            Módulo 5: Consultas y Filtros Operativos
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Filtrado multicriterio de clientes, órdenes, gestiones y visualización del histórico completo (RN13, RN14).
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {permisos.canExportar && (
            <>
              <button
                onClick={() => exportarAExcel(resultados, 'CRM_Consulta_Clientes.xlsx')}
                disabled={resultados.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={() => exportarACSV(resultados, 'CRM_Consulta_Clientes.csv')}
                disabled={resultados.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Box */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        {/* Main Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Número de Orden
            </label>
            <input
              type="text"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              placeholder="Ej: ORD-1001"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              DN de la Venta
            </label>
            <input
              type="text"
              value={dnVenta}
              onChange={(e) => setDnVenta(e.target.value)}
              placeholder="Ej: 3001234501"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Tipo de Venta
            </label>
            <select
              value={tipoVenta}
              onChange={(e) => setTipoVenta(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="Portabilidad">Portabilidad</option>
              <option value="Adición">Adición</option>
              <option value="Migración">Migración</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Estatus Enrolamiento
            </label>
            <select
              value={enrolamiento}
              onChange={(e) => setEnrolamiento(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="todos">Todos los Estatus</option>
              <option value="Enrolado">Enrolado</option>
              <option value="No Enrolado">No Enrolado</option>
            </select>
          </div>
        </div>

        {/* Quick Toggles & Advanced button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            {/* RN13: Toggle Solo Sin Gestión */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-700/80 transition">
              <input
                type="checkbox"
                checked={soloSinGestion}
                onChange={(e) => setSoloSinGestion(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-600"
              />
              <span className="text-amber-300 font-medium">Solo Clientes Sin Gestión (RN05, RN13)</span>
            </label>

            <button
              onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium px-2 py-1"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{mostrarFiltrosAvanzados ? 'Ocultar Filtros Avanzados' : 'Más Filtros (Fechas, Motivo, Estado)'}</span>
            </button>
          </div>

          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar Filtros</span>
          </button>
        </div>

        {/* Collapsible Advanced Filters */}
        {mostrarFiltrosAvanzados && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Estado de la Línea
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Predesactivado">Predesactivado</option>
                <option value="Sin Gestión">Sin Gestión</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Motivo de Gestión
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="todos">Todos los Motivos</option>
                <option value="No contactado">No contactado</option>
                <option value="No reconoce la venta">No reconoce la venta</option>
                <option value="Pendiente de reclamar SIM">Pendiente de reclamar SIM</option>
                <option value="Problema en entrega de SIM">Problema en entrega de SIM</option>
                <option value="Desiste / Solicita cancelación">Desiste / Solicita cancelación</option>
                <option value="Activa y en uso">Activa y en uso</option>
                <option value="Sin Gestión">Sin Gestión</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                ¿Venta Cerrada?
              </label>
              <select
                value={ventaCerrada}
                onChange={(e) => setVentaCerrada(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="Sí">Sí (Caso Finalizado)</option>
                <option value="No">No (En Seguimiento)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Filtrar por Mes / Año
              </label>
              <input
                type="month"
                value={mesAno}
                onChange={(e) => setMesAno(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                DN Nuevo
              </label>
              <input
                type="text"
                value={dnNuevo}
                onChange={(e) => setDnNuevo(e.target.value)}
                placeholder="Ej: 3009876501"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Tarea Realizada
              </label>
              <select
                value={tarea}
                onChange={(e) => setTarea(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="todos">Todas las Tareas</option>
                <option value="Recordatorio de recolección de la SIM">Recordatorio de recolección de la SIM</option>
                <option value="Mensaje de bienvenida">Mensaje de bienvenida</option>
                <option value="Seguimiento primera factura">Seguimiento primera factura</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Resultados: <strong className="text-white text-sm">{resultados.length}</strong> clientes encontrados
          </div>
          <span className="text-slate-500">Haz clic en "Ver Historial" para consultar trazabilidad completa (RN14)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-700/60">
                <th className="py-3 px-4">Orden (RN01)</th>
                <th className="py-3 px-4">Fecha Venta</th>
                <th className="py-3 px-4">DN Venta / Nuevo</th>
                <th className="py-3 px-4">Tipo Venta</th>
                <th className="py-3 px-4">Enrolamiento</th>
                <th className="py-3 px-4">Última Gestión (RN04)</th>
                <th className="py-3 px-4">Motivo / Observación</th>
                <th className="py-3 px-4">Caso Cerrado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-sm">
                    No se encontraron clientes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                resultados.map((cliente) => {
                  const ultima = cliente.ultima_gestion;
                  const sinGestion = !ultima;
                  const cerrado = ultima?.venta_cerrada === 'Sí';

                  return (
                    <tr
                      key={cliente.numero_orden}
                      className="hover:bg-slate-800/50 transition cursor-pointer"
                      onClick={() => onVerHistorial(cliente)}
                    >
                      {/* Orden */}
                      <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {cliente.numero_orden}
                      </td>

                      {/* Fecha Venta */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {cliente.fecha_venta}
                      </td>

                      {/* DNs */}
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                        <div>{cliente.dn_venta || '-'}</div>
                        <div className="text-[10px] text-slate-500">{cliente.dn_nuevo || '-'}</div>
                      </td>

                      {/* Tipo Venta */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-medium text-[11px] bg-blue-900/30 text-blue-300 border border-blue-800/40">
                          {cliente.tipo_venta}
                        </span>
                      </td>

                      {/* Enrolamiento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                            cliente.estatus_enrolamiento === 'Enrolado'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                              : 'bg-rose-950/70 text-rose-300 border border-rose-800/50'
                          }`}
                        >
                          {cliente.estatus_enrolamiento}
                        </span>
                      </td>

                      {/* Última Gestión */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {sinGestion ? (
                          <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-amber-950/70 text-amber-300 border border-amber-800/60">
                            Sin Gestión (RN05)
                          </span>
                        ) : (
                          <div>
                            <span className="font-semibold text-white block">
                              {ultima.estado} ({ultima.recibio_chip})
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(ultima.fecha_hora_gestion).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Motivo / Observación */}
                      <td className="py-3 px-4 max-w-xs">
                        {sinGestion ? (
                          <span className="text-slate-500 italic">Pendiente de barrido</span>
                        ) : (
                          <div>
                            <span className="text-slate-200 font-medium block truncate">
                              {ultima.motivo}
                            </span>
                            <p className="text-[10px] text-slate-400 truncate italic">
                              "{ultima.observaciones}"
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Caso Cerrado */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {cerrado ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Cerrado (Sí)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-medium text-[10px] bg-slate-800 text-slate-400">
                            Abierto (No)
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onVerHistorial(cliente)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Ver Historial Completo (RN14)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {permisos.canGestionarBarridos && (
                            <button
                              onClick={() => onNuevaGestion(cliente)}
                              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
                              title="Registrar Nuevo Barrido / Gestión"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
