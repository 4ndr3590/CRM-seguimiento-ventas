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
  Pencil,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

interface AdministracionCatalogosProps {
  onCatalogosActualizados?: () => void;
}

export const AdministracionCatalogos: React.FC<AdministracionCatalogosProps> = ({
  onCatalogosActualizados,
}) => {
  const { user, permisos, actualizarUsuarioSesion } = useAuth();
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
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [mostrarPasswordNuevo, setMostrarPasswordNuevo] = useState(false);
  const [rolNuevo, setRolNuevo] = useState<RolUsuario>('Analista');
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [userMensaje, setUserMensaje] = useState<string | null>(null);

  // Edit User Modal State
  const [usuarioAEditar, setUsuarioAEditar] = useState<Usuario | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [rolEdit, setRolEdit] = useState<RolUsuario>('Analista');
  const [passwordEdit, setPasswordEdit] = useState('');
  const [activoEdit, setActivoEdit] = useState(true);
  const [mostrarPasswordEdit, setMostrarPasswordEdit] = useState(false);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

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
    const unsubUsuarios = dbService.subscribeUsuarios((usrs) => {
      setUsuarios(usrs);
    });
    const unsubCats = dbService.subscribeCatalogos((cats) => {
      setCatalogos(cats);
    });
    return () => {
      unsubUsuarios();
      unsubCats();
    };
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
    if (!nombreNuevo.trim() || !emailNuevo.trim() || !passwordNuevo.trim()) return;

    if (passwordNuevo.trim().length < 6) {
      alert('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    setCreandoUsuario(true);
    setUserMensaje(null);
    try {
      const nuevo: Usuario = {
        uid: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nombre: nombreNuevo.trim(),
        email: emailNuevo.trim(),
        rol: rolNuevo,
        password: passwordNuevo.trim(),
        activo: true,
        fecha_creacion: new Date().toISOString(),
      };

      await dbService.guardarUsuario(nuevo, user?.nombre || 'Administrador');
      const refreshed = await dbService.getUsuarios();
      setUsuarios(refreshed);
      setNombreNuevo('');
      setEmailNuevo('');
      setPasswordNuevo('');
      setUserMensaje(`Usuario ${nuevo.email} registrado con éxito con rol ${nuevo.rol} y sincronizado en línea.`);
      setTimeout(() => setUserMensaje(null), 4000);
    } catch (err: any) {
      alert(`Error al crear usuario: ${err.message}`);
    } finally {
      setCreandoUsuario(false);
    }
  };

  const handleAbrirEditarUsuario = (u: Usuario) => {
    setUsuarioAEditar(u);
    setNombreEdit(u.nombre);
    setEmailEdit(u.email);
    setRolEdit(u.rol);
    setPasswordEdit('');
    setActivoEdit(u.activo);
    setMostrarPasswordEdit(false);
  };

  const handleGuardarEdicionUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioAEditar) return;

    if (!nombreEdit.trim() || !emailEdit.trim()) {
      alert('Nombre y correo electrónico son obligatorios.');
      return;
    }

    if (passwordEdit.trim() && passwordEdit.trim().length < 6) {
      alert('Si deseas cambiar la contraseña, debe tener al menos 6 caracteres.');
      return;
    }

    setGuardandoEdit(true);
    try {
      const updated: Usuario = {
        ...usuarioAEditar,
        nombre: nombreEdit.trim(),
        email: emailEdit.trim(),
        rol: rolEdit,
        activo: activoEdit,
        ...(passwordEdit.trim() ? { password: passwordEdit.trim() } : {}),
      };

      await dbService.guardarUsuario(updated, user?.nombre || 'Administrador');
      const refreshed = await dbService.getUsuarios();
      setUsuarios(refreshed);

      // If updating the current active user, refresh active session in context
      if (usuarioAEditar.uid === user?.uid) {
        actualizarUsuarioSesion(updated);
      }

      setUserMensaje(`Usuario ${updated.email} actualizado y sincronizado exitosamente.`);
      setTimeout(() => setUserMensaje(null), 4000);
      setUsuarioAEditar(null);
    } catch (err: any) {
      alert(`Error al actualizar usuario: ${err.message}`);
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleEliminarUsuario = async (u: Usuario) => {
    if (u.uid === user?.uid) {
      alert('No puedes eliminar tu propia cuenta de Administrador.');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar permanentemente al usuario ${u.email}?`)) {
      return;
    }

    try {
      await dbService.eliminarUsuario(u.uid, user?.nombre || 'Administrador');
      const refreshed = await dbService.getUsuarios();
      setUsuarios(refreshed);
    } catch (err: any) {
      alert(`Error al eliminar usuario: ${err.message}`);
    }
  };

  // Strict check: only Administrator can access this module
  if (user?.rol !== 'Administrador') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Acceso Restringido</h2>
        <p className="text-xs">
          La Administración de Catálogos y Usuarios está reservada exclusivamente para el perfil <strong>Administrador</strong>.
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
            Configuración dinámica de catálogos desplegables y administración integral de usuarios y accesos.
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
        /* Catalog Management */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Select Catalog */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Seleccionar Catálogo
            </h2>
            <div className="space-y-1">
              {nombresCatalogos.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCatalogoSeleccionado(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                    catalogoSeleccionado === cat.id
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-75">
                    {catalogos ? (catalogos[cat.id] as string[]).length : 0} valores
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Edit Selected Catalog */}
          <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Valores del Catálogo:{' '}
                  <span className="text-purple-400">
                    {nombresCatalogos.find((n) => n.id === catalogoSeleccionado)?.label}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Los cambios que realices se reflejarán inmediatamente en todos los formularios del CRM.
                </p>
              </div>

              <button
                onClick={handleGuardarCatalogos}
                disabled={guardandoCatalogo}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{guardandoCatalogo ? 'Guardando...' : 'Guardar en Base de Datos'}</span>
              </button>
            </div>

            {catMensaje && (
              <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{catMensaje}</span>
              </div>
            )}

            {/* Add New Value */}
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoValor}
                onChange={(e) => setNuevoValor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAgregarValor()}
                placeholder="Escribe un nuevo valor para este catálogo..."
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                onClick={handleAgregarValor}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>

            {/* Value List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {catalogos &&
                (catalogos[catalogoSeleccionado] as string[]).map((valor, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs group hover:border-slate-600 transition"
                  >
                    <span className="text-slate-200 font-medium">{valor}</span>
                    <button
                      onClick={() => handleEliminarValor(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-700 transition"
                      title="Eliminar este valor del catálogo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        /* User Management */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create User Form with Password Field */}
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

              {/* Password Assignment Field */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Contraseña de Acceso * (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={mostrarPasswordNuevo ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordNuevo}
                    onChange={(e) => setPasswordNuevo(e.target.value)}
                    placeholder="Contraseña inicial"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 pr-9 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPasswordNuevo(!mostrarPasswordNuevo)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {mostrarPasswordNuevo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
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
                disabled={creandoUsuario || !nombreNuevo.trim() || !emailNuevo.trim() || passwordNuevo.trim().length < 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-900/40 transition disabled:opacity-50 mt-4"
              >
                <UserPlus className="w-4 h-4" />
                <span>{creandoUsuario ? 'Registrando en Base de Datos...' : 'Registrar Usuario'}</span>
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
              <span>Usuarios Registrados en el Sistema ({usuarios.length})</span>
              <span className="text-xs text-slate-400 font-normal">Sincronizados en Cloud Firestore</span>
            </h2>

            <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto pr-1">
              {usuarios.map((u) => (
                <div key={u.uid} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-white block">{u.nombre}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{u.email}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Role Badge (Read-Only) */}
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border ${
                        u.rol === 'Administrador'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800/80'
                          : u.rol === 'Analista'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-800/80'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                      }`}
                    >
                      {u.rol}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-medium border ${
                        u.activo
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>

                    {/* Pencil Edit Button (Applies to all users including current profile) */}
                    <button
                      onClick={() => handleAbrirEditarUsuario(u)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition font-medium"
                      title="Editar usuario (nombre, correo, rol, contraseña, estado)"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-400" />
                      <span>Editar</span>
                    </button>

                    {/* Delete User (Cannot delete yourself) */}
                    {u.uid !== user?.uid && (
                      <button
                        onClick={() => handleEliminarUsuario(u)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                        title="Eliminar usuario permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario Completo */}
      {usuarioAEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                <span>Editar Usuario</span>
              </h3>
              <button
                onClick={() => setUsuarioAEditar(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicionUsuario} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={emailEdit}
                  onChange={(e) => setEmailEdit(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Perfil / Rol *</label>
                <select
                  value={rolEdit}
                  onChange={(e) => setRolEdit(e.target.value as RolUsuario)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Administrador">Administrador (Control Total)</option>
                  <option value="Analista">Analista (Gestiones y Barridos)</option>
                  <option value="Consulta">Consulta (Solo Lectura)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Contraseña (opcional, mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={mostrarPasswordEdit ? 'text' : 'password'}
                    minLength={6}
                    value={passwordEdit}
                    onChange={(e) => setPasswordEdit(e.target.value)}
                    placeholder="Dejar en blanco para conservar la actual"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 pr-9 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPasswordEdit(!mostrarPasswordEdit)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {mostrarPasswordEdit ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Si no deseas cambiar la clave, déjala vacía.
                </span>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Estado de la Cuenta</label>
                <select
                  value={activoEdit ? 'activo' : 'inactivo'}
                  disabled={usuarioAEditar.uid === user?.uid}
                  onChange={(e) => setActivoEdit(e.target.value === 'activo')}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="activo">Activo (Permite acceso al sistema)</option>
                  <option value="inactivo">Inactivo (Acceso bloqueado)</option>
                </select>
                {usuarioAEditar.uid === user?.uid && (
                  <span className="text-[10px] text-amber-400/80 block mt-0.5">
                    No puedes desactivar tu propia cuenta activa.
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUsuarioAEditar(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdit || !nombreEdit.trim() || !emailEdit.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
                >
                  {guardandoEdit ? 'Guardando Cambios...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
