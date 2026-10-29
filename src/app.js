import { lessons, pronunciationTips } from "./curriculum.js";
import { createAccount, syncLabels } from "./account.js";
import { createProgressController } from "./cloud-progress.js";
import {
  initialState,
  hydrateState,
  recordActivity,
  dateKey,
  getStreak,
  scheduleReview,
  dueCards,
  checkAnswer,
} from "./learning.js";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  book: '<path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1zM12 5v15"/>',
  repeat:
    '<path d="M20 7H8a5 5 0 0 0-5 5m1 5h12a5 5 0 0 0 5-5M17 3l4 4-4 4M7 13l-4 4 4 4"/>',
  chart: '<path d="M4 20V10m8 10V4m8 16v-7"/>',
  settings:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sound:
    '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  coffee:
    '<path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM16 9h2a3 3 0 0 1 0 6h-2M7 2v3m6-3v3"/>',
  flag: '<path d="M5 22V3c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
let state,
  cloud,
  account,
  storageFailed = false;
try {
  state = hydrateState(localStorage.getItem("wort-progress"));
} catch {
  state = initialState();
  storageFailed = true;
}
let view = [
  "learn",
  "review",
  "words",
  "progress",
  "settings",
  "account",
].includes(location.hash.slice(1))
  ? location.hash.slice(1)
  : "learn";
let session = null,
  wordFilter = "",
  installPrompt = null,
  toastTimer,
  voices = [];
const cards = lessons.flatMap((l) =>
  l.cards.map((c) => ({ ...c, lessonId: l.id, lessonTitle: l.title })),
);
const persist = () => {
  if (cloud) {
    state = cloud.setState(state);
    return;
  }
  try {
    localStorage.setItem("wort-progress", JSON.stringify(state));
  } catch {
    storageFailed = true;
    toast("No se pudo guardar. Exporta tu progreso desde Ajustes.");
  }
};
const toast = (text) => {
  clearTimeout(toastTimer);
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 4500);
};
const due = () => dueCards(state, cards);
const nextLesson = () =>
  lessons.find((l) => !state.completed.includes(l.id)) || lessons[0];
function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
const navItems = [
  ["learn", "home", "Aprender"],
  ["review", "repeat", "Repasar"],
  ["words", "book", "Mis palabras"],
  ["progress", "chart", "Mi progreso"],
];
function nav() {
  return navItems
    .map(
      ([id, ic, label]) =>
        `<button data-view="${id}" class="nav-item ${view === id && !session ? "active" : ""}" ${view === id && !session ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${id === "review" && due().length ? `<span class="nav-count">${due().length}</span>` : ""}</button>`,
    )
    .join("");
}
function render() {
  $("#app").innerHTML =
    `<aside class="sidebar"><a class="brand" href="#learn" aria-label="Wort, inicio"><span class="brand-symbol">w<span>•</span></span>wort<span class="brand-period">.</span></a><div class="language-label"><span class="german-flag" aria-hidden="true"></span>Alemán desde el español</div><nav aria-label="Navegación principal">${nav()}</nav><div class="sidebar-note"><span lang="de">Schritt für Schritt.</span><p>Paso a paso.<br>Una palabra a la vez.</p><span class="note-line"></span></div><button class="nav-item settings-nav ${view === "settings" ? "active" : ""}" data-view="settings">${icon("settings")}<span>Ajustes</span></button></aside><div class="workspace"><header class="topbar"><a href="#learn" class="mobile-brand">wort<span>.</span></a><span class="breadcrumb">Tu espacio de alemán <span>/</span> ${session ? "En práctica" : navItems.find((n) => n[0] === view)?.[2] || "Ajustes"}</span><div class="header-right"><span class="streak">${icon("spark")}<b>${getStreak(state)}</b><span>días de racha</span></span><button class="avatar" data-view="settings" aria-label="Abrir ajustes" title="Ajustes">${icon("settings")}</button></div></header><main id="main" tabindex="-1">${session ? renderSession() : renderView()}</main><footer class="site-footer"><span>Hecho para aprender. A tu ritmo.</span><span>Español → Deutsch ${icon("spark")}</span></footer></div><nav class="mobile-nav" aria-label="Navegación móvil">${nav()}</nav>`;
  const user = account?.getUser();
  const syncInfo = cloud?.getInfo() || { status: "local" };
  $(".header-right").insertAdjacentHTML(
    "afterbegin",
    `<button class="header-account" data-view="account" aria-label="${user ? "Abrir mi cuenta" : "Iniciar sesión"}"><span class="sync-dot ${user ? syncInfo.status : "local"}" aria-hidden="true"></span><span>${user ? "Mi cuenta" : "Entrar"}</span></button>`,
  );
  $(".settings-nav").insertAdjacentHTML(
    "beforebegin",
    `<button class="nav-item account-nav ${view === "account" ? "active" : ""}" data-view="account">${icon("book")}<span>${user ? "Mi cuenta" : "Entrar a mi cuenta"}</span></button>`,
  );
  if (view === "account")
    $(".breadcrumb").innerHTML =
      "Tu espacio de alemán <span>/</span> Mi cuenta";
  if (view === "settings") {
    const section = [...document.querySelectorAll(".settings-section")].find(
      (el) => el.querySelector("h2")?.textContent === "Tu progreso es tuyo",
    );
    if (section) {
      section.querySelector("p").textContent = user
        ? "Tu progreso se guarda en tu cuenta y en este dispositivo. La exportación te permite conservar una copia adicional."
        : "Tu progreso se guarda en este navegador. Entra a tu cuenta para sincronizarlo entre dispositivos, o exporta una copia.";
      section.insertAdjacentHTML(
        "afterbegin",
        `<button class="button secondary settings-account-link" data-view="account">${user ? "Ver mi cuenta y sincronización" : "Entrar para guardar mi progreso"}</button>`,
      );
    }
    const privacy = [...document.querySelectorAll(".about p")].find((el) =>
      el.textContent.includes("No hay anuncios, cuentas"),
    );
    if (privacy)
      privacy.textContent =
        "No hay anuncios ni analítica. Con una cuenta, Neon gestiona el acceso y guarda tu progreso; Vercel aloja la app. Sin cuenta, los avances permanecen en este navegador. Las voces son del dispositivo o de su proveedor.";
  }
  bind();
  account?.bind();
}
function renderView() {
  return (
    {
      learn: renderHome,
      review: renderReview,
      words: renderWords,
      progress: renderProgress,
      settings: renderSettings,
      account: () => account.render(),
    }[view] || renderHome
  )();
}
function renderHome() {
  const next = nextLesson(),
    completed = state.completed.length,
    today = state.activity[dateKey()]?.answers || 0,
    goal = state.settings.goal;
  return `<div class="page-heading"><div><h1>Tu alemán empieza<br>con un <span lang="de">Hallo.</span></h1><p>Un poco cada día. Un mundo por descubrir.</p></div><span class="level-pill"><span></span>Desde cero · A0 → A1</span></div><div class="home-top"><section class="welcome-panel" aria-labelledby="welcome-title"><div class="welcome-copy"><h2 id="welcome-title">${completed ? esc(next.title) : "Las grandes historias<br>empiezan con un hola."}</h2><p>${completed ? esc(next.summary) : "Escucha, entiende y di tus primeras palabras.<br>El español es tu punto de partida."}</p><button class="button primary" data-start="${next.id}">${completed ? "Seguir aprendiendo" : "Empezar mi primera lección"} ${icon("arrow")}</button><span class="small-meta">${icon("clock")} ${next.minutes} min aprox. <span>•</span> Sin prisa, sin presión</span></div><div class="word-art" aria-label="Hallo significa hola"><span class="art-hallo" lang="de">Hal<span>l</span>o<span class="art-dot">!</span></span><span class="translation-mark">hola ${icon("arrow")}</span><span class="art-speech" lang="de">Schön, dass du da bist.</span><span class="art-translation">Qué bueno que estés aquí.</span></div></section><aside class="daily-panel"><div class="daily-title">Tu pequeño gran hábito ${icon("spark")}</div><h2>${today}<span> / ${goal}</span></h2><p>respuestas practicadas hoy</p><div class="progress-track"><span style="width:${Math.min(100, (today / goal) * 100)}%"></span></div><p class="daily-message">${today >= goal ? "¡Meta cumplida! Cada paso cuenta." : "La constancia empieza<br>con unos minutos para ti."}</p><button class="daily-link" data-view="settings">Cambiar mi meta ${icon("arrow")}</button></aside></div><div class="section-heading"><div><h2>Tu ruta, paso a paso</h2><p>De tu primera palabra a situaciones de todos los días.</p></div><span class="route-total">${completed} de ${lessons.length} completadas</span></div><div class="route-list">${lessons.map((l, i) => `<button class="lesson-row ${state.completed.includes(l.id) ? "is-complete" : ""}" data-start="${l.id}"><span class="lesson-number">${state.completed.includes(l.id) ? icon("check") : String(i + 1).padStart(2, "0")}</span><span class="lesson-info"><strong>${esc(l.title)}</strong><span>${esc(l.subtitle)}</span></span><span class="lesson-duration">${l.minutes} min</span><span class="lesson-state">${state.completed.includes(l.id) ? "Practicar otra vez" : l.id === next.id ? "Empezar" : "Explorar"}</span><span class="row-arrow">${icon("arrow")}</span></button>`).join("")}</div><section class="spanish-tip"><span class="tip-symbol">ñ → ß</span><div><h3>Tu español viene contigo.</h3><p>Aprende qué se parece, qué cambia y dónde suelen aparecer las confusiones. Entender el porqué también es aprender.</p></div></section>`;
}
function renderReview() {
  const items = due(),
    learned = Object.keys(state.reviews).length;
  return `<div class="page-heading"><div><h1>Que se quede<br>contigo.</h1><p>Intenta recordar antes de mirar la respuesta.</p></div>${icon("repeat", "heading-icon")}</div><section class="review-intro"><div class="review-count">${items.length}<span>palabras para repasar hoy</span></div><div><h2>${items.length ? "Un reencuentro con tus palabras." : learned ? "Vas al día. Sehr gut!" : "Tu memoria empieza aquí."}</h2><p>${items.length ? "Las palabras vuelven cuando toca reforzarlas. Tú decides cuánto te costó recordarlas." : learned ? "Tus próximos repasos aparecerán cuando llegue su fecha. También puedes practicar todas tus palabras ahora." : "Completa una lección para añadir sus palabras a tus repasos. Volverán mañana y se espaciarán a medida que las recuerdes."}</p><button class="button primary" ${items.length ? 'data-review="due"' : learned ? 'data-review="all"' : `data-start="${lessons[0].id}"`}>${items.length ? "Empezar repaso" : learned ? "Practicar mis palabras" : "Ir a mi primera lección"} ${icon("arrow")}</button></div></section><div class="section-heading"><h2>Escuchar. Recordar. Volver.</h2></div><div class="method-list"><p><b>01</b><span><strong>Recupera la palabra.</strong> Lee el español e intenta decirlo en alemán antes de revelar.</span></p><p><b>02</b><span><strong>Valora tu recuerdo.</strong> «Otra vez» vuelve en 5 minutos; «Me costó», acorta el intervalo; «Lo sabía» amplía el intervalo.</span></p><p><b>03</b><span><strong>Dale tiempo.</strong> El repaso espaciado ayuda a consolidar lo aprendido. No hace falta hacerlo todo hoy.</span></p></div>`;
}
function wordRows(query = "") {
  const term = query.toLocaleLowerCase("es");
  const list = cards.filter(
    (c) =>
      !term ||
      `${c.de} ${c.es} ${c.note}`.toLocaleLowerCase("es").includes(term),
  );
  return list.length
    ? list
        .map(
          (c) =>
            `<article class="word-row"><div><strong lang="de">${esc(c.de)}</strong><span>${esc(c.es)}</span></div><span class="word-topic">${esc(c.lessonTitle)}</span><button class="icon-button" data-speak="${esc(c.de)}" aria-label="Escuchar ${esc(c.de)}">${icon("sound")}</button></article>`,
        )
        .join("")
    : '<div class="empty-state"><h2>No encontramos esa palabra.</h2><p>Prueba en español o alemán, o borra la búsqueda.</p></div>';
}
function renderWords() {
  return `<div class="page-heading"><div><h1>Pequeñas palabras.<br>Grandes comienzos.</h1><p>Tu diccionario de bolsillo, con ${cards.length} expresiones para empezar.</p></div></div><label class="search-label" for="word-search">Buscar en alemán o español</label><input id="word-search" class="search" type="search" placeholder="Prueba con «hola», «ich» o «café»" value="${esc(wordFilter)}" autocomplete="off"><div id="word-results" class="word-list">${wordRows(wordFilter)}</div><div class="section-heading"><h2>Los sonidos también se aprenden.</h2></div><div class="pronunciation-list">${pronunciationTips.map((t) => `<article><button class="sound-word" data-speak="${esc(t.de)}" aria-label="Escuchar ${esc(t.de)}">${icon("sound")}<span lang="de">${esc(t.de)}</span></button><div><h3>${esc(t.title)}</h3><p>${esc(t.explanation)}</p></div></article>`).join("")}</div>`;
}
function renderProgress() {
  const total = Object.values(state.activity).reduce(
      (s, d) => s + d.answers,
      0,
    ),
    mastered = Object.values(state.reviews).filter(
      (r) => r.repetitions >= 3,
    ).length;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      key: dateKey(d),
      day: d.toLocaleDateString("es", { weekday: "short" }),
      n: state.activity[dateKey(d)]?.answers || 0,
    };
  });
  return `<div class="page-heading"><div><h1>Cada paso<br>cuenta.</h1><p>Este es tu progreso real, guardado en este dispositivo.</p></div></div><div class="stats-strip"><div><strong>${state.completed.length}<small> / ${lessons.length}</small></strong><span>lecciones completadas</span></div><div><strong>${total}</strong><span>respuestas practicadas</span></div><div><strong>${getStreak(state)}</strong><span>días de racha</span></div><div><strong>${mastered}</strong><span>palabras reforzadas 3 veces</span></div></div><section class="activity-panel"><h2>Un poco, cada día</h2><p>Tus respuestas durante los últimos siete días.</p><div class="week-chart">${days.map((d) => `<div class="day-column"><span class="day-value">${d.n}</span><div class="day-track"><span style="height:${Math.min(100, (d.n / Math.max(10, ...days.map((x) => x.n))) * 100)}%"></span></div><span>${d.day}</span></div>`).join("")}</div></section><section class="progress-path"><h2>Lo que ya has recorrido</h2>${
    state.completed.length
      ? lessons
          .filter((l) => state.completed.includes(l.id))
          .map(
            (l) =>
              `<button data-start="${l.id}">${icon("check")}<span>${esc(l.title)}</span>${icon("arrow")}</button>`,
          )
          .join("")
      : `<p>Tu primera lección te está esperando. No necesitas saber nada para empezar.</p><button class="button primary" data-start="${lessons[0].id}">Dar mi primer paso ${icon("arrow")}</button>`
  }</section>`;
}
function renderSettings() {
  return `<div class="page-heading"><div><h1>A tu ritmo.</h1><p>Haz de Wort un espacio que funcione para ti.</p></div></div><section class="settings-section"><h2>Tu hábito diario</h2><label for="goal">Meta de respuestas al día</label><select id="goal">${[5, 10, 15, 20].map((n) => `<option value="${n}" ${state.settings.goal === n ? "selected" : ""}>${n} respuestas</option>`).join("")}</select><label for="voice-rate">Velocidad del audio</label><select id="voice-rate">${[
    [0.65, "Despacio"],
    [0.85, "Con calma"],
    [1, "Natural"],
  ]
    .map(
      ([n, t]) =>
        `<option value="${n}" ${state.settings.voiceRate === n ? "selected" : ""}>${t}</option>`,
    )
    .join(
      "",
    )}</select><button class="button secondary" data-speak="Hallo! Ich lerne Deutsch.">${icon("sound")} Probar audio alemán</button><p class="help">${voices.some((v) => v.lang.startsWith("de")) ? "Hay una voz alemana disponible en este dispositivo." : "No se detecta una voz alemana. Añade alemán en las voces de tu dispositivo; puedes estudiar con las transcripciones."} El audio puede necesitar conexión según la voz.</p></section><section class="settings-section"><h2>Llévala contigo</h2><p>Android: menú del navegador → «Instalar aplicación» o «Añadir a pantalla de inicio». iPhone: Safari → Compartir → «Añadir a pantalla de inicio».</p><button class="button secondary" id="install-app">${icon("download")} Instalar Wort</button><p class="help">Las lecciones y el progreso funcionan sin conexión después de la primera carga completa. El audio depende del dispositivo.</p></section><section class="settings-section"><h2>Tu progreso es tuyo</h2><p>Se guarda solo en este navegador. Exporta una copia si cambias de celular o vas a borrar los datos del navegador.</p>${storageFailed ? '<p class="storage-warning">El navegador no permite guardar los cambios. Exporta una copia antes de cerrar.</p>' : ""}<div class="button-group"><button class="button secondary" id="export-progress">${icon("download")} Exportar progreso</button><label class="button secondary" for="import-progress">Importar copia</label><input id="import-progress" class="visually-hidden" type="file" accept="application/json,.json"></div><button class="text-danger" id="reset-progress">Borrar mi progreso</button><div id="reset-confirm"></div></section><details class="about"><summary>Sobre Wort y su método</summary><p>Wort es una introducción original al alemán para hispanohablantes. Sus ocho lecciones son una base de inicio, no un programa A1 completo ni una certificación. Combínalas con escucha real y conversación.</p><p>Practicamos recuperar información y espaciar los repasos. El calendario es una heurística sencilla de 1, 3 y 7 días que se adapta a tu valoración; no es FSRS ni una predicción de fluidez.</p><p><a href="https://doi.org/10.1126/science.1152408" target="_blank" rel="noopener">Investigación sobre recuperación activa</a> · <a href="https://www.edresearch.edu.au/guides-resources/practice-guides/spacing-and-retrieval-practice-guide-full-publication" target="_blank" rel="noopener">Guía de práctica espaciada</a></p><p>No hay anuncios, cuentas ni analítica. Las voces son del dispositivo o de su proveedor.</p><a href="https://github.com/Aaronzaso/wort-aleman" target="_blank" rel="noopener">Ver el código en GitHub ${icon("arrow")}</a></details>`;
}
function startLesson(id) {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) return;
  session = {
    type: "lesson",
    lesson,
    stage: "study",
    index: 0,
    exerciseIndex: 0,
    queue: lesson.exercises.map((e, i) => ({
      ...e,
      key: i,
      options: e.options ? shuffle(e.options) : undefined,
      tokens: e.tokens ? shuffle(e.tokens) : undefined,
    })),
    wrong: new Set(),
    correct: 0,
    selected: null,
    checked: false,
    tokens: [],
  };
  render();
  focusMain();
}
function startReview(all = false) {
  const list = all ? cards.filter((c) => state.reviews[c.id]) : due();
  if (!list.length) {
    toast("No hay palabras pendientes por ahora.");
    return;
  }
  session = {
    type: "review",
    items: [...list]
      .sort(
        (a, b) =>
          (state.reviews[a.id]?.due || 0) - (state.reviews[b.id]?.due || 0),
      )
      .slice(0, 20),
    index: 0,
    revealed: false,
  };
  render();
  focusMain();
}
function sessionHeader(title, progress, label) {
  return `<div class="session-top"><button class="exit-button" id="exit-session">${icon("close")}<span>Salir</span></button><span>${esc(title)}</span><span>${label}</span></div><div class="session-progress"><span style="width:${progress}%"></span></div>`;
}
function renderSession() {
  if (session.type === "review") {
    const c = session.items[session.index];
    if (!c)
      return `<section class="session-finish"><span class="finish-symbol">${icon("check")}</span><h1>Bien recordado.</h1><p>Repasaste ${session.items.length} palabras. Volverán cuando toque reforzarlas.</p><button class="button primary" id="finish-close">Volver a mi ruta ${icon("arrow")}</button></section>`;
    return `${sessionHeader("Un momento para recordar", (session.index / session.items.length) * 100, `${session.index + 1} / ${session.items.length}`)}<section class="practice-stage"><span class="exercise-kind">RECUERDA EN ALEMÁN</span><h1>${esc(c.es)}</h1><p>Intenta decirlo en voz alta antes de mirar.</p>${session.revealed ? `<div class="revealed-answer"><h2 lang="de">${esc(c.de)}</h2><button class="icon-button" data-speak="${esc(c.de)}" aria-label="Escuchar la respuesta">${icon("sound")}</button><p>${esc(c.note)}</p></div><div class="review-grades"><button data-grade="again"><strong>Otra vez</strong><span>En 5 minutos</span></button><button data-grade="hard"><strong>Me costó</strong><span>Acortar intervalo</span></button><button data-grade="good"><strong>Lo sabía</strong><span>Ampliar intervalo</span></button></div>` : '<button class="button primary" id="reveal-review">Ver respuesta ' + icon("arrow") + "</button>"}</section>`;
  }
  const l = session.lesson;
  if (session.stage === "done")
    return `<section class="session-finish"><span class="finish-symbol">${icon("check")}</span><span class="exercise-kind" lang="de">GUT GEMACHT!</span><h1>Un paso más.<br>Una puerta nueva.</h1><p>Completaste «${esc(l.title)}». Acertaste ${session.correct} de ${l.exercises.length} preguntas al primer intento.</p><p class="finish-note">${session.wrong.size ? "Repasaste tus errores en una segunda ronda. Las frases de esta lección volverán mañana." : "Las palabras de esta lección volverán mañana para ayudarte a recordarlas."}</p><div class="button-group"><button class="button primary" id="finish-close">Volver a mi ruta ${icon("arrow")}</button><button class="button secondary" data-start="${lessons[(lessons.indexOf(l) + 1) % lessons.length].id}">Otra lección</button></div></section>`;
  if (session.stage === "study") {
    const c = l.cards[session.index];
    return `${sessionHeader(l.title, (session.index / (l.cards.length + l.exercises.length)) * 100, `${session.index + 1} / ${l.cards.length} palabras`)}<section class="practice-stage study-stage"><span class="exercise-kind">ESCUCHA Y CONECTA</span><div class="flashcard"><span class="card-lang">DEUTSCH</span><h1 lang="de">${esc(c.de)}</h1><button class="listen-button" data-speak="${esc(c.de)}">${icon("sound")} Escuchar</button><span class="card-divider"></span><h2>${esc(c.es)}</h2><p>${esc(c.note)}</p></div><div class="lesson-tip"><b>Desde el español</b><p>${esc(l.tip)}</p></div><div class="study-controls"><button class="button secondary" id="prev-card" ${session.index === 0 ? "disabled" : ""}>Anterior</button><button class="button primary" id="next-card">${session.index === l.cards.length - 1 ? "Vamos a practicar" : "Siguiente palabra"} ${icon("arrow")}</button></div></section>`;
  }
  const e = session.queue[session.exerciseIndex],
    total = session.queue.length;
  const progress =
    ((l.cards.length + session.exerciseIndex) / (l.cards.length + total)) * 100;
  const label = {
    choice: "ELIGE LA RESPUESTA",
    listen: "AFINA EL OÍDO",
    write: "ESCRIBE EN ALEMÁN",
    order: "DALE ORDEN A LA FRASE",
  }[e.type];
  const input =
    e.type === "choice" || e.type === "listen"
      ? `<div class="answer-options">${(e.options || []).map((o, i) => `<button class="answer-option ${session.selected === i ? "selected" : ""}" data-option="${i}" ${session.checked ? "disabled" : ""}><span>${String.fromCharCode(65 + i)}</span>${esc(o)}${session.checked && checkAnswer(o, e.answer).correct ? icon("check") : ""}</button>`).join("")}</div>`
      : e.type === "order"
        ? `<div class="sentence-output" aria-live="polite">${session.tokens.length ? session.tokens.map((i) => `<button data-remove-token="${i}" ${session.checked ? "disabled" : ""}>${esc(e.tokens[i])} <span>×</span></button>`).join("") : "<span>Toca las palabras en orden.</span>"}</div><div class="token-bank">${e.tokens.map((t, i) => `<button data-token="${i}" ${session.tokens.includes(i) || session.checked ? "disabled" : ""}>${esc(t)}</button>`).join("")}</div>`
        : `<label class="visually-hidden" for="written-answer">Tu respuesta en alemán</label><textarea id="written-answer" placeholder="Escribe tu respuesta…" rows="2" autocapitalize="off" autocomplete="off" spellcheck="false" ${session.checked ? "disabled" : ""}>${esc(session.written || "")}</textarea><div class="accent-keys" aria-label="Caracteres alemanes">${["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"].map((c) => `<button data-accent="${c}" ${session.checked ? "disabled" : ""}>${c}</button>`).join("")}</div>`;
  return `${sessionHeader(l.title, progress, `${session.exerciseIndex + 1} / ${total}`)}<section class="practice-stage exercise-stage"><span class="exercise-kind">${label}${session.exerciseIndex >= l.exercises.length ? " · SEGUNDA VUELTA" : ""}</span><h1>${esc(e.prompt)}</h1>${e.type === "listen" ? `<button class="audio-exercise" data-speak="${esc(e.de || e.answer)}">${icon("sound")} Escuchar en alemán</button><details class="transcript"><summary>Ver transcripción si no puedo escuchar</summary><p lang="de">${esc(e.de || e.answer)}</p></details>` : ""}${input}<div id="feedback" aria-live="polite">${session.checked ? `<div class="answer-feedback ${session.result.correct ? "correct" : "incorrect"}"><strong>${session.result.correct ? "¡Bien! Sehr gut." : session.result.accentOnly ? "Casi: revisa los caracteres." : "Vamos a aprender de esta."}</strong>${!session.result.correct ? `<p>Respuesta: <b lang="de">${esc(e.answer)}</b></p>` : ""}<p>${esc(e.explanation)}</p></div>` : ""}</div><button class="button primary check-button" id="${session.checked ? "next-exercise" : "check-answer"}">${session.checked ? "Continuar" : "Comprobar"} ${icon("arrow")}</button></section>`;
}
function focusMain() {
  $("#main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function go(id) {
  if (session) {
    toast("Termina la práctica o usa «Salir» para cambiar de sección.");
    return;
  }
  view = id;
  location.hash = id;
  render();
  focusMain();
}
function bind() {
  document
    .querySelectorAll("[data-view]")
    .forEach((el) => (el.onclick = () => go(el.dataset.view)));
  document
    .querySelectorAll("[data-start]")
    .forEach((el) => (el.onclick = () => startLesson(el.dataset.start)));
  document
    .querySelectorAll("[data-speak]")
    .forEach((el) => (el.onclick = () => speak(el.dataset.speak)));
  document
    .querySelectorAll("[data-review]")
    .forEach(
      (el) => (el.onclick = () => startReview(el.dataset.review === "all")),
    );
  $("#word-search")?.addEventListener("input", (e) => {
    wordFilter = e.target.value;
    $("#word-results").innerHTML = wordRows(wordFilter);
    $("#word-results")
      .querySelectorAll("[data-speak]")
      .forEach((el) => (el.onclick = () => speak(el.dataset.speak)));
  });
  $("#goal")?.addEventListener("change", (e) => {
    state.settings.goal = Number(e.target.value);
    persist();
    toast("Meta diaria guardada.");
  });
  $("#voice-rate")?.addEventListener("change", (e) => {
    state.settings.voiceRate = Number(e.target.value);
    persist();
  });
  $("#install-app")?.addEventListener("click", async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      installPrompt = null;
    } else
      toast(
        "Android: menú → Instalar. iPhone: Safari → Compartir → Añadir a pantalla de inicio.",
      );
  });
  $("#export-progress")?.addEventListener("click", () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `wort-progreso-${dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Copia de progreso exportada.");
  });
  $("#import-progress")?.addEventListener("change", async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2000000) throw Error();
      const raw = JSON.parse(await file.text());
      if (
        raw.version !== 1 ||
        !Array.isArray(raw.completed) ||
        !raw.reviews ||
        !raw.activity
      )
        throw Error();
      const imported = hydrateState(raw);
      const targetUser = account?.getUser()?.id || null;
      let confirmation = $("#import-confirm");
      if (!confirmation) {
        confirmation = document.createElement("div");
        confirmation.id = "import-confirm";
        $("#import-progress").closest(".settings-section").append(confirmation);
      }
      confirmation.innerHTML = `<p>${targetUser ? "Esta copia reemplazará el progreso de tu cuenta en todos los dispositivos al sincronizar." : "Esta copia reemplazará el progreso de este navegador."} Exporta antes una copia si quieres conservarlo.</p><div class="button-group"><button class="button primary" id="confirm-import">Sí, importar y reemplazar</button><button class="button secondary" id="cancel-import">Cancelar</button></div>`;
      $("#confirm-import").onclick = () => {
        if ((account?.getUser()?.id || null) !== targetUser) {
          toast("La cuenta cambió. Vuelve a seleccionar la copia.");
          return;
        }
        state = imported;
        if (cloud) state = cloud.setState(state, { replace: true });
        else persist();
        render();
        toast("Progreso importado.");
      };
      $("#cancel-import").onclick = () => confirmation.remove();
    } catch {
      toast("No se pudo importar. Elige una copia JSON exportada por Wort.");
    }
  });
  $("#reset-progress")?.addEventListener("click", () => {
    $("#reset-confirm").innerHTML =
      '<p>Se borrarán las lecciones, las palabras y las estadísticas de este navegador.</p><button class="button danger" id="confirm-reset">Sí, borrar mi progreso</button> <button class="button secondary" id="cancel-reset">Conservar mi progreso</button>';
    if (account?.getUser())
      $("#reset-confirm p").textContent =
        "Se borrarán las lecciones, las palabras y las estadísticas de tu cuenta en todos los dispositivos al sincronizar. Esta acción no se puede deshacer sin una copia exportada.";
    $("#confirm-reset").onclick = () => {
      state = initialState();
      if (cloud) state = cloud.setState(state, { replace: true });
      else persist();
      render();
      toast("Progreso borrado. Puedes empezar de nuevo.");
    };
    $("#cancel-reset").onclick = () => {
      $("#reset-confirm").innerHTML = "";
    };
  });
  $("#exit-session")?.addEventListener("click", () => {
    session = null;
    window.speechSynthesis?.cancel();
    render();
    focusMain();
    toast("Práctica cerrada. Los repasos ya respondidos están guardados.");
  });
  $("#finish-close")?.addEventListener("click", () => {
    session = null;
    view = "learn";
    location.hash = "learn";
    render();
    focusMain();
  });
  $("#prev-card")?.addEventListener("click", () => {
    session.index--;
    render();
  });
  $("#next-card")?.addEventListener("click", () => {
    if (session.index < session.lesson.cards.length - 1) session.index++;
    else session.stage = "exercise";
    render();
    focusMain();
  });
  document.querySelectorAll("[data-option]").forEach(
    (el) =>
      (el.onclick = () => {
        if (session.checked) return;
        session.selected = Number(el.dataset.option);
        document
          .querySelectorAll("[data-option]")
          .forEach((x) => x.classList.toggle("selected", x === el));
      }),
  );
  document.querySelectorAll("[data-token]").forEach(
    (el) =>
      (el.onclick = () => {
        session.tokens.push(Number(el.dataset.token));
        render();
      }),
  );
  document.querySelectorAll("[data-remove-token]").forEach(
    (el) =>
      (el.onclick = () => {
        session.tokens = session.tokens.filter(
          (i) => i !== Number(el.dataset.removeToken),
        );
        render();
      }),
  );
  document.querySelectorAll("[data-accent]").forEach(
    (el) =>
      (el.onclick = () => {
        const input = $("#written-answer"),
          start = input.selectionStart,
          end = input.selectionEnd;
        input.value =
          input.value.slice(0, start) +
          el.dataset.accent +
          input.value.slice(end);
        input.focus();
        input.setSelectionRange(start + 1, start + 1);
        session.written = input.value;
      }),
  );
  $("#written-answer")?.addEventListener(
    "input",
    (e) => (session.written = e.target.value),
  );
  $("#written-answer")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      checkExercise();
    }
  });
  $("#check-answer")?.addEventListener("click", checkExercise);
  $("#next-exercise")?.addEventListener("click", () => {
    session.exerciseIndex++;
    session.selected = null;
    session.tokens = [];
    session.written = "";
    session.checked = false;
    if (session.exerciseIndex >= session.queue.length) finishLesson();
    render();
    focusMain();
  });
  $("#reveal-review")?.addEventListener("click", () => {
    session.revealed = true;
    render();
  });
  document.querySelectorAll("[data-grade]").forEach(
    (el) =>
      (el.onclick = () => {
        if (!session.revealed) return;
        const c = session.items[session.index];
        state.reviews[c.id] = scheduleReview(
          state.reviews[c.id],
          el.dataset.grade,
        );
        state = recordActivity(state, {
          xp: el.dataset.grade === "good" ? 10 : 5,
        });
        persist();
        session.index++;
        session.revealed = false;
        render();
        focusMain();
      }),
  );
}
function checkExercise() {
  if (session?.checked) return;
  const e = session.queue[session.exerciseIndex];
  const answer =
    e.type === "choice" || e.type === "listen"
      ? (e.options?.[session.selected] ?? "")
      : e.type === "order"
        ? session.tokens.map((i) => e.tokens[i]).join(" ")
        : $("#written-answer").value;
  if (!answer.trim()) {
    toast("Elige o escribe una respuesta primero.");
    return;
  }
  session.result = checkAnswer(answer, e.answer);
  session.checked = true;
  session.written = answer;
  if (
    session.result.correct &&
    session.exerciseIndex < session.lesson.exercises.length
  )
    session.correct++;
  if (!session.result.correct && !session.wrong.has(e.key)) {
    session.wrong.add(e.key);
    session.queue.push({ ...e });
  }
  state = recordActivity(state, { xp: session.result.correct ? 10 : 3 });
  persist();
  render();
  $("#next-exercise").focus({ preventScroll: true });
}
function finishLesson() {
  const l = session.lesson;
  if (!state.completed.includes(l.id)) state.completed.push(l.id);
  for (const c of l.cards)
    if (!state.reviews[c.id])
      state.reviews[c.id] = scheduleReview(undefined, "good");
  persist();
  session.stage = "done";
}
function loadVoices() {
  voices = window.speechSynthesis?.getVoices() || [];
}
function speak(text) {
  loadVoices();
  if (!("speechSynthesis" in window)) {
    toast("Este navegador no admite audio. Puedes seguir con el texto.");
    return;
  }
  const german = voices.filter((v) => v.lang.toLowerCase().startsWith("de"));
  if (!german.length) {
    toast(
      "Añade una voz alemana en los ajustes del dispositivo. Usa la transcripción para continuar.",
    );
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.voice = german.find((v) => v.lang === "de-DE") || german[0];
  utterance.rate = state.settings.voiceRate;
  utterance.onerror = () =>
    toast("No se pudo reproducir. Comprueba la voz alemana o usa el texto.");
  window.speechSynthesis.speak(utterance);
}
window.addEventListener("hashchange", () => {
  const id = location.hash.slice(1);
  if (
    navItems.some((n) => n[0] === id) ||
    id === "settings" ||
    id === "account"
  ) {
    if (session) {
      location.hash = view;
      return;
    }
    view = id;
    render();
  }
});
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
loadVoices();
if (window.speechSynthesis)
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
async function progressRequest(method, payload) {
  const token = await account.token();
  const response = await fetch("/api/progress", {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = Object.assign(
      new Error(
        response.status === 401
          ? "Tu sesión venció. Vuelve a entrar."
          : "No se pudo sincronizar. Conservamos tus avances en este dispositivo.",
      ),
      { status: response.status },
    );
    if (response.status === 409)
      error.current = { document: data.document, revision: data.revision };
    throw error;
  }
  return data;
}
// A new writer for every page instance also isolates duplicated browser tabs.
const actor = crypto.randomUUID();
const storageBridge = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      storageFailed = true;
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      storageFailed = true;
      throw new Error("No se pudo guardar en este dispositivo.");
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      storageFailed = true;
    }
  },
  key(index) {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  },
  get length() {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  },
};
cloud = createProgressController({
  storage: storageBridge,
  actor,
  transport: {
    load: () => progressRequest("GET"),
    save: (document, expectedRevision) =>
      progressRequest("PUT", { document, expectedRevision }),
  },
  onState(next, meta) {
    state = next;
    if (meta?.reason === "account" || meta?.reason === "guest") session = null;
    if (
      account &&
      (!session || meta?.reason === "account" || meta?.reason === "guest") &&
      !(view === "account" && account.isBusy())
    )
      render();
  },
  onStatus() {
    if (!account) return;
    const info = cloud.getInfo();
    document
      .querySelectorAll(
        ".header-account .sync-dot,.account-sync-state .sync-dot",
      )
      .forEach((dot) => (dot.className = `sync-dot ${info.status}`));
    const label = document.querySelector(".account-sync-state strong");
    if (label) label.textContent = syncLabels[info.status] || syncLabels.local;
    const help = document.querySelector("#account-sync-help");
    if (help)
      help.textContent =
        info.errorMessage ||
        (info.pending
          ? "Tus avances están guardados aquí y pendientes de sincronizar."
          : "Tus avances se sincronizan con tu cuenta.");
    const syncButton = document.querySelector("#sync-now");
    if (syncButton)
      syncButton.disabled =
        info.status === "loading" || info.status === "syncing";
  },
});
state = cloud.getState();
account = createAccount({
  getProgressInfo: () => cloud.getInfo(),
  onUser: (user) => (user ? cloud.connect(user.id) : cloud.disconnect()),
  onChange() {
    if (view === "account" || !session) render();
  },
  onMessage(message) {
    if (message === "guest") go("learn");
    else toast(message);
  },
  onSync: () => cloud.sync(),
  onImportGuest: () => cloud.importGuest(),
});
if (new URL(location.href).searchParams.has("token")) view = "account";
render();
account.init();
window.addEventListener("online", () => {
  account.refresh();
  cloud.sync();
});
window.addEventListener("focus", () => {
  account.refresh();
  if (account.getUser()) cloud.sync();
});
window.addEventListener("pagehide", () => {
  /* Progress was queued to local storage before every network write. */
});
if (storageFailed)
  setTimeout(
    () =>
      toast(
        "El progreso no se puede guardar en este navegador. Puedes exportarlo en Ajustes.",
      ),
    500,
  );
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .then((reg) => {
      if (reg.waiting) offerUpdate(reg);
      reg.addEventListener("updatefound", () => {
        reg.installing?.addEventListener("statechange", () => {
          if (reg.waiting && navigator.serviceWorker.controller)
            offerUpdate(reg);
        });
      });
    })
    .catch(() =>
      toast(
        "Sin conexión inicial: vuelve a abrir Wort con internet para preparar el modo offline.",
      ),
    );
function offerUpdate(reg) {
  const box = $("#toast");
  box.textContent = "Hay una nueva versión de Wort. ";
  const button = document.createElement("button");
  button.textContent = "Actualizar";
  button.onclick = () => {
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    reg.waiting?.postMessage("SKIP_WAITING");
  };
  box.append(button);
  box.classList.add("show");
}
