import style from '../style';

const pkey = 'custom-dialog';

style(`
.${pkey} {
  padding: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #999;
  border-radius: 4px;
  filter: drop-shadow(0px 0px 1em rgba(0, 0, 0, 0.5));
  cursor: default;
}
.${pkey} > :not(:last-child) {
  flex: auto;
}
.${pkey} > :last-child {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  padding: 0 0.5em;
}
.${pkey} > :last-child > button {
  width: 7em;
  margin: 0.5em;
  white-space: pre;
}
.${pkey}-content {
  margin: 1em;
  white-space: pre-wrap;
}
.${pkey}-content :not(:first-child) {
  margin-top: 1em;
}
.${pkey}-content input {
  box-sizing: border-box;
  width: 24em;
  max-width: 100%;
}
.${pkey}-content summary {
  outline: none;
}
.${pkey}-content textarea {
  box-sizing: border-box;
  width: 32em;
  max-width: 100%;
  height: 8em;
}
`);

export function createElements<T extends (keyof HTMLElementTagNameMap)[]>(
  ...names: T
): { [K in keyof T]: HTMLElementTagNameMap[T[K]] } {
  return names.map((name) => document.createElement(name)) as {
    [K in keyof T]: HTMLElementTagNameMap[T[K]];
  };
}

function createButtonContainer(buttons: HTMLButtonElement[]): HTMLElement {
  const [buttonContainer] = createElements('div');
  buttonContainer.append(...buttons);
  return buttonContainer;
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
    button.dataset.value = String(index);
    button.textContent = text;
    button.onclick = () => {
      closeDialog(dialog, index, resolve);
    };
    button.onkeydown = handleButtonKeyDown(button);
    return button;
  });
}

function handleDialogKeyDown(
  dialog: HTMLDialogElement,
  resolve: (value: number) => void,
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeDialog(dialog, -1, resolve);
    }
  };
}

export function showDialog(
  content: HTMLElement,
  buttonTexts: string[],
  resolver?: (resolve: (value: number) => void) => void,
): Promise<number> {
  return new Promise((resolve) => {
    const [dialog] = createElements('dialog');
    dialog.classList.add(pkey);

    if (resolver) {
      resolver((value: number) => {
        closeDialog(dialog, value, resolve);
      });
    }

    content.classList.add(`${pkey}-content`);

    const buttons = createButtons(buttonTexts, dialog, resolve);
    const buttonContainer = createButtonContainer(buttons);

    dialog.append(content, buttonContainer);

    dialog.onkeydown = handleDialogKeyDown(dialog, resolve);

    document.body.append(dialog);
    dialog.showModal();
  });
}

async function normalAlert(message: string): Promise<void> {
  const [container] = createElements('div');
  container.textContent = message;

  await showDialog(container, ['OK']);
}

async function errorAlert(error: Error): Promise<void> {
  const [messageContainer, summary, textarea, details, container] =
    createElements('div', 'summary', 'textarea', 'details', 'div');

  messageContainer.textContent = `[${error.name}] ${error.message}`;
  summary.textContent = '詳細';

  textarea.readOnly = true;
  textarea.wrap = 'off';
  textarea.value = error.stack ?? '';

  details.append(summary, textarea);
  container.append(messageContainer, details);

  await showDialog(container, ['OK']);
}

export async function alert(message: unknown): Promise<void> {
  return message instanceof Error
    ? errorAlert(message)
    : normalAlert(String(message));
}

export async function confirm(message: string): Promise<boolean> {
  const [container] = createElements('div');
  container.textContent = message;
  const result = await showDialog(container, ['はい', 'いいえ']);
  return result === 0;
}

export async function prompt(message: string): Promise<string | null> {
  const [messageContainer, input, container] = createElements(
    'div',
    'input',
    'div',
  );
  messageContainer.textContent = message;
  container.append(messageContainer, input);

  const result = await showDialog(
    container,
    ['OK', 'キャンセル'],
    (resolve) => {
      input.onkeydown = (event) => {
        if (event.key === 'Enter') {
          resolve(0);
        }
      };
    },
  );
  return result === 0 ? input.value : null;
}
