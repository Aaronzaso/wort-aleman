import { hydrateState, initialState } from "./learning.js";
import {
  createProgressDocument,
  normalizeProgressDocument,
  progressFromDocument,
  updateProgressDocument,
  mergeProgressDocuments,
  replaceProgressDocument,
} from "./progress-sync.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const revisionOf = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0;
const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const hasProgress = (state) => !same(hydrateState(state), initialState());

/**
 * Account-scoped durable outbox. The transport authenticates requests; this
 * controller never accepts a user ID as authority for a server request.
 *
 * onState(state, { reason, userId }) receives detached learning state.
 * connect/sync resolve to info even when offline; importGuest resolves to a
 * boolean indicating whether the explicit transfer entered the outbox.
 */
export function createProgressController({
  storage,
  actor,
  onState = () => {},
  onStatus = () => {},
  transport,
  clock = Date.now,
  debounceMs = 600,
} = {}) {
  // Validate the writer once. A UUID per tab avoids concurrent writer counters.
  createProgressDocument(initialState(), actor, clock());
  let storageError = !storage;
  let destroyed = false;
  let userId = null;
  let document = null;
  let revision = 0;
  let pending = false;
  let status = "local";
  let lastSyncedAt = null;
  let errorMessage = "";
  let generation = 0;
  let timer = null;
  let active = null;
  const importedUsers = new Set();
  const volatile = new Map();
  const unpersistedKeys = new Set();

  function read(key) {
    if (unpersistedKeys.has(key)) return volatile.get(key) ?? null;
    try {
      const value = storage?.getItem(key);
      return value === undefined ? (volatile.get(key) ?? null) : value;
    } catch {
      storageError = true;
      return volatile.get(key) ?? null;
    }
  }

  function write(key, value) {
    const text = JSON.stringify(value);
    volatile.set(key, text);
    try {
      storage?.setItem(key, text);
      unpersistedKeys.delete(key);
    } catch {
      storageError = true;
      unpersistedKeys.add(key);
    }
  }

  function remove(key) {
    volatile.delete(key);
    try {
      storage?.removeItem?.(key);
      unpersistedKeys.delete(key);
    } catch {
      storageError = true;
      unpersistedKeys.add(key);
    }
  }

  function parse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function accountKey(id = userId) {
    return `wort-account:${encodeURIComponent(id)}`;
  }

  function outboxKey(id = userId) {
    return `${accountKey(id)}:outbox:${encodeURIComponent(actor)}`;
  }

  function importKey(id = userId) {
    return `wort-guest-imported:${encodeURIComponent(id)}`;
  }

  function outboxes(id) {
    const prefix = `${accountKey(id)}:outbox:`;
    const keys = new Set(
      [...volatile.keys()].filter((key) => key.startsWith(prefix)),
    );
    // Standard localStorage can recover every tab's independent outbox. A
    // minimal injected storage still recovers this tab's and the shared cache.
    keys.add(outboxKey(id));
    try {
      const length = Math.min(Number(storage?.length) || 0, 10000);
      for (let index = 0; index < length; index++) {
        const key = storage.key(index);
        if (typeof key === "string" && key.startsWith(prefix)) keys.add(key);
      }
    } catch {
      storageError = true;
    }
    return [...keys].flatMap((key) => {
      const raw = parse(read(key));
      return raw?.version === 1 && isRecord(raw.epoch)
        ? [normalizeProgressDocument(raw)]
        : [];
    });
  }

  function cachedAccount(id) {
    const cache = parse(read(accountKey(id)));
    let value = normalizeProgressDocument(cache?.document);
    const boxes = outboxes(id);
    for (const box of boxes) value = mergeProgressDocuments(value, box);
    return {
      document: value,
      revision: revisionOf(cache?.revision),
      pending: cache?.pending === true || boxes.length > 0,
      lastSyncedAt:
        Number.isSafeInteger(cache?.lastSyncedAt) && cache.lastSyncedAt >= 0
          ? cache.lastSyncedAt
          : null,
    };
  }

  let state = hydrateState(read("wort-progress"));

  function getState() {
    return hydrateState(state);
  }

  function getInfo() {
    const guest = hydrateState(read("wort-progress"));
    const used =
      userId &&
      (importedUsers.has(userId) ||
        read(importKey()) === "true" ||
        parse(read(accountKey()))?.guestImported === true);
    return {
      userId,
      status,
      pending,
      guestAvailable: Boolean(userId && !used && hasProgress(guest)),
      storageError,
      lastSyncedAt,
      errorMessage,
    };
  }

  function emitStatus() {
    if (!destroyed) onStatus(getInfo());
  }

  function emitState(reason) {
    if (!destroyed) onState(getState(), { reason, userId });
  }

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function persistAccount({ mergeStorage = true } = {}) {
    if (!userId || !document) return;
    if (mergeStorage) {
      const cache = cachedAccount(userId);
      document = mergeProgressDocuments(document, cache.document);
    }
    state = progressFromDocument(document);
    if (pending) write(outboxKey(), document);
    else remove(outboxKey());
    const guestImported =
      importedUsers.has(userId) ||
      parse(read(accountKey()))?.guestImported === true;
    write(accountKey(), {
      document,
      revision,
      pending,
      lastSyncedAt,
      guestImported,
    });
  }

  function schedule() {
    clearTimer();
    if (!userId || destroyed) return;
    timer = setTimeout(
      () => {
        timer = null;
        void sync();
      },
      Math.max(0, debounceMs),
    );
    timer.unref?.();
  }

  function setState(next, { replace = false } = {}) {
    if (destroyed) return getState();
    const clean = hydrateState(next);
    if (!userId) {
      state = clean;
      write("wort-progress", state);
      status = "local";
      errorMessage = "";
      emitState("local");
      emitStatus();
      return getState();
    }
    const stored = cachedAccount(userId).document;
    const combined = mergeProgressDocuments(document, stored);
    // See edits from other tabs before assigning a logical timestamp, while a
    // stale pre-reset UI must not reintroduce its complete old lesson list.
    const basis =
      replace || same(combined.epoch, document.epoch) ? combined : document;
    document = replace
      ? replaceProgressDocument(clean, actor, basis, clock())
      : updateProgressDocument(basis, state, clean, actor, clock());
    pending = true;
    errorMessage = "";
    persistAccount();
    emitState("local");
    emitStatus();
    schedule();
    return getState();
  }

  function validOperation(operation) {
    return (
      !destroyed &&
      operation.generation === generation &&
      operation.userId === userId
    );
  }

  function readRow(row, { allowMissing = true } = {}) {
    if (
      !isRecord(row) ||
      !Number.isSafeInteger(row.revision) ||
      row.revision < 0
    )
      throw new Error("El servidor devolvió un progreso no válido.");
    if (row.document === null && allowMissing && row.revision === 0)
      return { document: null, revision: 0 };
    if (
      !isRecord(row.document) ||
      row.document.version !== 1 ||
      !isRecord(row.document.epoch)
    )
      throw new Error(
        "El servidor devolvió un documento de progreso no válido.",
      );
    const clean = normalizeProgressDocument(row.document);
    if (
      clean.epoch.at !== row.document.epoch.at ||
      clean.epoch.id !== row.document.epoch.id
    )
      throw new Error(
        "El servidor devolvió una versión de progreso no válida.",
      );
    return { document: clean, revision: row.revision };
  }

  function rebase(row) {
    const cache = cachedAccount(userId);
    document = mergeProgressDocuments(document, cache.document);
    document = mergeProgressDocuments(document, row.document);
    revision = row.revision;
    pending = row.document === null || !same(document, row.document);
    persistAccount({ mergeStorage: false });
    emitState("remote");
  }

  function saved() {
    status = "saved";
    pending = false;
    errorMessage = "";
    lastSyncedAt = clock();
    persistAccount({ mergeStorage: false });
    emitStatus();
    return getInfo();
  }

  function failed(error) {
    status =
      error instanceof TypeError ||
      error?.status === 0 ||
      error?.code === "NETWORK_ERROR"
        ? "offline"
        : "error";
    errorMessage =
      status === "offline"
        ? "Sin conexión. Tus cambios se enviarán al recuperar internet."
        : error?.status === 401
          ? "Vuelve a iniciar sesión para sincronizar tu progreso."
          : error?.status === 409
            ? "El progreso cambió en otro dispositivo. Vuelve a sincronizar."
            : "No se pudo sincronizar. Tus cambios siguen guardados en este dispositivo.";
    persistAccount();
    emitStatus();
    return getInfo();
  }

  async function performSync(operation) {
    if (!validOperation(operation)) return getInfo();
    status = "syncing";
    errorMessage = "";
    emitStatus();
    try {
      let row = readRow(await transport.load());
      if (!validOperation(operation)) return getInfo();
      let conflicts = 0;
      // Bound one run even if the user edits continuously while requests run.
      for (let pass = 0; pass < 8; pass++) {
        rebase(row);
        if (!pending) return saved();
        const outgoing = normalizeProgressDocument(document);
        try {
          const response = readRow(
            await transport.save(clone(outgoing), revision),
            { allowMissing: false },
          );
          if (!validOperation(operation)) return getInfo();
          if (response.revision <= revision)
            throw new Error("El servidor no confirmó la revisión de progreso.");
          row = response;
        } catch (error) {
          if (!validOperation(operation)) return getInfo();
          if (error?.status !== 409 || !error.current) throw error;
          row = readRow(error.current);
          conflicts++;
          if (conflicts >= 3) {
            rebase(row);
            if (!pending) return saved();
            throw error;
          }
        }
        if (!validOperation(operation)) return getInfo();
      }
      // Local edits continue to live in the durable outbox; no unbounded retry.
      rebase(row);
      if (!pending) return saved();
      status = "syncing";
      emitStatus();
      schedule();
      return getInfo();
    } catch (error) {
      return validOperation(operation) ? failed(error) : getInfo();
    }
  }

  function sync() {
    clearTimer();
    if (!userId || destroyed) return Promise.resolve(getInfo());
    if (active?.generation === generation) return active.promise;
    const operation = { generation, userId, promise: null };
    active = operation;
    operation.promise = Promise.resolve()
      .then(() => performSync(operation))
      .finally(() => {
        if (active === operation) active = null;
      });
    return operation.promise;
  }

  function connect(id) {
    if (destroyed) return Promise.resolve(getInfo());
    if (
      typeof id !== "string" ||
      !id.trim() ||
      id.length > 200 ||
      /[\u0000-\u001f\u007f]/u.test(id)
    )
      throw new TypeError("Identificador de cuenta no válido.");
    if (userId === id) return sync();
    clearTimer();
    generation++;
    userId = id;
    const cache = cachedAccount(id);
    document = cache.document;
    revision = cache.revision;
    pending = cache.pending;
    lastSyncedAt = cache.lastSyncedAt;
    state = progressFromDocument(document);
    status = "loading";
    errorMessage = "";
    emitState("account");
    emitStatus();
    return sync();
  }

  function disconnect() {
    clearTimer();
    generation++;
    userId = null;
    document = null;
    revision = 0;
    pending = false;
    lastSyncedAt = null;
    status = "local";
    errorMessage = "";
    state = hydrateState(read("wort-progress"));
    emitState("guest");
    emitStatus();
    return getState();
  }

  async function importGuest() {
    if (!userId || destroyed || !getInfo().guestAvailable) return false;
    const target = userId;
    const currentGeneration = generation;
    const result = await sync();
    if (
      userId !== target ||
      generation !== currentGeneration ||
      result.status !== "saved"
    )
      return false;
    if (!getInfo().guestAvailable) return false;
    const guest = hydrateState(read("wort-progress"));
    const imported = createProgressDocument(
      guest,
      `guest-import:${actor}`,
      clock(),
    );
    imported.epoch = clone(document.epoch);
    document = mergeProgressDocuments(document, imported);
    pending = true;
    importedUsers.add(userId);
    persistAccount();
    write(importKey(), true);
    emitState("remote");
    emitStatus();
    await sync();
    return true;
  }

  function destroy() {
    clearTimer();
    generation++;
    destroyed = true;
  }

  return {
    getState,
    getInfo,
    setState,
    connect,
    disconnect,
    sync,
    importGuest,
    destroy,
  };
}
