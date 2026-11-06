'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase';
import {
  Shield,
  Database,
  Activity,
  Layers,
  Search,
  UploadCloud,
  FileSpreadsheet,
  Settings,
  History,
  LogOut,
  User,
} from 'lucide-react';

interface NavbarProps {
  tabActiva: string;
  setTabActiva: (tab: string) => void;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ tabActiva, setTabActiva }) => {
  const { user, logout, permisos } = useAuth();
  const firebaseConectado = isFirebaseConfigured();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: Activity, permiso: true },
    { id: 'barridos', label: 'Gestión de Barridos', icon: Layers, permiso: permisos.canGestionarBarridos },
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

          {/* Database Connection Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
              firebaseConectado
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800'
            }`}
            title={
              firebaseConectado
                ? 'Sincronizado en tiempo real con Firebase Cloud Firestore'
                : 'Modo Local Reactivo'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>{firebaseConectado ? 'Firestore en Tiempo Real' : 'Base Local'}</span>
          </div>
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
