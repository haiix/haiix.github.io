import TComponent from '@haiix/TComponent'
import * as vec3 from 'gl-matrix/esm/vec3.js'
import * as mat4 from 'gl-matrix/esm/mat4.js'
import Gls from '../../../assets/js/Gls-lib.mjs'

export default class App extends TComponent {
  static template = `
    <canvas id="canvas" width="400" height="400"></canvas>
  `

  canvas = this.id('canvas')

  constructor () {
    super()
    const gl = new Gls(this.canvas, { alpha: false, depth: true, antialias: true })
    this.gl = gl

    gl.enable(gl.CULL_FACE)

    const shadowColor = 0.75
    const shadowCount = 3

    gl.mainShader = gl.createProgram(`
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat4 modelMat;
      uniform mat4 depthMat;
      uniform vec3 lightInvDir;
      varying vec4 shadowCoord;
      varying float vColor;

      void main() {
        gl_Position = modelMat * vec4(position, 1.0);
        shadowCoord = (depthMat * vec4(position, 1.0)) * 0.5 + 0.5;
        vColor = clamp(dot(normal, lightInvDir), 0.0, 1.0) * 0.75 + ${shadowColor};
      }
    `, `
      precision mediump float;

      uniform sampler2D shadowMap;
      uniform float hue;
      varying vec4 shadowCoord;
      varying float vColor;

      vec3 hsv2rgb(float h, float s, float v) {
        vec3 rgb = h * 6. + vec3(2., 0., 4.);
        rgb = clamp(2. - abs(mod(rgb, 6.) - 2.), 0., 1.);
        rgb = mix(vec3(1.), rgb, s) * v;
        return clamp(rgb, 0., 1.);
      }

      void main() {
        vec2 coord = shadowCoord.xy;
        float z = shadowCoord.z - 0.02;
        float visibility = 1.0 - (${
          Array(shadowCount).fill(0)
            .map((_, i) => ['cos', 'sin'].map(fn => (Math[fn](i * 2) * 0.003).toFixed(8)))
            .map(([x, y]) => `step(texture2D(shadowMap, coord + vec2(${x}, ${y})).z, z)`)
            .join(' + ')
        }) * ${((1 - shadowColor) / shadowCount).toFixed(8)};
        gl_FragColor = vec4(hsv2rgb(hue, 0.5, min(visibility, vColor)), 1.0);
      }
    `)

    gl.shadowShader = gl.createProgram(`
      attribute vec3 position;
      uniform mat4 depthMat;

      void main() {
        gl_Position = depthMat * vec4(position, 1.0);
      }
    `, `
      precision mediump float;

      void main() {
        gl_FragColor = vec4(vec3(gl_FragCoord.z), 1.0);
      }
    `)

    // シャドウマップ
    gl.mainShader.uniform.shadowMap = gl.createFramebuffer({
      width: 512,
      height: 512,
      // depth: true,
      texture: gl.LINEAR_CLAMP
    })

    // 光源
    const lightInvDir = vec3.fromValues(5, 10, 20)
    vec3.normalize(lightInvDir, lightInvDir)
    gl.mainShader.uniform.lightInvDir = lightInvDir
    // 光源の視点
    gl.depthVP = (range => {
      const depthProjectionMatrix = mat4.create()
      mat4.ortho(depthProjectionMatrix, -range, range, -range, range, -range, range)
      const depthViewMatrix = mat4.create()
      mat4.lookAt(depthViewMatrix, lightInvDir, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 1))
      const depthVP = mat4.create()
      mat4.mul(depthVP, depthProjectionMatrix, depthViewMatrix)
      return depthVP
    })(15)

    // モデル作成
    gl.floorBuffer = gl.createBuffer([gl.shadowShader, gl.mainShader], gl.TRIANGLE_STRIP)
    gl.floorBuffer.addMesh(1, 1, attribute => {
      // 床
      const p = attribute.position
      const n = attribute.normal

      p.x *= 8
      p.y *= 8
      p.z = -1

      n.z = 1
    })
    gl.ballBuffer = gl.createBuffer([gl.shadowShader, gl.mainShader], gl.TRIANGLE_STRIP)
    gl.ballBuffer.addMesh(24, 12, attribute => {
      const p = attribute.position
      const n = attribute.normal

      const l = Math.cos(p.y * Math.PI / 2)
      p.x += p.y / 4
      p.z = Math.sin(p.y * Math.PI / 2)
      p.y = Math.sin(p.x * Math.PI) * l
      p.x = Math.cos(p.x * Math.PI) * l

      n.x = p.x
      n.y = p.y
      n.z = p.z
    })

    gl.camera = gl.createCamera = gl.createCamera({ fov: 45, near: 0.1, far: 100, z: 20 })
    gl.mouse = gl.createMouse({ delay: 0.9 })
  }

  // モデル描画
  drawBuffers (shader, modelVP, time) {
    const gl = this.gl

    // 床
    shader.uniform.modelMat = modelVP
    shader.uniform.depthMat = gl.depthVP
    shader.uniform.hue = 1 / 12
    shader.draw(gl.floorBuffer)

    // ボール
    for (let i = 0; i < 16; i++) {
      const x = Math.cos(i) * Math.sqrt(i * 3)
      const y = Math.sin(i) * Math.sqrt(i * 3)
      const z = Math.abs(Math.sin(i * 2 + time / 500)) * 5

      const M = mat4.fromTranslation(mat4.create(), vec3.fromValues(x, y, z))

      shader.uniform.modelMat = mat4.mul(mat4.create(), modelVP, M)
      shader.uniform.depthMat = mat4.mul(mat4.create(), gl.depthVP, M)
      shader.uniform.hue = i / 7.5
      shader.draw(gl.ballBuffer)
    }
  }

  loop (time) {
    const gl = this.gl
    gl.mouse.update()

    const VP = gl.camera({ pan: gl.mouse.dispX * 180, tilt: gl.mouse.dispY * -90, roll: 0 })
    mat4.mul(VP, VP, mat4.fromRotation(mat4.create(), -Math.PI / 2, vec3.fromValues(1, 0, 0))) // Y軸とZ軸を入れ替え

    gl.bindFramebuffer(gl.mainShader.uniform.shadowMap)
    gl.clearColor(1, 1, 1, 1)
    gl.clear()
    this.drawBuffers(gl.shadowShader, VP, time)

    gl.bindFramebuffer(null)
    gl.clearColor(0.4, 0.3, 0.2, 1)
    gl.clear()
    this.drawBuffers(gl.mainShader, VP, time)
  }
}
