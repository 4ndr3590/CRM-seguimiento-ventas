'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
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
  FileSpreadsheet,
} from 'lucide-react';

interface CargaBasesProps {
  onCargaCompleta: () => void;
}

const PLANTILLA_TXT = `Fecha Venta | DN de la Venta | DN Nuevo | Número de Orden | Tipo de Venta | Estatus | Ciclo | Consumo | Entrega de Chip | Entregado
2026-11-04 | 3005550101 | 3009990101 | ORD-2001 | Portabilidad | Enrolado | Ciclo 1 | Sí | CAC | Sí
2026-11-04 | 3005550102 | 3009990102 | ORD-2002 | Adición | No Enrolado | Ciclo 5 | No | Domicilio | No
2026-11-04 | 3005550103 | 3009990103 | ORD-2003 | Migración | Enrolado | Ciclo 15 | Sí | CAC | Sí
2026-10-25 | 3001234501 | 3009876501 | ORD-1001 | Portabilidad | No Enrolado | Ciclo 20 | No | Domicilio | Caída`;

export const CargaBases: React.FC<CargaBasesProps> = ({ onCargaCompleta }) => {
  const { user, permisos } = useAuth();
  const [contenidoTexto, setContenidoTexto] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState<number>(0);
  const [detalleProgreso, setDetalleProgreso] = useState<string>('');
  const [resumen, setResumen] = useState<CargaResumen | null>(null);
  const [modoEntrada, setModoEntrada] = useState<'archivo' | 'pegar'>('archivo');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // Convert Excel rows to pipe-delimited text layout
        const lineas = rawRows
          .map((row) =>
            row
              .map((cell: any) => String(cell !== undefined && cell !== null ? cell : '').trim())
              .join(' | ')
          )
          .filter((line) => line.replace(/\|/g, '').trim().length > 0);

        setContenidoTexto(lineas.join('\n'));
      } catch (err: any) {
        alert('Error al leer el archivo Excel: ' + err.message);
      }
    } else {
      // Plain text or CSV
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContenidoTexto(text || '');
      };
      reader.readAsText(file);
    }
  };

  const handleDescargarPlantillaTxt = () => {
    const blob = new Blob([PLANTILLA_TXT], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Carga_Ventas.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDescargarPlantillaExcel = () => {
    const datos = [
      {
        'Fecha Venta': '2026-11-04',
        'DN de la Venta': '3005550101',
        'DN Nuevo': '3009990101',
        'Número de Orden': 'ORD-2001',
        'Tipo de Venta': 'Portabilidad',
        'Estatus': 'Enrolado',
        'Ciclo': 'Ciclo 1',
        'Consumo': 'Sí',
        'Entrega de Chip': 'CAC',
        'Entregado': 'Sí',
      },
      {
        'Fecha Venta': '2026-11-04',
        'DN de la Venta': '3005550102',
        'DN Nuevo': '3009990102',
        'Número de Orden': 'ORD-2002',
        'Tipo de Venta': 'Adición',
        'Estatus': 'No Enrolado',
        'Ciclo': 'Ciclo 5',
        'Consumo': 'No',
        'Entrega de Chip': 'Domicilio',
        'Entregado': 'No',
      },
      {
        'Fecha Venta': '2026-11-04',
        'DN de la Venta': '3005550103',
        'DN Nuevo': '3009990103',
        'Número de Orden': 'ORD-2003',
        'Tipo de Venta': 'Migración',
        'Estatus': 'Enrolado',
        'Ciclo': 'Ciclo 15',
        'Consumo': 'Sí',
        'Entrega de Chip': 'CAC',
        'Entregado': 'Sí',
      },
      {
        'Fecha Venta': '2026-10-25',
        'DN de la Venta': '3001234501',
        'DN Nuevo': '3009876501',
        'Número de Orden': 'ORD-1001',
        'Tipo de Venta': 'Portabilidad',
        'Estatus': 'No Enrolado',
        'Ciclo': 'Ciclo 20',
        'Consumo': 'No',
        'Entrega de Chip': 'Domicilio',
        'Entregado': 'Caída',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    ws['!cols'] = [
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
    ];
    XLSX.writeFile(wb, 'Plantilla_Carga_Ventas.xlsx');
  };

  const handleProcesar = async () => {
    if (!contenidoTexto.trim()) {
      alert('Por favor selecciona un archivo (.txt o .xlsx) o pega el contenido en el área de texto.');
      return;
    }

    setProcesando(true);
    setResumen(null);
    setProgreso(0);
    setDetalleProgreso('Iniciando procesamiento y consulta en Cloud Firestore...');
    try {
      const lineas = contenidoTexto.split(/\r?\n/);
      const resp = await dbService.procesarCargaBase(
        lineas,
        user?.nombre || user?.email || 'Administrador',
        (pct, detalle) => {
          setProgreso(pct);
          setDetalleProgreso(detalle);
        }
      );
      setResumen(resp);
      onCargaCompleta();
    } catch (err: any) {
      alert(`Error al procesar la carga en Cloud Firestore: ${err.message}`);
    } finally {
      setProcesando(false);
    }
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
            Módulo 1: Carga y Actualización de Bases (.txt y Excel .xlsx)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Carga de archivos planos o libros de Excel con validación de existencia por Número de Orden (RN01, RN08, RN09).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDescargarPlantillaExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-700 transition"
            title="Descargar plantilla oficial en formato Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Plantilla Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleDescargarPlantillaTxt}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            title="Descargar archivo .txt de ejemplo con el layout requerido"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Plantilla Texto (.txt)</span>
          </button>
        </div>
      </div>

      {/* Rules Explanatory Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg text-xs space-y-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Layout Oficial Requerido (.txt o .xlsx)
          </h3>
          <p className="text-slate-400">
            Cada fila debe contener 10 columnas (en texto delimitadas por <code>|</code> o como columnas de Excel):
          </p>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-blue-300 break-all">
            Fecha Venta | DN de la Venta | DN Nuevo | Número de Orden | Tipo de Venta | Estatus | Ciclo | Consumo | Entrega de Chip | Entregado
          </div>
          <p className="text-[11px] text-slate-500">
            Valores válidos: Tipo de Venta: <em>Portabilidad, Adición, Migración</em>. Estatus: <em>Enrolado, No Enrolado</em>. Consumo: <em>Sí, No, NA</em>. Entrega de Chip: <em>CAC, Domicilio</em>. Entregado: <em>Sí, No, Caída</em>.
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
                Si la orden ya existe, actualiza <strong>únicamente</strong> los campos{' '}
                <code>Estatus</code>, <code>Ciclo</code>, <code>Entrega de Chip</code> y{' '}
                <code>Entregado</code>, manteniendo intacto el histórico de gestiones y barridos previos (RN08, RN09).
                Si ya registró <code>Entregado = Sí</code>, <code>Enrolamiento = Enrolado</code> o gestión con{' '}
                <code>Consumo = Sí</code>, dichos estados se conservan sin revertirse.
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
            Subir Archivo (.txt o Excel .xlsx)
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
                {nombreArchivo ? nombreArchivo : 'Haz clic para seleccionar o arrastra un archivo .txt o .xlsx / .xls'}
              </span>
              <span className="text-xs text-slate-400">
                Formatos compatibles: Texto delimitado (.txt, .csv) o Libro de Microsoft Excel (.xlsx, .xls)
              </span>
              <input
                type="file"
                accept=".txt,.xlsx,.xls,.csv"
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
            {contenidoTexto ? `${contenidoTexto.split(/\r?\n/).filter((l) => l.trim()).length} registros preparados para procesar` : 'Sin contenido aún'}
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

      {/* Live Firestore Batch Progress Bar */}
      {procesando && (
        <div className="bg-slate-900 border border-blue-800/80 p-5 rounded-2xl shadow-2xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              <span>Sincronizando con Cloud Firestore en lotes de 450 registros...</span>
            </span>
            <span className="font-mono font-bold text-blue-400 text-sm">{progreso}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300 shadow-lg shadow-blue-500/50"
              style={{ width: `${Math.max(5, progreso)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-300 font-medium">{detalleProgreso}</p>
        </div>
      )}

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
              <span className="text-[10px] text-blue-400 block mt-0.5">
                RN08/09: Estatus, Ciclo, Entrega Chip y Entregado
              </span>
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
