'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Database,
  Activity,
  Search,
  UploadCloud,
  FileSpreadsheet,
  Settings,
  History,
  LogOut,
  User,
  AlertTriangle,
  X,
} from 'lucide-react';

interface NavbarProps {
  tabActiva: string;
  setTabActiva: (tab: string) => void;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ tabActiva, setTabActiva }) => {
  const { user, logout, permisos, conexionFirestore, errorConexion } = useAuth();
  const [mostrarAlertaError, setMostrarAlertaError] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: Activity, permiso: true },
    { id: 'consultas', label: 'Consultas y Filtros', icon: Search, permiso: true },
    { id: 'carga', label: 'Carga de Bases', icon: UploadCloud, permiso: permisos.canCargarBases },
    { id: 'exportacion', label: 'Exportación', icon: FileSpreadsheet, permiso: permisos.canExportar },
    { id: 'administracion', label: 'Catálogos y Usuarios', icon: Settings, permiso: permisos.canAdministrarCatalogos },
    { id: 'auditoria', label: 'Bitácora Auditoría', icon: History, permiso: permisos.canAdministrarUsuarios },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      {/* Top Banner: Status & Active Authenticated User */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 font-black text-white tracking-wide text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            CRM SEGUIMIENTO DE VENTAS
          </div>

          {/* Database Connection Status - Requisito 5 */}
          <button
            onClick={() => {
              if (conexionFirestore === 'error') {
                setMostrarAlertaError(!mostrarAlertaError);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
              conexionFirestore === 'conectado'
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                : conexionFirestore === 'error'
                ? 'bg-rose-950/90 text-rose-300 border border-rose-800 animate-pulse hover:bg-rose-900 cursor-pointer'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800'
            }`}
            title={
              conexionFirestore === 'conectado'
                ? 'Sincronizado en tiempo real con Firebase Cloud Firestore'
                : 'Clic para ver detalles de diagnóstico de conexión'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              {conexionFirestore === 'conectado'
                ? '🟢 Conectado a Firebase Cloud'
                : conexionFirestore === 'error'
                ? '🔴 Error de Conexión o Permisos de Firestore'
                : '🟡 Conectando a Firebase...'}
            </span>
          </button>
        </div>

        {/* User Profile & Logout Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/90 text-white px-3 py-1.5 rounded-xl border border-slate-700">
            <Shield
              className={`w-3.5 h-3.5 ${
                user?.rol === 'Administrador'
                  ? 'text-purple-400'
                  : user?.rol === 'Analista'
                  ? 'text-blue-400'
                  : 'text-amber-400'
              }`}
            />
            <div className="text-left">
              <span className="font-bold text-white block text-xs leading-tight">
                {user?.nombre || 'Usuario'}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {user?.email} &bull;{' '}
                <strong
                  className={
                    user?.rol === 'Administrador'
                      ? 'text-purple-300'
                      : user?.rol === 'Analista'
                      ? 'text-blue-300'
                      : 'text-amber-300'
                  }
                >
                  {user?.rol}
                </strong>
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/70 transition text-xs font-semibold"
            title="Cerrar sesión actual"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Connection / Permission Error Diagnostic Banner (Requisito 5) */}
      {(conexionFirestore === 'error' || mostrarAlertaError) && (
        <div className="bg-rose-950/95 border-y border-rose-800 px-4 py-3 text-xs text-rose-200 animate-fade-in shadow-xl">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white text-sm">
                  Alerta de Conexión o Permisos en Cloud Firestore
                </p>
                <p className="text-rose-300">
                  {errorConexion ||
                    'Las reglas de seguridad de Firestore están rechazando la solicitud o no hay conectividad con Firebase.'}
                </p>
                <p className="text-[11px] text-rose-300/80">
                  Asegúrate de haber copiado las reglas de <strong>firestore.rules</strong> en la pestaña <em>Reglas</em> de la consola de Firebase y de tener configuradas las variables <code className="bg-rose-900/60 px-1 py-0.5 rounded text-white font-mono">NEXT_PUBLIC_FIREBASE_*</code>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setMostrarAlertaError(false)}
              className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-900/60 transition"
              title="Cerrar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const activo = tabActiva === item.id;
            const habilitado = item.permiso;

            // Only show navigation items that user has permission to access
            if (!habilitado) return null;

            return (
              <button
                key={item.id}
                onClick={() => setTabActiva(item.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  activo
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={item.label}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
