export type IdbDef = {
  name: string;
  version?: number;
  onupgradeneeded?: (db: IDBDatabase, tx: IDBTransaction, version: number) => unknown;
};

function reqError(req: IDBRequest, message: string): Error {
  return req.error ?? req.transaction?.error ?? new Error(message);
}

function idbOpen({ name, version, onupgradeneeded }: IdbDef): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.open(name, version);
    req.onupgradeneeded = (event) => {
      try {
        if (onupgradeneeded) {
          if (!req.transaction) {
            throw new Error('Something wrong.');
          }
          onupgradeneeded(req.result, req.transaction, event.oldVersion);
        }
      } catch (error) {
        reject(error);
      }
    };
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(reqError(req, 'Failed to open database: ' + name));
    };
  });
}

export function deleteDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.deleteDatabase(name);
    req.onerror = () => {
      reject(reqError(req, 'Failed to delete database: ' + name));
    };
    req.onsuccess = () => {
      resolve(req.result);
    };
  });
}

export async function getVersion(name: string): Promise<number> {
  const db = await idbOpen({ name });
  const version = db.version;
  db.close();
  return version;
}

export async function objectStoreNames(def: IdbDef): Promise<DOMStringList> {
  const db = await idbOpen(def);
  const objectStoreNames = db.objectStoreNames;
  db.close();
  return objectStoreNames;
}

export async function tx<T>(def: IdbDef, storeNames: string | Iterable<string>, mode: IDBTransactionMode, func: (tx: IDBTransaction) => T): Promise<T> {
  const db = await idbOpen(def);
  return await new Promise((resolve, reject) => {
    let val: T;
    const tx = db.transaction(storeNames, mode);
    tx.oncomplete = () => {
      db.close();
      resolve(val);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to transaction: ' + def.name));
    };
    try {
      val = func(tx);
    } catch (err) {
      tx.abort();
      db.close();
      reject(err);
    }
  });
}

export function add(os: IDBObjectStore, value: unknown): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = os.add(value);
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(reqError(req, 'Failed to add.'));
    };
  });
}

export function put(os: IDBObjectStore, value: unknown): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = os.put(value);
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(reqError(req, 'Failed to put.'));
    };
  });
}

export function get(os: IDBObjectStore, key: IDBValidKey | IDBKeyRange): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = os.get(key);
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(reqError(req, 'Failed to get.'));
    };
  });
}

export function del(os: IDBObjectStore, key: IDBValidKey | IDBKeyRange): Promise<undefined> {
  return new Promise((resolve, reject) => {
    const req = os.delete(key);
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(reqError(req, 'Failed to delete.'));
    };
  });
}

export function count(os: IDBObjectStore, key: IDBValidKey | IDBKeyRange): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = os.count(key);
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(reqError(req, 'Failed to count.'));
    };
  });
}

export type IdbCursorParam = {
  index: IDBObjectStore | IDBIndex,
  range?: IDBKeyRange,
  direction?: IDBCursorDirection,
  forEach: (value: unknown, cursor: IDBCursorWithValue) => unknown
};

export function cursor({ index, range, direction = 'next', forEach }: IdbCursorParam): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let result: unknown;
    const req = index.openCursor(range, direction);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        try {
          result = forEach(cursor.value, cursor);
        } catch (error) {
          reject(error);
        }
        cursor.advance(result === undefined ? 1 : 0xFFFFFFFF);
      } else {
        resolve(result);
      }
    };
    req.onerror = () => {
      reject(reqError(req, 'Failed to cursor.'));
    };
  });
}
