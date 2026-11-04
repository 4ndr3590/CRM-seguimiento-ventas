'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AuditoriaEvento } from '@/types/crm';
import { dbService } from '@/lib/dbService';
import { History, Search, Filter, Shield, User, Clock, FileText, CheckCircle2 } from 'lucide-react';

export const BitacoraAuditoria: React.FC = () => {
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('todos');

  const refrescar = async () => {
    setCargando(true);
    try {
      const list = await dbService.getBitacora();
      setEventos(list);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    refrescar();
  }, []);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      if (filtroModulo !== 'todos' && ev.modulo !== filtroModulo) return false;
      if (busqueda) {
        const term = busqueda.toLowerCase();
        const matchesDetalle = ev.detalle.toLowerCase().includes(term);
        const matchesUsuario = ev.usuario.toLowerCase().includes(term);
        const matchesAccion = ev.accion.toLowerCase().includes(term);
        if (!matchesDetalle && !matchesUsuario && !matchesAccion) return false;
      }
      return true;
    });
  }, [eventos, filtroModulo, busqueda]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-purple-600 rounded-full inline-block"></span>
            Bitácora de Auditoría y Trazabilidad (RN11)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronológico inmutable de todas las operaciones realizadas por usuarios en el sistema.
          </p>
        </div>

        <button
          onClick={refrescar}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
        >
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Actualizar Registros</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por usuario, acción o detalle..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Módulo:</span>
          <select
            value={filtroModulo}
            onChange={(e) => setFiltroModulo(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="todos">Todos los Módulos</option>
            <option value="Carga de Bases">Carga de Bases</option>
            <option value="Gestión de Barridos">Gestión de Barridos</option>
            <option value="Administración de Catálogos">Administración de Catálogos</option>
            <option value="Administración de Usuarios">Administración de Usuarios</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Mostrando <strong className="text-white">{eventosFiltrados.length}</strong> eventos registrados
          </span>
          <span className="text-slate-500">Regla RN11 activa y auditada</span>
        </div>

        <div className="divide-y divide-slate-800">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-xs">Cargando bitácora de auditoría...</div>
          ) : eventosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No hay eventos de auditoría para mostrar con los filtros aplicados.
            </div>
          ) : (
            eventosFiltrados.map((ev) => (
              <div key={ev.id} className="p-4 hover:bg-slate-800/40 transition text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{ev.usuario}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-blue-900/30 text-blue-300 border border-blue-800/40">
                      {ev.modulo}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                      {ev.accion}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(ev.fecha_hora).toLocaleString('es-CO')}
                  </span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 font-mono">
                  {ev.detalle}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
