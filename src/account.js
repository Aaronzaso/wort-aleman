import { createAuthClient } from "@neondatabase/auth";

const escape = (text) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const enabled =
  typeof __WORT_AUTH_ENABLED__ !== "undefined" && __WORT_AUTH_ENABLED__;
const appUrl =
  typeof __WORT_APP_URL__ !== "undefined"
    ? __WORT_APP_URL__
    : "https://wort-aleman.vercel.app";
export const syncLabels = {
  local: "En este dispositivo",
  loading: "Cargando tu progreso…",
  syncing: "Guardando tu progreso…",
  saved: "Progreso sincronizado",
  offline: "Sin conexión · guardado aquí",
  error: "Pendiente de sincronizar",
};

export function createAccount({
  onUser,
  onChange,
  onMessage,
  onSync,
  onImportGuest,
  getProgressInfo,
}) {
  const client = enabled
    ? createAuthClient(`${location.origin}/api/auth`)
    : null;
  let user = null,
    checking = !!client,
    busy = false,
    mode = "signin",
    message = "",
    errorMessage = "",
    recoveryEmail = "";
  const currentUrl = new URL(location.href);
  const recoveryToken = currentUrl.searchParams.get("token");
  if (recoveryToken) mode = "new-password";
  if (currentUrl.searchParams.has("authError"))
    errorMessage =
      "No se pudo completar el acceso con Google. Puedes intentarlo de nuevo.";

  function notify() {
    onChange?.();
  }
  async function setUser(next) {
    const previousId = user?.id;
    user = next;
    try {
      if (next)
        localStorage.setItem(
          "wort-last-user",
          JSON.stringify({ id: next.id, email: next.email, name: next.name }),
        );
      else localStorage.removeItem("wort-last-user");
    } catch {}
    if (previousId !== next?.id) await onUser?.(next);
    notify();
  }
  async function refresh() {
    if (!client || busy) return;
    try {
      const result = await client.getSession({
        fetchOptions: { cache: "no-store" },
      });
      if (result.error) throw result.error;
      checking = false;
      await setUser(result.data?.user || null);
    } catch {
      checking = false;
      // This is a local display identity, never authorization for server data.
      if (!user)
        try {
          const cached = JSON.parse(localStorage.getItem("wort-last-user"));
          if (cached?.id) await setUser(cached);
        } catch {}
      notify();
    }
  }
  function safeError(error) {
    const code = String(error?.code || "").toUpperCase();
    if (!navigator.onLine)
      return "No hay conexión. Puedes seguir practicando y entrar cuando tengas internet.";
    if (error?.status === 429 || /RATE|TOO_MANY/.test(code))
      return "Has hecho varios intentos. Espera un momento antes de volver a probar.";
    if (/PASSWORD.*SHORT|WEAK_PASSWORD/.test(code))
      return "Elige una contraseña de al menos 8 caracteres.";
    if (/INVALID_EMAIL/.test(code))
      return "Revisa que el correo esté escrito correctamente.";
    if (/USER_ALREADY|EMAIL_ALREADY/.test(code))
      return "No se pudo crear la cuenta. Prueba a iniciar sesión o recuperar tu contraseña.";
    if (/EMAIL_NOT_VERIFIED/.test(code))
      return "Confirma tu correo antes de entrar. Revisa también la carpeta de spam.";
    if (/INVALID.*PASSWORD|INVALID_CREDENTIAL|USER_NOT_FOUND/.test(code))
      return "El correo o la contraseña no coinciden. Revisa los datos o recupera tu contraseña.";
    if (/OTP|TOKEN.*EXPIRED|INVALID_TOKEN/.test(code))
      return "El enlace o código ya no es válido. Solicita uno nuevo.";
    if (error?.status === 403)
      return "No se pudo completar el acceso. Vuelve a intentarlo desde el enlace principal de Wort.";
    return mode === "signin"
      ? "No se pudo entrar. Revisa tu correo y contraseña, o prueba de nuevo en un momento."
      : "No se pudo completar la solicitud. Revisa los datos y vuelve a intentarlo.";
  }
  const inputs = () =>
    `<label for="account-email">Correo electrónico</label><input id="account-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="tu@correo.com" required value="${escape(recoveryEmail)}">`;
  function render() {
    const info = getProgressInfo();
    if (!enabled)
      return `<section class="account-page"><div class="page-heading"><div><h1>Tu alemán,<br>contigo.</h1><p>Guarda tus avances y continúa desde otro dispositivo.</p></div></div><div class="account-sheet"><h2>Tu cuenta vive en Wort.</h2><p>Abre la versión de Vercel para iniciar sesión y guardar tu progreso en la nube.</p><a class="button primary" href="${escape(appUrl)}">Abrir Wort con mi cuenta →</a><p class="help">Si has practicado aquí, exporta tu progreso desde Ajustes e impórtalo en la nueva app.</p></div></section>`;
    if (user)
      return `<section class="account-page"><div class="page-heading"><div><h1>Tu alemán,<br>donde estés.</h1><p>Continúa con tu cuenta en el celular o la computadora.</p></div></div><div class="account-sheet"><div class="account-identity"><span class="account-initial">${escape((user.name || user.email || "W").slice(0, 1).toUpperCase())}</span><div><h2>${escape(user.name || "Tu cuenta")}</h2><p>${escape(user.email)}</p></div></div><div class="account-sync-state"><span class="sync-dot ${info.status}"></span><strong>${syncLabels[info.status] || syncLabels.local}</strong></div><p id="account-sync-help">${info.pending ? "Tus últimos avances están guardados en este dispositivo y se enviarán al conectar." : info.status === "saved" ? "Tus lecciones, palabras, ajustes y estadísticas están guardados en tu cuenta." : "Puedes practicar sin conexión. Al volver a conectar, sincronizaremos tus avances."}</p><div class="button-group"><button class="button primary" id="sync-now" ${busy || info.status === "syncing" || info.status === "loading" ? "disabled" : ""}>Sincronizar ahora</button><button class="button secondary" id="sign-out" ${busy ? "disabled" : ""}>Cerrar sesión</button></div>${info.guestAvailable ? `<div class="guest-transfer"><h3>Tienes avances en este navegador.</h3><p>Añádelos a tu cuenta para continuarlos desde otro dispositivo. Esta transferencia se realiza una sola vez.</p><button class="button secondary" id="transfer-guest" ${busy ? "disabled" : ""}>Añadir mis avances locales</button></div>` : ""}<p class="help">Al cerrar sesión, tus datos de cuenta dejan de mostrarse y vuelves al modo sin cuenta. Cada persona tiene su propio progreso.</p></div><div class="account-privacy"><h3>Practica ahora. Sincroniza después.</h3><p>Si estás sin conexión, conserva esta sesión para seguir practicando con tu cuenta. Puedes exportar una copia de tus avances desde Ajustes.</p></div></section>`;
    return `<section class="account-page"><div class="page-heading"><div><h1>Tu alemán,<br>contigo.</h1><p>Un paso en el celular. El siguiente, donde quieras.</p></div></div><div class="account-grid"><div class="account-sheet">${mode === "signin" || mode === "signup" ? `<div class="account-tabs" role="tablist" aria-label="Acceso a tu cuenta"><button role="tab" aria-selected="${mode === "signin"}" data-auth-mode="signin" ${busy ? "disabled" : ""}>Entrar</button><button role="tab" aria-selected="${mode === "signup"}" data-auth-mode="signup" ${busy ? "disabled" : ""}>Crear cuenta</button></div>` : `<button class="account-back" data-auth-mode="signin">← Volver a entrar</button>`}<h2>${mode === "signin" ? "Qué bueno verte de nuevo." : mode === "signup" ? "Tu primera palabra se queda contigo." : mode === "recover" ? "Recupera tu acceso." : "Elige tu nueva contraseña."}</h2><p>${mode === "recover" ? "Te enviaremos un enlace para crear una nueva contraseña." : mode === "new-password" ? "Usa al menos 8 caracteres y una clave que no hayas usado en otros sitios." : "Guarda tus lecciones y repasos en tu cuenta."}</p>${checking ? '<p class="account-checking" role="status">Comprobando tu sesión…</p>' : ""}<form id="account-form">${mode === "signup" ? '<label for="account-name">Cómo quieres que te llamemos</label><input id="account-name" name="name" type="text" autocomplete="nickname" maxlength="60" placeholder="Tu nombre" required>' : ""}${mode !== "new-password" ? inputs() : ""}${mode !== "recover" ? `<label for="account-password">${mode === "new-password" ? "Nueva contraseña" : "Contraseña"}</label><div class="password-input"><input id="account-password" name="password" type="password" autocomplete="${mode === "signin" ? "current-password" : "new-password"}" minlength="8" maxlength="128" placeholder="${mode === "signin" ? "Tu contraseña" : "Al menos 8 caracteres"}" required><button type="button" id="toggle-password" aria-label="Mostrar contraseña">Ver</button></div>` : ""}<div class="account-message ${errorMessage ? "error" : ""}" role="status" aria-live="polite">${escape(errorMessage || message)}</div><button class="button primary account-submit" type="submit" ${busy || checking ? "disabled" : ""}>${busy ? "Un momento…" : mode === "signup" ? "Crear mi cuenta" : mode === "recover" ? "Enviar enlace" : mode === "new-password" ? "Guardar contraseña" : "Entrar a Wort"}</button></form>${mode === "signin" ? '<button class="account-forgot" data-auth-mode="recover">Olvidé mi contraseña</button>' : ""}<p class="account-footnote">Tu progreso es privado. No hay anuncios ni suscripciones.</p></div><aside class="account-promise"><span class="promise-word" lang="de">weiter<span>.</span></span><span class="promise-translation">seguir adelante</span><h3>Cambia de pantalla.<br>Conserva tu camino.</h3><p>Tus lecciones, tus palabras y los repasos que te esperan. Todo sigue contigo.</p><ul><li>Progreso entre dispositivos</li><li>Práctica sin conexión</li><li>Tus avances, separados por cuenta</li></ul></aside></div><button class="account-guest" id="continue-guest">Seguir practicando sin cuenta →</button></section>`;
  }
  function bind() {
    if (client && !user && ["signin", "signup"].includes(mode)) {
      const sheet = document.querySelector(".account-sheet");
      sheet?.insertAdjacentHTML(
        "afterbegin",
        `<button class="google-signin" id="google-signin" ${busy || checking ? "disabled" : ""}><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.6c3.9-3.6 6.1-8.8 6.1-15.1z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.2c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.4a12.3 12.3 0 0 1 0-7.8v-5.3H5.8a20 20 0 0 0 0 18.4z"/><path fill="#EA4335" d="M24 11.2c3 0 5.5 1 7.6 3l5.7-5.7A19.2 19.2 0 0 0 24 3a20.4 20.4 0 0 0-18.2 11.3l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4z"/></svg><span>${busy ? "Conectando…" : "Continuar con Google"}</span></button><div class="account-divider"><span>o con tu correo</span></div>`,
      );
      document
        .querySelector("#google-signin")
        ?.addEventListener("click", async () => {
          if (busy) return;
          busy = true;
          errorMessage = "";
          message = "";
          notify();
          try {
            const result = await client.signIn.social({
              provider: "google",
              callbackURL: `${location.origin}/api/auth-callback`,
            });
            if (result.error) throw result.error;
          } catch {
            errorMessage =
              "No se pudo abrir Google. Comprueba tu conexión y vuelve a intentarlo.";
            busy = false;
            notify();
          }
        });
    }
    document.querySelectorAll("[data-auth-mode]").forEach(
      (el) =>
        (el.onclick = () => {
          mode = el.dataset.authMode;
          message = "";
          errorMessage = "";
          notify();
        }),
    );
    document
      .querySelector("#continue-guest")
      ?.addEventListener("click", () => onMessage?.("guest"));
    document
      .querySelector("#toggle-password")
      ?.addEventListener("click", (e) => {
        const field = document.querySelector("#account-password");
        const show = field.type === "password";
        field.type = show ? "text" : "password";
        e.currentTarget.textContent = show ? "Ocultar" : "Ver";
        e.currentTarget.setAttribute(
          "aria-label",
          show ? "Ocultar contraseña" : "Mostrar contraseña",
        );
      });
    document.querySelector("#account-form")?.addEventListener("submit", submit);
    document
      .querySelector("#sync-now")
      ?.addEventListener("click", () => onSync?.());
    document
      .querySelector("#transfer-guest")
      ?.addEventListener("click", async () => {
        busy = true;
        notify();
        const imported = await onImportGuest?.();
        busy = false;
        notify();
        onMessage?.(
          imported
            ? "Añadimos tus avances locales a tu cuenta."
            : "Conecta a internet e inténtalo de nuevo para transferir tus avances.",
        );
      });
    document.querySelector("#sign-out")?.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      notify();
      try {
        const result = await client.signOut();
        if (result.error) throw result.error;
        await setUser(null);
        message = "Sesión cerrada.";
        onMessage?.(
          "Cerraste tu sesión. Tus avances de cuenta están separados del modo sin cuenta.",
        );
      } catch {
        onMessage?.(
          "No se pudo cerrar la sesión. Conecta a internet e inténtalo de nuevo.",
        );
      } finally {
        busy = false;
        notify();
      }
    });
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim(),
      password = String(form.get("password") || ""),
      name = String(form.get("name") || "").trim();
    recoveryEmail = email;
    busy = true;
    errorMessage = "";
    message = "";
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Un momento…";
    try {
      let result;
      if (mode === "signup")
        result = await client.signUp.email({ email, password, name });
      else if (mode === "recover")
        result = await client.requestPasswordReset({
          email,
          redirectTo: `${location.origin}${location.pathname}#account`,
        });
      else if (mode === "new-password")
        result = await client.resetPassword({
          token: recoveryToken,
          newPassword: password,
        });
      else result = await client.signIn.email({ email, password });
      if (result.error) throw result.error;
      if (mode === "recover") {
        message =
          "Si hay una cuenta con ese correo, recibirás un enlace para recuperar el acceso. Revisa también spam.";
      } else if (mode === "new-password") {
        mode = "signin";
        message = "Contraseña actualizada. Ya puedes entrar.";
        history.replaceState(null, "", `${location.pathname}#account`);
      } else {
        const session = await client.getSession({
          fetchOptions: { cache: "no-store" },
        });
        if (session.data?.user) {
          await setUser(session.data.user);
          onMessage?.(
            mode === "signup"
              ? "Tu cuenta está lista. ¡Willkommen!"
              : "Bienvenido de nuevo. Estamos sincronizando tu progreso.",
          );
        } else
          message =
            "Revisa tu correo para confirmar la cuenta y luego vuelve a entrar.";
      }
    } catch (error) {
      errorMessage = safeError(error);
    } finally {
      busy = false;
      checking = false;
      notify();
    }
  }
  return {
    render,
    bind,
    refresh,
    init: refresh,
    getUser: () => user,
    isBusy: () => busy,
    isEnabled: () => enabled,
    async token() {
      if (!client)
        throw Object.assign(
          new Error("Las cuentas están disponibles en Vercel."),
          { status: 503 },
        );
      if (!navigator.onLine) throw new TypeError("Sin conexión");
      // The SDK's session cache may contain an opaque session ID. Request the
      // documented JWT endpoint directly; only the server validates its claims.
      const response = await fetch("/api/auth/token", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status >= 500) throw new TypeError("No se pudo conectar.");
      const data = await response.json();
      if (
        !response.ok ||
        typeof data.token !== "string" ||
        data.token.split(".").length !== 3
      )
        throw Object.assign(new Error("Tu sesión venció. Vuelve a entrar."), {
          status: 401,
        });
      return data.token;
    },
  };
}
