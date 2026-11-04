'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, RolUsuario } from '@/types/crm';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { dbService } from '@/lib/dbService';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  cambiarUsuarioActivo: (usuario: Usuario) => void;
  cambiarRolRapido: (rol: RolUsuario) => void;
  logout: () => Promise<void>;
  usuariosDisponibles: Usuario[];
  permisos: {
    canCargarBases: boolean;
    canGestionarBarridos: boolean;
    canAdministrarUsuarios: boolean;
    canAdministrarCatalogos: boolean;
    canExportar: boolean;
    isReadOnly: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Usuario[]>([]);
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Load registered users from dbService
  const refrescarUsuarios = async () => {
    try {
      const list = await dbService.getUsuarios();
      setUsuariosDisponibles(list);
      // Default to the first admin if no user selected
      if (!user && list.length > 0) {
        const admin = list.find((u) => u.rol === 'Administrador') || list[0];
        setUser(admin);
      }
    } catch (e) {
      console.warn('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refrescarUsuarios();

    // If Firebase Auth is configured, listen to auth state
    if (isFirebaseConfigured() && auth) {
      const unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const list = await dbService.getUsuarios();
          const match = list.find((u) => u.email === fbUser.email || u.uid === fbUser.uid);
          if (match) {
            setUser(match);
          } else {
            // Create session user
            const nuevo: Usuario = {
              uid: fbUser.uid,
              email: fbUser.email || 'usuario@crm.com',
              nombre: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario Firebase',
              rol: 'Analista', // default fallback
              activo: true,
              fecha_creacion: new Date().toISOString(),
            };
            setUser(nuevo);
          }
        }
      });
      return () => unsub();
    }
  }, []);

  const cambiarUsuarioActivo = (nuevo: Usuario) => {
    setUser(nuevo);
  };

  const cambiarRolRapido = (rol: RolUsuario) => {
    if (!user) return;
    const match = usuariosDisponibles.find((u) => u.rol === rol);
    if (match) {
      setUser(match);
    } else {
      setUser({
        ...user,
        rol,
        nombre: `${user.nombre.split('(')[0].trim()} (${rol})`,
      });
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      await fbSignOut(auth);
    }
    // Switch to Consulta as fallback guest
    const consulta = usuariosDisponibles.find((u) => u.rol === 'Consulta');
    if (consulta) setUser(consulta);
  };

  const rol = user?.rol || 'Consulta';

  const permisos = {
    // Administrador: Cargar bases, actualizar bases, crear usuarios, modificar catálogos, consultar dashboard, exportar información.
    // Analista: Consultar clientes, crear gestiones, registrar barridos, consultar dashboard.
    // Consulta: Solo lectura, consulta de clientes, consulta de dashboard.
    canCargarBases: rol === 'Administrador',
    canGestionarBarridos: rol === 'Administrador' || rol === 'Analista',
    canAdministrarUsuarios: rol === 'Administrador',
    canAdministrarCatalogos: rol === 'Administrador',
    canExportar: rol === 'Administrador',
    isReadOnly: rol === 'Consulta',
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        cambiarUsuarioActivo,
        cambiarRolRapido,
        logout,
        usuariosDisponibles,
        permisos,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
