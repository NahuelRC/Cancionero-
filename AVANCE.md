# Estado para retomar

## Trabajo terminado

- Rama actual: `fix/logout-session-redirect`.
- Implementación anterior: `a796153`; corrección de logout: `1fce157`, publicada en `origin/fix/logout-session-redirect`.
- Navegación lateral plegable con botón para volver a mostrarla; el contenido ocupa el espacio libre.
- Selector de tonalidad del Set sincronizado con el tono y los acordes del visor. Se codifican los sostenidos en la URL y el evento no toma la tonalidad guardada del repertorio.
- El visor conserva modo de vista, tamaño de texto y visibilidad de acordes al actualizar el tono.
- Login distingue rechazo de credenciales/acceso, fallo del servidor y fallo de conexión.
- MongoDB puede reintentar la conexión después de un fallo.
- Playwright declarado en las dependencias de desarrollo y lockfile; resuelto el fallo de tipos de los tests durante el deploy.
- Logout compartido por Sidebar y Super Admin usa `signOut` y navegación completa a `/login`.
- El proxy consulta la sesión sin renovar cookies en respuestas pendientes. Se retiró el proveedor de sesión cliente sin consumidores, cuyas consultas también podían restaurar la cookie después del logout.

## Entorno

- Producción está desplegada en Render.
- Por indicación del usuario, el entorno local debe usar la misma base de producción.
- El usuario actualizó `MONGODB_URI` en `.env.local`; se verificó conexión remota exitosa y cuenta demo activa con contraseña coincidente. No se modificaron datos.
- `.env.local` contiene secretos: permanece fuera de Git. No copiar su contenido a notas ni logs.
- No ejecutar `db:seed` sobre producción: elimina y recrea los datos demo.
- Los avisos de hidratación reportados mostraban atributos inyectados por extensiones del navegador.

## Validación completada

- ESLint pasó para los archivos modificados.
- Pasaron comprobaciones aisladas de cambio de tono, cambio de canción, aislamiento de preferencia guardada, codificación de sostenidos y transposición de acordes.
- TypeScript completo y ESLint de los archivos modificados pasan.
- `npm run build` pasa, incluida la generación de páginas. El sandbox bloqueó inicialmente las fuentes y un puerto interno de Turbopack; pasó con permisos y caché regenerada.
- 9 pruebas pasan en Chrome visible contra el build de producción local: 3 logout, 4 páginas públicas y 2 pruebas de navegación plegable en escritorio (1280×720) y tablet (820×1180).
- Los logout de Admin, Músico y Multimedia eliminan la cookie, terminan en `/login`, conservan el estado anónimo al recargar y bloquean volver a `/en-vivo`.
- La navegación plegable libera espacio, vuelve a mostrarse y no genera desbordamiento horizontal en los dos tamaños probados.
- Para repetir contra producción local: `npm run build`, luego `PLAYWRIGHT_SERVER_COMMAND='npm run start' PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_SLOW_MO=700 npx playwright test --headed`.
- Persisten avisos de deprecación de dos opciones de Sentry; no bloquean el build.

## Fases pendientes

1. Completar la revisión visual del visor (tono, acordes, preferencias y cambio de canción). Evitar modificar el set compartido de producción durante pruebas locales; preparar datos aislados si se necesita probar escrituras.
2. Probar el logout de Super Admin con credenciales autorizadas. Comparte la función corregida, pero no se ejecutó una prueba de navegador de ese rol.
3. Integrar `fix/logout-session-redirect` y verificar el despliegue en Render. No se realizó merge ni se verificó ese despliegue en esta sesión.

No se encontró en el repositorio un roadmap de producto por fases; esta lista describe los pendientes de la entrega actual.

## Rama feature/google-signup-mercadopago

- Cuenta Super Admin configurada en la base de datos para `nahuel.muruga@hotmail.com`; la contraseña se guardó únicamente como hash y no se incluyó en archivos ni logs.
- La lista autorizada de Super Admin conserva `nahuelrc90@gmail.com` y agrega `nahuel.muruga@hotmail.com` en `config/super-admin.json`.
- El registro por email crea solo una cuenta ADMIN pendiente, sin iglesia ni acceso, y conduce a `/onboarding`.
- Google OAuth crea o vincula una cuenta ADMIN pendiente; exige `email_verified === true`, evita reactivar cuentas deshabilitadas y no habilita una iglesia sin pago.
- El onboarding solicita nombre y slug de iglesia y crea una suscripción mensual pendiente en Mercado Pago. La iglesia se habilita solamente después de una factura cuyo pago coincide en suscripción, vendedor, monto, moneda, modo live y estado aprobado.
- El webhook de Mercado Pago valida `x-signature` con HMAC y `x-request-id`, usa consultas idempotentes y procesa renovaciones, reembolsos y cancelaciones sin extender períodos fuera de orden.
- El flujo de pagos permanece desactivado hasta definir `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_COLLECTOR_ID`, `MERCADOPAGO_MONTHLY_PRICE`, `MERCADOPAGO_LIVE_MODE` y una `NEXT_PUBLIC_APP_URL` HTTPS.
- El callback de Google para configurar en Google Cloud es `/api/auth/callback/google`.
- `npm run test:integration`: 12 pruebas pasan con MongoDB temporal. `npx tsc --noEmit --incremental false`, `npx eslint .`, `npm run build` y 4 pruebas visibles de Chrome para páginas públicas también pasan.
- Dependencias nuevas: `server-only`, `tsx` y `mongodb-memory-server` para aislar la suite de integración.

## Pendientes para activar suscripciones

1. Definir el precio mensual en ARS y cargar las credenciales de Google OAuth y Mercado Pago en Render.
2. Registrar en Mercado Pago el webhook HTTPS `/api/payments/mercadopago/webhook` para los eventos de suscripción y pagos.
3. Ejecutar una suscripción con cuentas de prueba de Mercado Pago y confirmar el primer pago, una renovación, un reembolso y una cancelación.
4. Revisar y fusionar `feature/google-signup-mercadopago` a la rama de producción; el código todavía no activa cobros mientras faltan las variables anteriores.

## Próxima sesión

1. Terminar la configuración de Google Cloud OAuth:
   - Configurar la pantalla de consentimiento.
   - Crear un cliente OAuth de tipo aplicación web.
   - Agregar `http://localhost:3000/api/auth/callback/google`.
   - Cargar `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` en `.env.local`.
   - Probar registro e inicio de sesión con Google.
2. Terminar la configuración de Mercado Pago:
   - Definir el precio mensual en ARS.
   - Cargar `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` y `MERCADOPAGO_COLLECTOR_ID`.
   - Configurar `MERCADOPAGO_LIVE_MODE` y `NEXT_PUBLIC_APP_URL`.
   - Registrar `/api/payments/mercadopago/webhook` en Mercado Pago.
   - Probar suscripción, primer pago aprobado, renovación, reembolso y cancelación con cuentas de prueba.
