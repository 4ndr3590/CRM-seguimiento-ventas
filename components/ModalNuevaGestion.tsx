'use client';

import React, { useState, useEffect } from 'react';
import { Cliente, EstadoLinea, EntregaChip, RecibioChip, Consumo, Contactabilidad, MotivoGestion, TareaRealizada, VentaCerrada, Catalogos } from '@/types/crm';
import { dbService } from '@/lib/dbService';
import { useAuth } from '@/context/AuthContext';
import { X, Save, AlertCircle, CheckCircle2, Phone, Calendar, UserCheck } from 'lucide-react';

interface ModalNuevaGestionProps {
  cliente: Cliente | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalNuevaGestion: React.FC<ModalNuevaGestionProps> = ({
  cliente,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-loaded from DB state
  const [estado, setEstado] = useState<EstadoLinea>('Activo');
  const [entregaChip, setEntregaChip] = useState<EntregaChip>('CAC');
  const [recibioChip, setRecibioChip] = useState<RecibioChip>('NA');
  const [consumo, setConsumo] = useState<Consumo>('NA');

  // Empty by default for explicit analyst selection on each gestion
  const [contactabilidad, setContactabilidad] = useState<Contactabilidad | ''>('');
  const [motivo, setMotivo] = useState<MotivoGestion | ''>('');
  const [tareaRealizada, setTareaRealizada] = useState<TareaRealizada | ''>('');
  const [ventaCerrada, setVentaCerrada] = useState<VentaCerrada | ''>('');
  const [observaciones, setObservaciones] = useState<string>('');

  useEffect(() => {
    dbService.getCatalogos().then((cats) => {
      setCatalogos(cats);
    });

    if (!cliente) return;

    const normalizarEntregaChip = (val?: string): EntregaChip => {
      const lower = (val || '').trim().toLowerCase();
      if (lower === 'domicilio') return 'Domicilio';
      if (lower === 'cac') return 'CAC';
      return (val as EntregaChip) || 'CAC';
    };

    const normalizarConsumo = (val?: string): Consumo => {
      const lower = (val || '').trim().toLowerCase();
      if (lower === 'sí' || lower === 'si') return 'Sí';
      if (lower === 'no') return 'No';
      if (lower === 'na' || lower === 'n/a') return 'NA';
      return (val as Consumo) || 'NA';
    };

    const mapearEntregadoARecibio = (val?: string): RecibioChip => {
      const lower = (val || '').trim().toLowerCase();
      if (lower === 'sí' || lower === 'si' || lower === 'entregado') return 'Entregado';
      if (lower === 'no' || lower === 'caída' || lower === 'caida' || lower === 'sin registro de entrega') {
        return 'Sin registro de entrega';
      }
      return 'NA';
    };

    const baseEsMasReciente =
      !cliente.ultima_gestion ||
      Boolean(
        cliente.fecha_actualizacion &&
          cliente.ultima_gestion.fecha_hora_gestion &&
          cliente.fecha_actualizacion > cliente.ultima_gestion.fecha_hora_gestion
      );

    // 1. Auto-cargar Estado de la Línea, Entrega de Chip, ¿Ya Recibió el Chip?, Consumo desde BD
    setEstado(cliente.ultima_gestion?.estado || 'Activo');

    const entregadoEsSi =
      (cliente.entregado || '').trim().toLowerCase() === 'sí' ||
      (cliente.entregado || '').trim().toLowerCase() === 'si';

    if (baseEsMasReciente) {
      setEntregaChip(
        cliente.entrega_chip
          ? normalizarEntregaChip(cliente.entrega_chip)
          : cliente.ultima_gestion?.entrega_chip || 'CAC'
      );
      setRecibioChip(
        entregadoEsSi
          ? 'Entregado'
          : cliente.entregado
          ? mapearEntregadoARecibio(cliente.entregado)
          : cliente.ultima_gestion?.recibio_chip || 'NA'
      );
    } else {
      setEntregaChip(
        cliente.ultima_gestion?.entrega_chip || normalizarEntregaChip(cliente.entrega_chip)
      );
      setRecibioChip(
        entregadoEsSi
          ? 'Entregado'
          : cliente.ultima_gestion?.recibio_chip || mapearEntregadoARecibio(cliente.entregado)
      );
    }

    // Consumo: la carga de base ya no sobrescribe Consumo en existentes, priorizar última gestión
    setConsumo(
      cliente.ultima_gestion?.consumo
        ? normalizarConsumo(cliente.ultima_gestion.consumo)
        : normalizarConsumo(cliente.consumo)
    );

    // 2. Contactabilidad, Motivo de la Gestión, Tarea Realizada y ¿Venta Cerrada? SIEMPRE vacíos por defecto
    setContactabilidad('');
    setMotivo('');
    setTareaRealizada('');
    setVentaCerrada('');
    setObservaciones('');
    setErrorMsg(null);
  }, [cliente]);

  if (!cliente) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!contactabilidad || !motivo || !tareaRealizada || !ventaCerrada) {
      setErrorMsg(
        'Debes seleccionar Contactabilidad, Motivo de la Gestión, Tarea Realizada y ¿Venta Cerrada?.'
      );
      return;
    }

    // RN06: Observaciones obligatorias y máximo 200 caracteres
    const obsTrim = observaciones.trim();
    if (!obsTrim) {
      setErrorMsg('Las observaciones son obligatorias (RN06).');
      return;
    }

    if (obsTrim.length > 200) {
      setErrorMsg('Las observaciones no pueden superar los 200 caracteres (RN06).');
      return;
    }

    setGuardando(true);
    try {
      const responsable = user?.nombre || user?.email || 'Analista';
      await dbService.crearGestion(
        {
          numero_orden: cliente.numero_orden,
          estado,
          entrega_chip: entregaChip,
          recibio_chip: recibioChip,
          consumo,
          contactabilidad: contactabilidad as Contactabilidad,
          motivo: motivo as MotivoGestion,
          tarea_realizada: tareaRealizada as TareaRealizada,
          venta_cerrada: ventaCerrada as VentaCerrada,
          observaciones: obsTrim,
          usuario_responsable: responsable,
        },
        responsable
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al guardar la gestión.');
    } finally {
      setGuardando(false);
    }
  };

  const carRestantes = 200 - observaciones.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Registrar Barrido / Gestión
              <span className="text-blue-400 font-mono text-base">#{cliente.numero_orden}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Genera un registro histórico inmutable (RN02, RN03) y actualiza el Dashboard en tiempo real (RN12).
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[78vh]">
          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-800 text-rose-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Información General Completa del Cliente */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Información General del Cliente
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Número de Orden</span>
                <span className="font-bold text-white font-mono text-xs">{cliente.numero_orden}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Fecha Venta</span>
                <span className="font-semibold text-slate-200 text-xs">{cliente.fecha_venta || '-'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">DN Venta</span>
                <span className="font-mono text-slate-200 text-xs">{cliente.dn_venta || '-'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">DN Nuevo</span>
                <span className="font-mono text-slate-200 text-xs">{cliente.dn_nuevo || '-'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Tipo Venta</span>
                <span className="inline-block px-1.5 py-0.5 rounded font-medium text-[11px] bg-blue-900/40 text-blue-300 border border-blue-700/50">
                  {cliente.tipo_venta}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Enrolamiento</span>
                <span
                  className={`inline-block px-1.5 py-0.5 rounded font-medium text-[11px] ${
                    cliente.estatus_enrolamiento === 'Enrolado'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-700'
                  }`}
                >
                  {cliente.estatus_enrolamiento}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Ciclo</span>
                <span className="font-semibold text-purple-300 text-xs">{cliente.ciclo || '-'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Consumo Base</span>
                <span className="font-semibold text-cyan-300 text-xs">{cliente.consumo || '-'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Entrega Chip</span>
                <span className="font-semibold text-amber-300 text-xs">{cliente.entrega_chip || '-'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Entregado</span>
                <span
                  className={`inline-block px-1.5 py-0.5 rounded font-medium text-[11px] ${
                    cliente.entregado?.toLowerCase() === 'sí' || cliente.entregado?.toLowerCase() === 'si'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                      : cliente.entregado?.toLowerCase() === 'caída' || cliente.entregado?.toLowerCase() === 'caida'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-700'
                      : cliente.entregado?.toLowerCase() === 'no'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-700'
                      : 'text-slate-400'
                  }`}
                >
                  {cliente.entregado || '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Estado */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estado de la Línea *
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoLinea)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {(catalogos?.estado || ['Activo', 'Inactivo', 'Predesactivado']).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Entrega Chip */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Entrega de Chip *
              </label>
              <select
                value={entregaChip}
                onChange={(e) => setEntregaChip(e.target.value as EntregaChip)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {(catalogos?.entrega_chip || ['CAC', 'Domicilio']).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* ¿Ya Recibió el Chip? */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ¿Ya Recibió el Chip? *
              </label>
              <select
                value={recibioChip}
                onChange={(e) => setRecibioChip(e.target.value as RecibioChip)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {(catalogos?.recibio_chip || ['Entregado', 'Sin registro de entrega', 'NA']).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Consumo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Consumo *
              </label>
              <select
                value={consumo}
                onChange={(e) => setConsumo(e.target.value as Consumo)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {(catalogos?.consumo || ['Sí', 'No', 'NA']).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Contactabilidad */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contactabilidad *
              </label>
              <select
                required
                value={contactabilidad}
                onChange={(e) => setContactabilidad(e.target.value as Contactabilidad | '')}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Seleccionar --</option>
                {(catalogos?.contactabilidad || [
                  'Contacto efectivo',
                  'Contacto no efectivo',
                  'Venta activa con consumo sin novedad',
                  'NA',
                ]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Motivo de la Gestión */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motivo de la Gestión *
              </label>
              <select
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MotivoGestion | '')}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Seleccionar --</option>
                {(catalogos?.motivo || [
                  'No contactado',
                  'No reconoce la venta',
                  'Pendiente de reclamar SIM',
                  'Problema en entrega de SIM',
                  'Desiste / Solicita cancelación',
                  'Activa y en uso',
                ]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Tarea Realizada */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tarea Realizada *
              </label>
              <select
                required
                value={tareaRealizada}
                onChange={(e) => setTareaRealizada(e.target.value as TareaRealizada | '')}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Seleccionar --</option>
                {(catalogos?.tarea_realizada || [
                  'Recordatorio de recolección de la SIM',
                  'Mensaje de bienvenida',
                  'Seguimiento primera factura',
                ]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Venta Cerrada (RN07) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ¿Venta Cerrada? (RN07) *
              </label>
              <select
                required
                value={ventaCerrada}
                onChange={(e) => setVentaCerrada(e.target.value as VentaCerrada | '')}
                className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:outline-none ${
                  ventaCerrada === 'Sí'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600 focus:ring-emerald-500'
                    : ventaCerrada === 'No'
                    ? 'bg-slate-800 text-amber-300 border-slate-700 focus:ring-blue-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 focus:ring-blue-500'
                }`}
              >
                <option value="">-- Seleccionar --</option>
                {(catalogos?.venta_cerrada || ['Sí', 'No']).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Sí' ? 'Sí (Cierre Definitivo del Caso)' : 'No (Seguimiento Activo)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(consumo === 'Sí' || (consumo as string).toLowerCase() === 'si') && (
            <div className="bg-emerald-950/50 border border-emerald-700/70 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>
                <strong>Regla automática:</strong> Al guardar esta gestión con <strong>Consumo = Sí</strong>, el
                registro del cliente se actualizará automáticamente a <strong>Entregado = Sí</strong> y{' '}
                <strong>Enrolamiento = Enrolado</strong>.
              </span>
            </div>
          )}

          {/* Observaciones (RN06) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Observaciones (Texto libre obligatorio, máx. 200 car.) *
              </label>
              <span
                className={`text-[11px] font-mono ${
                  carRestantes < 20
                    ? 'text-rose-400 font-bold'
                    : carRestantes < 50
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {observaciones.length} / 200 caracteres ({carRestantes} restantes)
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={200}
              required
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escribe el detalle de la gestión realizada..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/40">
            <span>
              Usuario Responsable (RN10): <strong className="text-white">{user?.nombre || 'Usuario'}</strong>
            </span>
            <span>Fecha y Hora: <strong className="text-white">Al guardar (automática)</strong></span>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/40 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{guardando ? 'Guardando Gestión...' : 'Registrar Gestión'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
