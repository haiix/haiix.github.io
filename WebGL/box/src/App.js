import TComponent from '@haiix/TComponent'
import seq from '@haiix/seq'
import * as vec3 from 'gl-matrix/cjs/vec3.js'
import * as vec4 from 'gl-matrix/cjs/vec4.js'
import Gls from '../../../assets/Gls-lib.mjs'

export default class App extends TComponent {
  template () {
    return `
      <div>
        <h1>box</h1>
        <canvas id="canvas" width="600" height="600">
          WebGL is not available.
        </canvas>
      </div>
    `
  }

  mainVertexShader () {
    return `
      attribute vec3 position;
      attribute vec3 normal;
      attribute [[ubyte4]] color;
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
        vColor = 1.0 - (1.0 - color.rgb / 255.0) * (1.0 - pow(1.0 - lightness, 3.0) * 0.4);
      }
    `
  }

  mainFlagmentShader () {
    return `
      precision mediump float;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `
  }

  constructor () {
    super()

    this.gl = new Gls(this.canvas, { alpha: true, antialias: true, depth: true })
    this.gl.clearColor(0.9, 0.8, 0.7, 1)
    this.gl.enable(this.gl.CULL_FACE)

    this.shader = this.gl.createProgram(this.mainVertexShader(), this.mainFlagmentShader())
    this.mouse = this.gl.createMouse({ delay: 0.9 })
    this.camera = this.gl.createCamera({ fov: 45, near: 0.1, far: 100, z: 10 })

    this.geom = this.gl.createGeometry([this.shader])
    // this.geom = this.gl.createGeometry([this.shader], this.gl.LINE_STRIP)

    const ColorIds = seq(25).map(n => Math.random() * 3 | 0).toArray()

    this.geom.addMeshes(5, 5, 25 * 6, (attribute, i) => {
      const modelId = Math.floor(i / 6)
      const faceId = i % 6

      const modelX = modelId % 5 - 2
      const modelZ = (modelId / 5 | 0) - 2
      const colorId = ColorIds[modelId]

      const p = attribute.position

      p.z += 1
      vec3.rotateX(p, vec3.fromValues(p.x, 0, p.z), vec3.create(), p.y * Math.PI / -4)
      vec3.rotateY(p, vec3.fromValues(0, p.y, p.z), vec3.create(), p.x * Math.PI / 4)

      if (faceId < 4) {
        vec3.rotateY(p, p, vec3.create(), faceId * Math.PI / 2)
      } else {
        vec3.rotateX(p, p, vec3.create(), (faceId + 0.5) * Math.PI)
      }

      vec3.copy(attribute.normal, p)

      vec3.scale(p, p, 0.2)
      p.x += Math.sign(p.x) * 0.83
      p.y += Math.sign(p.y) * 0.83
      p.z += Math.sign(p.z) * 0.83

      p.x += modelX * 2
      p.z += modelZ * 2

      switch (colorId) {
        case 0:
          vec4.set(attribute.color, 96, 128, 224, 255)
          break
        case 1:
          vec4.set(attribute.color, 128, 192, 32, 255)
          break
        case 2:
          vec4.set(attribute.color, 224, 64, 160, 255)
          break
      }
    })
  }

  loop (t) {
    this.mouse.update()

    this.gl.clear()

    this.shader.uniform.time = (new Date().getTime() / 1000 % (24 * 60 * 60))
    this.shader.uniform.mvp = this.camera({ pan: this.mouse.dispX * 180, tilt: this.mouse.dispY * -90 })
    this.shader.draw(this.geom)
  }
}
