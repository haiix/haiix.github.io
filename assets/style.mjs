export default function style (text) {
  const elem = document.createElement('style')
  elem.textContent = text
  document.head.appendChild(elem)
}
