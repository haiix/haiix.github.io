function idb_open({name = '', version = 1, onupgradeneeded = null}) {
  return new Promise(function (resolve, reject) {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = function (event) {
      try {
        onupgradeneeded(req.result, req.transaction, event.oldVersion);
      } catch (err) {
        reject(err);
      }
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export function deleteDatabase(name) {
  return new Promise(function (resolve, reject) {
    const req = window.indexedDB.deleteDatabase(name);
    req.onerror = function (event) {
      reject(event.target.error);
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
  });
}

export async function getVersion(name) {
  const db = await idb_open({name});
  const version = db.version;
  db.close();
  return version;
}

export async function objectStoreNames(conf) {
  const db = await idb_open(conf);
  const objectStoreNames = db.objectStoreNames;
  db.close();
  return objectStoreNames;
}

export async function tx(conf, osns, mode, fn) {
  const db = await idb_open(conf);
  return await new Promise(function (resolve, reject) {
    let val;
    const tx = db.transaction(osns, mode);
    tx.oncomplete = function () {
      db.close();
      resolve(val);
    };
    tx.onerror = function (event) {
      db.close();
      reject(event.target.error);
    };
    try {
      val = fn(tx);
    } catch (err) {
      tx.abort();
      db.close();
      reject(err);
    }
  });
}

export function add(os, item) {
  return new Promise(function (resolve, reject) {
    const req = os.add(item);
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export function put(os, item) {
  return new Promise(function (resolve, reject) {
    const req = os.put(item);
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export function get(os, key) {
  return new Promise(function (resolve, reject) {
    const req = os.get(key);
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export function del(os, item) {
  return new Promise(function (resolve, reject) {
    const req = os.delete(item);
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export function count(os, key) {
  return new Promise(function (resolve, reject) {
    const req = os.count(key);
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export function cursor({index, range = null, direction = 'next', forEach}) {
  const req = index.openCursor(range, direction);
  req.onsuccess = function () {
    const cursor = req.result;
    if (cursor) {
      if (forEach(cursor.value, cursor) === undefined) {
        cursor.continue();
      }
    }
  };
}
