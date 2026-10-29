import test from "node:test";
import assert from "node:assert/strict";
import { initialState, recordActivity } from "../src/learning.js";
import {
  createProgressDocument,
  progressFromDocument,
  updateProgressDocument,
} from "../src/progress-sync.js";
import { createProgressController } from "../src/cloud-progress.js";

const copy = (value) => structuredClone(value);
const date = new Date(2026, 9, 28, 12);
const answer = (state, xp = 10, lessonId) =>
  recordActivity(state, { xp, lessonId, date });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

function memory(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

function server(initial = {}) {
  const rows = new Map(
    Object.entries(initial).map(([id, state]) => [
      id,
      {
        document: createProgressDocument(state, `remote-${id}`, 100),
        revision: 1,
      },
    ]),
  );
  let loads = 0,
    saves = 0;
  const api = {
    rows,
    get loads() {
      return loads;
    },
    get saves() {
      return saves;
    },
    transport(getUser) {
      return {
        load: async () => {
          loads++;
          return copy(rows.get(getUser()) ?? { document: null, revision: 0 });
        },
        save: async (document, expectedRevision) => {
          saves++;
          const id = getUser();
          const current = rows.get(id) ?? { document: null, revision: 0 };
          if (current.revision !== expectedRevision)
            throw Object.assign(new Error("Conflict"), {
              status: 409,
              current: copy(current),
            });
          const next = {
            document: copy(document),
            revision: expectedRevision + 1,
          };
          rows.set(id, next);
          return copy(next);
        },
      };
    },
  };
  return api;
}

function controller(t, options = {}) {
  const result = createProgressController({
    storage: memory(),
    actor: "tab-a",
    clock: () => 1000,
    debounceMs: 100000,
    transport: server().transport(() => "a"),
    ...options,
  });
  t.after(() => result.destroy());
  return result;
}

test("constructor does not emit callbacks and guest writes stay local and detached", (t) => {
  let events = 0;
  const db = server();
  const storage = memory();
  const value = controller(t, {
    storage,
    transport: db.transport(() => "a"),
    onState: () => events++,
    onStatus: () => events++,
  });
  assert.equal(events, 0);
  const state = answer(value.getState(), 10, "saludos");
  value.setState(state);
  state.xp = 999;
  assert.equal(value.getState().xp, 10);
  assert.equal(JSON.parse(storage.getItem("wort-progress")).xp, 10);
  assert.equal(value.getInfo().status, "local");
  assert.equal(db.loads, 0);
  assert.equal(db.saves, 0);
});

test("switching accounts and signing out never mix guest or another account", async (t) => {
  const guest = answer(initialState(), 3, "guest");
  const db = server({
    a: answer(initialState(), 10, "account-a"),
    b: answer(initialState(), 20, "account-b"),
  });
  let selected = "a";
  const storage = memory({ "wort-progress": JSON.stringify(guest) });
  const value = controller(t, {
    storage,
    transport: db.transport(() => selected),
  });
  const first = value.connect("a");
  assert.deepEqual(value.getState().completed, []);
  await first;
  assert.deepEqual(value.getState().completed, ["account-a"]);
  selected = "b";
  const second = value.connect("b");
  assert.deepEqual(value.getState().completed, []);
  await second;
  assert.deepEqual(value.getState().completed, ["account-b"]);
  assert.equal(value.getState().xp, 20);
  value.disconnect();
  assert.deepEqual(value.getState(), guest);
  assert.equal(value.getInfo().userId, null);
  assert.equal(value.getInfo().status, "local");
});

test("guest transfer is explicit, additive, once per account and survives reload", async (t) => {
  const guest = answer(initialState(), 3, "guest");
  const db = server({ a: answer(initialState(), 10, "account-a") });
  const storage = memory({ "wort-progress": JSON.stringify(guest) });
  const value = controller(t, { storage, transport: db.transport(() => "a") });
  await value.connect("a");
  assert.equal(value.getState().xp, 10);
  assert.equal(value.getInfo().guestAvailable, true);
  assert.equal(await value.importGuest(), true);
  assert.equal(value.getState().xp, 13);
  assert.deepEqual(value.getState().completed, ["account-a", "guest"]);
  assert.equal(value.getInfo().guestAvailable, false);
  assert.equal(await value.importGuest(), false);
  assert.equal(JSON.parse(storage.getItem("wort-progress")).xp, 3);
  value.destroy();
  const reloaded = controller(t, {
    storage,
    actor: "tab-new",
    transport: db.transport(() => "a"),
  });
  await reloaded.connect("a");
  assert.equal(reloaded.getInfo().guestAvailable, false);
  assert.equal(reloaded.getState().xp, 13);
});

test("offline guest transfer remains available rather than consuming an unmerged baseline", async (t) => {
  const storage = memory({
    "wort-progress": JSON.stringify(answer(initialState())),
  });
  const value = controller(t, {
    storage,
    transport: {
      load: async () => {
        throw new TypeError("Failed to fetch");
      },
    },
  });
  await value.connect("a");
  assert.equal(await value.importGuest(), false);
  assert.equal(value.getInfo().guestAvailable, true);
  assert.equal(value.getState().xp, 0);
  assert.equal(value.getInfo().status, "offline");
});

test("local edits use a cloned baseline and successful retries do not double count", async (t) => {
  const db = server();
  let exposed;
  const value = controller(t, {
    transport: db.transport(() => "a"),
    onState: (next) => {
      exposed = next;
    },
  });
  await value.connect("a");
  exposed = answer(exposed, 10);
  value.setState(exposed);
  exposed.xp += 900;
  await value.sync();
  await value.sync();
  assert.equal(value.getState().xp, 10);
  assert.equal(progressFromDocument(db.rows.get("a").document).xp, 10);
  assert.equal(value.getInfo().pending, false);
  assert.equal(value.getInfo().status, "saved");
});

test("CAS conflict rebases both devices' counters before retrying", async (t) => {
  const db = server({ a: initialState() });
  const baseTransport = db.transport(() => "a");
  let conflict = true;
  const value = controller(t, {
    transport: {
      load: baseTransport.load,
      save: async (document, revision) => {
        if (conflict) {
          conflict = false;
          const current = db.rows.get("a");
          const before = progressFromDocument(current.document);
          current.document = updateProgressDocument(
            current.document,
            before,
            answer(before, 5, "remote"),
            "other-tab",
            1001,
          );
          current.revision++;
        }
        return baseTransport.save(document, revision);
      },
    },
  });
  await value.connect("a");
  value.setState(answer(value.getState(), 10, "local"));
  await value.sync();
  const final = value.getState();
  assert.equal(final.xp, 15);
  assert.equal(final.activity["2026-10-28"].answers, 2);
  assert.deepEqual(final.completed, ["local", "remote"]);
  assert.equal(value.getInfo().pending, false);
});

test("an edit during PUT is preserved and written in a subsequent CAS", async (t) => {
  const db = server({ a: initialState() });
  const base = db.transport(() => "a");
  const gate = deferred();
  let hold = true;
  const value = controller(t, {
    transport: {
      load: base.load,
      save: async (...args) => {
        if (hold) {
          hold = false;
          await gate.promise;
        }
        return base.save(...args);
      },
    },
  });
  await value.connect("a");
  value.setState(answer(value.getState(), 10));
  const syncing = value.sync();
  await tick();
  value.setState(answer(value.getState(), 3));
  gate.resolve();
  await syncing;
  assert.equal(value.getState().xp, 13);
  assert.equal(progressFromDocument(db.rows.get("a").document).xp, 13);
  assert.equal(value.getState().activity["2026-10-28"].answers, 2);
  assert.equal(value.getInfo().pending, false);
});

test("failed network writes survive reload and sync when the connection returns", async (t) => {
  const db = server({ a: initialState() });
  const storage = memory();
  let offline = false;
  const base = db.transport(() => "a");
  const transport = {
    load: async () => {
      if (offline) throw new TypeError("offline");
      return base.load();
    },
    save: base.save,
  };
  const first = controller(t, { storage, transport });
  await first.connect("a");
  first.setState(answer(first.getState(), 10, "saludos"));
  offline = true;
  await first.sync();
  assert.equal(first.getInfo().status, "offline");
  assert.equal(first.getInfo().pending, true);
  first.destroy();
  const reloaded = controller(t, { storage, actor: "new-tab", transport });
  await reloaded.connect("a");
  assert.equal(reloaded.getState().xp, 10);
  assert.equal(reloaded.getInfo().pending, true);
  offline = false;
  await reloaded.sync();
  assert.equal(reloaded.getInfo().status, "saved");
  assert.equal(progressFromDocument(db.rows.get("a").document).xp, 10);
});

test("a late response from an old account never replaces the active account", async (t) => {
  const db = server({ b: answer(initialState(), 20, "b") });
  let selected = "a";
  const gate = deferred();
  const aStarted = deferred();
  const base = db.transport(() => selected);
  const events = [];
  const value = controller(t, {
    transport: {
      load: async () => {
        if (selected === "a") {
          aStarted.resolve();
          return gate.promise;
        }
        return base.load();
      },
      save: base.save,
    },
    onState: (next, info) => events.push({ next, info }),
  });
  const old = value.connect("a");
  await aStarted.promise;
  selected = "b";
  await value.connect("b");
  gate.resolve({
    document: createProgressDocument(
      answer(initialState(), 999, "a"),
      "remote-a",
      100,
    ),
    revision: 1,
  });
  await old;
  assert.equal(value.getInfo().userId, "b");
  assert.equal(value.getState().xp, 20);
  assert.equal(events.at(-1).info.userId, "b");
  assert.ok(
    !events.some(({ next, info }) => info.userId === "b" && next.xp === 999),
  );
});

test("disconnect during a request preserves guest state and suppresses late callbacks", async (t) => {
  const guest = answer(initialState(), 3, "guest");
  const storage = memory({ "wort-progress": JSON.stringify(guest) });
  const gate = deferred();
  const started = deferred();
  const events = [];
  const value = controller(t, {
    storage,
    transport: {
      load: async () => {
        started.resolve();
        return gate.promise;
      },
    },
    onState: (next, info) => events.push({ next, info }),
  });
  const loading = value.connect("a");
  await started.promise;
  value.disconnect();
  const afterLogout = events.length;
  gate.resolve({
    document: createProgressDocument(
      answer(initialState(), 500),
      "remote",
      100,
    ),
    revision: 1,
  });
  await loading;
  assert.deepEqual(value.getState(), guest);
  assert.equal(events.length, afterLogout);
  assert.equal(events.at(-1).info.reason, "guest");
});

test("explicit reset supersedes stale offline snapshots rather than resurrecting lessons", async (t) => {
  const old = answer(initialState(), 10, "saludos");
  const db = server({ a: old });
  const value = controller(t, { transport: db.transport(() => "a") });
  await value.connect("a");
  const stale = copy(db.rows.get("a").document);
  value.setState(initialState(), { replace: true });
  await value.sync();
  assert.deepEqual(value.getState(), initialState());
  const saved = db.rows.get("a");
  const staleStorage = memory({
    "wort-account:a": JSON.stringify({
      document: stale,
      revision: 1,
      pending: true,
    }),
  });
  const other = controller(t, {
    storage: staleStorage,
    actor: "old-device",
    transport: db.transport(() => "a"),
  });
  await other.connect("a");
  assert.deepEqual(other.getState(), initialState());
  assert.equal(db.rows.get("a").revision, saved.revision);
});

test("independent tab outboxes survive an overwritten shared cache", async (t) => {
  const db = server({ a: initialState() });
  const storage = memory();
  const a = controller(t, {
    storage,
    actor: "tab-a",
    transport: db.transport(() => "a"),
  });
  const b = controller(t, {
    storage,
    actor: "tab-b",
    transport: db.transport(() => "a"),
  });
  await a.connect("a");
  await b.connect("a");
  a.setState(answer(a.getState(), 10));
  b.setState(answer(b.getState(), 5));
  // A different tab's stale aggregate cannot erase the independent outboxes.
  storage.setItem(
    "wort-account:a",
    JSON.stringify({
      document: createProgressDocument(initialState(), "stale", 0),
      revision: 1,
      pending: false,
    }),
  );
  a.destroy();
  b.destroy();
  const reloaded = controller(t, {
    storage,
    actor: "new-tab",
    transport: db.transport(() => "a"),
  });
  await reloaded.connect("a");
  assert.equal(reloaded.getState().xp, 15);
  assert.equal(reloaded.getState().activity["2026-10-28"].answers, 2);
});

test("storage failures keep a volatile copy, flag the limitation and do not crash startup", async (t) => {
  const denied = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("denied");
    },
  };
  const db = server();
  const value = controller(t, {
    storage: denied,
    transport: db.transport(() => "a"),
  });
  value.setState(answer(initialState(), 3));
  assert.equal(value.getInfo().storageError, true);
  await value.connect("a");
  value.setState(answer(value.getState(), 10));
  await value.sync();
  assert.equal(value.getState().xp, 10);
  value.disconnect();
  assert.equal(value.getState().xp, 3);
});

test("a deliberate edit sees another tab's newer logical stamp before writing", async (t) => {
  const db = server({ a: initialState() });
  const storage = memory();
  const first = controller(t, {
    storage,
    actor: "a",
    clock: () => 1000,
    transport: db.transport(() => "a"),
  });
  const second = controller(t, {
    storage,
    actor: "b",
    clock: () => 5000,
    transport: db.transport(() => "a"),
  });
  await first.connect("a");
  await second.connect("a");
  const remote = second.getState();
  remote.settings.goal = 15;
  second.setState(remote);
  const local = first.getState();
  local.settings.goal = 20;
  first.setState(local);
  assert.equal(first.getState().settings.goal, 20);
  await first.sync();
  assert.equal(
    progressFromDocument(db.rows.get("a").document).settings.goal,
    20,
  );
});

test("a cached reset in another tab cannot resurrect the stale UI's lesson history", async (t) => {
  const db = server({ a: answer(initialState(), 10, "saludos") });
  const storage = memory();
  const first = controller(t, {
    storage,
    actor: "a",
    transport: db.transport(() => "a"),
  });
  const second = controller(t, {
    storage,
    actor: "b",
    transport: db.transport(() => "a"),
  });
  await first.connect("a");
  await second.connect("a");
  second.setState(initialState(), { replace: true });
  first.setState(answer(first.getState(), 10));
  assert.deepEqual(first.getState().completed, []);
  await first.sync();
  assert.deepEqual(
    progressFromDocument(db.rows.get("a").document).completed,
    [],
  );
});

test("CAS conflicts are bounded and pending edits remain durable", async (t) => {
  const storage = memory();
  const row = {
    document: createProgressDocument(initialState(), "server", 0),
    revision: 1,
  };
  let saves = 0;
  const value = controller(t, {
    storage,
    transport: {
      load: async () => copy(row),
      save: async () => {
        saves++;
        row.revision++;
        throw Object.assign(new Error("conflict"), {
          status: 409,
          current: copy(row),
        });
      },
    },
  });
  await value.connect("a");
  value.setState(answer(value.getState(), 10));
  await value.sync();
  assert.equal(saves, 3);
  assert.equal(value.getInfo().status, "error");
  assert.equal(value.getInfo().pending, true);
  assert.equal(value.getState().xp, 10);
  assert.equal(JSON.parse(storage.getItem("wort-account:a")).pending, true);
});

test("malformed server rows do not silently replace pending progress", async (t) => {
  const value = controller(t, {
    transport: {
      load: async () => ({ document: { bogus: true }, revision: 1 }),
    },
  });
  await value.connect("a");
  value.setState(answer(value.getState(), 10));
  await value.sync();
  assert.equal(value.getInfo().status, "error");
  assert.equal(value.getState().xp, 10);
  assert.equal(value.getInfo().pending, true);
});

test("an invalid server epoch is rejected rather than normalized into a real empty document", async (t) => {
  let saves = 0;
  const value = controller(t, {
    transport: {
      load: async () => ({ document: { version: 1, epoch: {} }, revision: 1 }),
      save: async () => {
        saves++;
      },
    },
  });
  await value.connect("a");
  assert.equal(value.getInfo().status, "error");
  assert.equal(saves, 0);
});
