export type IdbDef = {
  name: string;
  version?: number;
  onupgradeneeded?: (db: IDBDatabase, tx: IDBTransaction, version: number) => unknown;
};

function reqError(req: IDBRequest, message: string): Error {
  return req.error ?? req.transaction?.error ?? new Error(message);
}

function getIdbDef(def: IdbDef | string): IdbDef {
  return typeof def === 'string' ? { name: def } : def;
}

function queryWrapper<T>(fn: (reject: (reason?: unknown) => void) => IDBRequest<T>, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = fn(reject);
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(reqError(req, errorMessage));
    };
  });
}

function idbOpen(idbDef: IdbDef | string): Promise<IDBDatabase> {
  const { name, version, onupgradeneeded } = getIdbDef(idbDef);
  return queryWrapper((reject) => {
    const req = indexedDB.open(name, version);
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
    return req;
  }, 'Failed to open database: ' + name);
}

export function deleteDatabase(dbName: IdbDef | string): Promise<IDBDatabase> {
  const idbDef = getIdbDef(dbName);
  return queryWrapper(() => indexedDB.deleteDatabase(idbDef.name), 'Failed to delete database: ' + idbDef.name);
}

export async function getVersion(dbName: IdbDef | string): Promise<number> {
  const db = await idbOpen(dbName);
  const version = db.version;
  db.close();
  return version;
}

export async function objectStoreNames(dbName: IdbDef | string): Promise<DOMStringList> {
  const db = await idbOpen(dbName);
  const objectStoreNames = db.objectStoreNames;
  db.close();
  return objectStoreNames;
}

export async function tx<T>(dbName: IdbDef | string, storeNames: string | Iterable<string>, mode: IDBTransactionMode, func: (tx: IDBTransaction) => T): Promise<T> {
  const db = await idbOpen(dbName);
  return await new Promise((resolve, reject) => {
    let val: T;
    const tx = db.transaction(storeNames, mode);
    tx.oncomplete = () => {
      db.close();
      resolve(val);
    };
    tx.onerror = (event: Event) => {
      db.close();
      const error = (event.target instanceof IDBRequest) ? event.target.error : null;
      reject(error ?? tx.error ?? new Error('Failed to transaction'));
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

export function add(os: IDBObjectStore, value: unknown, key?: IDBValidKey): Promise<IDBValidKey> {
  return queryWrapper(() => os.add(value, key), 'Failed to add.');
}

export function clear(os: IDBObjectStore): Promise<void> {
  return queryWrapper(() => os.clear(), 'Failed to clear.');
}

export function count(os: IDBObjectStore, query?: IDBValidKey | IDBKeyRange): Promise<number> {
  return queryWrapper(() => os.count(query), 'Failed to count.');
}

export function del(os: IDBObjectStore, query: IDBValidKey | IDBKeyRange): Promise<void> {
  return queryWrapper(() => os.delete(query), 'Failed to delete.');
}

export function get(os: IDBObjectStore, query: IDBValidKey | IDBKeyRange): Promise<unknown> {
  return queryWrapper(() => os.get(query), 'Failed to get.');
}

export function getAll(os: IDBObjectStore, query?: IDBValidKey | IDBKeyRange | null, count?: number): Promise<unknown[]> {
  return queryWrapper(() => os.getAll(query, count), 'Failed to getAll.');
}

export function getAllKeys(os: IDBObjectStore, query?: IDBValidKey | IDBKeyRange | null, count?: number): Promise<IDBValidKey[]> {
  return queryWrapper(() => os.getAllKeys(query, count), 'Failed to getAllKeys.');
}

export function getKey(os: IDBObjectStore, query: IDBValidKey | IDBKeyRange): Promise<IDBValidKey | undefined> {
  return queryWrapper(() => os.getKey(query), 'Failed to getKey.');
}

export function put(os: IDBObjectStore, value: unknown, key?: IDBValidKey): Promise<IDBValidKey> {
  return queryWrapper(() => os.put(value, key), 'Failed to put.');
}

//export function openCursor(index: IDBObjectStore | IDBIndex, query?: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection): Promise<IDBCursorWithValue | null> {
//  return queryWrapper(() => index.openCursor(query, direction), 'Failed to openCursor.');
//}

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
