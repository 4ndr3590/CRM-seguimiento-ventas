'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, RolUsuario } from '@/types/crm';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { dbService } from '@/lib/dbService';
import { USUARIOS_INICIALES } from '@/lib/defaultUsers';

const SESSION_STORAGE_KEY = 'crm_active_session';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  actualizarUsuarioSesion: (nuevo: Usuario) => void;
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
              try {
                let match = await dbService.getUsuarioPorUid(fbUser.uid);
                if (!match) {
                  match = await dbService.getUsuarioPorEmail(fbUser.email);
                }
                if (match && match.activo) {
                  setUser(match);
                  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(match));
                } else if (match && !match.activo) {
                  if (auth) await fbSignOut(auth);
                  setUser(null);
                  localStorage.removeItem(SESSION_STORAGE_KEY);
                }
              } catch (e) {
                console.warn('Error loading user profile on auth state change:', e);
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
      // 1. Si Firebase está activo, autenticar directamente en línea con Firebase Authentication
      if (isFirebaseConfigured() && auth) {
        let cred;
        try {
          cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        } catch (fbErr: any) {
          // Si el usuario es uno de los preconfigurados iniciales y aún no existe en Auth, auto-crear
          const defaultUser = USUARIOS_INICIALES.find(
            (u) => u.email.toLowerCase() === cleanEmail
          );
          if (
            defaultUser &&
            defaultUser.password === cleanPass &&
            (fbErr.code === 'auth/user-not-found' ||
              fbErr.code === 'auth/invalid-credential' ||
              fbErr.code === 'auth/invalid-login-credentials')
          ) {
            try {
              cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
            } catch (createErr: any) {
              console.error('Auto-create default user in Auth error:', createErr);
            }
          }

          if (!cred) {
            if (
              fbErr.code === 'auth/wrong-password' ||
              fbErr.code === 'auth/invalid-credential' ||
              fbErr.code === 'auth/invalid-login-credentials'
            ) {
              return {
                success: false,
                error: 'Contraseña incorrecta. Por favor verifica tus credenciales.',
              };
            }
            if (fbErr.code === 'auth/user-not-found') {
              return {
                success: false,
                error: 'No se encontró ningún usuario registrado con ese correo electrónico.',
              };
            }
            if (fbErr.code === 'auth/too-many-requests') {
              return {
                success: false,
                error: 'Demasiados intentos fallidos. Por favor intenta más tarde.',
              };
            }
            return {
              success: false,
              error: `Error de autenticación: ${fbErr.message || 'Verifica tus credenciales.'}`,
            };
          }
        }

        // Usuario autenticado exitosamente en Firebase Authentication
        // Ahora obtenemos su perfil sincronizado desde Cloud Firestore
        let userDoc = await dbService.getUsuarioPorUid(cred.user.uid);
        if (!userDoc) {
          userDoc = await dbService.getUsuarioPorEmail(cleanEmail);
          if (userDoc) {
            userDoc.uid = cred.user.uid;
            await dbService.guardarUsuario(userDoc, 'Sistema');
          }
        }

        // Si no tiene perfil aún en Firestore, crearlo automáticamente
        if (!userDoc) {
          const defaultUser = USUARIOS_INICIALES.find(
            (u) => u.email.toLowerCase() === cleanEmail
          );
          userDoc = {
            uid: cred.user.uid,
            email: cleanEmail,
            nombre: cred.user.displayName || defaultUser?.nombre || cleanEmail.split('@')[0],
            rol: defaultUser?.rol || (cleanEmail.includes('admin') ? 'Administrador' : 'Analista'),
            activo: true,
            fecha_creacion: new Date().toISOString(),
          };
          await dbService.guardarUsuario(userDoc, 'Sistema');
        }

        if (!userDoc.activo) {
          if (auth) await fbSignOut(auth);
          return {
            success: false,
            error: 'Tu usuario se encuentra inactivo. Por favor contacta al Administrador.',
          };
        }

        setUser(userDoc);
        if (typeof window !== 'undefined') {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userDoc));
        }

        await dbService.registrarAuditoria({
          usuario: userDoc.nombre || userDoc.email,
          modulo: 'Autenticación',
          accion: 'Inicio de Sesión',
          detalle: `Inicio de sesión exitoso con perfil ${userDoc.rol} sincronizado en línea.`,
        });

        await refrescarUsuarios();
        return { success: true };
      }

      // 2. Modo fallback local si Firebase no estuviera disponible
      const list = await dbService.getUsuarios();
      const defaultUser = USUARIOS_INICIALES.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );
      let found = list.find((u) => u.email.toLowerCase() === cleanEmail) || defaultUser;

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

      const expectedPassword = found.password || defaultUser?.password;
      if (expectedPassword && cleanPass !== expectedPassword) {
        return {
          success: false,
          error: 'Contraseña incorrecta. Por favor verifica tus credenciales.',
        };
      }

      setUser(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(found));
      }

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

  const actualizarUsuarioSesion = (nuevo: Usuario) => {
    setUser(nuevo);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nuevo));
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
        actualizarUsuarioSesion,
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
