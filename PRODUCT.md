# Wort

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML, CSS y JavaScript nativos, con cliente empaquetado mediante esbuild. PWA alojada en Vercel; autenticación administrada de Neon con Better Auth y progreso en Neon Postgres. La API valida sesiones con `jose`. Se mantienen fijadas las versiones del SDK de autenticación y sus dependencias de compatibilidad. GitHub Pages conserva una versión de invitado sin servicios de cuenta.

## Users

Hispanohablantes que comienzan a aprender alemán desde cero y estudian desde su celular.

## Product Purpose

Practicar alemán con explicaciones en español, ejemplos cotidianos, recuperación activa y repasos espaciados. El usuario pidió crear su repositorio de GitHub.

## Operating Context

Sesiones breves en Android o iPhone, con continuidad en otros dispositivos mediante una cuenta opcional. El modo invitado conserva los avances en el navegador. Con cuenta se usa una copia local separada por usuario y se sincronizan los cambios pendientes al recuperar conexión. La app principal está en https://wort-aleman.vercel.app; la versión anterior de GitHub Pages usa otro origen y requiere exportación e importación explícitas para trasladar sus avances.

## Capabilities and Constraints

Ocho lecciones iniciales con 64 tarjetas y 48 ejercicios de comprensión y escritura. La biblioteca reúne 80 tarjetas en diez categorías: conserva esas 64 y añade ocho frutas y ocho alimentos. Se pueden abrir carpetas, buscar y mezclar categorías para repasar sin repetir tarjetas; la selección prioriza las palabras que necesitan refuerzo. El audio depende de una voz alemana disponible. Contenido inicial orientativo A0–A1; no equivale a un curso completo ni a una certificación.

Las lecciones y los repasos se pueden pausar al volver al inicio o cambiar de sección. Se conservan varias prácticas en el mismo dispositivo, separadas por cuenta y por invitado, con su pregunta o tarjeta, respuesta en curso y valoración ya realizada. El punto exacto de una práctica es local: no se sincroniza entre dispositivos ni se incluye en la copia de progreso. Las respuestas y el progreso de aprendizaje sí siguen el flujo de sincronización de la cuenta.

El mapa de repaso clasifica cada palabra según su última respuesta o valoración registrada: «Otra vez» y «Me costó» aparecen como «Reforzar»; «Lo sabía», como «Recordadas». Las palabras nuevas y los datos antiguos sin esa evidencia aparecen como «Sin valorar». Los ejercicios asociados a una tarjeta concreta también registran su acierto o error. No es un porcentaje de dominio ni una estimación de fluidez. Las valoraciones de cada ficha se combinan por su última revisión; sus contadores no constituyen un historial exhaustivo de eventos entre dispositivos.

El tema claro u oscuro es una preferencia del dispositivo, separada del progreso. Sin elección explícita sigue el sistema; el control de sol/luna cambia el tema y Ajustes permite volver a «Como el dispositivo». Cambiarlo conserva el quiz abierto.

El usuario autorizó expresamente repositorio y app públicos, conexión a Vercel, acceso principal con Google y progreso en la nube. La app ofrece también correo y contraseña. El cliente propio de Google y el dominio de confianza están configurados; se verificó el recorrido real de Google hasta una cuenta con progreso sincronizado, con consentimiento del usuario para nombre, correo y foto.

El progreso se guarda en la nube por usuario con control de revisiones y combinación de avances entre dispositivos. Los cambios sin conexión permanecen en una cola local durable. Añadir avances de invitado es explícito; importar una copia o borrar progreso con cuenta afecta también a la nube y requiere confirmación. Al salir de la cuenta se vuelve a los avances de invitado sin mezclar identidades.

La autenticación usa rutas del mismo origen y un retorno de Google con verificación de sesión. El repositorio está vinculado a Vercel con acceso autorizado por el usuario a Wort; los cambios en `main` publican la aplicación. El despliegue por CLI también está disponible.

## Evidence on Hand

El usuario corrigió expresamente el idioma a alemán desde cero. El enlace compartido se titula «Práctica de pronombres alemanes», pero el cuerpo no es accesible públicamente.

## Product Principles

- Explicar desde el español sin equiparar sonidos que son diferentes.
- Practicar antes de revelar respuestas.
- Repetir lo que cuesta y conservar el progreso real.
- Mantener los controles legibles y cómodos en celular.
- Mantener separados los avances de invitado y de cada cuenta, con cambios pendientes visibles.
