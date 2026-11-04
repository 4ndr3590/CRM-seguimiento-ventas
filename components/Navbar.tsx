'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase';
import { dbService } from '@/lib/dbService';
import {
  Shield,
  UserCheck,
  Database,
  CheckCircle,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Activity,
  Layers,
  Search,
  UploadCloud,
  FileSpreadsheet,
  Settings,
  History,
} from 'lucide-react';
import { RolUsuario } from '@/types/crm';

interface NavbarProps {
  tabActiva: string;
  setTabActiva: (tab: string) => void;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ tabActiva, setTabActiva, onRefreshData }) => {
  const { user, cambiarRolRapido, permisos, usuariosDisponibles, cambiarUsuarioActivo } = useAuth();
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seederMensaje, setSeederMensaje] = useState<string | null>(null);

  const firebaseConectado = isFirebaseConfigured();

  const handleEjecutarSeeder = async () => {
    setSeeding(true);
    setSeederMensaje(null);
    try {
      const res = await dbService.inicializarCatalogosYDatosPrueba(true);
      setSeederMensaje(res.message);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSeederMensaje(null), 4000);
    } catch (e: any) {
      setSeederMensaje(`Error: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

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
      {/* Top Banner: Status & User Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 font-bold text-white tracking-wide text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            CRM SEGUIMIENTO DE VENTAS
          </div>

          {/* Firebase Connection Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
              firebaseConectado
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800'
            }`}
            title={
              firebaseConectado
                ? 'Conectado a Firebase Cloud Firestore en tiempo real'
                : 'Operando en Modo Reactivo Local / Demo (puedes conectar Firebase vía .env.local)'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>{firebaseConectado ? 'Firebase Conectado' : 'Modo Reactivo Demo'}</span>
          </div>

          {/* Quick Seeder Button */}
          <button
            onClick={handleEjecutarSeeder}
            disabled={seeding}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/60 transition"
            title="Cargar o reestablecer catálogos y casos de prueba para el requerimiento"
          >
            <Sparkles className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Inicializando...' : 'Poblar Datos Demo'}</span>
          </button>

          {seederMensaje && (
            <span className="text-emerald-400 font-medium animate-fade-in">{seederMensaje}</span>
          )}
        </div>

        {/* User Role Switcher */}
        <div className="relative flex items-center gap-2">
          <span className="text-slate-400">Perfil Activo:</span>
          <div className="relative">
            <button
              onClick={() => setDropdownAbierto(!dropdownAbierto)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <Shield
                className={`w-3.5 h-3.5 ${
                  user?.rol === 'Administrador'
                    ? 'text-purple-400'
                    : user?.rol === 'Analista'
                    ? 'text-blue-400'
                    : 'text-amber-400'
                }`}
              />
              <span>{user?.rol || 'Administrador'}</span>
              <span className="text-slate-400 font-normal">({user?.nombre || 'Usuario'})</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {dropdownAbierto && (
              <div
                className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-slate-200"
                onMouseLeave={() => setDropdownAbierto(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-700 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Cambiar Rol de Prueba:
                </div>
                {(['Administrador', 'Analista', 'Consulta'] as RolUsuario[]).map((rol) => (
                  <button
                    key={rol}
                    onClick={() => {
                      cambiarRolRapido(rol);
                      setDropdownAbierto(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/70 transition ${
                      user?.rol === rol ? 'bg-slate-700 text-emerald-400 font-medium' : ''
                    }`}
                  >
                    <span>{rol}</span>
                    <span className="text-[10px] text-slate-400">
                      {rol === 'Administrador'
                        ? 'Carga, Gestiones, Export, Catálogos'
                        : rol === 'Analista'
                        ? 'Gestión de Barridos y Consultas'
                        : 'Solo Lectura'}
                    </span>
                  </button>
                ))}

                {usuariosDisponibles.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 mt-2 border-t border-slate-700 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                      Usuarios Registrados:
                    </div>
                    {usuariosDisponibles.map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => {
                          cambiarUsuarioActivo(u);
                          setDropdownAbierto(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 transition flex items-center justify-between ${
                          user?.uid === u.uid ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate">{u.nombre}</span>
                        <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                          {u.rol}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const activo = tabActiva === item.id;
            const habilitado = item.permiso;

            return (
              <button
                key={item.id}
                onClick={() => habilitado && setTabActiva(item.id)}
                disabled={!habilitado}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  activo
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : habilitado
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                }`}
                title={
                  !habilitado
                    ? `No disponible para perfil ${user?.rol || 'Consulta'}`
                    : item.label
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {!habilitado && (
                  <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded">
                    Bloqueado
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
