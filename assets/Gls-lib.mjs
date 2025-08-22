import Gls from './Gls.mjs'
import * as mat4 from 'gl-matrix/esm/mat4.js'
import * as quat from 'gl-matrix/esm/quat.js'
import * as vec3 from 'gl-matrix/esm/vec3.js'

/**
 * Mouse
 */
function Mouse (gls, c) {
  this.x = c.x || 0
  this.y = c.y || 0
  this.z = c.z || 0
  this.delayX = c.delayX || c.delay || 0
  this.delayY = c.delayY || c.delay || 0
  this.delayZ = c.delayZ || c.delay || 0
  this[0] = this.dispX = this.x
  this[1] = this.dispY = this.y
  this[2] = this.dispZ = this.z
  gls.canvas.addEventListener('mousemove', function (event) {
    const rect = event.target.getBoundingClientRect()
    this.x = (event.pageX - rect.left - window.pageXOffset) / rect.width * 2 - 1
    this.y = 1 - (event.pageY - rect.top - window.pageYOffset) / rect.height * 2
  }.bind(this))
  gls.canvas.addEventListener('mousewheel', function (event) {
    this.z += event.wheelDelta
  }.bind(this), { passive: true })
}
Mouse.prototype.update = function () {
  this[0] = this.dispX = this.dispX * this.delayX + this.x * (1 - this.delayX)
  this[1] = this.dispY = this.dispY * this.delayY + this.y * (1 - this.delayY)
  this[2] = this.dispZ = this.dispZ * this.delayZ + this.z * (1 - this.delayZ)
}
Gls.prototype.createMouse = function (c) {
  return new Mouse(this, c || {})
}

/**
 * createCamera
 */
Gls.prototype.createCamera = function (c) {
  const translation = vec3.fromValues(-c.x || 0, -c.y || 0, -c.z || 0)
  const pMatrix = mat4.perspective(mat4.create(), c.fov * Math.PI / 180, this.canvas.width / this.canvas.height, c.near, c.far)

  return function (p) {
    const rotation = quat.create()
    quat.rotateZ(rotation, rotation, (p.roll || 0) * Math.PI / 180)
    quat.rotateX(rotation, rotation, (p.tilt || 0) * Math.PI / 180)
    quat.rotateY(rotation, rotation, (p.pan || 0) * Math.PI / 180)

    const vMatrix = mat4.fromRotationTranslation(mat4.create(), rotation, translation)
    const vpMatrix = mat4.mul(mat4.create(), pMatrix, vMatrix)
    mat4.translate(vpMatrix, vpMatrix, vec3.fromValues(-p.x || 0, -p.y || 0, -p.z || 0))

    return vpMatrix
  }
}

export default Gls
