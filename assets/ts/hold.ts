function call(
  x: number,
  y: number,
  modal: HTMLElement,
  callback?: (x: number, y: number, modal: HTMLElement) => unknown,
  onerror?: (error: unknown) => unknown,
) {
  if (!callback) return;
  let retVal;
  try {
    retVal = callback(x, y, modal);
  } catch (error) {
    if (onerror) {
      onerror(error);
    }
  }
  if (
    !onerror ||
    typeof retVal !== 'object' ||
    retVal == null ||
    !('then' in retVal) ||
    typeof retVal.then !== 'function'
  )
    return;
  (async function (retVal) {
    try {
      await retVal;
    } catch (error) {
      onerror(error);
    }
  })(retVal);
}

export function getPageCoordinate(
  event: MouseEvent | TouchEvent,
): [number, number] {
  if (event instanceof TouchEvent) {
    return [event.touches?.[0]?.clientX ?? 0, event.touches?.[0]?.clientY ?? 0];
  } else {
    return [event.pageX, event.pageY];
  }
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
  let modal: HTMLElement;
  const handleMousemove = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const [px, py] = getPageCoordinate(event);
    if (!modal) {
      modal = document.createElement('div');
      modal.setAttribute('style', 'position: fixed; inset: 0;');
      if (cursor == null && event.target instanceof Element) {
        const style = getComputedStyle(event.target);
        cursor = style.cursor;
      }
      if (cursor) modal.style.cursor = cursor;
      container.append(modal);
      call(px, py, modal, ondragstart, onerror);
    }
    call(px, py, modal, ondrag, onerror);
  };
  const handleMouseup = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const [px, py] = getPageCoordinate(event);
    removeEventListener('touchmove', handleMousemove);
    removeEventListener('touchend', handleMouseup);
    removeEventListener('mousemove', handleMousemove);
    removeEventListener('mouseup', handleMouseup);
    if (modal) modal.remove();
    call(px, py, modal, ondragend, onerror);
  };
  addEventListener('touchmove', handleMousemove, { passive: false });
  addEventListener('touchend', handleMouseup, { passive: false });
  addEventListener('mousemove', handleMousemove, { passive: false });
  addEventListener('mouseup', handleMouseup, { passive: false });
}

export default hold;
