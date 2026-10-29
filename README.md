# Wort · Alemán desde cero

Una app para hispanohablantes que quieren dar su primer paso en alemán desde el celular.

**[Abrir Wort](https://aaronzaso.github.io/wort-aleman/)** · [Código fuente](https://github.com/Aaronzaso/wort-aleman)

## Qué puedes hacer

- Estudiar 8 lecciones con 64 expresiones cotidianas y notas en español.
- Resolver 48 ejercicios de elección, escucha, escritura y orden de palabras.
- Volver a intentar los errores en una segunda ronda.
- Escuchar con una voz alemana del dispositivo y ajustar la velocidad.
- Repasar tarjetas con un calendario espaciado según cuánto te cuesta recordar.
- Buscar palabras en español o alemán, consultar sonidos y revisar tu progreso real.
- Instalar la PWA y estudiar sin conexión después de la primera carga completa.
- Exportar e importar tu progreso como JSON.

## Desde tu celular

Abre **[aaronzaso.github.io/wort-aleman](https://aaronzaso.github.io/wort-aleman/)** en el navegador.

- **Android:** menú de Chrome → «Instalar aplicación» o «Añadir a pantalla de inicio».
- **iPhone:** Safari → Compartir → «Añadir a pantalla de inicio».

Puedes usarla directamente sin instalarla. No necesitas cuenta ni claves de API. El audio requiere que tu dispositivo tenga una voz alemana; algunas voces necesitan internet. Si no puedes escuchar, abre la transcripción del ejercicio. Wort no evalúa tu pronunciación ni graba el micrófono.

## Cómo estudiar

1. Comienza por «La primera conversación». Escucha y repite cada expresión.
2. Responde sin mirar las tarjetas. Revisa la explicación de cada respuesta.
3. Vuelve a «Repasar» cuando haya palabras pendientes. Intenta decir el alemán antes de revelarlo.
4. Si olvidas una tarjeta, elige «Otra vez»: reaparece en 5 minutos. «Me costó» acorta el intervalo, con un mínimo de un día. «Lo sabía» avanza por 1, 3 y 7 días; después multiplica el intervalo por un factor de facilidad.
5. Añade conversaciones y escucha real a medida que avances.

El calendario es una heurística simple y transparente, no FSRS. Las lecciones son una introducción A0–A1, no un curso A1 completo ni una certificación. La app no garantiza fluidez ni un plazo de aprendizaje. La práctica de recuperación y el espaciado se apoyan en [investigación sobre recuperación activa](https://doi.org/10.1126/science.1152408) y en la [guía de AERO sobre espaciado y recuperación](https://www.edresearch.edu.au/guides-resources/practice-guides/spacing-and-retrieval-practice-guide-full-publication).

## Privacidad

El progreso se guarda en `localStorage` de este navegador y origen; no se sincroniza entre dispositivos. Borrar los datos del sitio elimina el progreso. Puedes descargar una copia en Ajustes. El repositorio público no contiene tu historial de aprendizaje.

Wort no tiene cuentas, publicidad ni analítica. GitHub sirve los archivos y puede procesar los datos habituales de una visita. La síntesis de voz la gestiona el navegador o el proveedor del sistema; puede usar un servicio remoto.

## Ejecutar en tu computadora

Requiere Node.js 22 o superior. La app no tiene dependencias de ejecución.

```sh
npm ci
npm start
```

Abre `http://127.0.0.1:4173`. Usa HTTP en lugar de abrir `index.html` directamente, porque los módulos y el service worker lo necesitan.

```sh
npm test          # Motor de repaso y coherencia del contenido
npm run test:e2e  # Flujos reales de navegador
npm run build    # Archivos estáticos en dist/
```

Las pruebas de navegador usan Microsoft Edge en Windows y Chromium en otros sistemas. Si lo necesitas, instala Chromium con `npx playwright install chromium`.

## Publicación

GitHub Actions prueba y publica `dist/` en GitHub Pages al actualizar `main`. En Settings → Pages, la fuente debe ser **GitHub Actions**.

Todos los recursos usan rutas relativas para funcionar bajo `/wort-aleman/`. Para publicar actualizaciones, cambia la versión `CACHE` en `sw.js` cuando modifiques recursos; la app ofrece actualizar al detectar el nuevo service worker.

## Archivos

| Archivo | Función |
| --- | --- |
| `src/curriculum.js` | Lecciones, tarjetas y ejercicios originales |
| `src/learning.js` | Corrección, repasos y fechas locales |
| `src/app.js` | Interfaz, audio, instalación y progreso |
| `src/style.css` | Diseño adaptable a celular y computadora |
| `sw.js` | Caché offline y actualización |
| `tests/` | Pruebas del motor y contenido |
| `e2e/` | Pruebas de la experiencia completa |

Para ampliar el curso, conserva los identificadores existentes: las tarjetas de repaso guardadas dependen de ellos.
