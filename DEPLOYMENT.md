# 🚀 Guía de Despliegue y Configuración de Infraestructura: CRM Seguimiento de Ventas

Esta guía detalla paso a paso la configuración y puesta en producción del **CRM Seguimiento de Ventas** utilizando la arquitectura desacoplada de **Next.js (App Router)**, **Firebase (Firestore & Authentication)**, control de versiones en **GitHub** y hosting continuo en **Vercel** con dominio personalizado.

---

## Índice
1. [Arquitectura del Sistema y Modo Híbrido](#1-arquitectura-del-sistema-y-modo-híbrido)
2. [Paso 1: Configuración de Firebase (Firestore y Authentication)](#paso-1-configuración-de-firebase-firestore-y-authentication)
3. [Paso 2: Reglas de Seguridad e Índices de Firestore](#paso-2-reglas-de-seguridad-e-índices-de-firestore)
4. [Paso 3: Variables de Entorno](#paso-3-variables-de-entorno)
5. [Paso 4: Control de Versiones y Alojamiento en GitHub](#paso-4-control-de-versiones-y-alojamiento-en-github)
6. [Paso 5: Despliegue en Producción en Vercel](#paso-5-despliegue-en-producción-en-vercel)
7. [Paso 6: Conexión de Dominio Personalizado y Autorización en Firebase](#paso-6-conexión-de-dominio-personalizado-y-autorización-en-firebase)
8. [Matriz de Cumplimiento de Reglas de Negocio (RN01 - RN15)](#matriz-de-cumplimiento-de-reglas-de-negocio-rn01---rn15)

---

## 1. Arquitectura del Sistema y Modo Híbrido

La aplicación implementa un patrón **híbrido inteligente**:
* **Modo Firebase (Producción):** Cuando se configuran las variables de entorno `NEXT_PUBLIC_FIREBASE_*`, la aplicación se conecta a **Cloud Firestore** utilizando suscripciones en tiempo real (`onSnapshot`), transacciones atómicas (`runTransaction`) para gestiones y lotes (`writeBatch`) para la carga de bases.
* **Modo Demo / Fallback (Desarrollo & Sandbox):** Si las credenciales aún no han sido configuradas, el sistema arranca inmediatamente en memoria local reactiva con persistencia en `localStorage` y simulación de eventos en tiempo real. Cuenta con un botón **"Poblar Datos Demo"** en la barra superior para inicializar todos los catálogos oficiales y casos de prueba.

---

## Paso 1: Configuración de Firebase (Firestore y Authentication)

### 1.1. Crear el Proyecto en Firebase Console
1. Ingresa a [Firebase Console](https://console.firebase.google.com/) con tu cuenta de Google.
2. Haz clic en **"Agregar proyecto"** (o "Crear proyecto").
3. Nombra tu proyecto, por ejemplo: `crm-seguimiento-ventas-prod`.
4. (Opcional) Activa o desactiva Google Analytics según tus requerimientos y haz clic en **Crear proyecto**.

### 1.2. Habilitar Firebase Authentication
1. En el menú lateral izquierdo, ve a **Compilación (Build) > Authentication**.
2. Haz clic en **Comenzar (Get started)**.
3. En la pestaña **Sign-in method**, selecciona **Correo electrónico / Contraseña (Email/Password)**.
4. Activa la opción **Habilitar** (la primera casilla) y guarda los cambios.

### 1.3. Crear la Base de Datos Cloud Firestore
1. En el menú lateral, ve a **Compilación (Build) > Firestore Database**.
2. Haz clic en **Crear base de datos (Create database)**.
3. Selecciona la ubicación más cercana a tu operación (ej. `nam5 (us-central1)` o `southamerica-east1`).
4. Selecciona **Comenzar en modo producción (Start in production mode)**.
5. Haz clic en **Habilitar**.

### 1.4. Registrar la Aplicación Web y Obtener las Credenciales
1. Ve a la **Configuración del proyecto** (icono de engranaje ⚙️ junto a "Descripción general").
2. En la sección *Tus apps*, haz clic en el icono **Web** (`</>`).
3. Registra el apodo de la app (ej: `crm-web`) y haz clic en **Registrar app**.
4. Copia los valores del objeto `firebaseConfig` que te entrega la consola.

---

## Paso 2: Reglas de Seguridad e Índices de Firestore

El proyecto incluye los archivos oficiales [`firestore.rules`](file:///firestore.rules) y [`firestore.indexes.json`](file:///firestore.indexes.json).

### 2.1. Desplegar o Pegar Reglas de Seguridad (`firestore.rules`)
En Firebase Console, ve a **Firestore Database > pestaña Reglas** y pega el contenido exacto de `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data;
    }

    function isAdministrador() {
      return isAuthenticated() && (
        getUserData().rol == 'Administrador' ||
        request.auth.token.rol == 'Administrador'
      );
    }

    function isAnalista() {
      return isAuthenticated() && (
        getUserData().rol == 'Analista' ||
        request.auth.token.rol == 'Analista'
      );
    }

    // COLECCIÓN clientes: ID es numero_orden (RN01)
    match /clientes/{numero_orden} {
      allow read: if isAuthenticated();
      allow create: if isAdministrador() || isAnalista();
      allow update: if isAdministrador() || isAnalista();
      allow delete: if isAdministrador();
    }

    // COLECCIÓN gestiones: INMUTABILIDAD ESTRICTA (RN03, RN08)
    // Jamás se permite editar ni eliminar registros
    match /gestiones/{id_gestion} {
      allow read: if isAuthenticated();
      allow create: if isAdministrador() || isAnalista();
      allow update, delete: if false; // BLOQUEO NATIVO A NIVEL DE MOTOR
    }

    // COLECCIÓN bitacora_auditoria: RN11
    match /bitacora_auditoria/{id_auditoria} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }

    // COLECCIÓN catalogos
    match /catalogos/{catalogoId} {
      allow read: if isAuthenticated();
      allow write: if isAdministrador();
    }

    // COLECCIÓN usuarios
    match /usuarios/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdministrador();
    }
  }
}
```
Haz clic en **Publicar**.

### 2.2. Desplegar Índices Compuestos (`firestore.indexes.json`)
Si tienes instalado Firebase CLI (`npm install -g firebase-tools`):
```bash
firebase login
firebase use tu_proyecto_id
firebase deploy --only firestore:indexes
```

O agrégalos manualmente en **Firestore Database > Índices**:
1. Colección: `gestiones`, Campos: `numero_orden` (Ascendente) + `fecha_hora_gestion` (Descendente).
2. Colección: `gestiones`, Campos: `usuario_responsable` (Ascendente) + `fecha_hora_gestion` (Descendente).
3. Colección: `bitacora_auditoria`, Campos: `modulo` (Ascendente) + `fecha_hora` (Descendente).

---

## Paso 3: Variables de Entorno

Copia el archivo `.env.example` a un archivo local `.env.local` y reemplaza con tus credenciales:

```bash
cp .env.example .env.local
```

Contenido de `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA1234567890abcdef...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=crm-seguimiento-ventas-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=crm-seguimiento-ventas-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=crm-seguimiento-ventas-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

## Paso 4: Control de Versiones y Alojamiento en GitHub

Ejecuta los siguientes comandos desde la raíz del proyecto para crear el repositorio Git y subirlo a GitHub:

```bash
# 1. Inicializar repositorio local
git init

# 2. Agregar todos los archivos (el .gitignore excluye node_modules, .next y .env.local)
git add .

# 3. Crear commit inicial
git commit -m "feat: versión inicial CRM Seguimiento de Ventas con Firebase, Dashboard en tiempo real y exportaciones"

# 4. Establecer la rama principal como main
git branch -M main

# 5. Conectar con tu repositorio remoto de GitHub (reemplaza con tu URL real)
git remote add origin https://github.com/TU_USUARIO/crm-seguimiento-ventas.git

# 6. Empujar el código a GitHub
git push -u origin main
```

---

## Paso 5: Despliegue en Producción en Vercel

1. Inicia sesión en [Vercel](https://vercel.com/) con tu cuenta de GitHub.
2. En el panel principal, haz clic en **"Add New..." > "Project"**.
3. Selecciona tu repositorio `crm-seguimiento-ventas` de la lista y haz clic en **Import**.
4. En la pantalla de configuración:
   * **Framework Preset:** Next.js (detectado automáticamente).
   * **Root Directory:** `./`
   * **Build Command:** `next build`
   * **Output Directory:** `.next`
5. Despliega la sección **Environment Variables** y agrega las 6 variables:
   * `NEXT_PUBLIC_FIREBASE_API_KEY`
   * `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   * `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   * `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   * `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   * `NEXT_PUBLIC_FIREBASE_APP_ID`
6. Haz clic en **Deploy**. Vercel compilará la aplicación y te entregará una URL de producción (ej: `crm-seguimiento-ventas.vercel.app`).

---

## Paso 6: Conexión de Dominio Personalizado y Autorización en Firebase

### 6.1. Configuración de Dominio en Vercel
1. En tu proyecto en Vercel, ve a **Settings > Domains**.
2. Escribe tu dominio o subdominio deseado (por ejemplo, `crm.tudominio.com` o `tudominio.com`) y haz clic en **Add**.
3. Vercel te indicará los registros DNS requeridos:
   * **Para Subdominio (ej: `crm.tudominio.com`):**
     * **Tipo:** `CNAME`
     * **Nombre / Host:** `crm`
     * **Valor / Destino:** `cname.vercel-dns.com`
   * **Para Dominio Raíz (ej: `tudominio.com`):**
     * **Tipo:** `A`
     * **Nombre / Host:** `@`
     * **Valor / Destino:** `76.76.21.21`
4. Ingresa al panel de tu proveedor DNS (Cloudflare, GoDaddy, Namecheap, AWS Route 53, etc.) y crea dicho registro.
5. Vercel verificará el registro automáticamente y generará el certificado SSL gratuito (Let's Encrypt).

### 6.2. Autorizar el Dominio en Firebase Authentication (Evitar Bloqueos CORS)
Para que Firebase permita el inicio de sesión y la autenticación desde tu dominio personalizado:
1. Abre [Firebase Console](https://console.firebase.google.com/).
2. Ve a **Authentication > Configuración (Settings) > pestaña Dominios autorizados (Authorized domains)**.
3. Haz clic en **Agregar dominio (Add domain)**.
4. Escribe tu dominio de Vercel y tu dominio personalizado (por ejemplo: `crm-seguimiento-ventas.vercel.app` y `crm.tudominio.com`).
5. Haz clic en **Listo / Agregar**.

---

## Matriz de Cumplimiento de Reglas de Negocio (RN01 - RN15)

| Regla | Requerimiento de Negocio | Implementación en la Solución |
| :--- | :--- | :--- |
| **RN01** | `numero_orden` único como llave principal del sistema. | Clave primaria nativa de documentos en la colección `clientes/{numero_orden}`. |
| **RN02** | Cada gestión crea un nuevo registro histórico. | Cada barrido genera un doc autogenerado en la subcolección/colección `gestiones`. |
| **RN03** | El histórico nunca podrá ser eliminado ni modificado. | `allow update, delete: if false;` estricto en `firestore.rules` y sin botones en frontend. |
| **RN04** | El Dashboard solo utiliza la última gestión del cliente. | Objeto desnormalizado `ultima_gestion` sincronizado en transacción atómica en `clientes`. |
| **RN05** | Clientes sin gestiones pertenecen a la categoría "Sin Gestión". | Clasificación automática y visible en gráficos y métricas para `ultima_gestion == null`. |
| **RN06** | Observaciones obligatorias y máximo 200 caracteres. | Validación en formulario con contador reactivo `X / 200` y validación en `dbService`. |
| **RN07** | Cuando `Venta Cerrada = Sí`, el caso se considera finalizado. | Etiquetado visual como "Caso Finalizado" y segregación de métricas. |
| **RN08** | Nuevas cargas no modifican histórico de gestiones. | Procesador en lote `writeBatch` actualiza solo documento cliente sin tocar `gestiones`. |
| **RN09** | En orden existente, solo se actualiza campo `Estatus`. | El método `procesarCargaBase` ejecuta `updateDoc({ estatus_enrolamiento })` únicamente. |
| **RN10** | Toda gestión almacena Fecha, Hora y Usuario responsable. | Campos `fecha_hora_gestion` (ISO / Timestamp) y `usuario_responsable` obligatorios. |
| **RN11** | Registro de toda acción en bitácora de auditoría. | Colección `bitacora_auditoria` con vista dedicada y filtros en Módulo 7. |
| **RN12** | Dashboard se actualiza automáticamente con cada nueva gestión. | Suscripción reactiva mediante `onSnapshot` de Firestore o broadcaster local. |
| **RN13** | Clientes sin gestión visibles en dashboard y reportes. | Card de KPI interactiva "Sin Gestión" y filtro rápido en Consultas. |
| **RN14** | Visualización permanente del histórico completo. | Drawer/Modal Módulo 3 ordenado cronológicamente desde la más reciente. |
| **RN15** | Descarga de base consolidada con información actualizada. | Módulo 6 con exportación nativa a Excel `.xlsx`, `.csv` y PDF del Dashboard. |
