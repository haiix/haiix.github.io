import { nextTabbable } from './focus.mjs'

export default async function initApp (App) {
  let app = null
  try {
    app = new App()
    document.body.appendChild(app.element)
    window.app = app
    const firstElem = nextTabbable(null, app.element)
    if (firstElem) firstElem.focus()
    if (app.main) await app.main()
    if (app.loop) {
      ;(async function loop (t) {
        try {
          await app.loop(t)
        } catch (error) {
          if (app.onerror) {
            await app.onerror(error)
          } else {
            throw error
          }
        }
        window.requestAnimationFrame(loop)
      }(0))
    }
  } catch (error) {
    if (app && app.onerror) {
      app.onerror(error)
    } else if (App.prototype.onerror) {
      App.prototype.onerror.call(null, error)
    } else {
      throw error
    }
  }
}
