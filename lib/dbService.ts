import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';
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

// Helper para obtener la instancia activa de Firestore o lanzar error descriptivo
function getFirestoreDb() {
  if (!db) {
    throw new Error(
      'Cloud Firestore no está inicializado. Verifica las credenciales de Firebase en lib/firebase.ts o en las variables de entorno.'
    );
  }
  return db;
}

// ----------------------------------------------------
// SERVICIO DE BASE DE DATOS ONLINE (CLOUD FIRESTORE)
// 100% Sincronizado en tiempo real sin almacenamiento mock/local
// ----------------------------------------------------
export const dbService = {
  // 1. Suscripción en Tiempo Real a Clientes (RN12)
  subscribeClientes(
    callback: (clientes: Cliente[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const firestore = getFirestoreDb();
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
        console.error('[Firestore] Error onSnapshot clientes:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  },

  // 2. Suscripción en Tiempo Real a Gestiones (RN02, RN12)
  subscribeGestiones(
    callback: (gestiones: Gestion[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const firestore = getFirestoreDb();
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
        console.error('[Firestore] Error onSnapshot gestiones:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  },

  // 3. Suscripción en Tiempo Real a Catálogos Dinámicos
  subscribeCatalogos(
    callback: (catalogos: Catalogos) => void,
    onError?: (err: Error) => void
  ): () => void {
    const firestore = getFirestoreDb();
    const unsubscribe = onSnapshot(
      doc(firestore, 'catalogos', 'general'),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as Catalogos);
        } else {
          // Inicializar catálogos si no existen en Firestore
          setDoc(doc(firestore, 'catalogos', 'general'), CATALOGOS_INICIALES).catch(console.error);
          callback(CATALOGOS_INICIALES);
        }
      },
      (error) => {
        console.error('[Firestore] Error onSnapshot catalogos:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  },

  // 4. Suscripción en Tiempo Real a Usuarios
  subscribeUsuarios(
    callback: (usuarios: Usuario[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const firestore = getFirestoreDb();
    const unsubscribe = onSnapshot(
      collection(firestore, 'usuarios'),
      (snapshot) => {
        const list: Usuario[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Usuario);
        });
        callback(list);
      },
      (error) => {
        console.error('[Firestore] Error onSnapshot usuarios:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  },

  // Obtener lista completa de Clientes
  async getClientes(): Promise<Cliente[]> {
    const firestore = getFirestoreDb();
    const snap = await getDocs(collection(firestore, 'clientes'));
    const list: Cliente[] = [];
    snap.forEach((d) => list.push(d.data() as Cliente));
    return list;
  },

  // Obtener un Cliente específico por su Número de Orden
  async getCliente(numeroOrden: string): Promise<Cliente | null> {
    const firestore = getFirestoreDb();
    const docRef = doc(firestore, 'clientes', numeroOrden);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Cliente;
    }
    return null;
  },

  // Eliminar Cliente individual
  async eliminarCliente(numeroOrden: string, usuarioResponsable: string): Promise<void> {
    const firestore = getFirestoreDb();
    const nowISO = new Date().toISOString();

    await deleteDoc(doc(firestore, 'clientes', numeroOrden));

    const auditId = `aud_${Date.now()}`;
    await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
      id: auditId,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Consultas y Filtros',
      accion: 'Eliminación Individual de Cliente',
      detalle: `Cliente con Número de Orden ${numeroOrden} eliminado de Cloud Firestore por el Administrador.`,
    });
  },

  // Eliminación Masiva de Clientes
  async eliminarClientesMasivo(numerosOrden: string[], usuarioResponsable: string): Promise<number> {
    const firestore = getFirestoreDb();
    const nowISO = new Date().toISOString();
    const count = numerosOrden.length;
    if (count === 0) return 0;

    // Procesar en chunks de 450 por lote
    const chunkSize = 450;
    for (let i = 0; i < numerosOrden.length; i += chunkSize) {
      const batch = writeBatch(firestore);
      const chunk = numerosOrden.slice(i, i + chunkSize);
      chunk.forEach((num) => {
        batch.delete(doc(firestore, 'clientes', num));
      });
      await batch.commit();
    }

    const auditId = `aud_${Date.now()}`;
    await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
      id: auditId,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Consultas y Filtros',
      accion: 'Eliminación Masiva de Clientes',
      detalle: `Eliminación masiva de ${count} clientes en Cloud Firestore por el Administrador.`,
    });

    return count;
  },

  // Obtener Histórico de Gestiones de un Cliente específico (RN14)
  async getGestionesCliente(numeroOrden: string): Promise<Gestion[]> {
    const firestore = getFirestoreDb();
    const q = query(
      collection(firestore, 'gestiones'),
      where('numero_orden', '==', numeroOrden),
      orderBy('fecha_hora_gestion', 'desc')
    );
    const snap = await getDocs(q);
    const list: Gestion[] = [];
    snap.forEach((d) => list.push(d.data() as Gestion));
    return list;
  },

  // Obtener todas las gestiones
  async getAllGestiones(): Promise<Gestion[]> {
    const firestore = getFirestoreDb();
    const q = query(collection(firestore, 'gestiones'), orderBy('fecha_hora_gestion', 'desc'));
    const snap = await getDocs(q);
    const list: Gestion[] = [];
    snap.forEach((d) => list.push(d.data() as Gestion));
    return list;
  },

  // Crear Gestión (RN02, RN03, RN07, RN10, RN11, RN12)
  async crearGestion(
    data: Omit<Gestion, 'id_gestion' | 'fecha_hora_gestion'>,
    usuarioResponsable: string
  ): Promise<Gestion> {
    const firestore = getFirestoreDb();
    const nowISO = new Date().toISOString();
    const id_gestion = `gest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const nuevaGestion: Gestion = {
      ...data,
      id_gestion,
      fecha_hora_gestion: nowISO,
      usuario_responsable: usuarioResponsable,
    };

    // Usar writeBatch para operación atómica en Firestore:
    // 1. Guardar nueva gestión inmutable
    // 2. Actualizar última gestión del cliente para refrescar Dashboard en tiempo real
    // 3. Registrar en bitácora de auditoría
    const batch = writeBatch(firestore);

    const gestionRef = doc(firestore, 'gestiones', id_gestion);
    batch.set(gestionRef, nuevaGestion);

    const clienteRef = doc(firestore, 'clientes', data.numero_orden);
    batch.update(clienteRef, {
      ultima_gestion: nuevaGestion,
      fecha_actualizacion: nowISO,
    });

    const auditId = `aud_${Date.now()}`;
    const auditRef = doc(firestore, 'bitacora_auditoria', auditId);
    batch.set(auditRef, {
      id: auditId,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Gestión de Barridos',
      accion: data.venta_cerrada === 'Sí' ? 'Cierre de Caso' : 'Registro de Gestión',
      detalle: `Gestión registrada para orden ${data.numero_orden}. Motivo: ${data.motivo}. Venta Cerrada: ${data.venta_cerrada}.`,
    });

    await batch.commit();
    return nuevaGestion;
  },

  // Carga de Bases Online en Chunks de 450 con Cruce en Firestore (RN01, RN08, RN09)
  async procesarCargaBase(
    lineas: string[],
    usuarioResponsable: string,
    onProgress?: (progreso: number, detalle: string) => void
  ): Promise<CargaResumen> {
    const firestore = getFirestoreDb();
    const resumen: CargaResumen = {
      totalLeidos: 0,
      creados: 0,
      actualizados: 0,
      errores: [],
    };

    const nowISO = new Date().toISOString();
    const tiposVentaValidos: TipoVenta[] = ['Portabilidad', 'Adición', 'Migración'];
    const estatusValidos: EstatusEnrolamiento[] = ['Enrolado', 'No Enrolado'];

    if (onProgress) onProgress(5, 'Consultando clientes existentes en Cloud Firestore...');

    // Consultar todos los clientes existentes en Firestore para cruce exacto en la nube
    const clientesSnap = await getDocs(collection(firestore, 'clientes'));
    const clienteExistenteMap = new Map<string, Cliente>();
    clientesSnap.forEach((d) => {
      const cl = d.data() as Cliente;
      clienteExistenteMap.set(cl.numero_orden.trim().toUpperCase(), cl);
    });

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

      // Omitir encabezados
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
          razon: `Fila incompleta. Se esperan columnas: Fecha Venta | DN Venta | DN Nuevo | Orden | Tipo Venta | Estatus | Ciclo | Consumo | Entrega Chip | Entregado. Se recibieron ${parts.length}.`,
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
      const cicloProvided = cicloRaw !== undefined && cicloRaw.trim() !== '';
      const consumoProvided = consumoRaw !== undefined && consumoRaw.trim() !== '';
      const entregaChipProvided = entregaChipRaw !== undefined && entregaChipRaw.trim() !== '';
      const entregadoProvided = entregadoRaw !== undefined && entregadoRaw.trim() !== '';

      const ciclo = cicloProvided ? cicloRaw!.trim() : '';

      let consumo = 'NA';
      if (consumoProvided) {
        const consLower = consumoRaw!.trim().toLowerCase();
        if (consLower === 'si' || consLower === 'sí') {
          consumo = 'Sí';
        } else if (consLower === 'no') {
          consumo = 'No';
        } else if (consLower === 'na' || consLower === 'n/a') {
          consumo = 'NA';
        } else {
          consumo = consumoRaw!.trim();
        }
      }

      let entregaChip = 'CAC';
      if (entregaChipProvided) {
        const ecLower = entregaChipRaw!.trim().toLowerCase();
        if (ecLower === 'cac') {
          entregaChip = 'CAC';
        } else if (ecLower === 'domicilio') {
          entregaChip = 'Domicilio';
        } else {
          entregaChip = entregaChipRaw!.trim();
        }
      }

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
      if (clienteExistenteMap.has(key)) {
        // REGISTRO EXISTENTE: Actualizar únicamente Estatus, Ciclo, Consumo, Entrega de Chip y Entregado (RN08, RN09)
        const clienteActual = clienteExistenteMap.get(key)!;
        operacionesActualizar.push({
          numero_orden: clienteActual.numero_orden,
          estatus,
          ciclo: cicloProvided ? ciclo : (clienteActual.ciclo ?? ''),
          consumo: consumoProvided ? consumo : (clienteActual.consumo ?? 'NA'),
          entrega_chip: entregaChipProvided ? entregaChip : (clienteActual.entrega_chip ?? 'CAC'),
          entregado: entregadoProvided ? entregado : (clienteActual.entregado ?? ''),
        });
        resumen.actualizados++;
      } else {
        // REGISTRO NUEVO: Crear con estado inicial Sin Gestión (RN05)
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
        clienteExistenteMap.set(key, nuevoCliente);
        resumen.creados++;
      }
    });

    const totalOperaciones = operacionesNuevas.length + operacionesActualizar.length;
    let operacionesProcesadas = 0;
    const CHUNK_SIZE = 450; // Límite estricto de seguridad para Firestore writeBatch (máx 500)

    // 1. Guardar registros nuevos en Firestore en bloques de 450
    for (let i = 0; i < operacionesNuevas.length; i += CHUNK_SIZE) {
      const batch = writeBatch(firestore);
      const chunk = operacionesNuevas.slice(i, i + CHUNK_SIZE);
      chunk.forEach((c) => {
        const ref = doc(firestore, 'clientes', c.numero_orden);
        batch.set(ref, c);
      });
      await batch.commit();
      operacionesProcesadas += chunk.length;
      if (onProgress) {
        const pct = Math.min(95, Math.round((operacionesProcesadas / Math.max(1, totalOperaciones)) * 100));
        onProgress(pct, `Guardando registros nuevos en Cloud Firestore (${operacionesProcesadas} de ${totalOperaciones})...`);
      }
    }

    // 2. Actualizar registros existentes en Firestore en bloques de 450
    for (let i = 0; i < operacionesActualizar.length; i += CHUNK_SIZE) {
      const batch = writeBatch(firestore);
      const chunk = operacionesActualizar.slice(i, i + CHUNK_SIZE);
      chunk.forEach((u) => {
        const ref = doc(firestore, 'clientes', u.numero_orden);
        batch.update(ref, {
          estatus_enrolamiento: u.estatus,
          ...(u.ciclo !== undefined ? { ciclo: u.ciclo } : {}),
          ...(u.consumo !== undefined ? { consumo: u.consumo } : {}),
          ...(u.entrega_chip !== undefined ? { entrega_chip: u.entrega_chip } : {}),
          ...(u.entregado !== undefined ? { entregado: u.entregado } : {}),
          fecha_actualizacion: nowISO,
        });
      });
      await batch.commit();
      operacionesProcesadas += chunk.length;
      if (onProgress) {
        const pct = Math.min(95, Math.round((operacionesProcesadas / Math.max(1, totalOperaciones)) * 100));
        onProgress(pct, `Actualizando registros existentes en Cloud Firestore (${operacionesProcesadas} de ${totalOperaciones})...`);
      }
    }

    // 3. Registrar auditoría
    const auditId = `aud_${Date.now()}`;
    await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
      id: auditId,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Carga de Bases',
      accion: 'Carga de Archivo',
      detalle: `Carga de base exitosa: ${resumen.totalLeidos} filas leídas, ${resumen.creados} nuevos, ${resumen.actualizados} actualizados, ${resumen.errores.length} errores. Sincronizado en Cloud Firestore.`,
    });

    if (onProgress) onProgress(100, '¡Base sincronizada exitosamente en Cloud Firestore!');
    return resumen;
  },

  // Catálogos Dinámicos
  async getCatalogos(): Promise<Catalogos> {
    const firestore = getFirestoreDb();
    const docRef = doc(firestore, 'catalogos', 'general');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Catalogos;
    }
    await setDoc(docRef, CATALOGOS_INICIALES);
    return CATALOGOS_INICIALES;
  },

  async guardarCatalogos(catalogos: Catalogos, usuarioResponsable: string): Promise<void> {
    const firestore = getFirestoreDb();
    const nowISO = new Date().toISOString();
    await setDoc(doc(firestore, 'catalogos', 'general'), catalogos);

    const auditId = `aud_${Date.now()}`;
    await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
      id: auditId,
      fecha_hora: nowISO,
      usuario: usuarioResponsable,
      modulo: 'Administración de Catálogos',
      accion: 'Actualización de Catálogos',
      detalle: 'Catálogos dinámicos actualizados en Cloud Firestore por el Administrador.',
    });
  },

  // Gestión de Usuarios Online en Firestore
  async getUsuarios(): Promise<Usuario[]> {
    const firestore = getFirestoreDb();
    const snap = await getDocs(collection(firestore, 'usuarios'));
    const list: Usuario[] = [];
    snap.forEach((d) => list.push(d.data() as Usuario));

    if (list.length === 0) {
      // Sembrar usuarios iniciales directamente en Firestore si la colección está vacía
      const batch = writeBatch(firestore);
      USUARIOS_INICIALES.forEach((u) => {
        const ref = doc(firestore, 'usuarios', u.uid);
        batch.set(ref, u);
      });
      await batch.commit();
      return USUARIOS_INICIALES;
    }

    return list;
  },

  async getUsuarioPorUid(uid: string): Promise<Usuario | null> {
    const firestore = getFirestoreDb();
    const snap = await getDoc(doc(firestore, 'usuarios', uid));
    if (snap.exists()) {
      return snap.data() as Usuario;
    }
    return null;
  },

  async getUsuarioPorEmail(email: string): Promise<Usuario | null> {
    const firestore = getFirestoreDb();
    const clean = email.trim().toLowerCase();
    const q = query(collection(firestore, 'usuarios'), where('email', '==', clean));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Usuario;
    }
    return null;
  },

  async guardarUsuario(usuario: Usuario, adminResponsable: string): Promise<void> {
    const firestore = getFirestoreDb();
    const nowISO = new Date().toISOString();

    // 1. Guardar directamente en Cloud Firestore
    await setDoc(doc(firestore, 'usuarios', usuario.uid), usuario, { merge: true });

    // 2. Registrar evento de auditoría
    const auditId = `aud_${Date.now()}`;
    await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
      id: auditId,
      fecha_hora: nowISO,
      usuario: adminResponsable,
      modulo: 'Administración de Usuarios',
      accion: 'Guardar Usuario',
      detalle: `Usuario ${usuario.email} (${usuario.rol}) guardado en Cloud Firestore.`,
    });

    // 3. Crear en Firebase Auth en segundo plano si hay contraseña (no bloqueante para la UI)
    if (usuario.password) {
      try {
        const secApp = initializeApp(firebaseConfig, `user_app_${Date.now()}`);
        const secAuth = getAuth(secApp);
        await createUserWithEmailAndPassword(secAuth, usuario.email, usuario.password);
        await deleteApp(secApp);
      } catch (authErr: any) {
        // Ignorar si ya existe en Firebase Auth o si la red bloquea identitytoolkit
        console.warn('[Firebase Auth] Notice al crear credencial secundaria:', authErr.message);
      }
    }
  },

  async eliminarUsuario(uid: string, adminResponsable: string): Promise<void> {
    const firestore = getFirestoreDb();
    const nowISO = new Date().toISOString();

    await deleteDoc(doc(firestore, 'usuarios', uid));

    const auditId = `aud_${Date.now()}`;
    await setDoc(doc(firestore, 'bitacora_auditoria', auditId), {
      id: auditId,
      fecha_hora: nowISO,
      usuario: adminResponsable,
      modulo: 'Administración de Usuarios',
      accion: 'Eliminar Usuario',
      detalle: `Usuario con UID ${uid} eliminado de Cloud Firestore por el Administrador.`,
    });
  },

  // Bitácora de Auditoría (RN11)
  async getBitacora(): Promise<AuditoriaEvento[]> {
    const firestore = getFirestoreDb();
    const q = query(collection(firestore, 'bitacora_auditoria'), orderBy('fecha_hora', 'desc'));
    const snap = await getDocs(q);
    const list: AuditoriaEvento[] = [];
    snap.forEach((d) => list.push(d.data() as AuditoriaEvento));
    return list;
  },

  async registrarAuditoria(
    evento: Omit<AuditoriaEvento, 'id' | 'fecha_hora'>
  ): Promise<void> {
    const firestore = getFirestoreDb();
    const nowISO = new Date().toISOString();
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullEvento: AuditoriaEvento = {
      id,
      fecha_hora: nowISO,
      ...evento,
    };
    await setDoc(doc(firestore, 'bitacora_auditoria', id), fullEvento);
  },
};
