export interface Point {
  x: number;
  y: number;
}

export interface HoldParams {
  ondragstart?: (
    x: number,
    y: number,
    event: MouseEvent | TouchEvent,
  ) => unknown;
  ondrag?: (x: number, y: number, event: MouseEvent | TouchEvent) => unknown;
  ondragend?: (x: number, y: number, event: MouseEvent | TouchEvent) => unknown;
  onerror?: (error: unknown) => unknown;
  cursor?: string;
  container?: HTMLElement;
  overlay?: HTMLElement | false;
}

export function getPageCoordinate(event: MouseEvent | TouchEvent): Point {
  // TouchEventはブラウザで実装されていない可能性があるので判定に使用しないように注意
  if (event instanceof MouseEvent) {
    return { x: event.pageX, y: event.pageY };
  }
  // TouchEventの場合
  // touchendの場合は touches が空になるため changedTouches を参照する
  const touch = event.touches[0] ?? event.changedTouches[0];
  return { x: touch?.pageX ?? 0, y: touch?.pageY ?? 0 };
}

class HoldController {
  params: HoldParams;
  point: Point;
  overlay: HTMLElement | null = null;
  dragStarted = false;

  constructor(params: HoldParams, initialEvent: MouseEvent | TouchEvent) {
    this.params = params;
    this.point = getPageCoordinate(initialEvent);
  }

  private callback(
    event: MouseEvent | TouchEvent,
    fn?: (x: number, y: number, event: MouseEvent | TouchEvent) => unknown,
  ): void {
    if (!fn) return;

    let result;
    try {
      result = fn(this.point.x, this.point.y, event);
    } catch (error) {
      if (this.params.onerror) {
        this.params.onerror(error);
      }
    }

    if (this.params.onerror && result instanceof Promise) {
      result.catch(this.params.onerror);
    }
  }

  handleMouseMove(event: MouseEvent | TouchEvent): void {
    const point = getPageCoordinate(event);

    if (point.x === this.point.x && point.y === this.point.y) return;
    this.point = point;

    if (!this.dragStarted) {
      // 初回の移動検知でドラッグ開始とみなす
      if (this.params.overlay !== false) {
        let overlay: HTMLElement;
        if (this.params.overlay) {
          overlay = this.params.overlay;
        } else {
          overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.inset = '0';
        }
        if (this.params.cursor) overlay.style.cursor = this.params.cursor;

        this.overlay = overlay;
        (this.params.container ?? document.body).append(this.overlay);
      }
      this.callback(event, this.params.ondragstart);
      this.dragStarted = true;
    }

    this.callback(event, this.params.ondrag);
  }

  handleMouseUp(event: MouseEvent | TouchEvent): void {
    this.overlay?.remove();
    this.point = getPageCoordinate(event);

    if (this.dragStarted) {
      this.callback(event, this.params.ondragend);
    }
  }
}

/**
 * ドラッグ操作を開始します。
 * onMouseDown / onTouchStart イベントハンドラ内で呼び出してください。
 */
export function hold(event: MouseEvent | TouchEvent, params: HoldParams): void {
  // デフォルト挙動は、必要に応じて呼び出し側で制御する
  // if (event.cancelable) event.preventDefault();

  const controller = new HoldController(params, event);

  const handleMouseMove = (ev: MouseEvent | TouchEvent) => {
    if (ev.cancelable) ev.preventDefault();
    controller.handleMouseMove(ev);
  };

  const handleMouseUp = (ev: MouseEvent | TouchEvent) => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchmove', handleMouseMove);
    window.removeEventListener('touchend', handleMouseUp);
    window.removeEventListener('touchcancel', handleMouseUp);

    controller.handleMouseUp(ev);
  };

  const options = { passive: false };

  window.addEventListener('mousemove', handleMouseMove, options);
  window.addEventListener('mouseup', handleMouseUp, options);
  window.addEventListener('touchmove', handleMouseMove, options);
  window.addEventListener('touchend', handleMouseUp, options);
  window.addEventListener('touchcancel', handleMouseUp, options);
}

export default hold;
