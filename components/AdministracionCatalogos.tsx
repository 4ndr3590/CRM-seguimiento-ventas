'use client';

import React, { useState, useEffect } from 'react';
import { Catalogos, Usuario, RolUsuario } from '@/types/crm';
import { dbService } from '@/lib/dbService';
import { useAuth } from '@/context/AuthContext';
import {
  Settings,
  Users,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

interface AdministracionCatalogosProps {
  onCatalogosActualizados?: () => void;
}

export const AdministracionCatalogos: React.FC<AdministracionCatalogosProps> = ({
  onCatalogosActualizados,
}) => {
  const { user, permisos } = useAuth();
  const [subTab, setSubTab] = useState<'catalogos' | 'usuarios'>('catalogos');

  // Catalogs state
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<keyof Catalogos>('motivo');
  const [nuevoValor, setNuevoValor] = useState('');
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);
  const [catMensaje, setCatMensaje] = useState<string | null>(null);

  // Users state
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [rolNuevo, setRolNuevo] = useState<RolUsuario>('Analista');
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [userMensaje, setUserMensaje] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      const cats = await dbService.getCatalogos();
      setCatalogos(cats);
      const usrs = await dbService.getUsuarios();
      setUsuarios(usrs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleAgregarValor = () => {
    if (!catalogos || !nuevoValor.trim()) return;
    const listaActual = (catalogos[catalogoSeleccionado] as string[]) || [];
    if (listaActual.includes(nuevoValor.trim())) {
      alert('Ese valor ya existe en este catálogo.');
      return;
    }

    const actualizada = [...listaActual, nuevoValor.trim()];
    setCatalogos({
      ...catalogos,
      [catalogoSeleccionado]: actualizada,
    });
    setNuevoValor('');
  };

  const handleEliminarValor = (index: number) => {
    if (!catalogos) return;
    const listaActual = (catalogos[catalogoSeleccionado] as string[]) || [];
    if (listaActual.length <= 1) {
      alert('El catálogo debe mantener al menos un valor.');
      return;
    }
    const actualizada = listaActual.filter((_, i) => i !== index);
    setCatalogos({
      ...catalogos,
      [catalogoSeleccionado]: actualizada,
    });
  };

  const handleGuardarCatalogos = async () => {
    if (!catalogos) return;
    setGuardandoCatalogo(true);
    setCatMensaje(null);
    try {
      await dbService.guardarCatalogos(catalogos, user?.nombre || 'Administrador');
      setCatMensaje('Catálogos guardados y sincronizados correctamente en la base de datos.');
      if (onCatalogosActualizados) onCatalogosActualizados();
      setTimeout(() => setCatMensaje(null), 4000);
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevo.trim() || !emailNuevo.trim()) return;

    setCreandoUsuario(true);
    setUserMensaje(null);
    try {
      const nuevo: Usuario = {
        uid: `usr_${Date.now()}`,
        nombre: nombreNuevo.trim(),
        email: emailNuevo.trim(),
        rol: rolNuevo,
        activo: true,
        fecha_creacion: new Date().toISOString(),
      };

      await dbService.guardarUsuario(nuevo, user?.nombre || 'Administrador');
      setUsuarios((prev) => [nuevo, ...prev]);
      setNombreNuevo('');
      setEmailNuevo('');
      setUserMensaje(`Usuario ${nuevo.email} registrado con éxito con rol ${nuevo.rol}.`);
      setTimeout(() => setUserMensaje(null), 4000);
    } catch (err: any) {
      alert(`Error al crear usuario: ${err.message}`);
    } finally {
      setCreandoUsuario(false);
    }
  };

  const handleCambiarRolUsuario = async (u: Usuario, nuevoRol: RolUsuario) => {
    try {
      const updated: Usuario = { ...u, rol: nuevoRol };
      await dbService.guardarUsuario(updated, user?.nombre || 'Administrador');
      setUsuarios((prev) => prev.map((item) => (item.uid === u.uid ? updated : item)));
    } catch (err: any) {
      alert(`Error al actualizar rol: ${err.message}`);
    }
  };

  if (!permisos.canAdministrarCatalogos) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Acceso Restringido</h2>
        <p className="text-xs">
          La Administración de Catálogos y Usuarios está reservada para el perfil <strong>Administrador</strong>.
        </p>
      </div>
    );
  }

  const nombresCatalogos: { id: keyof Catalogos; label: string }[] = [
    { id: 'motivo', label: 'Motivo de la Gestión' },
    { id: 'estado', label: 'Estado de la Línea' },
    { id: 'entrega_chip', label: 'Entrega de Chip' },
    { id: 'recibio_chip', label: '¿Ya Recibió el Chip?' },
    { id: 'consumo', label: 'Consumo' },
    { id: 'contactabilidad', label: 'Contactabilidad' },
    { id: 'tarea_realizada', label: 'Tarea Realizada' },
    { id: 'tipo_venta', label: 'Tipo de Venta' },
    { id: 'estatus', label: 'Estatus Enrolamiento' },
    { id: 'venta_cerrada', label: 'Venta Cerrada' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-purple-600 rounded-full inline-block"></span>
            Módulo 7: Administración de Catálogos y Usuarios
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configuración dinámica de catálogos desplegables y administración de accesos por perfil.
          </p>
        </div>

        {/* Sub tabs */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setSubTab('catalogos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              subTab === 'catalogos' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Catálogos Desplegables</span>
          </button>
          <button
            onClick={() => setSubTab('usuarios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              subTab === 'usuarios' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gestión de Usuarios</span>
          </button>
        </div>
      </div>

      {subTab === 'catalogos' ? (
        /* Catalogs Editor */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Catalogs Menu */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
              Catálogos del Sistema:
            </h3>
            {nombresCatalogos.map((c) => (
              <button
                key={c.id}
                onClick={() => setCatalogoSeleccionado(c.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                  catalogoSeleccionado === c.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{c.label}</span>
                <span className="text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded text-slate-400">
                  {catalogos ? (catalogos[c.id] || []).length : 0}
                </span>
              </button>
            ))}
          </div>

          {/* Catalog Values Manager */}
          <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Editar Catálogo: <span className="text-purple-400">{nombresCatalogos.find((n) => n.id === catalogoSeleccionado)?.label}</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Agrega o remueve opciones que aparecerán en los formularios de registro y filtros.
                </p>
              </div>

              <button
                onClick={handleGuardarCatalogos}
                disabled={guardandoCatalogo}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{guardandoCatalogo ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>

            {catMensaje && (
              <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{catMensaje}</span>
              </div>
            )}

            {/* Add new option input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoValor}
                onChange={(e) => setNuevoValor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAgregarValor())}
                placeholder="Escribe el nombre de la nueva opción..."
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-slate-500"
              />
              <button
                onClick={handleAgregarValor}
                disabled={!nuevoValor.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold rounded-xl text-xs border border-purple-800/40 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>

            {/* List of current options */}
            <div className="space-y-2 max-h-96 overflow-y-auto pt-2">
              {catalogos &&
                ((catalogos[catalogoSeleccionado] as string[]) || []).map((valor, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
                  >
                    <span className="font-medium text-slate-200">{valor}</span>
                    <button
                      onClick={() => handleEliminarValor(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      title="Eliminar opción"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        /* User Management */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create User Form */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-400" />
              Crear Nuevo Usuario
            </h2>

            <form onSubmit={handleCrearUsuario} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={emailNuevo}
                  onChange={(e) => setEmailNuevo(e.target.value)}
                  placeholder="laura@crmventas.com"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Perfil / Rol *</label>
                <select
                  value={rolNuevo}
                  onChange={(e) => setRolNuevo(e.target.value as RolUsuario)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Administrador">Administrador (Control Total)</option>
                  <option value="Analista">Analista (Gestiones y Barridos)</option>
                  <option value="Consulta">Consulta (Solo Lectura)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creandoUsuario || !nombreNuevo.trim() || !emailNuevo.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-900/40 transition disabled:opacity-50 mt-4"
              >
                <UserPlus className="w-4 h-4" />
                <span>{creandoUsuario ? 'Registrando...' : 'Registrar Usuario'}</span>
              </button>
            </form>

            {userMensaje && (
              <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-2.5 rounded-xl text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{userMensaje}</span>
              </div>
            )}
          </div>

          {/* User List Table */}
          <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Usuarios del Sistema ({usuarios.length})</span>
              <span className="text-xs text-slate-400 font-normal">Roles y permisos de seguridad</span>
            </h2>

            <div className="divide-y divide-slate-800">
              {usuarios.map((u) => (
                <div key={u.uid} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-white block">{u.nombre}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{u.email}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={u.rol}
                      onChange={(e) => handleCambiarRolUsuario(u, e.target.value as RolUsuario)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="Analista">Analista</option>
                      <option value="Consulta">Consulta</option>
                    </select>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        u.activo
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
