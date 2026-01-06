import DirectoryHandleManager from '../DirectoryHandleManager';

export class SelectFolderButton {
  readonly element: HTMLButtonElement;
  #handle: FileSystemDirectoryHandle;

  private constructor(
    button: HTMLButtonElement,
    manager: DirectoryHandleManager,
    handle: FileSystemDirectoryHandle,
    key: string,
  ) {
    button.textContent = '✅ フォルダー選択';
    button.onclick = async () => {
      this.#handle =
        (await SelectFolderButton.showPicker(manager, key)) ?? this.#handle;
    };
    this.element = button;
    this.#handle = handle;
  }

  get handle() {
    return this.#handle;
  }

  private static async showPicker(
    manager: DirectoryHandleManager,
    key: string,
  ) {
    try {
      return await manager.showPicker(key);
    } catch (error: unknown) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        throw error;
      }
    }
    return null;
  }

  static create(key: string) {
    const { promise, resolve, reject } =
      Promise.withResolvers<SelectFolderButton>();

    const button = document.createElement('button');
    button.textContent = 'フォルダー選択';

    const manager = new DirectoryHandleManager();

    (async () => {
      const handle = await manager.load(key);
      if (handle) {
        resolve(new SelectFolderButton(button, manager, handle, key));
        return;
      }

      button.onclick = async () => {
        try {
          const picked = await SelectFolderButton.showPicker(manager, key);
          if (picked) {
            resolve(new SelectFolderButton(button, manager, picked, key));
          }
        } catch (error) {
          reject(error);
        }
      };
    })().catch(reject);

    return [button, promise] as const;
  }
}

export default SelectFolderButton;
