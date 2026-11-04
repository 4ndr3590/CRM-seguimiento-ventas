'use client';

import React, { useState } from 'react';
import { dbService } from '@/lib/dbService';
import { useAuth } from '@/context/AuthContext';
import { CargaResumen } from '@/types/crm';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Clipboard,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface CargaBasesProps {
  onCargaCompleta: () => void;
}

const PLANTILLA_TXT = `Fecha Venta | DN de la Venta | DN Nuevo | Número de Orden | Tipo de Venta | Estatus
2026-11-04 | 3005550101 | 3009990101 | ORD-2001 | Portabilidad | Enrolado
2026-11-04 | 3005550102 | 3009990102 | ORD-2002 | Adición | No Enrolado
2026-11-04 | 3005550103 | 3009990103 | ORD-2003 | Migración | Enrolado
2026-10-25 | 3001234501 | 3009876501 | ORD-1001 | Portabilidad | No Enrolado`;

export const CargaBases: React.FC<CargaBasesProps> = ({ onCargaCompleta }) => {
  const { user, permisos } = useAuth();
  const [contenidoTexto, setContenidoTexto] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resumen, setResumen] = useState<CargaResumen | null>(null);
  const [modoEntrada, setModoEntrada] = useState<'archivo' | 'pegar'>('archivo');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContenidoTexto(text || '');
    };
    reader.readAsText(file);
  };

  const handleDescargarPlantilla = () => {
    const blob = new Blob([PLANTILLA_TXT], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Carga_Ventas.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcesar = async () => {
    if (!contenidoTexto.trim()) {
      alert('Por favor selecciona un archivo .txt o pega el contenido en el área de texto.');
      return;
    }

    setProcesando(true);
    setResumen(null);
    try {
      const lineas = contenidoTexto.split(/\r?\n/);
      const resp = await dbService.procesarCargaBase(
        lineas,
        user?.nombre || user?.email || 'Administrador'
      );
      setResumen(resp);
      onCargaCompleta();
    } catch (err: any) {
      alert(`Error al procesar la carga: ${err.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const handleCargarEjemplo = () => {
    setContenidoTexto(PLANTILLA_TXT);
    setNombreArchivo('Plantilla_Ejemplo.txt');
    setModoEntrada('pegar');
  };

  if (!permisos.canCargarBases) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Acceso Restringido</h2>
        <p className="text-xs">
          El Módulo de Carga de Bases está reservado exclusivamente para el perfil <strong>Administrador</strong>.
          Cambia tu rol en el selector superior para acceder a esta funcionalidad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            Módulo 1: Carga y Actualización de Bases (.txt)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Carga de archivos planos con validación de existencia por Número de Orden (RN01, RN08, RN09).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDescargarPlantilla}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            title="Descargar archivo .txt de ejemplo con el layout requerido"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Descargar Plantilla .txt</span>
          </button>

          <button
            onClick={handleCargarEjemplo}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-700 transition"
          >
            <Clipboard className="w-4 h-4" />
            <span>Cargar Texto Demo</span>
          </button>
        </div>
      </div>

      {/* Rules Explanatory Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg text-xs space-y-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Layout Oficial Requerido (.txt)
          </h3>
          <p className="text-slate-400">
            Cada línea debe contener 6 campos separados por barra vertical <code>|</code>:
          </p>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-blue-300 break-all">
            Fecha Venta | DN Venta | DN Nuevo | Número de Orden | Tipo de Venta | Estatus
          </div>
          <p className="text-[11px] text-slate-500">
            Valores válidos: Tipo de Venta: <em>Portabilidad, Adición, Migración</em>. Estatus: <em>Enrolado, No Enrolado</em>.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg text-xs space-y-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Reglas de Validación (RN01, RN08, RN09)
          </h3>
          <ul className="space-y-1.5 text-slate-300">
            <li className="flex items-start gap-1.5">
              <strong className="text-emerald-400 font-mono">Registro Nuevo:</strong>
              <span>Si la orden no existe, crea el cliente nuevo con registro base y sin gestiones.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <strong className="text-blue-400 font-mono">Registro Existente:</strong>
              <span>
                Si la orden ya existe, actualiza <strong>únicamente</strong> el campo <code>Estatus</code>, manteniendo
                intacto el histórico de gestiones, observaciones y barridos (RN08, RN09).
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Upload & Input Section */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 text-xs">
          <button
            onClick={() => setModoEntrada('archivo')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              modoEntrada === 'archivo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Subir Archivo .txt
          </button>
          <button
            onClick={() => setModoEntrada('pegar')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              modoEntrada === 'pegar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pegar Texto Directamente
          </button>
        </div>

        {modoEntrada === 'archivo' ? (
          <div>
            <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition group">
              <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-blue-400 mb-2 transition" />
              <span className="text-sm font-bold text-white mb-1">
                {nombreArchivo ? nombreArchivo : 'Haz clic para seleccionar o arrastra un archivo .txt'}
              </span>
              <span className="text-xs text-slate-400">
                Archivo plano delimitado por tubería (|) o tabuladores
              </span>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pega las líneas del archivo aquí:
            </label>
            <textarea
              rows={8}
              value={contenidoTexto}
              onChange={(e) => setContenidoTexto(e.target.value)}
              placeholder="Fecha Venta | DN Venta | DN Nuevo | Número de Orden | Tipo Venta | Estatus..."
              className="w-full bg-slate-800 border border-slate-700 text-white font-mono rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            />
          </div>
        )}

        {/* Process button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            {contenidoTexto ? `${contenidoTexto.split(/\r?\n/).filter((l) => l.trim()).length} líneas cargadas` : 'Sin contenido aún'}
          </span>

          <button
            onClick={handleProcesar}
            disabled={procesando || !contenidoTexto.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/40 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${procesando ? 'animate-spin' : ''}`} />
            <span>{procesando ? 'Procesando en Firestore...' : 'Validar y Procesar Carga'}</span>
          </button>
        </div>
      </div>

      {/* Summary Report Card */}
      {resumen && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 animate-fade-in">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Resultado del Procesamiento (writeBatch)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-slate-400 block mb-1 font-semibold">Total Registros Leídos</span>
              <span className="text-xl font-bold text-white">{resumen.totalLeidos}</span>
            </div>

            <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800">
              <span className="text-emerald-400 block mb-1 font-semibold">Clientes Nuevos Creados</span>
              <span className="text-xl font-bold text-emerald-300">{resumen.creados}</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">RN01: Nueva orden creada</span>
            </div>

            <div className="bg-blue-950/40 p-3 rounded-xl border border-blue-800">
              <span className="text-blue-400 block mb-1 font-semibold">Órdenes Actualizadas</span>
              <span className="text-xl font-bold text-blue-300">{resumen.actualizados}</span>
              <span className="text-[10px] text-blue-400 block mt-0.5">RN08/09: Solo Estatus enrolamiento</span>
            </div>

            <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-800">
              <span className="text-rose-400 block mb-1 font-semibold">Errores Encontrados</span>
              <span className="text-xl font-bold text-rose-300">{resumen.errores.length}</span>
              <span className="text-[10px] text-rose-400 block mt-0.5">Líneas rechazadas</span>
            </div>
          </div>

          {/* Error detail list */}
          {resumen.errores.length > 0 && (
            <div className="mt-4 bg-rose-950/20 border border-rose-900/60 rounded-xl p-4">
              <h4 className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Detalle de Errores ({resumen.errores.length}):
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                {resumen.errores.map((err, i) => (
                  <div key={i} className="bg-slate-900/80 p-2 rounded border border-rose-900/40">
                    <span className="text-rose-400 font-bold">Línea {err.linea}: </span>
                    <span className="text-slate-300">{err.razon}</span>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                      "{err.contenido}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
