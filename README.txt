KLAVE — App de letras y acordes para ministerios de alabanza
=============================================================

STACK
-----
  Next.js 15 (App Router) + MongoDB + NextAuth v5
  Tailwind CSS v4 · TypeScript · Mongoose


REQUISITOS PREVIOS
------------------
  - Node.js >= 20
  - MongoDB local o MongoDB Atlas (recomendado para producción)
  - Cuenta en Resend (resend.com) para el envío de invitaciones por email
  - Cuenta Google Cloud para login con Google (opcional pero recomendado)


VARIABLES DE ENTORNO
--------------------
Crear un archivo .env.local en la raíz del proyecto con:

  # Base de datos
  MONGODB_URI=mongodb://localhost:27017/klave

  # NextAuth
  NEXTAUTH_SECRET=<string aleatorio de 32+ caracteres>
  NEXTAUTH_URL=http://localhost:3000

  # Google OAuth (opcional)
  GOOGLE_CLIENT_ID=<client id de Google Cloud Console>
  GOOGLE_CLIENT_SECRET=<client secret de Google Cloud Console>

  # Email (invitaciones)
  RESEND_API_KEY=<api key de resend.com>
  RESEND_FROM=Klave <no-reply@tudominio.com>

  # URL pública de la app (se usa en los links de invitación)
  NEXT_PUBLIC_APP_URL=http://localhost:3000

  # Sentry (opcional — error tracking en producción)
  NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oxxxx.ingest.sentry.io/yyyy

  # Cloudflare R2 (opcional — almacenamiento de archivos originales .docx)
  R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
  R2_ACCESS_KEY_ID=<r2 access key>
  R2_SECRET_ACCESS_KEY=<r2 secret key>
  R2_BUCKET_NAME=klave-originals
  R2_PUBLIC_URL=https://pub-<hash>.r2.dev  # URL pública del bucket (opcional)

Para generar NEXTAUTH_SECRET:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"


INSTALACIÓN Y EJECUCIÓN LOCAL
------------------------------
  npm install
  npm run dev        # http://localhost:3000

Para producción:
  npm run build
  npm start


PRIMER USO
----------
1. Ir a /register
2. Crear una cuenta de iglesia (nombre de iglesia + slug + tu usuario admin)
3. Desde /usuarios, invitar a músicos y multimedia con su email
4. Subir canciones desde /subir (archivo .docx o .txt con formato de cancionero)
5. Armar el set del día desde /en-vivo


FORMATO DE ARCHIVOS DE CANCIONES (.docx / .txt)
------------------------------------------------
El parser detecta automáticamente las líneas de acordes.
Las líneas de acordes van ARRIBA de la letra correspondiente:

    [Verso 1]
         C          G        Am
    Cuando el silencio se hace canción
         C          G              F
    y el corazón empieza a latir

Reglas:
  - Secciones: encabezados entre corchetes [Coro], [Verso 2], etc.
    También reconoce: CORO, VERSO, PUENTE, INTRO en mayúsculas.
  - Línea de acordes: tokens cortos separados por espacios que matcheen
    formato de acorde (C, Am, G7, Em7b5, C/E, Bbmaj7, etc.)
  - El preview antes de guardar permite editar o quitar acordes mal detectados.


ROLES
-----
  Admin      → todo: sube canciones, gestiona usuarios, arma En Vivo
  Músico     → ve letra + acordes, puede transportar tono
  Multimedia → ve solo letra (la API nunca envía acordes a este rol)


HEALTH CHECK
------------
  GET /api/health   →   { ok: true, db: "connected" }


LO QUE ESTÁ IMPLEMENTADO
-------------------------
  ✅ Auth con email/contraseña + Google OAuth
  ✅ Multi-tenant: aislamiento total de datos por iglesia
  ✅ Invitaciones por email con token de un solo uso (48h de validez)
  ✅ Gestión de usuarios: roles, desactivación
  ✅ Subir canciones (.docx / .txt): parser automático + preview editable
  ✅ Editar y eliminar canciones
  ✅ Repertorio: búsqueda, filtro por etiqueta, orden por reciente/título/artista,
     paginación
  ✅ Vista músico: acordes alineados sobre letra, transposición ±semitonos,
     indicador de tono, reset, toggle "Solo letra", tamaño de texto A-/A+,
     imprimir/PDF, persistencia del tono elegido en localStorage
  ✅ Vista multimedia: solo letra, modo pantalla completa, navegación por
     secciones con teclado
  ✅ En Vivo: crear sesión, agregar/quitar/reordenar canciones, seleccionar
     canción activa, SSE en tiempo real (3s) con fallback a polling, finalizar sesión
  ✅ Selector de tono por canción en el Set de En Vivo (admin)
  ✅ Agregar acordes en el preview de Subir (incluso en líneas sin acordes)
  ✅ Historial de sesiones En Vivo
  ✅ Mobile responsive: bottom nav, tabs Set/Vista en En Vivo, toolbar wrapping
  ✅ Audit log: delete de canción, cambio de rol, desactivación de usuario
  ✅ Security headers (CSP, X-Frame-Options, etc.)
  ✅ Hook de suscripción preparado (bloquea iglesias con estado "vencida")
  ✅ Rate limiting en memoria: upload (10/min), invitaciones (20/h) — sin Redis
  ✅ SSE endpoint /api/envivo/stream con fallback automático a polling
  ✅ Almacenamiento de originales en Cloudflare R2 (activar con R2_* env vars)
  ✅ Sentry error tracking (activar con NEXT_PUBLIC_SENTRY_DSN)
  ✅ MIME validation + tamaño máximo en upload
  ✅ Índices MongoDB optimizados (iglesiaId + sort fields)


LO QUE FALTA / PENDIENTE
-------------------------
FUNCIONAL:
  [ ] Pagos y suscripciones (Stripe o MercadoPago)
      - El modelo tiene estadoSuscripcion, el hook ya está en requireTenant()
      - Solo falta integrar el webhook de pago que cambie ese campo

INFRAESTRUCTURA / ESCALA:
  [ ] Rate limiting con Redis (Upstash) para entornos serverless distribuidos
      - La implementación actual (in-memory) funciona en servidor único
      - En Vercel Serverless cada función tiene su propia memoria → no comparte estado

  [ ] SSE con MongoDB Change Streams (en lugar del polling interno de 3s)
      - La implementación actual hace una consulta DB cada 3s dentro del SSE
      - Con Change Streams (requiere Atlas Replica Set), el push sería event-driven

  [ ] Login con Google para usuarios invitados
      - El flujo está implementado pero requiere que el email del Google
        account coincida exactamente con el email al que se envió la invitación

SEGURIDAD (futuro):
  [ ] Rotación de NEXTAUTH_SECRET sin downtime
  [ ] Política de contraseña más estricta (hoy solo mínimo 8 caracteres)


ESTRUCTURA DEL PROYECTO
-----------------------
  app/
    (app)/          → páginas protegidas (layout con sidebar)
    api/            → route handlers (REST)
  components/       → componentes React reutilizables
  lib/              → auth, db, dal, chords, audit, errors
  models/           → esquemas Mongoose (Iglesia, Usuario, Cancion, EnVivo, ...)
  services/         → lógica de negocio del servidor
  types/            → TypeScript types compartidos
