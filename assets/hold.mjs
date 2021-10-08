export default function hold ({ ondragstart = null, ondrag = null, ondragend = null, cursor = '', bind = null, container = document.body }) {
  let modal = null
  const handleMousemove = event => {
    if (!modal) {
      modal = document.createElement('div')
      modal.setAttribute('style', 'position: fixed; top: 0; left: 0; right: 0; bottom: 0;')
      if (cursor) modal.style.cursor = cursor
      container.appendChild(modal)
      if (ondragstart) ondragstart.call(bind, event.pageX, event.pageY, modal)
    }
    if (ondrag) ondrag.call(bind, event.pageX, event.pageY, modal)
  }
  const handleMouseup = event => {
    window.removeEventListener('mousemove', handleMousemove)
    window.removeEventListener('mouseup', handleMouseup)
    if (modal) {
      container.removeChild(modal)
      if (ondragend) ondragend.call(bind, event.pageX, event.pageY, modal)
    }
  }
  window.addEventListener('mousemove', handleMousemove)
  window.addEventListener('mouseup', handleMouseup)
}
