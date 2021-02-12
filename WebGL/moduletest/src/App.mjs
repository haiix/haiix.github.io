import TComponent from '@haiix/TComponent'
import Gls from './Gls.mjs'
import * as vec3 from 'gl-matrix/cjs/vec3.js'

export default class App extends TComponent {
  template () {
    return `
      <canvas id="canvas" width="400" height="400">
        WebGL is not available.
        <script data-name="mainShader" type="x-shader/x-vertex">
          attribute vec2 position;
          uniform float time;
          void main() {
            float c = cos(time);
            float s = sin(time);
            vec2 p = vec2(
              position.x * c + position.y * s,
              position.y * c - position.x * s
            );
            gl_Position = vec4(p * 0.7, 0.0, 1.0);
          }
        </script>
        <script data-name="mainShader" type="x-shader/x-fragment">
          void main() {
            gl_FragColor = vec4(1.0);
          }
        </script>
      </canvas>
    `
  }

  constructor () {
    super()

    this.gl = new Gls(this.canvas)
    this.gl.clearColor(0, 0, 0, 1)

    this.mainShader = this.gl.mainShader

    this.geom = this.gl.createGeometry([this.mainShader])
    this.geom.addMesh()
  }

  loop () {
    this.gl.clear()
    this.mainShader.uniform.time = (new Date().getTime() / 1000 % (24 * 60 * 60))
    this.mainShader.draw(this.geom)
  }
}
