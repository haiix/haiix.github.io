import TComponent from '@haiix/TComponent'
import seq from '@haiix/seq'
import Gls from './Gls.mjs'
import * as vec3 from 'gl-matrix/cjs/vec3.js'

export default class App extends TComponent {
  template () {
    return `
      <canvas id="canvas" width="400" height="400">
        WebGL is not available.
        <script data-name="mainShader" type="x-shader/x-vertex">
          attribute vec3 position;
          attribute vec3 normal;
          uniform mat4 mvp;
          uniform float time;
          varying vec3 vColor;

          void main() {
            vec4 tp = mvp * vec4(position, 1.0);          // 視点から見た頂点座標
            vec4 tn = mvp * vec4(position + normal, 1.0); // 視点から見た頂点+頂点の法線ベクトル
            vec3 normal_v = normalize(tn.xyz - tp.xyz);   // 視点から見た頂点の法線ベクトル
            vec3 camera_v = vec3(0.0, 0.0, -1.0);         // 視線ベクトル
            float lightness = dot(normal_v, camera_v);    // 視点から見た頂点の法線ベクトルと視線ベクトルのドット積

            gl_Position = tp;
            vColor = 1.0 - (1.0 - vec3(0.0, 0.1, 0.3)) * (1.0 - pow(1.0 - lightness, 3.0) * 0.4);
          }
        </script>
        <script data-name="mainShader" type="x-shader/x-fragment">
          precision mediump float;
          varying vec3 vColor;
          void main() {
            gl_FragColor = vec4(vColor, 1.0);
          }
        </script>
      </canvas>
    `
  }

  constructor () {
    super()

    this.gl = new Gls(this.canvas, { context: { depth: true } })
    this.gl.clearColor(0, 0, 0, 1)
    this.gl.enable(this.gl.CULL_FACE)

    this.shader = this.gl.mainShader
    this.mouse = this.gl.createMouse({ delay: 0.9 })
    this.camera = this.gl.createCamera({ fov: 45, near: 0.1, far: 100, z: 10 })

    this.geom = this.gl.createGeometry([this.shader])
    //this.geom = this.gl.createGeometry([this.shader], this.gl.LINE_STRIP)

    for (const idx of seq(6)) {
      this.geom.addMesh({
        vnum: 5,
        unum: 5,
        shape (vertex) {
          const p = vertex.position

          p.z += 1
          vec3.rotateX(p, vec3.fromValues(p.x, 0, p.z), vec3.create(), p.y * Math.PI / -4)
          vec3.rotateY(p, vec3.fromValues(0, p.y, p.z), vec3.create(), p.x * Math.PI / 4)

          if (idx < 4) {
            vec3.rotateY(p, p, vec3.create(), idx * Math.PI / 2)
          } else {
            vec3.rotateX(p, p, vec3.create(), (idx + 0.5) * Math.PI)
          }

          vec3.copy(vertex.normal, p)

          vec3.scale(p, p, 0.2)
          p.x = p.x < 0 ? p.x - 1 : p.x + 1
          p.y = p.y < 0 ? p.y - 1 : p.y + 1
          p.z = p.z < 0 ? p.z - 1 : p.z + 1
        }
      })
    }
  }

  loop (t) {
    this.mouse.update()

    this.gl.clear()

    this.shader.uniform.time = (new Date().getTime() / 1000 % (24 * 60 * 60))
    this.shader.uniform.mvp = this.camera({ pan: this.mouse.dispX * 180, tilt: this.mouse.dispY * -90 })
    this.shader.draw(this.geom)
  }
}
