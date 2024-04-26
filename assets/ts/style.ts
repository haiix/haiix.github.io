export class Style {
  private src: string[] = [];

  add(value: string): void {
    this.src.push(value);
  }

  apply(): void {
    if (this.src.length === 0) return;
    const style = document.createElement('style');
    style.textContent = this.src.join('\n');
    document.head.appendChild(style);
    this.src.length = 0;
  }
}

export default new Style();
