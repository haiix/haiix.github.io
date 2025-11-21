export class Style {
  private src: string[] = [];
  private requested = false;
  private styleElement: HTMLStyleElement | null = null;
  private readonly autoApply: boolean;

  constructor(autoApply = true) {
    this.autoApply = autoApply;
  }

  add(value: string): void {
    this.src.push(value);
    if (!this.autoApply || this.requested) return;
    this.requested = true;
    requestAnimationFrame(() => {
      this.requested = false;
      this.apply();
    });
  }

  apply(): void {
    if (!this.src.length) return;

    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      document.head.insertAdjacentElement('afterbegin', this.styleElement);
    }

    this.styleElement.insertAdjacentText(
      'beforeend',
      `${this.src.join('\n')}\n`,
    );
    this.src.length = 0;
  }

  clear(): void {
    if (this.styleElement) {
      this.styleElement.textContent = '';
    }
    this.src.length = 0;
  }
}

const instance = new Style();
export default function style(value: string): void {
  instance.add(value);
}
