import DirectoryHandleManager from '../DirectoryHandleManager';

export class FolderSelectionButton {
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
        (await FolderSelectionButton.showPicker(manager, key)) ?? this.#handle;
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
      Promise.withResolvers<FolderSelectionButton>();

    const button = document.createElement('button');
    button.textContent = 'フォルダー選択';

    const manager = new DirectoryHandleManager();

    (async () => {
      const handle = await manager.load(key);
      if (handle) {
        resolve(new FolderSelectionButton(button, manager, handle, key));
        return;
      }

      button.onclick = async () => {
        try {
          const picked = await FolderSelectionButton.showPicker(manager, key);
          if (picked) {
            resolve(new FolderSelectionButton(button, manager, picked, key));
          }
        } catch (error) {
          reject(error);
        }
      };
    })().catch(reject);

    return [button, promise] as const;
  }
}

export default FolderSelectionButton;
