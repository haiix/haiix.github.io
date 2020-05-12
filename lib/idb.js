const opened = [];

function idb_open(conf) {
  return new Promise(function (resolve, reject) {
    const def = opened.find(def => def.conf === conf);
    if (def != null) {
      resolve(def.db);
      return;
    }
    const req = indexedDB.open(conf.name, conf.version);
    req.onupgradeneeded = function (event) {
      try {
        conf.onupgradeneeded(this.result, this.transaction, event.oldVersion);
      } catch (err) {
        reject(err);
      }
    };
    req.onsuccess = function () {
      opened.push({ conf, db: this.result });
      resolve(this.result);
    };
    req.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

function idb_close(conf) {
  for (let i = 0; i < opened.length; i++) {
    if (opened[i].conf === conf) {
      opened[i].db.close();
      opened.splice(i, 1);
      return;
    }
  }
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
  const conf = {name};
  const db = await idb_open(conf);
  const version = db.version;
  idb_close(conf);
  return version;
}

export async function objectStoreNames(conf) {
  const db = await idb_open(conf);
  const objectStoreNames = db.objectStoreNames;
  idb_close(conf);
  return objectStoreNames;
}

export async function tx(conf, osns, mode, fn) {
  const db = await idb_open(conf);
  return await new Promise(function (resolve, reject) {
    let val;
    const tx = db.transaction(osns, mode);
    tx.oncomplete = function () {
      idb_close(conf);
      resolve(val);
    };
    tx.onerror = function (event) {
      idb_close(conf);
      reject(event.target.error);
    };
    try {
      val = fn(tx);
    } catch (err) {
      tx.abort();
      idb_close(conf);
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
    const cursor = this.result;
    if (cursor) {
      if (forEach(cursor.value, cursor) === undefined) {
        cursor.continue();
      }
    }
  };
}
