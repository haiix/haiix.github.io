import style from '../style';

style(`
.custom-dialog {
  /* デザインシステムを一元管理するカスタムプロパティ */
  --dialog-padding: 1em;
  --dialog-border-color: #999;
  --dialog-border-radius: 4px;
  --dialog-shadow: 0px 4px 16px rgba(0, 0, 0, 0.2);
  --button-spacing: 0.5em;

  padding: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--dialog-border-color);
  border-radius: var(--dialog-border-radius);
  box-shadow: var(--dialog-shadow);
  cursor: default;
  min-width: 20em;
}

/* タイトル要素 */
.custom-dialog__title {
  font-size: 1.2em;
  font-weight: bold;
  margin: 0;
  padding: var(--dialog-padding);
  padding-bottom: 0.5em;
  border-bottom: 1px solid #eee;
}

/* メインコンテンツ領域 */
.custom-dialog__content {
  flex: auto;
  padding: var(--dialog-padding);
  white-space: pre-wrap;
  /* コンテンツが長い場合にスクロール可能にする */
  overflow-y: auto;
  max-height: 70vh;
}

.custom-dialog__content :not(:first-child) {
  margin-top: 1em;
}

/* ボタンなどを配置するアクション領域 */
.custom-dialog__actions {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  padding: var(--button-spacing);
  background-color: #f5f5f5;
  border-top: 1px solid #eee;
}

.custom-dialog__button {
  width: 7em;
  margin: var(--button-spacing);
  white-space: pre;
}

/* フォーム要素のスタイル */
.custom-dialog__content input,
.custom-dialog__content textarea {
  box-sizing: border-box;
  width: 100%;
}

.custom-dialog__content textarea {
  width: 40em;
  height: 8em;
  max-width: 100%;
}
`);

// ダイアログの戻り値を表す定数
const DIALOG_RESULT_OK = 0;
const DIALOG_RESULT_CANCEL = -1;

export function createElements<T extends (keyof HTMLElementTagNameMap)[]>(
  ...names: T
): { [K in keyof T]: HTMLElementTagNameMap[T[K]] } {
  return names.map((name) => document.createElement(name)) as {
    [K in keyof T]: HTMLElementTagNameMap[T[K]];
  };
}

function closeDialog(
  dialog: HTMLDialogElement,
  result: number,
  resolve: (value: number) => void,
) {
  dialog.close();
  dialog.remove();
  resolve(result);
}

function handleButtonKeyDown(
  button: HTMLButtonElement,
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      const nextButton = (button.nextElementSibling ??
        button.parentElement?.firstElementChild) as HTMLElement;
      nextButton.focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      const previousButton = (button.previousElementSibling ??
        button.parentElement?.lastElementChild) as HTMLElement;
      previousButton.focus();
    }
  };
}

function createButtons(
  buttonTexts: string[],
  dialog: HTMLDialogElement,
  resolve: (value: number) => void,
): HTMLButtonElement[] {
  return buttonTexts.map((text, index) => {
    const [button] = createElements('button');
    button.type = 'button';
    button.className = 'custom-dialog__button';
    button.dataset.value = String(index);
    button.textContent = text;
    button.onclick = () => {
      closeDialog(dialog, index, resolve);
    };
    button.onkeydown = handleButtonKeyDown(button);
    return button;
  });
}

// showDialogのオプションをインターフェースとして定義
interface ShowDialogOptions {
  title?: string;
  content: HTMLElement;
  buttonTexts: string[];
  setupExtraHandlers?: (
    resolve: (value: number) => void,
    content: HTMLElement,
  ) => void;
}

export function showDialog({
  title,
  content,
  buttonTexts,
  setupExtraHandlers,
}: ShowDialogOptions): Promise<number> {
  return new Promise((resolve) => {
    const [dialog, titleEl, contentWrapper, buttonContainer] = createElements(
      'dialog',
      'h2',
      'div',
      'div',
    );

    dialog.classList.add('custom-dialog');
    dialog.onkeydown = (event) => {
      if (event.key === 'Escape') {
        requestAnimationFrame(() => {
          closeDialog(dialog, DIALOG_RESULT_CANCEL, resolve);
        });
      }
    };

    // IDを動的に生成してARIA属性と紐付ける
    const titleId = `dialog-title-${Math.random().toString(36).slice(2)}`;
    if (title) {
      titleEl.id = titleId;
      titleEl.className = 'custom-dialog__title';
      titleEl.textContent = title;
      dialog.setAttribute('aria-labelledby', titleId);
      dialog.append(titleEl);
    }

    contentWrapper.className = 'custom-dialog__content';
    contentWrapper.append(content);

    // Enterキーでのデフォルト送信など、カスタムのイベントハンドラを設定
    if (setupExtraHandlers) {
      setupExtraHandlers((value: number) => {
        closeDialog(dialog, value, resolve);
      }, content);
    }

    const buttons = createButtons(buttonTexts, dialog, resolve);
    buttonContainer.className = 'custom-dialog__actions';
    buttonContainer.append(...buttons);

    dialog.append(contentWrapper, buttonContainer);
    document.body.append(dialog);
    dialog.showModal();
  });
}

async function normalAlert(message: string): Promise<void> {
  const [container] = createElements('div');
  container.textContent = message;

  await showDialog({ title: '情報', content: container, buttonTexts: ['OK'] });
}

async function errorAlert(error: Error): Promise<void> {
  const [messageContainer, summary, textarea, details, container] =
    createElements('div', 'summary', 'textarea', 'details', 'div');

  messageContainer.textContent = `${error.name}: ${error.message}`;
  summary.textContent = '詳細';
  textarea.readOnly = true;
  textarea.wrap = 'off';
  textarea.value = error.stack ?? '';

  details.append(summary, textarea);
  container.append(messageContainer, details);

  await showDialog({
    title: 'エラー',
    content: container,
    buttonTexts: ['OK'],
  });
}

export async function alert(message: unknown): Promise<void> {
  return message instanceof Error
    ? errorAlert(message)
    : normalAlert(String(message));
}

export async function confirm(message: string): Promise<boolean> {
  const [container] = createElements('div');
  container.textContent = message;

  const result = await showDialog({
    title: '確認',
    content: container,
    buttonTexts: ['はい', 'いいえ'],
  });
  return result === DIALOG_RESULT_OK;
}

export async function prompt(
  message: string,
  defaultValue = '',
): Promise<string | null> {
  const [messageContainer, input, container] = createElements(
    'div',
    'input',
    'div',
  );
  messageContainer.textContent = message;
  input.value = defaultValue;
  container.append(messageContainer, input);

  const result = await showDialog({
    title: '入力',
    content: container,
    buttonTexts: ['OK', 'キャンセル'],
    setupExtraHandlers: (resolve) => {
      // EnterキーでOKボタンと同じ動作をさせる
      input.onkeydown = (event) => {
        if (event.key === 'Enter') {
          requestAnimationFrame(() => {
            resolve(DIALOG_RESULT_OK);
          });
        }
      };
      // 表示時にinputにフォーカスし、テキストを選択状態にする
      input.focus();
      input.select();
    },
  });

  return result === DIALOG_RESULT_OK ? input.value : null;
}
