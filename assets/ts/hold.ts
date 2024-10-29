function call(
  x: number,
  y: number,
  modal: HTMLElement,
  callback?: (_x: number, _y: number, _modal: HTMLElement) => unknown,
  onerror?: (error: unknown) => unknown,
): void {
  if (!callback) return;
  let retVal = null;
  try {
    retVal = callback(x, y, modal);
  } catch (error) {
    if (onerror) {
      onerror(error);
    }
  }
  if (onerror && retVal instanceof Promise) {
    retVal.catch(onerror);
  }
}

export function getPageCoordinate(event: MouseEvent | TouchEvent): {
  x: number;
  y: number;
} {
  if (event instanceof TouchEvent) {
    return {
      x: event.touches[0]?.clientX ?? 0,
      y: event.touches[0]?.clientY ?? 0,
    };
  }
  return { x: event.pageX, y: event.pageY };
}

export function hold({
  ondragstart,
  ondrag,
  ondragend,
  onerror,
  cursor,
  container = document.body,
}: {
  ondragstart?: (x: number, y: number, modal: HTMLElement) => unknown;
  ondrag?: (x: number, y: number, modal: HTMLElement) => unknown;
  ondragend?: (x: number, y: number, modal: HTMLElement) => unknown;
  onerror?: (error: unknown) => unknown;
  cursor?: string;
  container?: HTMLElement;
}) {
  let modal: HTMLElement | null = null;
  const handleMousemove = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const { x, y } = getPageCoordinate(event);
    if (!modal) {
      modal = document.createElement('div');
      modal.setAttribute('style', 'position: fixed; inset: 0;');
      if (cursor) modal.style.cursor = cursor;
      container.append(modal);
      call(x, y, modal, ondragstart, onerror);
    }
    call(x, y, modal, ondrag, onerror);
  };
  const handleMouseup = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const { x, y } = getPageCoordinate(event);
    removeEventListener('touchmove', handleMousemove);
    removeEventListener('touchend', handleMouseup);
    removeEventListener('mousemove', handleMousemove);
    removeEventListener('mouseup', handleMouseup);
    if (modal) {
      modal.remove();
      call(x, y, modal, ondragend, onerror);
    }
  };
  addEventListener('touchmove', handleMousemove, { passive: false });
  addEventListener('touchend', handleMouseup, { passive: false });
  addEventListener('mousemove', handleMousemove, { passive: false });
  addEventListener('mouseup', handleMouseup, { passive: false });
}

export default hold;
