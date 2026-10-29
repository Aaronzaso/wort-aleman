---
name: Wort
description: Un taller de conversación para dar el primer paso en alemán.
colors:
  ink: "#282339"
  muted: "#6b657b"
  purple: "#5940c6"
  purple-dark: "#41308d"
  lilac: "#eee9fc"
  paper: "#f6f5fa"
  mint: "#c4f1be"
  line: "#e6e3ed"
  white: "#fff"
typography:
  display:
    fontFamily: "Trebuchet MS, Arial, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Trebuchet MS, Arial, sans-serif"
    fontSize: "29px"
    fontWeight: 700
    lineHeight: 1.18
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 700
rounded:
  control: "8px"
  navigation: "9px"
  answer: "10px"
  inset: "12px"
  panel: "16px"
  pill: "25px"
spacing:
  tight: "8px"
  related: "12px"
  group: "22px"
  panel: "28px"
  desktop-edge: "45px"
components:
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "13px 18px"
  button-primary-hover:
    backgroundColor: "{colors.purple-dark}"
  button-secondary:
    backgroundColor: "#eeebf5"
    textColor: "{colors.purple-dark}"
    rounded: "{rounded.control}"
    padding: "13px 18px"
  navigation-active:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.purple}"
    rounded: "{rounded.navigation}"
    padding: "14px 15px"
  search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.navigation}"
    padding: "15px 17px"
  flashcard:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "36px 32px 32px"
---

# Design System: Wort

## Overview

**Creative North Star: "Taller de conversación"**

Esta es una descripción del diseño implementado, no una preferencia estética confirmada por el usuario. La interfaz usa tinta violeta, superficies lilas y marcas menta para conectar una palabra alemana con su significado en español. Los títulos redondeados dan carácter; los controles conservan formas sencillas y reconocibles.

La unidad visual principal es una expresión que se escucha, se entiende y se practica. Las listas dan continuidad al curso y las tarjetas reservan espacio para una sola tarea. La ilustración tipográfica de bienvenida se omite en celular para proteger la lectura.

**Key Characteristics:**

- Superficies planas diferenciadas por tono.
- Títulos redondeados y texto de interfaz de sistema.
- Una expresión central por tarjeta de estudio.
- Navegación lateral en escritorio y barra inferior en celular.

## Colors

El violeta concentra acciones y estados activos; el lila agrupa contenido y la menta marca conexiones o confirmaciones.

- **Primary:** `purple` en acciones, iconos y palabras destacadas; `purple-dark` en hover de botones principales y texto secundario de acciones.
- **Secondary:** `lilac` en navegación activa, botones de audio y respuestas reveladas; `mint` en divisores de traducción y detalles de progreso.
- **Neutral:** `paper` es el fondo del espacio, `white` las tarjetas, `ink` el texto principal, `muted` el texto de apoyo y `line` los separadores.

Los estados de ejercicio también usan verde para acierto y rosa para error, acompañados siempre de texto explícito. El panel de hábito usa una superficie ciruela (`#35294f`) con texto claro.

## Typography

Los títulos usan Trebuchet MS con Arial de respaldo; la interfaz usa Arial, Helvetica y sans-serif. No hay fuentes externas.

- El título de página parte del rol display; baja a (36px) en celular y a (33px) bajo (370px).
- La frase de estudio usa (43px) en escritorio y (34px) en celular; permite romper palabras largas.
- El cuerpo principal es de (14px), las explicaciones de tarjeta de (13px) y las etiquetas de (10–12px). En celular se reducen los textos auxiliares según su componente.
- Los párrafos usan interlineado (1.6). Las notas de tarjeta se limitan a (50ch) y las explicaciones de ajustes a (70ch).

## Layout

En escritorio hay una barra lateral fija de (225px), cabecera de (87px) y área principal de ancho máximo (1400px), con márgenes interiores laterales de (45px). El inicio combina una superficie de bienvenida con un panel de hábito de (244px). La ruta usa filas completas con número, título, subtítulo, duración y acción.

Los puntos de adaptación existentes son (1600px), (1250px), (1050px), (760px) y (370px). Bajo (1050px), bienvenida y hábito se apilan. Bajo (760px), desaparece la barra lateral, la cabecera mide (69px), el margen lateral es (22px) y la navegación se fija abajo con espacio para el área segura del dispositivo. El pie deja espacio para esa barra.

Las prácticas se centran en una columna de hasta (650px). Los grupos relacionados usan separaciones cortas; los cambios de sección tienen más aire. Las filas de lección mantienen un orden numerado real y no bloquean el acceso a otras lecciones.

## Elevation & Depth

Las superficies son planas: el contraste tonal y los separadores construyen la jerarquía. Las tarjetas principales no tienen sombra. El aviso flotante es la excepción funcional, con una sombra desplazada (`0 8px 24px #30243f25`) que lo separa del contenido mientras comunica un estado.

## Shapes

Los paneles comparten esquinas suaves del rol panel. Los botones son rectángulos de radio control; los indicadores pequeños y el botón de audio pueden usar forma de píldora. Los botones de icono son circulares. Los bordes finos se reservan para campos, opciones y separadores; las respuestas seleccionadas usan un contorno violeta de (2px).

## Components

- **Botones:** principal violeta, secundario lila grisáceo y acciones de texto sin contenedor. Altura mínima base (47px); al presionar se desplazan (1px). Los botones deshabilitados reducen opacidad.
- **Navegación:** icono de línea más etiqueta. El elemento activo usa violeta y fondo lila en escritorio; en celular usa una marca superior violeta. Ajustes tiene un engranaje visible y nombre accesible.
- **Búsqueda y escritura:** superficies blancas, bordes suaves y texto oscuro. La escritura alemana ofrece teclas ä, ö, ü y ß. El foco visible común es un contorno de (3px), desplazado (4px).
- **Tarjeta de estudio:** expresión alemana grande, acción de audio, divisor menta, traducción española y explicación breve. La entrada usa desplazamiento vertical (9px) y recorte durante (.35s); se elimina con movimiento reducido.
- **Opciones de respuesta:** filas blancas con letra de referencia y selección violeta. La corrección añade texto explicativo y un icono de acierto cuando corresponde.
- **Avisos:** aparecen sobre el contenido y anuncian su texto mediante una región de estado. En celular quedan por encima de la navegación inferior.

## Do's and Don'ts

### Do:

- **Do** mantener la expresión y su traducción como foco de las tarjetas de estudio.
- **Do** conservar violeta para acciones y estados activos, y menta para conexiones y confirmaciones.
- **Do** incluir etiquetas accesibles en botones de icono y foco visible en controles.
- **Do** comprobar palabras alemanas largas y las teclas de caracteres especiales en celular.

### Don't:

- **Don't** poner elementos decorativos encima de títulos o controles en celular.
- **Don't** añadir sombras a las tarjetas principales sin cambiar deliberadamente el sistema plano actual.
- **Don't** depender solo del color para explicar una respuesta correcta o incorrecta.
- **Don't** eliminar el espacio inferior que evita que la barra móvil cubra el contenido final.
