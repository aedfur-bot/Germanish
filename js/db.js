// Minimal promise wrapper over IndexedDB. One database, a handful of stores.
// Schema changes: bump DB_VERSION and add an upgrade step in onupgradeneeded.

const DB_NAME = 'geschichten';
const DB_VERSION = 1;

export const STORES = {
  kv: { keyPath: 'key' },                       // settings, progress, lesson progress, meta
  vocab: { keyPath: 'de', indexes: [['rank', 'rank'], ['status', 'status']] },
  cards: { keyPath: 'id', indexes: [['due', 'due'], ['noteId', 'noteId'], ['kind', 'kind']] },
  revlog: { keyPath: 'id', autoIncrement: true, indexes: [['cardId', 'cardId'], ['day', 'day']] },
  texts: { keyPath: 'id', indexes: [['createdAt', 'createdAt']] },
  outputs: { keyPath: 'id', indexes: [['day', 'day'], ['reviewStatus', 'reviewStatus']] },
  errors: { keyPath: 'id', indexes: [['outputId', 'outputId']] },
  days: { keyPath: 'day' },
  lessons: { keyPath: 'id' },                    // imported / generated lessons (seed lessons live in code)
  cache: { keyPath: 'key' },                     // Claude response cache (translations)
  audio: { keyPath: 'id' },                      // shadowing clips (Blobs)
};

let dbp = null;

export function openDB() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, def] of Object.entries(STORES)) {
        if (db.objectStoreNames.contains(name)) continue;
        const os = db.createObjectStore(name, { keyPath: def.keyPath, autoIncrement: !!def.autoIncrement });
        for (const [idx, path] of def.indexes || []) os.createIndex(idx, path);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

const done = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

async function store(name, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(name, mode).objectStore(name);
}

export async function get(name, key) { return done((await store(name)).get(key)); }
export async function getAll(name, query) { return done((await store(name)).getAll(query)); }
export async function put(name, value) { return done((await store(name, 'readwrite')).put(value)); }
export async function del(name, key) { return done((await store(name, 'readwrite')).delete(key)); }
export async function clear(name) { return done((await store(name, 'readwrite')).clear()); }
export async function count(name, query) { return done((await store(name)).count(query)); }

export async function byIndex(name, index, query) {
  return done((await store(name)).index(index).getAll(query));
}
export async function countIndex(name, index, query) {
  return done((await store(name)).index(index).count(query));
}

/** Write many records in one transaction. */
export async function putMany(name, values) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    const os = tx.objectStore(name);
    for (const v of values) os.put(v);
    tx.oncomplete = () => resolve(values.length);
    tx.onerror = () => reject(tx.error);
  });
}

// ---- key/value helpers ----
export async function kvGet(key, fallback = null) {
  const row = await get('kv', key);
  return row ? row.value : fallback;
}
export async function kvSet(key, value) { return put('kv', { key, value }); }

export function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
