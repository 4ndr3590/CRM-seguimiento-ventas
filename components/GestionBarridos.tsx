'use client';

import React, { useState, useMemo } from 'react';
import { Cliente } from '@/types/crm';
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Smartphone,
  PhoneCall,
  User,
  Layers,
} from 'lucide-react';

interface GestionBarridosProps {
  clientes: Cliente[];
  onSeleccionarParaGestion: (cliente: Cliente) => void;
  onVerHistorial: (cliente: Cliente) => void;
}

export const GestionBarridos: React.FC<GestionBarridosProps> = ({
  clientes,
  onSeleccionarParaGestion,
  onVerHistorial,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState<string>('todos'); // 'todos' | 'sin_gestion' | 'abiertos' | 'cerrados'
  const [filtroTipoVenta, setFiltroTipoVenta] = useState<string>('todos');

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      // Search
      const term = busqueda.toLowerCase().trim();
      if (term) {
        const matchesOrden = c.numero_orden.toLowerCase().includes(term);
        const matchesDnVenta = (c.dn_venta || '').toLowerCase().includes(term);
        const matchesDnNuevo = (c.dn_nuevo || '').toLowerCase().includes(term);
        if (!matchesOrden && !matchesDnVenta && !matchesDnNuevo) return false;
      }

      // Quick filter
      if (filtroEstatus === 'sin_gestion') {
        if (c.ultima_gestion) return false;
      } else if (filtroEstatus === 'abiertos') {
        if (c.ultima_gestion?.venta_cerrada === 'Sí') return false;
      } else if (filtroEstatus === 'cerrados') {
        if (c.ultima_gestion?.venta_cerrada !== 'Sí') return false;
      }

      // Tipo Venta
      if (filtroTipoVenta !== 'todos' && c.tipo_venta !== filtroTipoVenta) {
        return false;
      }

      return true;
    });
  }, [clientes, busqueda, filtroEstatus, filtroTipoVenta]);

  const counts = useMemo(() => {
    const total = clientes.length;
    const sinGestion = clientes.filter((c) => !c.ultima_gestion).length;
    const abiertos = clientes.filter((c) => c.ultima_gestion?.venta_cerrada !== 'Sí').length;
    const cerrados = clientes.filter((c) => c.ultima_gestion?.venta_cerrada === 'Sí').length;
    return { total, sinGestion, abiertos, cerrados };
  }, [clientes]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            Módulo 2: Gestión de Barridos y Seguimiento
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecciona clientes para registrar nuevos barridos históricos (RN02, RN03) y finalizar casos (RN07).
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setFiltroEstatus('todos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filtroEstatus === 'todos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({counts.total})
          </button>
          <button
            onClick={() => setFiltroEstatus('sin_gestion')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filtroEstatus === 'sin_gestion'
                ? 'bg-amber-600 text-white shadow'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            Sin Gestión ({counts.sinGestion})
          </button>
          <button
            onClick={() => setFiltroEstatus('abiertos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filtroEstatus === 'abiertos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Casos Abiertos ({counts.abiertos})
          </button>
          <button
            onClick={() => setFiltroEstatus('cerrados')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filtroEstatus === 'cerrados' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cerrados ({counts.cerrados})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-lg flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por Número de Orden, DN Venta o DN Nuevo..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Tipo de Venta:</span>
          <select
            value={filtroTipoVenta}
            onChange={(e) => setFiltroTipoVenta(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="Portabilidad">Portabilidad</option>
            <option value="Adición">Adición</option>
            <option value="Migración">Migración</option>
          </select>
        </div>
      </div>

      {/* Client List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientesFiltrados.length === 0 ? (
          <div className="col-span-full bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No se encontraron clientes con los filtros aplicados.
          </div>
        ) : (
          clientesFiltrados.map((cliente) => {
            const ultima = cliente.ultima_gestion;
            const estaCerrado = ultima?.venta_cerrada === 'Sí';
            const sinGestion = !ultima;

            return (
              <div
                key={cliente.numero_orden}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3 group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono uppercase block">
                        Número de Orden
                      </span>
                      <span className="font-mono font-bold text-white text-sm group-hover:text-blue-400 transition">
                        {cliente.numero_orden}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-blue-900/30 text-blue-300 border border-blue-800/40">
                        {cliente.tipo_venta}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          cliente.estatus_enrolamiento === 'Enrolado'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        {cliente.estatus_enrolamiento}
                      </span>
                    </div>
                  </div>

                  {/* DNs & Fecha */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 block">DN Venta:</span>
                      <span className="font-mono">{cliente.dn_venta || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">DN Nuevo:</span>
                      <span className="font-mono">{cliente.dn_nuevo || '-'}</span>
                    </div>
                  </div>

                  {/* Status Banner */}
                  {sinGestion ? (
                    <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-2.5 text-xs text-amber-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Sin Gestión Asociada</strong>
                        <span className="text-[11px] text-amber-400/80">
                          Pendiente de primer barrido operativo.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                        estaCerrado
                          ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-white">
                          Motivo: {ultima.motivo}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            estaCerrado
                              ? 'bg-emerald-900/60 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {estaCerrado ? 'Venta Cerrada' : 'En Seguimiento'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 italic line-clamp-2">
                        "{ultima.observaciones}"
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                        <span>Por: {ultima.usuario_responsable}</span>
                        <span>{new Date(ultima.fecha_hora_gestion).toLocaleDateString('es-CO')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => onVerHistorial(cliente)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Historial</span>
                  </button>

                  <button
                    onClick={() => onSeleccionarParaGestion(cliente)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/30 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Hacer Barrido</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
