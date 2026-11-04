'use client';

import React, { useEffect, useState } from 'react';
import { Cliente, Gestion } from '@/types/crm';
import { dbService } from '@/lib/dbService';
import { exportarHistorialClienteAExcel } from '@/lib/exportUtils';
import {
  X,
  FileSpreadsheet,
  PlusCircle,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Smartphone,
  PhoneCall,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HistorialClienteModalProps {
  cliente: Cliente | null;
  onClose: () => void;
  onNuevaGestion: (cliente: Cliente) => void;
}

export const HistorialClienteModal: React.FC<HistorialClienteModalProps> = ({
  cliente,
  onClose,
  onNuevaGestion,
}) => {
  const { permisos } = useAuth();
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    setCargando(true);
    dbService
      .getGestionesCliente(cliente.numero_orden)
      .then((data) => setGestiones(data))
      .catch((err) => console.error('Error cargando gestiones:', err))
      .finally(() => setCargando(false));
  }, [cliente]);

  if (!cliente) return null;

  const ultima = cliente.ultima_gestion || (gestiones.length > 0 ? gestiones[0] : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Orden: <span className="text-blue-400">{cliente.numero_orden}</span>
                {cliente.ultima_gestion?.venta_cerrada === 'Sí' && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium">
                    Caso Finalizado
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Historial completo y trazabilidad de gestiones (RN03 - Inmutable)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {gestiones.length > 0 && (
              <button
                onClick={() => exportarHistorialClienteAExcel(cliente, gestiones)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700 text-xs rounded-lg transition"
                title="Descargar historial completo en Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>
            )}

            {permisos.canGestionarBarridos && (
              <button
                onClick={() => onNuevaGestion(cliente)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Nueva Gestión</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Section 1: Información General del Cliente */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>1. Información General del Cliente</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Número de Orden</span>
                <span className="font-bold text-white text-sm">{cliente.numero_orden}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Fecha Venta</span>
                <span className="font-semibold text-slate-200">{cliente.fecha_venta}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">DN Venta</span>
                <span className="font-mono text-slate-200">{cliente.dn_venta || '-'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">DN Nuevo</span>
                <span className="font-mono text-slate-200">{cliente.dn_nuevo || '-'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Tipo de Venta</span>
                <span className="inline-block px-2 py-0.5 rounded font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50">
                  {cliente.tipo_venta}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Estatus Enrolamiento</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded font-medium ${
                    cliente.estatus_enrolamiento === 'Enrolado'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-700'
                  }`}
                >
                  {cliente.estatus_enrolamiento}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Última Gestión (Destacada) */}
          <div className="bg-gradient-to-r from-slate-800/90 to-slate-800/40 rounded-xl p-4 border border-blue-600/30 shadow-lg">
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> 2. Última Gestión Registrada (RN04)
              </span>
              {ultima && (
                <span className="text-[11px] text-slate-400 lowercase font-normal">
                  {new Date(ultima.fecha_hora_gestion).toLocaleString('es-CO')}
                </span>
              )}
            </h3>

            {ultima ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block">Estado</span>
                    <span className="font-semibold text-white">{ultima.estado}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block">¿Recibió Chip?</span>
                    <span className="font-semibold text-white">{ultima.recibio_chip}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block">Consumo</span>
                    <span className="font-semibold text-white">{ultima.consumo}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block">Venta Cerrada</span>
                    <span
                      className={`font-semibold ${
                        ultima.venta_cerrada === 'Sí' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {ultima.venta_cerrada}
                    </span>
                  </div>
                  {ultima.numero_manual !== undefined && ultima.numero_manual !== null && (
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">N° Seguimiento</span>
                      <span className="font-semibold text-blue-400 font-mono">#{ultima.numero_manual}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block">Motivo:</span>
                    <span className="font-medium text-slate-200">{ultima.motivo}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block">Tarea Realizada:</span>
                    <span className="font-medium text-slate-200">{ultima.tarea_realizada}</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-400 block mb-1 font-medium">
                    Observaciones (RN06):
                  </span>
                  <p className="text-slate-200 italic">"{ultima.observaciones}"</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                    <span>Responsable: {ultima.usuario_responsable}</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-3 h-3" /> Registro Inmutable (RN03)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-950/20 border border-amber-800/40 p-4 rounded-lg text-center text-amber-300 text-xs">
                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                Este cliente no cuenta con gestiones previas registrada (Categoría: "Sin Gestión" -
                RN05, RN13).
              </div>
            )}
          </div>

          {/* Section 3: Histórico Completo de Gestiones (RN14) */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>3. Histórico Completo de Gestiones (Cronológico Inverso - RN14)</span>
              <span className="text-xs font-normal text-slate-400">
                Total gestiones: <strong className="text-white">{gestiones.length}</strong>
              </span>
            </h3>

            {cargando ? (
              <div className="text-center py-6 text-slate-400 text-xs">Cargando histórico...</div>
            ) : gestiones.length === 0 ? (
              <div className="text-center py-6 bg-slate-800/30 rounded-lg text-slate-500 text-xs">
                No hay historial de gestiones registrado.
              </div>
            ) : (
              <div className="space-y-3">
                {gestiones.map((g, idx) => (
                  <div
                    key={g.id_gestion || idx}
                    className="bg-slate-800/40 hover:bg-slate-800/70 transition p-3.5 rounded-xl border border-slate-700/60 relative"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-700/40 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                          #{gestiones.length - idx}
                        </span>
                        <span className="font-semibold text-white">
                          {new Date(g.fecha_hora_gestion).toLocaleString('es-CO')}
                        </span>
                        <span className="text-slate-400 text-[11px]">por {g.usuario_responsable}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {g.numero_manual !== undefined && g.numero_manual !== null && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono font-semibold" title="Número manual (1 al 30)">
                            Seguimiento: #{g.numero_manual}
                          </span>
                        )}
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-medium">
                          {g.estado}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                            g.venta_cerrada === 'Sí'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          Cerrada: {g.venta_cerrada}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Chip:</span>
                        <span>{g.recibio_chip} ({g.entrega_chip})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Consumo:</span>
                        <span>{g.consumo}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Contactabilidad:</span>
                        <span>{g.contactabilidad}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Tarea:</span>
                        <span>{g.tarea_realizada}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Motivo: {g.motivo}
                      </span>
                      <p className="text-slate-200 mt-1 italic">"{g.observaciones}"</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Trazabilidad auditada. Reglas RN02, RN03 y RN10 garantizadas.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
