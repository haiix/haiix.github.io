import App from './App.js'
const app = new App()
document.body.appendChild(app.element)
if (app.main) app.main()
if (app.loop) {
  ;(function loop (t) {
    window.requestAnimationFrame(loop)
    app.loop(t)
  }(0))
}
window.app = app
