export interface Point {
  x: number;
  y: number;
}

export interface HoldParams {
  ondragstart?: (x: number, y: number, overlay: HTMLElement) => unknown;
  ondrag?: (x: number, y: number, overlay: HTMLElement) => unknown;
  ondragend?: (x: number, y: number, overlay: HTMLElement) => unknown;
  onerror?: (error: unknown) => unknown;
  cursor?: string;
  container?: HTMLElement;
}

const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.inset = '0';

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
  point: Point = { x: 0, y: 0 };
  dragStarted = false;

  constructor(params: HoldParams) {
    this.params = params;
  }

  private callback(
    callback?: (x: number, y: number, o: HTMLElement) => unknown,
  ): void {
    if (!callback) return;

    let retVal = null;
    try {
      retVal = callback(this.point.x, this.point.y, overlay);
    } catch (error) {
      if (this.params.onerror) {
        this.params.onerror(error);
      }
    }

    if (this.params.onerror && retVal instanceof Promise) {
      retVal.catch(this.params.onerror);
    }
  }

  handleMouseDown(event: MouseEvent | TouchEvent): void {
    this.point = getPageCoordinate(event);
  }

  handleMouseMove(event: MouseEvent | TouchEvent): void {
    const point = getPageCoordinate(event);
    if (point.x === this.point.x && point.y === this.point.y) return;
    this.point = point;

    if (!this.dragStarted) {
      if (this.params.cursor) overlay.style.cursor = this.params.cursor;
      (this.params.container ?? document.body).append(overlay);
      this.callback(this.params.ondragstart);
      this.dragStarted = true;
    }

    this.callback(this.params.ondrag);
  }

  handleMouseUp(event: MouseEvent | TouchEvent): void {
    overlay.remove();
    overlay.style.cursor = '';
    this.point = getPageCoordinate(event);
    this.callback(this.params.ondragend);
  }
}

export function hold(params: HoldParams): void {
  const controller = new HoldController(params);

  const handleMouseDown = (event: MouseEvent | TouchEvent) => {
    // マウスダウンのイベントを抑止すると、フォーカス処理が行われなくなる
    //event.preventDefault();
    controller.handleMouseDown(event);
  };
  const handleMouseMove = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    controller.handleMouseMove(event);
  };
  const handleMouseUp = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    for (const handler of handlers) {
      removeEventListener(handler.type, handler.listener);
    }
    controller.handleMouseUp(event);
  };

  const handlers = [
    { type: 'touchstart', listener: handleMouseDown },
    { type: 'touchmove', listener: handleMouseMove },
    { type: 'touchend', listener: handleMouseUp },
    { type: 'mousedown', listener: handleMouseDown },
    { type: 'mousemove', listener: handleMouseMove },
    { type: 'mouseup', listener: handleMouseUp },
  ] as const;

  for (const handler of handlers) {
    addEventListener(handler.type, handler.listener, { passive: false });
  }
}

export default hold;
