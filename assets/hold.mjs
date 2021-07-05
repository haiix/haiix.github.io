export default function hold ({ ondrag = null, ondragend = null, cursor = '', bind = null, container = document.body }) {
  const modal = document.createElement('div')
  modal.setAttribute('style', 'position: absolute; left: 0; top: 0; width: 100%; height: 100%;')
  if (cursor) modal.style.cursor = cursor
  const handleMousemove = event => {
    if (ondrag) ondrag.call(bind, event.pageX, event.pageY, modal)
  }
  const handleMouseup = event => {
    removeEventListener('mousemove', handleMousemove)
    removeEventListener('mouseup', handleMouseup)
    container.removeChild(modal)
    if (ondragend) ondragend.call(bind, event.pageX, event.pageY, modal)
  }
  container.appendChild(modal)
  addEventListener('mousemove', handleMousemove)
  addEventListener('mouseup', handleMouseup)
}
