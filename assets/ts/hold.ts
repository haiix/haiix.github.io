function call(
  x: number,
  y: number,
  modal: HTMLElement,
  callback?: (_x: number, _y: number, _modal: HTMLElement) => unknown,
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
  (async () => {
    try {
      await retVal;
    } catch (error) {
      onerror(error);
    }
  })();
}

export function getPageCoordinate(
  event: MouseEvent | TouchEvent,
): [number, number] {
  if (event instanceof TouchEvent) {
    return [event.touches?.[0]?.clientX ?? 0, event.touches?.[0]?.clientY ?? 0];
  }
  return [event.pageX, event.pageY];
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
      const [x, y] = getPageCoordinate(event);
      if (!modal) {
        modal = document.createElement('div');
        modal.setAttribute('style', 'position: fixed; inset: 0;');
        if (cursor) modal.style.cursor = cursor;
        container.append(modal);
        call(x, y, modal, ondragstart, onerror);
      }
      call(x, y, modal, ondrag, onerror);
    },
    handleMouseup = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      const [x, y] = getPageCoordinate(event);
      removeEventListener('touchmove', handleMousemove);
      removeEventListener('touchend', handleMouseup);
      removeEventListener('mousemove', handleMousemove);
      removeEventListener('mouseup', handleMouseup);
      if (modal) modal.remove();
      call(x, y, modal, ondragend, onerror);
    };
  addEventListener('touchmove', handleMousemove, { passive: false });
  addEventListener('touchend', handleMouseup, { passive: false });
  addEventListener('mousemove', handleMousemove, { passive: false });
  addEventListener('mouseup', handleMouseup, { passive: false });
}

export default hold;
