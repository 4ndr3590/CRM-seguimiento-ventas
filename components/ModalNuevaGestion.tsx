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

  // Form state
  const [estado, setEstado] = useState<EstadoLinea>('Activo');
  const [entregaChip, setEntregaChip] = useState<EntregaChip>('CAC');
  const [recibioChip, setRecibioChip] = useState<RecibioChip>('Entregado');
  const [consumo, setConsumo] = useState<Consumo>('Sí');
  const [contactabilidad, setContactabilidad] = useState<Contactabilidad>('Contacto efectivo');
  const [motivo, setMotivo] = useState<MotivoGestion>('Activa y en uso');
  const [tareaRealizada, setTareaRealizada] = useState<TareaRealizada>('Mensaje de bienvenida');
  const [ventaCerrada, setVentaCerrada] = useState<VentaCerrada>('No');
  const [numeroManual, setNumeroManual] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  useEffect(() => {
    dbService.getCatalogos().then((cats) => {
      setCatalogos(cats);
    });

    // Preset values if client already had a previous gestion
    if (cliente?.ultima_gestion) {
      setEstado(cliente.ultima_gestion.estado);
      setEntregaChip(cliente.ultima_gestion.entrega_chip);
      setRecibioChip(cliente.ultima_gestion.recibio_chip);
      setConsumo(cliente.ultima_gestion.consumo);
      setContactabilidad(cliente.ultima_gestion.contactabilidad);
      setMotivo(cliente.ultima_gestion.motivo);
      setTareaRealizada(cliente.ultima_gestion.tarea_realizada);
      setVentaCerrada(cliente.ultima_gestion.venta_cerrada);
      if (cliente.ultima_gestion.numero_manual !== undefined && cliente.ultima_gestion.numero_manual !== null) {
        setNumeroManual(String(cliente.ultima_gestion.numero_manual));
      }
    }
  }, [cliente]);

  if (!cliente) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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

    let numVal: number | null = null;
    if (numeroManual.trim() !== '') {
      numVal = parseInt(numeroManual, 10);
      if (isNaN(numVal) || numVal < 1 || numVal > 30) {
        setErrorMsg('El número manual debe ser un valor entero entre 1 y 30.');
        return;
      }
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
          contactabilidad,
          motivo,
          tarea_realizada: tareaRealizada,
          venta_cerrada: ventaCerrada,
          numero_manual: numVal,
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
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-800 text-rose-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick info banner */}
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Cliente / DN: </span>
              <strong className="text-white">{cliente.dn_venta || cliente.dn_nuevo || cliente.numero_orden}</strong>
            </div>
            <div>
              <span className="text-slate-400">Tipo: </span>
              <span className="text-blue-300 font-medium">{cliente.tipo_venta}</span>
            </div>
            <div>
              <span className="text-slate-400">Enrolamiento: </span>
              <span className={cliente.estatus_enrolamiento === 'Enrolado' ? 'text-emerald-400' : 'text-rose-400'}>
                {cliente.estatus_enrolamiento}
              </span>
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
                value={contactabilidad}
                onChange={(e) => setContactabilidad(e.target.value as Contactabilidad)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
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
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MotivoGestion)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
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
                value={tareaRealizada}
                onChange={(e) => setTareaRealizada(e.target.value as TareaRealizada)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
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
                value={ventaCerrada}
                onChange={(e) => setVentaCerrada(e.target.value as VentaCerrada)}
                className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:outline-none ${
                  ventaCerrada === 'Sí'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600 focus:ring-emerald-500'
                    : 'bg-slate-800 text-amber-300 border-slate-700 focus:ring-blue-500'
                }`}
              >
                {(catalogos?.venta_cerrada || ['Sí', 'No']).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Sí' ? 'Sí (Cierre Definitivo del Caso)' : 'No (Seguimiento Activo)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Número Manual del 1 al 30 */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Número de Seguimiento (1 al 30)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={numeroManual}
                onChange={(e) => setNumeroManual(e.target.value)}
                placeholder="Ingresa un número (1 al 30)"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500 font-mono"
              />
            </div>
          </div>

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
