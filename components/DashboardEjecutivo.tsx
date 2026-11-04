'use client';

import React, { useMemo, useState } from 'react';
import { Cliente, Gestion } from '@/types/crm';
import { exportarDashboardAPDF } from '@/lib/exportUtils';
import {
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Smartphone,
  PhoneCall,
  Calendar,
  AlertTriangle,
  Award,
  Layers,
  Download,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface DashboardEjecutivoProps {
  clientes: Cliente[];
  todasGestiones: Gestion[];
  onVerClientesSinGestion?: () => void;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // rose
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#64748b', // slate
];

const renderCompactPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentStr = `${(percent * 100).toFixed(0)}%`;

  return (
    <text
      x={x}
      y={y}
      fill="#e2e8f0"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: '10px', fontWeight: 600 }}
    >
      {`${name} ${percentStr}`}
    </text>
  );
};

export const DashboardEjecutivo: React.FC<DashboardEjecutivoProps> = ({
  clientes,
  todasGestiones,
  onVerClientesSinGestion,
}) => {
  const [periodoProductividad, setPeriodoProductividad] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [exportandoPDF, setExportandoPDF] = useState(false);

  // ========================================================
  // RN04: Construir indicadores EXCLUSIVAMENTE con la última gestión
  // RN05, RN13: Clientes sin gestión se clasifican como "Sin Gestión"
  // ========================================================
  const stats = useMemo(() => {
    const totalClientes = clientes.length;

    let sinGestionCount = 0;
    let conGestionCount = 0;

    // 1. Entrega SIM
    let chipEntregado = 0;
    let chipSinEntrega = 0;

    // 2. Enrolamiento
    let enrolados = 0;
    let noEnrolados = 0;

    // 3. Tipología de Venta
    const tipologiaMap: Record<string, number> = {
      Portabilidad: 0,
      Adición: 0,
      Migración: 0,
    };

    // 4. Estado de la Línea
    const estadoMap: Record<string, number> = {
      Activo: 0,
      Inactivo: 0,
      Predesactivado: 0,
      'Sin Gestión': 0,
    };

    // 5. Consumo
    const consumoMap: Record<string, number> = {
      Sí: 0,
      No: 0,
      NA: 0,
      'Sin Gestión': 0,
    };

    // 6. Motivo
    const motivoMap: Record<string, number> = {
      'No contactado': 0,
      'No reconoce la venta': 0,
      'Pendiente de reclamar SIM': 0,
      'Problema en entrega de SIM': 0,
      'Desiste / Solicita cancelación': 0,
      'Activa y en uso': 0,
      'Sin Gestión': 0,
    };

    // 8. Ventas Cerradas (RN07)
    let ventasCerradas = 0;
    let ventasActivas = 0;

    clientes.forEach((c) => {
      // Tipología y Enrolamiento provienen de la ficha base del cliente
      if (tipologiaMap[c.tipo_venta] !== undefined) {
        tipologiaMap[c.tipo_venta]++;
      }
      if (c.estatus_enrolamiento === 'Enrolado') {
        enrolados++;
      } else {
        noEnrolados++;
      }

      // Última gestión únicamente (RN04)
      const u = c.ultima_gestion;
      if (!u) {
        sinGestionCount++;
        estadoMap['Sin Gestión']++;
        consumoMap['Sin Gestión']++;
        motivoMap['Sin Gestión']++;
        ventasActivas++; // Sigue abierta / pendiente
      } else {
        conGestionCount++;

        // Entrega Chip
        if (u.recibio_chip === 'Entregado') {
          chipEntregado++;
        } else {
          chipSinEntrega++;
        }

        // Estado
        if (estadoMap[u.estado] !== undefined) {
          estadoMap[u.estado]++;
        }

        // Consumo
        if (consumoMap[u.consumo] !== undefined) {
          consumoMap[u.consumo]++;
        }

        // Motivo
        if (motivoMap[u.motivo] !== undefined) {
          motivoMap[u.motivo]++;
        }

        // Ventas Cerradas
        if (u.venta_cerrada === 'Sí') {
          ventasCerradas++;
        } else {
          ventasActivas++;
        }
      }
    });

    return {
      totalClientes,
      sinGestionCount,
      conGestionCount,
      porcentajeSinGestion: totalClientes > 0 ? Math.round((sinGestionCount / totalClientes) * 100) : 0,
      porcentajeConGestion: totalClientes > 0 ? Math.round((conGestionCount / totalClientes) * 100) : 0,

      // 1. SIM
      chipEntregado,
      chipSinEntrega,
      dataChip: [
        { name: 'Entregado', value: chipEntregado },
        { name: 'Sin Entrega / NA', value: chipSinEntrega },
      ],

      // 2. Enrolamiento
      enrolados,
      noEnrolados,
      dataEnrolamiento: [
        { name: 'Enrolado', value: enrolados },
        { name: 'No Enrolado', value: noEnrolados },
      ],

      // 3. Tipología
      dataTipologia: Object.keys(tipologiaMap).map((k) => ({ name: k, value: tipologiaMap[k] })),

      // 4. Estado Línea
      dataEstado: Object.keys(estadoMap)
        .filter((k) => estadoMap[k] > 0)
        .map((k) => ({ name: k, value: estadoMap[k] })),

      // 5. Consumo
      dataConsumo: Object.keys(consumoMap)
        .filter((k) => consumoMap[k] > 0)
        .map((k) => ({ name: k, value: consumoMap[k] })),

      // 6. Motivo
      dataMotivo: Object.keys(motivoMap)
        .filter((k) => motivoMap[k] > 0)
        .map((k) => ({ name: k, value: motivoMap[k] })),

      // 8. Ventas Cerradas
      ventasCerradas,
      ventasActivas,
      dataVentasCerradas: [
        { name: 'Ventas Cerradas', value: ventasCerradas },
        { name: 'Ventas Activas', value: ventasActivas },
      ],
    };
  }, [clientes]);

  // ========================================================
  // 9. Productividad: Gestiones por Día, Semana, Mes segmentadas por usuario
  // ========================================================
  const productividad = useMemo(() => {
    const now = new Date();
    const mapUsuarios: Record<string, number> = {};

    todasGestiones.forEach((g) => {
      const gDate = new Date(g.fecha_hora_gestion);
      const diffMs = now.getTime() - gDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let include = false;
      if (periodoProductividad === 'dia' && diffDays <= 1) include = true;
      else if (periodoProductividad === 'semana' && diffDays <= 7) include = true;
      else if (periodoProductividad === 'mes' && diffDays <= 30) include = true;

      if (include) {
        const u = g.usuario_responsable || 'Sin Asignar';
        mapUsuarios[u] = (mapUsuarios[u] || 0) + 1;
      }
    });

    const data = Object.keys(mapUsuarios).map((usuario) => ({
      usuario: usuario.replace(/\(.*\)/, '').trim(),
      gestiones: mapUsuarios[usuario],
      usuarioCompleto: usuario,
    }));

    return data.sort((a, b) => b.gestiones - a.gestiones);
  }, [todasGestiones, periodoProductividad]);

  const handleDescargarPDF = async () => {
    setExportandoPDF(true);
    try {
      await exportarDashboardAPDF('dashboard-completo-ejecutivo');
    } catch (err: any) {
      alert(`Error al generar PDF: ${err.message}`);
    } finally {
      setExportandoPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar: Title & Export Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-500 rounded-full inline-block"></span>
            Dashboard Ejecutivo en Tiempo Real (RN04, RN12)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas calculadas exclusivamente con la última gestión por cliente. Actualización automática continua.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDescargarPDF}
            disabled={exportandoPDF}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30 transition disabled:opacity-50"
            title="Exportar imagen del Dashboard completo a documento PDF"
          >
            <Download className="w-4 h-4" />
            <span>{exportandoPDF ? 'Generando PDF...' : 'Descargar Dashboard (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Main printable dashboard container */}
      <div id="dashboard-completo-ejecutivo" className="space-y-6 bg-slate-950 p-4 rounded-2xl">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Clientes */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Cartera</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{stats.totalClientes}</div>
            <div className="text-[11px] text-slate-400 mt-1">Clientes cargados en el sistema</div>
          </div>

          {/* 7. Gestión Pendiente ("Sin Gestión" - RN05, RN13) */}
          <div
            onClick={onVerClientesSinGestion}
            className="bg-amber-950/30 border border-amber-800/60 p-4 rounded-2xl shadow-lg relative overflow-hidden cursor-pointer hover:border-amber-500 transition group"
            title="Ver clientes sin gestión en el módulo de consultas"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase">Sin Gestión (RN05)</span>
              <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-300">
              {stats.sinGestionCount}{' '}
              <span className="text-xs font-normal text-amber-400/80">({stats.porcentajeSinGestion}%)</span>
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">
              Pendientes de primer barrido &rarr;
            </div>
          </div>

          {/* 8. Ventas Cerradas */}
          <div className="bg-emerald-950/30 border border-emerald-800/60 p-4 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase">Ventas Cerradas (RN07)</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-300">
              {stats.ventasCerradas}{' '}
              <span className="text-xs font-normal text-emerald-400/80">
                ({stats.totalClientes > 0 ? Math.round((stats.ventasCerradas / stats.totalClientes) * 100) : 0}%)
              </span>
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">Casos finalizados exitosamente</div>
          </div>

          {/* Total Gestiones Históricas */}
          <div className="bg-purple-950/30 border border-purple-800/60 p-4 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-400 uppercase">Histórico Gestiones</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-purple-300">{todasGestiones.length}</div>
            <div className="text-[11px] text-purple-400/80 mt-1">Barridos inmutables (RN02, RN03)</div>
          </div>
        </div>

        {/* Charts Grid: First Row (4 Pie charts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Entrega de SIM */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                1. Entrega de SIM (Chip)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Última gestión</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                  <Pie
                    data={stats.dataChip}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={4}
                    dataKey="value"
                    label={renderCompactPieLabel}
                    labelLine={false}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-around text-xs text-slate-300 border-t border-slate-800 pt-2">
              <span>Entregado: <strong>{stats.chipEntregado}</strong></span>
              <span>Sin Entrega: <strong>{stats.chipSinEntrega}</strong></span>
            </div>
          </div>

          {/* 2. Enrolamiento */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                2. Enrolamiento
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Base Clientes</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                  <Pie
                    data={stats.dataEnrolamiento}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={4}
                    dataKey="value"
                    label={renderCompactPieLabel}
                    labelLine={false}
                  >
                    <Cell fill="#059669" />
                    <Cell fill="#e11d48" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-around text-xs text-slate-300 border-t border-slate-800 pt-2">
              <span>Enrolado: <strong>{stats.enrolados}</strong></span>
              <span>No Enrolado: <strong>{stats.noEnrolados}</strong></span>
            </div>
          </div>

          {/* 3. Tipología de Venta */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                3. Tipología de Venta
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Port/Adic/Migr</span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dataTipologia}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-around text-xs text-slate-300 border-t border-slate-800 pt-2">
              {stats.dataTipologia.map((d) => (
                <span key={d.name}>
                  {d.name}: <strong>{d.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Grid: Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 4. Estado de la Línea */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                4. Estado de la Línea
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Activo/Inac/Predes</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                  <Pie
                    data={stats.dataEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderCompactPieLabel}
                    labelLine={false}
                  >
                    {stats.dataEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-around text-xs text-slate-300 border-t border-slate-800 pt-2 gap-2">
              {stats.dataEstado.map((d) => (
                <span key={d.name}>
                  {d.name}: <strong>{d.value}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* 5. Consumo */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-cyan-400" />
                5. Consumo de Tráfico
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Sí / No / NA</span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dataConsumo}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-around text-xs text-slate-300 border-t border-slate-800 pt-2">
              {stats.dataConsumo.map((d) => (
                <span key={d.name}>
                  {d.name}: <strong>{d.value}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* 8. Ventas Cerradas vs Activas */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                8. Ventas Cerradas (RN07)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Cerradas vs Activas</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                  <Pie
                    data={stats.dataVentasCerradas}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={4}
                    dataKey="value"
                    label={renderCompactPieLabel}
                    labelLine={false}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-around text-xs text-slate-300 border-t border-slate-800 pt-2">
              <span>Cerradas: <strong>{stats.ventasCerradas}</strong></span>
              <span>Activas: <strong>{stats.ventasActivas}</strong></span>
            </div>
          </div>
        </div>

        {/* Charts Grid: Third Row (Motivo + Productividad) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 6. Motivo de la Gestión */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                6. Motivo de la Gestión (Distribución de Cartera - RN04)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">6 Categorías oficiales</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.dataMotivo}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={130} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 9. Productividad Segmentada por Usuario */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  9. Productividad Operativa
                </h3>
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    onClick={() => setPeriodoProductividad('dia')}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      periodoProductividad === 'dia' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setPeriodoProductividad('semana')}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      periodoProductividad === 'semana' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setPeriodoProductividad('mes')}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      periodoProductividad === 'mes' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Mes
                  </button>
                </div>
              </div>

              <div className="h-56">
                {productividad.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productividad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="usuario" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                      />
                      <Bar dataKey="gestiones" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    No hay gestiones registradas en este período.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-2 text-xs text-slate-400 flex items-center justify-between">
              <span>Total en período: <strong>{productividad.reduce((acc, p) => acc + p.gestiones, 0)}</strong> gestiones</span>
              <span className="text-[11px] text-slate-500">Segmentadas por usuario responsable (RN10)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
