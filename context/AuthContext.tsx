'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, RolUsuario } from '@/types/crm';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { dbService } from '@/lib/dbService';
import { USUARIOS_INICIALES } from '@/lib/defaultUsers';

const SESSION_STORAGE_KEY = 'crm_active_session';

export type EstadoConexionFirestore = 'conectado' | 'error' | 'verificando';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  conexionFirestore: EstadoConexionFirestore;
  errorConexion: string | null;
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
  const [conexionFirestore, setConexionFirestore] = useState<EstadoConexionFirestore>('verificando');
  const [errorConexion, setErrorConexion] = useState<string | null>(null);

  // Cargar lista de usuarios desde Cloud Firestore
  const refrescarUsuarios = async () => {
    try {
      const list = await dbService.getUsuarios();
      setUsuariosDisponibles(list);
      setConexionFirestore('conectado');
      setErrorConexion(null);
      return list;
    } catch (e: any) {
      console.error('[Firestore] Error al cargar usuarios:', e);
      setConexionFirestore('error');
      setErrorConexion(e?.message || 'Error de permisos o conexión con Cloud Firestore');
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Recuperar sesión activa existente en el navegador (único dato local permitido)
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Usuario;
          if (parsed && parsed.email) {
            setUser(parsed);
          }
        } catch {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }

    // 2. Suscribirse en tiempo real a la colección 'usuarios' de Cloud Firestore
    const unsubscribeUsuarios = dbService.subscribeUsuarios(
      (list) => {
        if (!isMounted) return;
        setUsuariosDisponibles(list);
        setConexionFirestore('conectado');
        setErrorConexion(null);
        setLoading(false);

        // Si el usuario actual está en sesión, sincronizar su perfil en vivo
        setUser((currentUser) => {
          if (!currentUser) return null;
          const match = list.find(
            (u) =>
              u.email.toLowerCase() === currentUser.email.toLowerCase() ||
              u.uid === currentUser.uid
          );
          if (match) {
            if (!match.activo) {
              // Si fue desactivado por un Administrador, cerrar su sesión de inmediato
              if (typeof window !== 'undefined') {
                localStorage.removeItem(SESSION_STORAGE_KEY);
              }
              return null;
            }
            if (typeof window !== 'undefined') {
              localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(match));
            }
            return match;
          }
          return currentUser;
        });
      },
      (err) => {
        if (!isMounted) return;
        console.error('[Firestore] Error en suscripción a usuarios:', err);
        setConexionFirestore('error');
        setErrorConexion(err.message);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribeUsuarios();
    };
  }, []);

  // Inicio de Sesión 100% Online contra Cloud Firestore (+ enlace con Firebase Auth)
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
      // 1. Consultar usuario en Cloud Firestore
      let userDoc = await dbService.getUsuarioPorEmail(cleanEmail);

      // Si no existe en Firestore, verificar si es uno de los usuarios iniciales oficiales
      if (!userDoc) {
        const defaultUser = USUARIOS_INICIALES.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        if (defaultUser && defaultUser.password === cleanPass) {
          userDoc = {
            ...defaultUser,
            fecha_creacion: new Date().toISOString(),
          };
          await dbService.guardarUsuario(userDoc, 'Sistema');
        }
      }

      if (!userDoc) {
        return {
          success: false,
          error: 'No se encontró ningún usuario registrado con ese correo electrónico.',
        };
      }

      // Validar si la cuenta está activa
      if (!userDoc.activo) {
        return {
          success: false,
          error: 'Tu usuario se encuentra inactivo. Por favor contacta al Administrador.',
        };
      }

      // Validar contraseña
      if (userDoc.password && cleanPass !== userDoc.password) {
        return {
          success: false,
          error: 'Contraseña incorrecta. Por favor verifica tus credenciales.',
        };
      }

      // Usuario autenticado exitosamente en Firestore
      // En segundo plano, sincronizar con Firebase Auth (no bloqueante en redes corporativas con proxy/firewall)
      const fbAuth = auth;
      if (isFirebaseConfigured() && fbAuth) {
        signInWithEmailAndPassword(fbAuth, cleanEmail, cleanPass).catch(() => {
          createUserWithEmailAndPassword(fbAuth, cleanEmail, cleanPass).catch(() => {
            // Ignorar errores de red secundaria (ej. auth/network-request-failed)
          });
        });
      }

      setUser(userDoc);
      setConexionFirestore('conectado');
      setErrorConexion(null);

      // Guardar token/estado de sesión activa en el navegador
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userDoc));
      }

      // Registrar evento en bitácora de auditoría online
      await dbService.registrarAuditoria({
        usuario: userDoc.nombre || userDoc.email,
        modulo: 'Autenticación',
        accion: 'Inicio de Sesión',
        detalle: `Inicio de sesión exitoso con perfil ${userDoc.rol} sincronizado en Cloud Firestore.`,
      });

      return { success: true };
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setConexionFirestore('error');
      setErrorConexion(err.message || 'Error al conectar con Cloud Firestore');
      return {
        success: false,
        error: `Error al iniciar sesión: ${err.message || 'Verifica tu conexión a Internet o permisos de Firestore.'}`,
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
          detalle: 'Sesión finalizada por el usuario.',
        });
      }

      if (isFirebaseConfigured() && auth) {
        await fbSignOut(auth).catch(() => {});
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
        conexionFirestore,
        errorConexion,
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
