import * as idb from './idb';

/**
 * ディレクトリハンドルをIndexedDBに保存・読み込みするためのマネージャークラス。
 *
 * このクラスは、File System Access API の `FileSystemDirectoryHandle` を
 * IndexedDB に永続化し、再利用できるようにします。
 */
export class DirectoryHandleManager {
  /** IndexedDB データベースインスタンス */
  private db: idb.Idb;

  /** IndexedDB のオブジェクトストア */
  private store: idb.IdbStore;

  /**
   * DirectoryHandleManagerのコンストラクタ。
   *
   * @param db - データベース名または `idb.Idb` インスタンス。既定値は `'DirectoryHandleManager'`。
   * @param store - ストア名または `idb.IdbStore` インスタンス。既定値は `'directoryHandle'`。
   */
  constructor(
    db: string | idb.Idb = 'DirectoryHandleManager',
    store: string | idb.IdbStore = 'directoryHandle',
  ) {
    this.db = typeof db === 'string' ? idb.open(db) : db;
    this.store = typeof store === 'string' ? this.db.objectStore(store) : store;
  }

  /**
   * IndexedDB からディレクトリハンドルを読み込みます。
   *
   * ハンドルが存在しない場合や、権限が付与されていない場合は `null` を返します。
   *
   * @param key - 保存時のキー。既定値は `'default'`。
   * @returns 有効な `FileSystemDirectoryHandle` または `null`。
   */
  async load(key = 'default'): Promise<FileSystemDirectoryHandle | null> {
    try {
      const handle = await this.store.get(key);
      if (!(handle instanceof FileSystemDirectoryHandle)) return null;
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission === 'denied') return null;
      if (
        (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted'
      ) {
        return null;
      }
      // ディレクトリが実際にアクセス可能か確認する
      await handle.keys().next();
      return handle;
    } catch {
      return null;
    }
  }

  /**
   * ユーザーにディレクトリ選択ダイアログを表示し、選択されたハンドルを保存します。
   *
   * このメソッドは `showDirectoryPicker` を呼び出し、取得したハンドルを IndexedDB に保存します。
   *
   * @param key - 保存時のキー。falseを指定した場合は保存しない。既定値は `'default'`。
   * @returns 選択された `FileSystemDirectoryHandle`。
   */
  async showPicker(
    key: string | false = 'default',
  ): Promise<FileSystemDirectoryHandle> {
    const handle = await showDirectoryPicker({ mode: 'readwrite' });
    if (key !== false) await this.save(handle, key);
    return handle;
  }

  /**
   * ハンドルを IndexedDB に保存します。
   *
   * @param handle - 保存するハンドル。
   * @param key - 保存時のキー。既定値は `'default'`。
   */
  async save(
    handle: FileSystemDirectoryHandle,
    key = 'default',
  ): Promise<void> {
    await this.store.put(handle, key);
  }
}

export default DirectoryHandleManager;
