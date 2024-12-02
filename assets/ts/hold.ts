export type Point = {
  x: number;
  y: number;
};

export type HoldParams = {
  ondragstart?: (x: number, y: number, modal: HTMLElement) => unknown;
  ondrag?: (x: number, y: number, modal: HTMLElement) => unknown;
  ondragend?: (x: number, y: number, modal: HTMLElement) => unknown;
  onerror?: (error: unknown) => unknown;
  cursor?: string;
  container?: HTMLElement;
};

export function getPageCoordinate(event: MouseEvent | TouchEvent): Point {
  if (event instanceof TouchEvent) {
    return {
      x: event.touches[0]?.clientX ?? 0,
      y: event.touches[0]?.clientY ?? 0,
    };
  }
  return { x: event.pageX, y: event.pageY };
}

class HoldController {
  params: HoldParams;
  modal: HTMLElement | null = null;
  prevPoint: Point = { x: 0, y: 0 };

  constructor(params: HoldParams) {
    this.params = params;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    addEventListener('touchstart', this.handleMouseDown, { passive: false });
    addEventListener('touchmove', this.handleMouseMove, { passive: false });
    addEventListener('touchend', this.handleMouseUp, { passive: false });
    addEventListener('mousedown', this.handleMouseDown, { passive: false });
    addEventListener('mousemove', this.handleMouseMove, { passive: false });
    addEventListener('mouseup', this.handleMouseUp, { passive: false });
  }

  private handleMouseDown(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.prevPoint = getPageCoordinate(event);
  }

  private handleMouseMove(event: MouseEvent | TouchEvent): void {
    event.preventDefault();

    const point = getPageCoordinate(event);
    if (point.x === this.prevPoint.x && point.y === this.prevPoint.y) return;
    this.prevPoint = point;

    if (!this.modal) {
      this.modal = document.createElement('div');
      this.modal.setAttribute('style', 'position: fixed; inset: 0;');
      if (this.params.cursor) this.modal.style.cursor = this.params.cursor;
      (this.params.container ?? document.body).append(this.modal);
      this.call(point, this.modal, this.params.ondragstart);
    }

    this.call(point, this.modal, this.params.ondrag);
  }

  private handleMouseUp(event: MouseEvent | TouchEvent): void {
    event.preventDefault();

    removeEventListener('touchstart', this.handleMouseDown);
    removeEventListener('touchmove', this.handleMouseMove);
    removeEventListener('touchend', this.handleMouseUp);
    removeEventListener('mousedown', this.handleMouseDown);
    removeEventListener('mousemove', this.handleMouseMove);
    removeEventListener('mouseup', this.handleMouseUp);

    if (this.modal) {
      this.modal.remove();
      const point = getPageCoordinate(event);
      this.call(point, this.modal, this.params.ondragend);
    }
  }

  private call(
    point: Point,
    modal: HTMLElement,
    callback?: (x: number, y: number, m: HTMLElement) => unknown,
  ): void {
    if (!callback) return;

    let retVal = null;
    try {
      retVal = callback(point.x, point.y, modal);
    } catch (error) {
      if (this.params.onerror) {
        this.params.onerror(error);
      }
    }

    if (this.params.onerror && retVal instanceof Promise) {
      retVal.catch(this.params.onerror);
    }
  }
}

export function hold(params: HoldParams): void {
  new HoldController(params);
}

export default hold;
