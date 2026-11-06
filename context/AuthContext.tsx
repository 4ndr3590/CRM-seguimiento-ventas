'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, RolUsuario } from '@/types/crm';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { dbService } from '@/lib/dbService';

const SESSION_STORAGE_KEY = 'crm_active_session';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refrescarUsuarios: () => Promise<Usuario[]>;
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

  // Load all users from dbService
  const refrescarUsuarios = async () => {
    try {
      const list = await dbService.getUsuarios();
      setUsuariosDisponibles(list);
      return list;
    } catch (e) {
      console.warn('Error loading users:', e);
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const list = await refrescarUsuarios();

        // 1. Check local session storage
        let initialUser: Usuario | null = null;
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(SESSION_STORAGE_KEY);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as Usuario;
              // Validate user is still in system and active
              const match = list.find(
                (u) => u.email.toLowerCase() === parsed.email.toLowerCase() || u.uid === parsed.uid
              );
              if (match && match.activo) {
                initialUser = match;
              }
            } catch {
              localStorage.removeItem(SESSION_STORAGE_KEY);
            }
          }
        }

        // 2. If Firebase Auth is configured, check auth state
        if (isFirebaseConfigured() && auth) {
          onAuthStateChanged(auth, async (fbUser) => {
            if (!isMounted) return;
            if (fbUser && fbUser.email) {
              const updatedList = await dbService.getUsuarios();
              const match = updatedList.find(
                (u) =>
                  u.email.toLowerCase() === fbUser.email!.toLowerCase() || u.uid === fbUser.uid
              );
              if (match && match.activo) {
                setUser(match);
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(match));
              }
            }
          });
        }

        if (initialUser && isMounted) {
          setUser(initialUser);
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Por favor ingresa correo y contraseña.' };
    }

    try {
      const list = await dbService.getUsuarios();

      // Find user in database records
      const found = list.find((u) => u.email.toLowerCase() === cleanEmail);

      if (!found) {
        return {
          success: false,
          error: 'No se encontró ningún usuario registrado con ese correo electrónico.',
        };
      }

      if (!found.activo) {
        return {
          success: false,
          error: 'Tu usuario se encuentra inactivo. Por favor contacta al Administrador.',
        };
      }

      // Check with Firebase Auth first if configured
      let firebaseAuthSuccess = false;
      if (isFirebaseConfigured() && auth) {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
          if (cred.user) {
            firebaseAuthSuccess = true;
          }
        } catch (fbErr: any) {
          // If Firebase Auth fails, we still check the database record password
          console.warn('Firebase Auth sign-in attempt notice:', fbErr.code || fbErr.message);
        }
      }

      // Check database password match
      if (!firebaseAuthSuccess) {
        if (!found.password || found.password !== cleanPass) {
          return {
            success: false,
            error: 'Contraseña incorrecta. Por favor verifica tus credenciales.',
          };
        }
      }

      // User authenticated successfully
      setUser(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(found));
      }

      // Record audit event
      await dbService.registrarAuditoria({
        usuario: found.nombre || found.email,
        modulo: 'Autenticación',
        accion: 'Inicio de Sesión',
        detalle: `Inicio de sesión exitoso con perfil ${found.rol}.`,
      });

      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      return {
        success: false,
        error: `Error al iniciar sesión: ${err.message || 'Error desconocido'}`,
      };
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await dbService.registrarAuditoria({
          usuario: user.nombre || user.email,
          modulo: 'Autenticación',
          accion: 'Cierre de Sesión',
          detalle: `Sesión finalizada por el usuario.`,
        });
      }

      if (isFirebaseConfigured() && auth) {
        await fbSignOut(auth);
      }
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      setUser(null);
    }
  };

  const rol: RolUsuario = user?.rol || 'Consulta';

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
        login,
        logout,
        refrescarUsuarios,
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
