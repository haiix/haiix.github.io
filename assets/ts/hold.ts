function call(bind?: object, callback?: (x: number, y: number, modal: HTMLElement) => any, args?: any, onerror?: Function) {
  if (!callback) return;
  let retVal;
  try {
    retVal = callback.apply(bind, args);
  } catch (error) {
    if (onerror) {
      onerror.call(bind, error);
    }
  }
  if (!onerror || retVal == null || typeof retVal.then !== 'function') return;
  (async function (retVal) {
    try {
      await retVal;
    } catch (error) {
      onerror.call(bind, error);
    }
  })(retVal);
}

export function getPageCoordinate(event: MouseEvent | TouchEvent): [number, number] {
  if (event instanceof TouchEvent) {
    return [
      event.touches?.[0]?.clientX ?? 0,
      event.touches?.[0]?.clientY ?? 0
    ];
  } else {
    return [
      event.pageX,
      event.pageY
    ];
  }
}

export function hold({ ondragstart, ondrag, ondragend, onerror, cursor = '', bind, container = document.body }: { ondragstart?: (x: number, y: number, modal: HTMLElement) => any, ondrag?: (x: number, y: number, modal: HTMLElement) => any, ondragend?: (x: number, y: number, modal: HTMLElement) => any, onerror?: Function, cursor?: string, bind?: object, container?: HTMLElement }) {
  let modal: HTMLElement;
  const handleMousemove = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const [px, py] = getPageCoordinate(event);
    if (!modal) {
      modal = document.createElement('div');
      modal.setAttribute('style', 'position: fixed; top: 0; left: 0; right: 0; bottom: 0;');
      if (cursor) modal.style.cursor = cursor;
      container.appendChild(modal);
      call(bind, ondragstart, [px, py, modal], onerror);
    }
    call(bind, ondrag, [px, py, modal], onerror);
  }
  const handleMouseup = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const [px, py] = getPageCoordinate(event);
    removeEventListener('touchmove', handleMousemove);
    removeEventListener('touchend', handleMouseup);
    removeEventListener('mousemove', handleMousemove);
    removeEventListener('mouseup', handleMouseup);
    if (modal) container.removeChild(modal);
    call(bind, ondragend, [px, py, modal], onerror);
  }
  addEventListener('touchmove', handleMousemove, { passive: false });
  addEventListener('touchend', handleMouseup, { passive: false });
  addEventListener('mousemove', handleMousemove, { passive: false });
  addEventListener('mouseup', handleMouseup, { passive: false });
}

export default hold;
