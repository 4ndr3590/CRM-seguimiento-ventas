'use client';

import React, { useState, useEffect } from 'react';
import { Cliente, Gestion } from '@/types/crm';
import { dbService } from '@/lib/dbService';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { LoginScreen } from '@/components/LoginScreen';
import { DashboardEjecutivo } from '@/components/DashboardEjecutivo';
import { GestionBarridos } from '@/components/GestionBarridos';
import { ConsultasFiltros } from '@/components/ConsultasFiltros';
import { CargaBases } from '@/components/CargaBases';
import { ExportacionDatos } from '@/components/ExportacionDatos';
import { AdministracionCatalogos } from '@/components/AdministracionCatalogos';
import { BitacoraAuditoria } from '@/components/BitacoraAuditoria';
import { HistorialClienteModal } from '@/components/HistorialClienteModal';
import { ModalNuevaGestion } from '@/components/ModalNuevaGestion';

export default function HomePage() {
  const { user, loading: authLoading, permisos } = useAuth();
  const [tabActiva, setTabActiva] = useState<string>('dashboard');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [todasGestiones, setTodasGestiones] = useState<Gestion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  // Modals state
  const [clienteHistorial, setClienteHistorial] = useState<Cliente | null>(null);
  const [clienteGestion, setClienteGestion] = useState<Cliente | null>(null);

  // Filter state passed from Dashboard click
  const [filtroSinGestionActivo, setFiltroSinGestionActivo] = useState(false);

  // Real-time listeners for Clientes & Gestiones (RN12) when authenticated
  useEffect(() => {
    if (!user) return;

    setCargando(true);

    const unsubClientes = dbService.subscribeClientes((listaClientes) => {
      setClientes(listaClientes);
      setCargando(false);
    });

    const unsubGestiones = dbService.subscribeGestiones((listaGestiones) => {
      setTodasGestiones(listaGestiones);
    });

    return () => {
      unsubClientes();
      unsubGestiones();
    };
  }, [user]);

  // Role-based protection: redirect if user role does not allow active tab
  useEffect(() => {
    if (!user) return;

    if (tabActiva === 'carga' && !permisos.canCargarBases) {
      setTabActiva('dashboard');
    } else if (tabActiva === 'administracion' && !permisos.canAdministrarCatalogos) {
      setTabActiva('dashboard');
    } else if (tabActiva === 'auditoria' && !permisos.canAdministrarUsuarios) {
      setTabActiva('dashboard');
    } else if (tabActiva === 'barridos' && !permisos.canGestionarBarridos) {
      setTabActiva('dashboard');
    } else if (tabActiva === 'exportacion' && !permisos.canExportar) {
      setTabActiva('dashboard');
    }
  }, [user, tabActiva, permisos]);

  const handleRefrescarTodo = async () => {
    const cls = await dbService.getClientes();
    setClientes(cls);
    const gests = await dbService.getAllGestiones();
    setTodasGestiones(gests);
  };

  const handleAbrirSinGestionDesdeDashboard = () => {
    setFiltroSinGestionActivo(true);
    setTabActiva('consultas');
  };

  // 1. Loading Authentication State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Verificando sesión en Firebase...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated: Show Login Screen
  if (!user) {
    return <LoginScreen />;
  }

  // 3. Authenticated: Render Main Application Dashboard according to role
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* Top Navbar */}
      <Navbar
        tabActiva={tabActiva}
        setTabActiva={(tab) => {
          setTabActiva(tab);
          if (tab !== 'consultas') setFiltroSinGestionActivo(false);
        }}
        onRefreshData={handleRefrescarTodo}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {cargando && clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">
              Sincronizando cartera y gestiones en tiempo real desde Firestore...
            </p>
          </div>
        ) : (
          <>
            {/* Tab 1: Dashboard Ejecutivo (Módulo 4) */}
            {tabActiva === 'dashboard' && (
              <DashboardEjecutivo
                clientes={clientes}
                todasGestiones={todasGestiones}
                onVerClientesSinGestion={handleAbrirSinGestionDesdeDashboard}
              />
            )}

            {/* Tab 2: Gestión de Barridos (Módulo 2) */}
            {tabActiva === 'barridos' && permisos.canGestionarBarridos && (
              <GestionBarridos
                clientes={clientes}
                onSeleccionarParaGestion={(c) => setClienteGestion(c)}
                onVerHistorial={(c) => setClienteHistorial(c)}
              />
            )}

            {/* Tab 3: Consultas y Filtros (Módulo 5) */}
            {tabActiva === 'consultas' && (
              <ConsultasFiltros
                clientes={clientes}
                onVerHistorial={(c) => setClienteHistorial(c)}
                onNuevaGestion={(c) => setClienteGestion(c)}
                filtroInicialSinGestion={filtroSinGestionActivo}
              />
            )}

            {/* Tab 4: Carga de Bases (Módulo 1) */}
            {tabActiva === 'carga' && permisos.canCargarBases && (
              <CargaBases onCargaCompleta={handleRefrescarTodo} />
            )}

            {/* Tab 5: Exportación de Datos (Módulo 6) */}
            {tabActiva === 'exportacion' && permisos.canExportar && (
              <ExportacionDatos clientes={clientes} todasGestiones={todasGestiones} />
            )}

            {/* Tab 6: Administración de Catálogos y Usuarios (Módulo 7) */}
            {tabActiva === 'administracion' && permisos.canAdministrarCatalogos && (
              <AdministracionCatalogos onCatalogosActualizados={handleRefrescarTodo} />
            )}

            {/* Tab 7: Bitácora de Auditoría (RN11) */}
            {tabActiva === 'auditoria' && permisos.canAdministrarUsuarios && (
              <BitacoraAuditoria />
            )}
          </>
        )}
      </main>

      {/* Modal: Historial y Vista del Cliente (Módulo 3 - RN14, RN03) */}
      {clienteHistorial && (
        <HistorialClienteModal
          cliente={clienteHistorial}
          onClose={() => setClienteHistorial(null)}
          onNuevaGestion={(c) => {
            setClienteHistorial(null);
            setClienteGestion(c);
          }}
        />
      )}

      {/* Modal: Registrar Nueva Gestión / Barrido (Módulo 2 - RN02, RN06, RN07, RN10, RN12) */}
      {clienteGestion && (
        <ModalNuevaGestion
          cliente={clienteGestion}
          onClose={() => setClienteGestion(null)}
          onSuccess={() => {
            handleRefrescarTodo();
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        CRM Seguimiento de Ventas &copy; 2026 &bull; Cloud Firestore Realtime &bull; Trazabilidad Inmutable (RN03)
      </footer>
    </div>
  );
}
