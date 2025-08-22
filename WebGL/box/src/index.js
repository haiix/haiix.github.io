import App from './App.js'

const app = new App()
document.body.appendChild(app.element)
function loop (t) {
  requestAnimationFrame(loop)
  app.loop(t)
}
loop(0)
