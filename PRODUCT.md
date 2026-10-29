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

Ocho lecciones iniciales, 64 tarjetas, 48 ejercicios de comprensión y escritura, tarjetas de repaso y audio del dispositivo. El audio depende de una voz alemana disponible. Contenido inicial orientativo A0–A1; no equivale a un curso completo ni a una certificación.

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
