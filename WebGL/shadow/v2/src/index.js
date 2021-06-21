import App from './App.js'
const app = new App()
document.body.appendChild(app.element)
if (app.main) app.main()
if (app.loop) {
  ;(function loop (t) {
    app.loop(t)
    window.requestAnimationFrame(loop)
  }(0))
}
window.app = app
