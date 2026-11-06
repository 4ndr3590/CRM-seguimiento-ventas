import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, firebaseConfig } from './firebase';
import {
  Cliente,
  Gestion,
  Catalogos,
  Usuario,
  AuditoriaEvento,
  CargaResumen,
  TipoVenta,
  EstatusEnrolamiento,
} from '@/types/crm';
import { CATALOGOS_INICIALES } from './defaultCatalogs';
import { USUARIOS_INICIALES } from './defaultUsers';

// ----------------------------------------------------
// LOCAL STORAGE KEYS (Fallback / Mock Mode)
// ----------------------------------------------------
const STORAGE_KEY_CLIENTES = 'crm_clientes_store';
const STORAGE_KEY_GESTIONES = 'crm_gestiones_store';
const STORAGE_KEY_CATALOGOS = 'crm_catalogos_store';
const STORAGE_KEY_USUARIOS = 'crm_usuarios_store';
const STORAGE_KEY_AUDITORIA = 'crm_auditoria_store';

function emitLocalDbChange(event: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm_local_change', { detail: event }));
    try {
      localStorage.setItem('crm_last_event', `${event}_${Date.now()}`);
    } catch {
      // ignore
    }
  }
}

// ----------------------------------------------------
// INITIAL SEED DATA GENERATOR
// ----------------------------------------------------
export function generateSeedData(): {
  clientes: Cliente[];
  gestiones: Gestion[];
  catalogos: Catalogos;
  usuarios: Usuario[];
  auditoria: AuditoriaEvento[];
} {
  const now = new Date();
  const formatISO = (d: Date) => d.toISOString();
  const subDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const subHours = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

  const usuarios: Usuario[] = [
    {
      uid: 'admin_1',
      email: 'admin@crmventas.com',
      nombre: 'Carlos Mendoza (Admin)',
      rol: 'Administrador',
      activo: true,
      fecha_creacion: formatISO(subDays(30)),
    },
    {
      uid: 'analista_1',
      email: 'analista1@crmventas.com',
      nombre: 'Lucía Fernández (Analista)',
      rol: 'Analista',
      activo: true,
      fecha_creacion: formatISO(subDays(20)),
    },
    {
      uid: 'analista_2',
      email: 'analista2@crmventas.com',
      nombre: 'Jorge Ramírez (Analista)',
      rol: 'Analista',
      activo: true,
      fecha_creacion: formatISO(subDays(15)),
    },
    {
      uid: 'consulta_1',
      email: 'consulta@crmventas.com',
      nombre: 'Mariana Silva (Consulta)',
      rol: 'Consulta',
      activo: true,
      fecha_creacion: formatISO(subDays(10)),
    },
  ];

  const gestiones: Gestion[] = [
    {
      id_gestion: 'gest_001',
      numero_orden: 'ORD-1001',
      fecha_hora_gestion: formatISO(subDays(4)),
      estado: 'Activo',
      entrega_chip: 'CAC',
      recibio_chip: 'Sin registro de entrega',
      consumo: 'No',
      contactabilidad: 'Contacto efectivo',
      motivo: 'Pendiente de reclamar SIM',
      tarea_realizada: 'Recordatorio de recolección de la SIM',
      venta_cerrada: 'No',
      observaciones: 'Cliente informa que pasará mañana por el Centro de Atención a Clientes.',
      usuario_responsable: 'Lucía Fernández (Analista)',
    },
    {
      id_gestion: 'gest_002',
      numero_orden: 'ORD-1001',
      fecha_hora_gestion: formatISO(subHours(12)),
      estado: 'Activo',
      entrega_chip: 'CAC',
      recibio_chip: 'Entregado',
      consumo: 'Sí',
      contactabilidad: 'Venta activa con consumo sin novedad',
      motivo: 'Activa y en uso',
      tarea_realizada: 'Mensaje de bienvenida',
      venta_cerrada: 'Sí',
      observaciones: 'Cliente retiró la SIM en CAC, línea activa cursando tráfico de datos.',
      usuario_responsable: 'Lucía Fernández (Analista)',
    },
    {
      id_gestion: 'gest_003',
      numero_orden: 'ORD-1002',
      fecha_hora_gestion: formatISO(subDays(3)),
      estado: 'Predesactivado',
      entrega_chip: 'Domicilio',
      recibio_chip: 'Sin registro de entrega',
      consumo: 'No',
      contactabilidad: 'Contacto no efectivo',
      motivo: 'Problema en entrega de SIM',
      tarea_realizada: 'Recordatorio de recolección de la SIM',
      venta_cerrada: 'No',
      observaciones: 'Dirección con nomenclatura confusa, mensajería reportó visita fallida.',
      usuario_responsable: 'Jorge Ramírez (Analista)',
    },
    {
      id_gestion: 'gest_004',
      numero_orden: 'ORD-1003',
      fecha_hora_gestion: formatISO(subDays(2)),
      estado: 'Activo',
      entrega_chip: 'Domicilio',
      recibio_chip: 'Entregado',
      consumo: 'Sí',
      contactabilidad: 'Contacto efectivo',
      motivo: 'Activa y en uso',
      tarea_realizada: 'Seguimiento primera factura',
      venta_cerrada: 'Sí',
      observaciones: 'SIM entregada en domicilio, portabilidad exitosa con consumo normal.',
      usuario_responsable: 'Lucía Fernández (Analista)',
    },
    {
      id_gestion: 'gest_005',
      numero_orden: 'ORD-1004',
      fecha_hora_gestion: formatISO(subDays(1)),
      estado: 'Inactivo',
      entrega_chip: 'CAC',
      recibio_chip: 'NA',
      consumo: 'No',
      contactabilidad: 'Contacto efectivo',
      motivo: 'Desiste / Solicita cancelación',
      tarea_realizada: 'Mensaje de bienvenida',
      venta_cerrada: 'Sí',
      observaciones: 'Cliente manifiesta que su operador actual le mejoró la oferta y desiste.',
      usuario_responsable: 'Jorge Ramírez (Analista)',
    },
    {
      id_gestion: 'gest_006',
      numero_orden: 'ORD-1005',
      fecha_hora_gestion: formatISO(subHours(6)),
      estado: 'Activo',
      entrega_chip: 'Domicilio',
      recibio_chip: 'Entregado',
      consumo: 'No',
      contactabilidad: 'Contacto efectivo',
      motivo: 'Pendiente de reclamar SIM',
      tarea_realizada: 'Recordatorio de recolección de la SIM',
      venta_cerrada: 'No',
      observaciones: 'SIM recibida por portería, cliente aún no inserta el chip en su terminal.',
      usuario_responsable: 'Lucía Fernández (Analista)',
    },
    {
      id_gestion: 'gest_007',
      numero_orden: 'ORD-1006',
      fecha_hora_gestion: formatISO(subHours(2)),
      estado: 'Predesactivado',
      entrega_chip: 'CAC',
      recibio_chip: 'Sin registro de entrega',
      consumo: 'No',
      contactabilidad: 'Contacto no efectivo',
      motivo: 'No contactado',
      tarea_realizada: 'Recordatorio de recolección de la SIM',
      venta_cerrada: 'No',
      observaciones: 'Buzón de voz en 3 intentos consecutivos. Se programa nuevo barrido.',
      usuario_responsable: 'Jorge Ramírez (Analista)',
    },
  ];

  const clientes: Cliente[] = [
    {
      numero_orden: 'ORD-1001',
      fecha_venta: '2026-10-25',
      dn_venta: '3001234501',
      dn_nuevo: '3009876501',
      tipo_venta: 'Portabilidad',
      estatus_enrolamiento: 'Enrolado',
      ciclo: 'Ciclo 1',
      consumo: 'Sí',
      entrega_chip: 'CAC',
      entregado: 'Sí',
      fecha_carga: formatISO(subDays(10)),
      fecha_actualizacion: formatISO(subHours(12)),
      ultima_gestion: gestiones[1],
    },
    {
      numero_orden: 'ORD-1002',
      fecha_venta: '2026-10-27',
      dn_venta: '3001234502',
      dn_nuevo: '3009876502',
      tipo_venta: 'Adición',
      estatus_enrolamiento: 'No Enrolado',
      ciclo: 'Ciclo 5',
      consumo: 'No',
      entrega_chip: 'Domicilio',
      entregado: 'No',
      fecha_carga: formatISO(subDays(8)),
      fecha_actualizacion: formatISO(subDays(3)),
      ultima_gestion: gestiones[2],
    },
    {
      numero_orden: 'ORD-1003',
      fecha_venta: '2026-10-28',
      dn_venta: '3001234503',
      dn_nuevo: '3009876503',
      tipo_venta: 'Migración',
      estatus_enrolamiento: 'Enrolado',
      ciclo: 'Ciclo 10',
      consumo: 'Sí',
      entrega_chip: 'Domicilio',
      entregado: 'Sí',
      fecha_carga: formatISO(subDays(7)),
      fecha_actualizacion: formatISO(subDays(2)),
      ultima_gestion: gestiones[3],
    },
    {
      numero_orden: 'ORD-1004',
      fecha_venta: '2026-10-29',
      dn_venta: '3001234504',
      dn_nuevo: '3009876504',
      tipo_venta: 'Portabilidad',
      estatus_enrolamiento: 'No Enrolado',
      ciclo: 'Ciclo 15',
      consumo: 'No',
      entrega_chip: 'CAC',
      entregado: 'Caída',
      fecha_carga: formatISO(subDays(6)),
      fecha_actualizacion: formatISO(subDays(1)),
      ultima_gestion: gestiones[4],
    },
    {
      numero_orden: 'ORD-1005',
      fecha_venta: '2026-10-30',
      dn_venta: '3001234505',
      dn_nuevo: '3009876505',
      tipo_venta: 'Adición',
      estatus_enrolamiento: 'Enrolado',
      ciclo: 'Ciclo 20',
      consumo: 'No',
      entrega_chip: 'Domicilio',
      entregado: 'No',
      fecha_carga: formatISO(subDays(5)),
      fecha_actualizacion: formatISO(subHours(6)),
      ultima_gestion: gestiones[5],
    },
    {
      numero_orden: 'ORD-1006',
      fecha_venta: '2026-10-31',
      dn_venta: '3001234506',
      dn_nuevo: '3009876506',
      tipo_venta: 'Portabilidad',
      estatus_enrolamiento: 'No Enrolado',
      ciclo: 'Ciclo 25',
      consumo: 'No',
      entrega_chip: 'CAC',
      entregado: 'Caída',
      fecha_carga: formatISO(subDays(4)),
      fecha_actualizacion: formatISO(subHours(2)),
      ultima_gestion: gestiones[6],
    },
    // CLIENTS WITHOUT GESTION (RN05, RN13)
    {
      numero_orden: 'ORD-1007',
      fecha_venta: '2026-11-01',
      dn_venta: '3001234507',
      dn_nuevo: '3009876507',
      tipo_venta: 'Portabilidad',
      estatus_enrolamiento: 'Enrolado',
      ciclo: 'Ciclo 1',
      consumo: 'NA',
      entrega_chip: 'CAC',
      entregado: 'Sí',
      fecha_carga: formatISO(subDays(2)),
      fecha_actualizacion: formatISO(subDays(2)),
      ultima_gestion: null,
    },
    {
      numero_orden: 'ORD-1008',
      fecha_venta: '2026-11-02',
      dn_venta: '3001234508',
      dn_nuevo: '3009876508',
      tipo_venta: 'Migración',
      estatus_enrolamiento: 'No Enrolado',
      ciclo: 'Ciclo 15',
      consumo: 'No',
      entrega_chip: 'Domicilio',
      entregado: 'No',
      fecha_carga: formatISO(subDays(1)),
      fecha_actualizacion: formatISO(subDays(1)),
      ultima_gestion: null,
    },
    {
      numero_orden: 'ORD-1009',
      fecha_venta: '2026-11-03',
      dn_venta: '3001234509',
      dn_nuevo: '3009876509',
      tipo_venta: 'Adición',
      estatus_enrolamiento: 'Enrolado',
      ciclo: 'Ciclo 28',
      consumo: 'Sí',
      entrega_chip: 'CAC',
      entregado: 'Sí',
      fecha_carga: formatISO(subHours(5)),
      fecha_actualizacion: formatISO(subHours(5)),
      ultima_gestion: null,
    },
  ];

  const auditoria: AuditoriaEvento[] = [
    {
      id: 'aud_001',
      fecha_hora: formatISO(subDays(10)),
      usuario: 'Carlos Mendoza (Admin)',
      modulo: 'Carga de Bases',
      accion: 'Carga Inicial TXT',
      detalle: 'Carga inicial de 9 clientes desde archivo de ventas',
    },
    {
      id: 'aud_002',
      fecha_hora: formatISO(subDays(4)),
      usuario: 'Lucía Fernández (Analista)',
      modulo: 'Gestión de Barridos',
      accion: 'Crear Gestión',
      detalle: 'Gestión registrada para orden ORD-1001 (Recordatorio de recolección)',
    },
    {
      id: 'aud_003',
      fecha_hora: formatISO(subHours(12)),
      usuario: 'Lucía Fernández (Analista)',
      modulo: 'Gestión de Barridos',
      accion: 'Cierre de Caso',
      detalle: 'Venta cerrada para orden ORD-1001 (Activa y en uso)',
    },
  ];

  return {
    clientes,
    gestiones,
    catalogos: CATALOGOS_INICIALES,
    usuarios,
    auditoria,
  };
}

// ----------------------------------------------------
// LOCAL STORAGE ADAPTER HELPERS
// ----------------------------------------------------
function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Error writing to localStorage', err);
  }
}

function ensureMockStorageInitialized() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_KEY_CATALOGOS)) {
    setLocal(STORAGE_KEY_CATALOGOS, CATALOGOS_INICIALES);
  }
  if (!localStorage.getItem(STORAGE_KEY_USUARIOS)) {
    setLocal(STORAGE_KEY_USUARIOS, USUARIOS_INICIALES);
  }
  if (!localStorage.getItem(STORAGE_KEY_CLIENTES)) {
    setLocal(STORAGE_KEY_CLIENTES, []);
  }
  if (!localStorage.getItem(STORAGE_KEY_GESTIONES)) {
    setLocal(STORAGE_KEY_GESTIONES, []);
  }
  if (!localStorage.getItem(STORAGE_KEY_AUDITORIA)) {
    setLocal(STORAGE_KEY_AUDITORIA, []);
  }
}

// ----------------------------------------------------
// UNIFIED DATABASE SERVICE
// ----------------------------------------------------
export const dbService = {
  subscribeClientes(callback: (clientes: Cliente[]) => void): () => void {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      const q = collection(firestore, 'clientes');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Cliente[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Cliente);
          });
          callback(list);
        },
        (error) => {
          console.warn('Firestore onSnapshot error, falling back to local store:', error);
          callback(getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []));
        }
      );
      return unsubscribe;
    }

    ensureMockStorageInitialized();
    callback(getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []));

    const handler = () => {
      callback(getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('crm_local_change', handler);
      window.addEventListener('storage', handler);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('crm_local_change', handler);
        window.removeEventListener('storage', handler);
      }
    };
  },

  subscribeGestiones(callback: (gestiones: Gestion[]) => void): () => void {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      const q = query(collection(firestore, 'gestiones'), orderBy('fecha_hora_gestion', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Gestion[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Gestion);
          });
          callback(list);
        },
        (error) => {
          console.warn('Firestore onSnapshot gestiones error:', error);
          callback(getLocal<Gestion[]>(STORAGE_KEY_GESTIONES, []));
        }
      );
      return unsubscribe;
    }

    ensureMockStorageInitialized();
    callback(getLocal<Gestion[]>(STORAGE_KEY_GESTIONES, []));

    const handler = () => {
      callback(getLocal<Gestion[]>(STORAGE_KEY_GESTIONES, []));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('crm_local_change', handler);
      window.addEventListener('storage', handler);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('crm_local_change', handler);
        window.removeEventListener('storage', handler);
      }
    };
  },

  subscribeCatalogos(callback: (catalogos: Catalogos) => void): () => void {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      const unsubscribe = onSnapshot(
        doc(firestore, 'catalogos', 'general'),
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.data() as Catalogos);
          } else {
            callback(CATALOGOS_INICIALES);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot catalogos error:', error);
          callback(getLocal<Catalogos>(STORAGE_KEY_CATALOGOS, CATALOGOS_INICIALES));
        }
      );
      return unsubscribe;
    }

    ensureMockStorageInitialized();
    callback(getLocal<Catalogos>(STORAGE_KEY_CATALOGOS, CATALOGOS_INICIALES));

    const handler = () => {
      callback(getLocal<Catalogos>(STORAGE_KEY_CATALOGOS, CATALOGOS_INICIALES));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('crm_local_change', handler);
      window.addEventListener('storage', handler);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('crm_local_change', handler);
        window.removeEventListener('storage', handler);
      }
    };
  },

  async getClientes(): Promise<Cliente[]> {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'clientes'));
        const list: Cliente[] = [];
        snap.forEach((d) => list.push(d.data() as Cliente));
        return list;
      } catch (e) {
        console.warn('Firestore error in getClientes, falling back:', e);
      }
    }
    ensureMockStorageInitialized();
    return getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []);
  },

  async getCliente(numeroOrden: string): Promise<Cliente | null> {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        const docRef = doc(firestore, 'clientes', numeroOrden);
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data() as Cliente;
      } catch (e) {
        console.warn('Firestore error in getCliente, falling back:', e);
      }
    }
    const clientes = getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []);
    return clientes.find((c) => c.numero_orden === numeroOrden) || null;
  },

  async eliminarCliente(numeroOrden: string, usuarioResponsable: string): Promise<void> {
    const nowISO = new Date().toISOString();
    const firestore = db;

    if (isFirebaseConfigured() && firestore) {
      try {
        await deleteDoc(doc(firestore, 'clientes', numeroOrden));

        const auditId = `aud_${Date.now()}`;
        const auditRef = doc(firestore, 'bitacora_auditoria', auditId);
        await setDoc(auditRef, {
          id: auditId,
          fecha_hora: nowISO,
          usuario: usuarioResponsable,
          modulo: 'Consultas y Filtros',
          accion: 'Eliminación Individual de Cliente',
          detalle: `Cliente con Número de Orden ${numeroOrden} eliminado permanentemente por el Administrador.`,
        });
        return;
      } catch (e) {
        console.warn('Firestore error in eliminarCliente, falling back to local:', e);
      }
    }

    ensureMockStorageInitialized();
    const clientes = getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []);
    const filtrados = clientes.filter((c) => c.numero_orden !== numeroOrden);
    setLocal(STORAGE_KEY_CLIENTES, filtrados);

    const auditoria = getLocal<AuditoriaEvento[]>(STORAGE_KEY_AUDITORIA, []);
    auditoria.unshift({
      id: `aud_${Date.now()}`,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Consultas y Filtros',
      accion: 'Eliminación Individual de Cliente',
      detalle: `Cliente con Número de Orden ${numeroOrden} eliminado permanentemente por el Administrador.`,
    });
    setLocal(STORAGE_KEY_AUDITORIA, auditoria);

    emitLocalDbChange('cliente_eliminado');
  },

  async eliminarClientesMasivo(numerosOrden: string[], usuarioResponsable: string): Promise<number> {
    const nowISO = new Date().toISOString();
    const firestore = db;
    const count = numerosOrden.length;
    if (count === 0) return 0;

    if (isFirebaseConfigured() && firestore) {
      try {
        const chunkSize = 400;
        for (let i = 0; i < numerosOrden.length; i += chunkSize) {
          const batch = writeBatch(firestore);
          const chunk = numerosOrden.slice(i, i + chunkSize);
          chunk.forEach((num) => {
            batch.delete(doc(firestore, 'clientes', num));
          });
          await batch.commit();
        }

        const auditId = `aud_${Date.now()}`;
        const auditRef = doc(firestore, 'bitacora_auditoria', auditId);
        await setDoc(auditRef, {
          id: auditId,
          fecha_hora: nowISO,
          usuario: usuarioResponsable,
          modulo: 'Consultas y Filtros',
          accion: 'Eliminación Masiva de Clientes',
          detalle: `Eliminación masiva de ${count} clientes: ${numerosOrden.slice(0, 5).join(', ')}${count > 5 ? '...' : ''} por el Administrador.`,
        });

        return count;
      } catch (e) {
        console.warn('Firestore error in eliminarClientesMasivo, falling back to local:', e);
      }
    }

    ensureMockStorageInitialized();
    const clientes = getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []);
    const setOrd = new Set(numerosOrden);
    const filtrados = clientes.filter((c) => !setOrd.has(c.numero_orden));
    setLocal(STORAGE_KEY_CLIENTES, filtrados);

    const auditoria = getLocal<AuditoriaEvento[]>(STORAGE_KEY_AUDITORIA, []);
    auditoria.unshift({
      id: `aud_${Date.now()}`,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Consultas y Filtros',
      accion: 'Eliminación Masiva de Clientes',
      detalle: `Eliminación masiva de ${count} clientes: ${numerosOrden.slice(0, 5).join(', ')}${count > 5 ? '...' : ''} por el Administrador.`,
    });
    setLocal(STORAGE_KEY_AUDITORIA, auditoria);

    emitLocalDbChange('clientes_eliminados_masivo');
    return count;
  },

  async getGestionesCliente(numeroOrden: string): Promise<Gestion[]> {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        const q = query(
          collection(firestore, 'gestiones'),
          where('numero_orden', '==', numeroOrden),
          orderBy('fecha_hora_gestion', 'desc')
        );
        const snap = await getDocs(q);
        const list: Gestion[] = [];
        snap.forEach((d) => list.push(d.data() as Gestion));
        return list;
      } catch (e) {
        console.warn('Firestore query gestiones error:', e);
      }
    }
    ensureMockStorageInitialized();
    const gestiones = getLocal<Gestion[]>(STORAGE_KEY_GESTIONES, []);
    return gestiones
      .filter((g) => g.numero_orden === numeroOrden)
      .sort((a, b) => new Date(b.fecha_hora_gestion).getTime() - new Date(a.fecha_hora_gestion).getTime());
  },

  async getAllGestiones(): Promise<Gestion[]> {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        const q = query(collection(firestore, 'gestiones'), orderBy('fecha_hora_gestion', 'desc'));
        const snap = await getDocs(q);
        const list: Gestion[] = [];
        snap.forEach((d) => list.push(d.data() as Gestion));
        return list;
      } catch (e) {
        console.warn('Firestore getAllGestiones error:', e);
      }
    }
    ensureMockStorageInitialized();
    const gestiones = getLocal<Gestion[]>(STORAGE_KEY_GESTIONES, []);
    return [...gestiones].sort(
      (a, b) => new Date(b.fecha_hora_gestion).getTime() - new Date(a.fecha_hora_gestion).getTime()
    );
  },

  async crearGestion(
    data: Omit<Gestion, 'id_gestion' | 'fecha_hora_gestion'>,
    usuarioResponsable: string
  ): Promise<Gestion> {
    const nowISO = new Date().toISOString();
    const id_gestion = `gest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const nuevaGestion: Gestion = {
      ...data,
      id_gestion,
      fecha_hora_gestion: nowISO,
      usuario_responsable: usuarioResponsable,
    };

    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        await runTransaction(firestore, async (tx) => {
          const gestionRef = doc(firestore, 'gestiones', id_gestion);
          tx.set(gestionRef, nuevaGestion);

          const clienteRef = doc(firestore, 'clientes', data.numero_orden);
          tx.update(clienteRef, {
            ultima_gestion: nuevaGestion,
            fecha_actualizacion: nowISO,
          });

          const auditId = `aud_${Date.now()}`;
          const auditRef = doc(firestore, 'bitacora_auditoria', auditId);
          tx.set(auditRef, {
            id: auditId,
            fecha_hora: nowISO,
            usuario: usuarioResponsable,
            modulo: 'Gestión de Barridos',
            accion: data.venta_cerrada === 'Sí' ? 'Cierre de Caso' : 'Registro de Gestión',
            detalle: `Gestión registrada para orden ${data.numero_orden}. Motivo: ${data.motivo}. Venta Cerrada: ${data.venta_cerrada}.`,
          });
        });
        return nuevaGestion;
      } catch (e) {
        console.warn('Firestore transaction error, using local fallback:', e);
      }
    }

    // Local Storage fallback
    ensureMockStorageInitialized();
    const gestiones = getLocal<Gestion[]>(STORAGE_KEY_GESTIONES, []);
    gestiones.unshift(nuevaGestion);
    setLocal(STORAGE_KEY_GESTIONES, gestiones);

    const clientes = getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []);
    const idx = clientes.findIndex((c) => c.numero_orden === data.numero_orden);
    if (idx !== -1) {
      clientes[idx] = {
        ...clientes[idx],
        ultima_gestion: nuevaGestion,
        fecha_actualizacion: nowISO,
      };
      setLocal(STORAGE_KEY_CLIENTES, clientes);
    }

    const auditoria = getLocal<AuditoriaEvento[]>(STORAGE_KEY_AUDITORIA, []);
    auditoria.unshift({
      id: `aud_${Date.now()}`,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Gestión de Barridos',
      accion: data.venta_cerrada === 'Sí' ? 'Cierre de Caso' : 'Registro de Gestión',
      detalle: `Gestión registrada para orden ${data.numero_orden}. Motivo: ${data.motivo}. Venta Cerrada: ${data.venta_cerrada}.`,
    });
    setLocal(STORAGE_KEY_AUDITORIA, auditoria);

    emitLocalDbChange('gestion_creada');
    return nuevaGestion;
  },

  async procesarCargaBase(lineas: string[], usuarioResponsable: string): Promise<CargaResumen> {
    const resumen: CargaResumen = {
      totalLeidos: 0,
      creados: 0,
      actualizados: 0,
      errores: [],
    };

    const nowISO = new Date().toISOString();
    const tiposVentaValidos: TipoVenta[] = ['Portabilidad', 'Adición', 'Migración'];
    const estatusValidos: EstatusEnrolamiento[] = ['Enrolado', 'No Enrolado'];

    const clientesActuales = await this.getClientes();
    const clienteMap = new Map<string, Cliente>(
      clientesActuales.map((c) => [c.numero_orden.trim().toUpperCase(), c])
    );

    const operacionesNuevas: Cliente[] = [];
    const operacionesActualizar: {
      numero_orden: string;
      estatus: EstatusEnrolamiento;
      ciclo?: string;
      consumo?: string;
      entrega_chip?: string;
      entregado?: string;
    }[] = [];

    lineas.forEach((linea, index) => {
      const numLinea = index + 1;
      const trimLine = linea.trim();
      if (!trimLine) return;

      if (
        trimLine.toLowerCase().includes('fecha venta') &&
        trimLine.toLowerCase().includes('número de orden')
      ) {
        return;
      }

      resumen.totalLeidos++;

      let delimiter = '|';
      if (!trimLine.includes('|') && trimLine.includes('\t')) delimiter = '\t';
      else if (!trimLine.includes('|') && trimLine.includes(',')) delimiter = ',';

      const parts = trimLine.split(delimiter).map((p) => p.trim());
      if (parts.length < 6) {
        resumen.errores.push({
          linea: numLinea,
          razon: `Fila incompleta. Se esperan las 10 columnas: Fecha Venta | DN Venta | DN Nuevo | Orden | Tipo Venta | Estatus | Ciclo | Consumo | Entrega Chip | Entregado. Se recibieron ${parts.length}.`,
          contenido: trimLine,
        });
        return;
      }

      const [
        fechaVenta,
        dnVenta,
        dnNuevo,
        numeroOrdenRaw,
        tipoVentaRaw,
        estatusRaw,
        cicloRaw,
        consumoRaw,
        entregaChipRaw,
        entregadoRaw,
      ] = parts;
      const numeroOrden = numeroOrdenRaw.trim();
      const ciclo = cicloRaw ? cicloRaw.trim() : '';
      const consumo = consumoRaw ? consumoRaw.trim() : 'NA';
      const entregaChip = entregaChipRaw ? entregaChipRaw.trim() : 'CAC';

      // Normalizar 'entregado': Sí / No / Caída
      let entregado = '';
      if (entregadoRaw) {
        const entLower = entregadoRaw.trim().toLowerCase();
        if (entLower === 'si' || entLower === 'sí') {
          entregado = 'Sí';
        } else if (entLower === 'no') {
          entregado = 'No';
        } else if (entLower === 'caída' || entLower === 'caida') {
          entregado = 'Caída';
        } else {
          entregado = entregadoRaw.trim();
        }
      }

      if (!numeroOrden) {
        resumen.errores.push({
          linea: numLinea,
          razon: 'El Número de Orden es obligatorio.',
          contenido: trimLine,
        });
        return;
      }

      let tipoVenta: TipoVenta = 'Portabilidad';
      const tvMatch = tiposVentaValidos.find(
        (t) => t.toLowerCase() === tipoVentaRaw.toLowerCase()
      );
      if (tvMatch) {
        tipoVenta = tvMatch;
      } else {
        resumen.errores.push({
          linea: numLinea,
          razon: `Tipo de Venta no válido: "${tipoVentaRaw}". Permitidos: Portabilidad, Adición, Migración.`,
          contenido: trimLine,
        });
        return;
      }

      let estatus: EstatusEnrolamiento = 'No Enrolado';
      const estMatch = estatusValidos.find(
        (e) => e.toLowerCase() === estatusRaw.toLowerCase()
      );
      if (estMatch) {
        estatus = estMatch;
      } else {
        resumen.errores.push({
          linea: numLinea,
          razon: `Estatus de Enrolamiento no válido: "${estatusRaw}". Permitidos: Enrolado, No Enrolado.`,
          contenido: trimLine,
        });
        return;
      }

      const key = numeroOrden.toUpperCase();
      if (clienteMap.has(key)) {
        operacionesActualizar.push({
          numero_orden: clienteMap.get(key)!.numero_orden,
          estatus,
          ciclo: ciclo || clienteMap.get(key)!.ciclo || '',
          consumo: consumo !== 'NA' ? consumo : (clienteMap.get(key)!.consumo || 'NA'),
          entrega_chip: entregaChip !== 'CAC' ? entregaChip : (clienteMap.get(key)!.entrega_chip || 'CAC'),
          entregado: entregado || clienteMap.get(key)!.entregado || '',
        });
        resumen.actualizados++;
      } else {
        const nuevoCliente: Cliente = {
          numero_orden: numeroOrden,
          fecha_venta: fechaVenta || nowISO.split('T')[0],
          dn_venta: dnVenta || '',
          dn_nuevo: dnNuevo || '',
          tipo_venta: tipoVenta,
          estatus_enrolamiento: estatus,
          ciclo: ciclo,
          consumo: consumo,
          entrega_chip: entregaChip,
          entregado: entregado,
          fecha_carga: nowISO,
          fecha_actualizacion: nowISO,
          ultima_gestion: null,
        };
        operacionesNuevas.push(nuevoCliente);
        clienteMap.set(key, nuevoCliente);
        resumen.creados++;
      }
    });

    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        const chunkSize = 400;

        // Escribir registros nuevos en lotes seguros (máximo 400 por batch en Firestore)
        for (let i = 0; i < operacionesNuevas.length; i += chunkSize) {
          const batch = writeBatch(firestore);
          const chunk = operacionesNuevas.slice(i, i + chunkSize);
          chunk.forEach((c) => {
            const ref = doc(firestore, 'clientes', c.numero_orden);
            batch.set(ref, c);
          });
          await batch.commit();
        }

        // Actualizar registros existentes en lotes seguros
        for (let i = 0; i < operacionesActualizar.length; i += chunkSize) {
          const batch = writeBatch(firestore);
          const chunk = operacionesActualizar.slice(i, i + chunkSize);
          chunk.forEach((u) => {
            const ref = doc(firestore, 'clientes', u.numero_orden);
            batch.update(ref, {
              estatus_enrolamiento: u.estatus,
              ...(u.ciclo ? { ciclo: u.ciclo } : {}),
              ...(u.consumo ? { consumo: u.consumo } : {}),
              ...(u.entrega_chip ? { entrega_chip: u.entrega_chip } : {}),
              ...(u.entregado ? { entregado: u.entregado } : {}),
              fecha_actualizacion: nowISO,
            });
          });
          await batch.commit();
        }

        // Registrar evento de auditoría en Firestore
        const auditId = `aud_${Date.now()}`;
        const auditRef = doc(firestore, 'bitacora_auditoria', auditId);
        await setDoc(auditRef, {
          id: auditId,
          fecha_hora: nowISO,
          usuario: usuarioResponsable,
          modulo: 'Carga de Bases',
          accion: 'Procesamiento de Archivo',
          detalle: `Carga de base finalizada: ${resumen.totalLeidos} leídos, ${resumen.creados} nuevos, ${resumen.actualizados} actualizados, ${resumen.errores.length} errores sincronizados en Firestore.`,
        });

        return resumen;
      } catch (err) {
        console.warn('Error in Firestore batch carga base, falling back to local:', err);
      }
    }

    ensureMockStorageInitialized();
    const stored = getLocal<Cliente[]>(STORAGE_KEY_CLIENTES, []);
    const storedMap = new Map<string, Cliente>(
      stored.map((c) => [c.numero_orden.toUpperCase(), c])
    );

    operacionesNuevas.forEach((c) => storedMap.set(c.numero_orden.toUpperCase(), c));
    operacionesActualizar.forEach((u) => {
      const existing = storedMap.get(u.numero_orden.toUpperCase());
      if (existing) {
        storedMap.set(u.numero_orden.toUpperCase(), {
          ...existing,
          estatus_enrolamiento: u.estatus,
          ...(u.ciclo ? { ciclo: u.ciclo } : {}),
          ...(u.consumo ? { consumo: u.consumo } : {}),
          ...(u.entrega_chip ? { entrega_chip: u.entrega_chip } : {}),
          ...(u.entregado ? { entregado: u.entregado } : {}),
          fecha_actualizacion: nowISO,
        });
      }
    });

    setLocal(STORAGE_KEY_CLIENTES, Array.from(storedMap.values()));

    const auditoria = getLocal<AuditoriaEvento[]>(STORAGE_KEY_AUDITORIA, []);
    auditoria.unshift({
      id: `aud_${Date.now()}`,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Carga de Bases',
      accion: 'Procesamiento TXT',
      detalle: `Carga de archivo finalizada: ${resumen.totalLeidos} leídos, ${resumen.creados} nuevos, ${resumen.actualizados} actualizados, ${resumen.errores.length} errores.`,
    });
    setLocal(STORAGE_KEY_AUDITORIA, auditoria);

    emitLocalDbChange('carga_base');
    return resumen;
  },

  async getCatalogos(): Promise<Catalogos> {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        const docRef = doc(firestore, 'catalogos', 'general');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as Catalogos;
        }
      } catch (e) {
        console.warn('Firestore getCatalogos error:', e);
      }
    }
    ensureMockStorageInitialized();
    return getLocal<Catalogos>(STORAGE_KEY_CATALOGOS, CATALOGOS_INICIALES);
  },

  async guardarCatalogos(catalogos: Catalogos, usuarioResponsable: string): Promise<void> {
    const nowISO = new Date().toISOString();
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        await setDoc(doc(firestore, 'catalogos', 'general'), catalogos);
        const auditId = `aud_${Date.now()}`;
        await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
          id: auditId,
          fecha_hora: nowISO,
          usuario: usuarioResponsable,
          modulo: 'Administración de Catálogos',
          accion: 'Actualización de Catálogos',
          detalle: 'Modificación de valores en los catálogos del sistema.',
        });
        return;
      } catch (e) {
        console.warn('Firestore guardarCatalogos error:', e);
      }
    }
    setLocal(STORAGE_KEY_CATALOGOS, catalogos);
    const auditoria = getLocal<AuditoriaEvento[]>(STORAGE_KEY_AUDITORIA, []);
    auditoria.unshift({
      id: `aud_${Date.now()}`,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Administración de Catálogos',
      accion: 'Actualización de Catálogos',
      detalle: 'Modificación de valores en los catálogos del sistema.',
    });
    setLocal(STORAGE_KEY_AUDITORIA, auditoria);
    emitLocalDbChange('catalogos_update');
  },

  async getUsuarios(): Promise<Usuario[]> {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'usuarios'));
        const list: Usuario[] = [];
        snap.forEach((d) => list.push(d.data() as Usuario));

        // Si la colección de usuarios está vacía en Firestore, registrar usuarios por defecto
        if (list.length === 0) {
          const batch = writeBatch(firestore);
          USUARIOS_INICIALES.forEach((u) => {
            const ref = doc(firestore, 'usuarios', u.uid);
            batch.set(ref, u);
          });
          await batch.commit();
          return USUARIOS_INICIALES;
        }

        // Asegurar que todos los usuarios existentes tengan contraseñas asignadas
        let needsBatchUpdate = false;
        const batch = writeBatch(firestore);

        const updatedList = list.map((user) => {
          if (!user.password) {
            const defaultMatch = USUARIOS_INICIALES.find(
              (u) => u.email.toLowerCase() === user.email.toLowerCase()
            );
            const fallbackPass =
              defaultMatch?.password ||
              (user.rol === 'Administrador'
                ? 'Admin123*'
                : user.rol === 'Analista'
                ? 'Analista123*'
                : 'Consulta123*');

            needsBatchUpdate = true;
            try {
              batch.update(doc(firestore, 'usuarios', user.uid), {
                password: fallbackPass,
              });
            } catch {
              // ignore
            }
            return { ...user, password: fallbackPass };
          }
          return user;
        });

        // Asegurar que los 3 perfiles oficiales existan en Firestore
        USUARIOS_INICIALES.forEach((initUser) => {
          const exists = updatedList.some(
            (u) => u.email.toLowerCase() === initUser.email.toLowerCase()
          );
          if (!exists) {
            needsBatchUpdate = true;
            try {
              batch.set(doc(firestore, 'usuarios', initUser.uid), initUser);
              updatedList.push(initUser);
            } catch {
              // ignore
            }
          }
        });

        if (needsBatchUpdate) {
          await batch.commit().catch((e) => console.warn('Batch update users error:', e));
        }

        return updatedList;
      } catch (e) {
        console.warn('Firestore getUsuarios error:', e);
      }
    }

    ensureMockStorageInitialized();
    const localUsers = getLocal<Usuario[]>(STORAGE_KEY_USUARIOS, USUARIOS_INICIALES);
    const enriched = localUsers.map((u) => {
      if (!u.password) {
        const def = USUARIOS_INICIALES.find((i) => i.email.toLowerCase() === u.email.toLowerCase());
        return {
          ...u,
          password:
            def?.password ||
            (u.rol === 'Administrador'
              ? 'Admin123*'
              : u.rol === 'Analista'
              ? 'Analista123*'
              : 'Consulta123*'),
        };
      }
      return u;
    });

    USUARIOS_INICIALES.forEach((initUser) => {
      if (!enriched.some((u) => u.email.toLowerCase() === initUser.email.toLowerCase())) {
        enriched.push(initUser);
      }
    });

    setLocal(STORAGE_KEY_USUARIOS, enriched);
    return enriched;
  },

  async guardarUsuario(usuario: Usuario, adminResponsable: string): Promise<void> {
    const nowISO = new Date().toISOString();
    const firestore = db;

    // Si Firebase Auth está activo y se proporcionó contraseña, crear usuario en Firebase Authentication
    if (isFirebaseConfigured() && usuario.password) {
      try {
        const secApp = initializeApp(firebaseConfig, `user_app_${Date.now()}`);
        const secAuth = getAuth(secApp);
        const cred = await createUserWithEmailAndPassword(secAuth, usuario.email, usuario.password);
        usuario.uid = cred.user.uid;
        await deleteApp(secApp);
      } catch (authErr: any) {
        // Puede que ya exista en Auth o sea actualización de perfil
        console.warn('Firebase Auth user creation notice:', authErr.message);
      }
    }

    if (isFirebaseConfigured() && firestore) {
      try {
        await setDoc(doc(firestore, 'usuarios', usuario.uid), usuario);
        const auditId = `aud_${Date.now()}`;
        await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
          id: auditId,
          fecha_hora: nowISO,
          usuario: adminResponsable,
          modulo: 'Administración de Usuarios',
          accion: 'Guardar Usuario',
          detalle: `Usuario ${usuario.email} (${usuario.rol}) registrado o actualizado en Firestore.`,
        });
        return;
      } catch (e) {
        console.warn('Firestore guardarUsuario error:', e);
      }
    }

    ensureMockStorageInitialized();
    const list = getLocal<Usuario[]>(STORAGE_KEY_USUARIOS, USUARIOS_INICIALES);
    const idx = list.findIndex((u) => u.uid === usuario.uid || u.email.toLowerCase() === usuario.email.toLowerCase());
    if (idx !== -1) {
      list[idx] = usuario;
    } else {
      list.unshift(usuario);
    }
    setLocal(STORAGE_KEY_USUARIOS, list);

    const auditoria = getLocal<AuditoriaEvento[]>(STORAGE_KEY_AUDITORIA, []);
    auditoria.unshift({
      id: `aud_${Date.now()}`,
      fecha_hora: nowISO,
      usuario: adminResponsable,
      modulo: 'Administración de Usuarios',
      accion: 'Guardar Usuario',
      detalle: `Usuario ${usuario.email} (${usuario.rol}) registrado o actualizado.`,
    });
    setLocal(STORAGE_KEY_AUDITORIA, auditoria);
    emitLocalDbChange('usuario_guardado');
  },

  async eliminarUsuario(uid: string, adminResponsable: string): Promise<void> {
    const firestore = db;
    const nowISO = new Date().toISOString();
    if (isFirebaseConfigured() && firestore) {
      try {
        await deleteDoc(doc(firestore, 'usuarios', uid));
        const auditId = `aud_${Date.now()}`;
        await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
          id: auditId,
          fecha_hora: nowISO,
          usuario: adminResponsable,
          modulo: 'Administración de Usuarios',
          accion: 'Eliminar Usuario',
          detalle: `Usuario con identificador ${uid} eliminado por el Administrador.`,
        });
        return;
      } catch (e) {
        console.warn('Firestore eliminarUsuario error:', e);
      }
    }
    const list = getLocal<Usuario[]>(STORAGE_KEY_USUARIOS, USUARIOS_INICIALES);
    setLocal(STORAGE_KEY_USUARIOS, list.filter((u) => u.uid !== uid));
    emitLocalDbChange('usuario_eliminado');
  },

  async getBitacora(): Promise<AuditoriaEvento[]> {
    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        const q = query(collection(firestore, 'bitacora_auditoria'), orderBy('fecha_hora', 'desc'));
        const snap = await getDocs(q);
        const list: AuditoriaEvento[] = [];
        snap.forEach((d) => list.push(d.data() as AuditoriaEvento));
        return list;
      } catch (e) {
        console.warn('Firestore getBitacora error:', e);
      }
    }
    ensureMockStorageInitialized();
    return getLocal<AuditoriaEvento[]>(STORAGE_KEY_AUDITORIA, []);
  },

  async registrarAuditoria(
    evento: Omit<AuditoriaEvento, 'id' | 'fecha_hora'>
  ): Promise<void> {
    const nowISO = new Date().toISOString();
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullEvento: AuditoriaEvento = {
      id,
      fecha_hora: nowISO,
      ...evento,
    };

    const firestore = db;
    if (isFirebaseConfigured() && firestore) {
      try {
        await setDoc(doc(firestore, 'bitacora_auditoria', id), fullEvento);
        return;
      } catch (e) {
        console.warn('Firestore registrarAuditoria error:', e);
      }
    }

    const list = getLocal<AuditoriaEvento[]>(STORAGE_KEY_AUDITORIA, []);
    list.unshift(fullEvento);
    setLocal(STORAGE_KEY_AUDITORIA, list);
    emitLocalDbChange('auditoria');
  },
};
