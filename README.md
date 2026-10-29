# Wort · Alemán desde cero

Una app para hispanohablantes que quieren dar su primer paso en alemán desde el celular.

**[Abrir Wort](https://wort-aleman.vercel.app)** · [Código fuente](https://github.com/Aaronzaso/wort-aleman) · [Versión local en GitHub Pages](https://aaronzaso.github.io/wort-aleman/)

## Qué puedes hacer

- Estudiar 8 lecciones con 64 expresiones cotidianas y notas en español.
- Resolver 48 ejercicios de elección, escucha, escritura y orden de palabras.
- Volver a intentar los errores en una segunda ronda.
- Escuchar con una voz alemana del dispositivo y ajustar la velocidad.
- Repasar tarjetas con un calendario espaciado según cuánto te cuesta recordar.
- Buscar palabras en español o alemán, consultar sonidos y revisar tu progreso real.
- Instalar la PWA y estudiar sin conexión después de la primera carga completa.
- Exportar e importar tu progreso como JSON.
- Crear una cuenta con correo y contraseña para continuar desde otro dispositivo.
- Practicar sin cuenta, con el progreso guardado solo en este navegador.

## Desde tu celular

Abre **[wort-aleman.vercel.app](https://wort-aleman.vercel.app)** en el navegador.

- **Android:** menú de Chrome → «Instalar aplicación» o «Añadir a pantalla de inicio».
- **iPhone:** Safari → Compartir → «Añadir a pantalla de inicio».

Puedes usarla directamente sin instalarla. La cuenta es opcional y no necesitas claves de API. El audio requiere que tu dispositivo tenga una voz alemana; algunas voces necesitan internet. Si no puedes escuchar, abre la transcripción del ejercicio. Wort no evalúa tu pronunciación ni graba el micrófono.

## Tu cuenta y tus avances

La versión de Vercel permite acceder con correo y contraseña y guardar el progreso de tu cuenta en la nube. Al entrar desde otro dispositivo, puedes continuar con las mismas lecciones, repasos, ajustes y estadísticas.

**«Continuar con Google»** es la opción principal. Usa el cliente OAuth propio de Wort y solicita únicamente nombre, correo y foto de perfil. El recorrido real de Google hasta la cuenta sincronizada quedó verificado. También puedes usar correo y contraseña.

- **Sin cuenta:** los avances permanecen en este navegador.
- **Con cuenta:** cada persona tiene su propio progreso y una copia local para practicar sin conexión. Los cambios pendientes se envían al volver a conectar. Revisa el estado de sincronización antes de cerrar sesión o cambiar de dispositivo.
- **Avances previos de invitado:** puedes añadirlos a tu cuenta mediante «Añadir mis avances locales». La transferencia es explícita y se realiza una vez por cuenta.
- **Copias y borrado:** importar una copia o borrar el progreso mientras estás conectado también afecta a tu progreso de cuenta. La app pide confirmación antes de hacerlo.

La versión antigua de GitHub Pages sigue funcionando en modo invitado. Como GitHub Pages y Vercel son sitios distintos, sus datos locales no se trasladan automáticamente. Para llevarlos contigo, exporta una copia desde Ajustes en la versión antigua e impórtala en la nueva.

## Cómo estudiar

1. Comienza por «La primera conversación». Escucha y repite cada expresión.
2. Responde sin mirar las tarjetas. Revisa la explicación de cada respuesta.
3. Vuelve a «Repasar» cuando haya palabras pendientes. Intenta decir el alemán antes de revelarlo.
4. Si olvidas una tarjeta, elige «Otra vez»: reaparece en 5 minutos. «Me costó» acorta el intervalo, con un mínimo de un día. «Lo sabía» avanza por 1, 3 y 7 días; después multiplica el intervalo por un factor de facilidad.
5. Añade conversaciones y escucha real a medida que avances.

El calendario es una heurística simple y transparente, no FSRS. Las lecciones son una introducción A0–A1, no un curso A1 completo ni una certificación. La app no garantiza fluidez ni un plazo de aprendizaje. La práctica de recuperación y el espaciado se apoyan en [investigación sobre recuperación activa](https://doi.org/10.1126/science.1152408) y en la [guía de AERO sobre espaciado y recuperación](https://www.edresearch.edu.au/guides-resources/practice-guides/spacing-and-retrieval-practice-guide-full-publication).

## Privacidad

El progreso de invitado se guarda en `localStorage` de este navegador y origen. Borrar los datos del sitio elimina esa copia. Al iniciar sesión, el progreso se guarda también en una base de datos Neon asociado a tu cuenta; las copias y los cambios pendientes del navegador se mantienen separados por usuario. Al cerrar sesión, los datos de la cuenta dejan de mostrarse y vuelves al modo invitado. Puedes descargar una copia en Ajustes. El repositorio público no contiene tu historial de aprendizaje ni las credenciales de los servicios.

Wort no incluye publicidad ni analítica. Vercel sirve la app y sus funciones; Neon gestiona la autenticación y el almacenamiento. Estos proveedores pueden procesar los datos necesarios para prestar sus servicios. GitHub sirve la versión de invitado. La síntesis de voz la gestiona el navegador o el proveedor del sistema y puede usar un servicio remoto.

## Ejecutar en tu computadora

Requiere Node.js 22 o superior. El cliente se empaqueta con esbuild y el servidor usa Neon Auth, Neon Postgres y `jose` para verificar las sesiones. Las versiones de autenticación y sus ajustes de compatibilidad están fijados en `package.json` y `package-lock.json`; consérvalos al instalar.

```sh
npm ci
npm start
```

Abre **`http://localhost:4173`**. El origen debe coincidir con el autorizado en Neon Auth. `127.0.0.1` puede servir el modo invitado, pero el inicio de sesión puede responder con un error de origen no permitido. Usa HTTP en lugar de abrir `index.html` directamente.

Sin configuración de servicios, el cliente se compila en modo invitado. Para trabajar con cuentas, copia `.env.example` a `.env.local` y configura estas variables con tus propios valores:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión del servidor a Neon Postgres |
| `DATABASE_URL_UNPOOLED` | Conexión directa para aplicar la migración |
| `NEON_AUTH_BASE_URL` | Servicio de Neon Auth de tu entorno |
| `NEON_AUTH_COOKIE_SECRET` | Secreto privado para las cookies de autenticación |
| `WORT_APP_URL` | Origen público de la app, o `http://localhost:4173` en desarrollo |

Configura también los orígenes de confianza en Neon Auth. Google se habilita desde la configuración de proveedores de Neon Auth con las credenciales OAuth correspondientes y sus dominios autorizados. No subas `.env.local`, credenciales OAuth ni valores secretos al repositorio.

```sh
npm run db:migrate  # Prepara la tabla de progreso; requiere conexión configurada
npm test            # Aprendizaje, sincronización, autenticación y API
npm run test:e2e    # Navegador: invitado y flujos de cuenta con datos de prueba
npm run build      # Cliente empaquetado en dist/
```

Las pruebas de navegador usan Microsoft Edge en Windows y Chromium en otros sistemas. Si lo necesitas, instala Chromium con `npx playwright install chromium`. Las pruebas de autenticación contra el servicio real son opcionales: se activan con `WORT_LIVE_AUTH_TESTS=1` y crean cuentas temporales reservadas para las pruebas. El recorrido normal no completa el consentimiento de Google ni envía correos de recuperación.

## Publicación

La app principal está desplegada en **Vercel**, con Neon para las cuentas y el progreso. El repositorio está vinculado a Vercel: los cambios en `main` publican producción y las ramas generan vistas previas. Las vistas previas pueden requerir acceso a Vercel. También se puede desplegar por CLI.

GitHub Actions sigue probando y publicando `dist/` en GitHub Pages al actualizar `main`, en modo invitado porque ese entorno no recibe la configuración de Neon Auth. En Settings → Pages, la fuente debe ser **GitHub Actions**.

Todos los recursos usan rutas relativas para funcionar también bajo `/wort-aleman/`. Para publicar actualizaciones, cambia la versión `CACHE` en `sw.js` cuando modifiques recursos; la app ofrece actualizar al detectar el nuevo service worker. Las respuestas de autenticación y progreso no se guardan en esa caché pública.

El servidor valida el token de sesión y obtiene de él el usuario de cada solicitud de progreso. La API guarda por usuario y comprueba la revisión para evitar que un dispositivo sobrescriba cambios nuevos de otro. El cliente combina los avances, conserva los cambios pendientes sin conexión y distingue los reinicios de progreso de las ediciones habituales.

## Archivos

| Archivo | Función |
| --- | --- |
| `src/curriculum.js` | Lecciones, tarjetas y ejercicios originales |
| `src/learning.js` | Corrección, repasos y fechas locales |
| `src/app.js` | Interfaz, audio, instalación y coordinación del progreso |
| `src/account.js` | Acceso, cuenta y transferencia de avances de invitado |
| `src/cloud-progress.js` | Sincronización, copias por cuenta y cambios pendientes |
| `src/progress-sync.js` | Combinación del progreso entre dispositivos |
| `src/style.css` | Diseño adaptable a celular y computadora |
| `api/` y `server/` | Autenticación y API privada de progreso |
| `db/migrations/` | Esquema de almacenamiento de progreso |
| `sw.js` | Caché offline y actualización |
| `tests/` | Pruebas del motor y contenido |
| `e2e/` | Pruebas de la experiencia completa |

Para ampliar el curso, conserva los identificadores existentes: las tarjetas de repaso guardadas dependen de ellos.
