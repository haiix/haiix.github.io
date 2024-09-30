export class Style extends EventTarget {
  private src: string[] = [];
  private requested = false;
  private styleElement: HTMLStyleElement | null = null;
  private readonly autoApply: boolean;

  constructor(autoApply = true) {
    super();
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
    if (this.src.length === 0) return;

    try {
      if (!this.styleElement) {
        this.styleElement = document.createElement('style');
        document.head.appendChild(this.styleElement);
      }

      this.styleElement.textContent += this.src.join('\n');
      this.src.length = 0;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    }
  }

  clear(): void {
    if (this.styleElement) {
      this.styleElement.textContent = '';
    }
    this.src.length = 0;
  }
}

export default new Style();
