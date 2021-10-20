export const VERSION = '0.4.1'

const replaceAll = String.prototype.replaceAll ? String.prototype.replaceAll : function (a, b) { return this.split(a).join(b) }

const GL = window.WebGLRenderingContext || {}

const ATTRIBUTE_TYPE = {
  [GL.FLOAT]: { type: GL.FLOAT, size: 1, fn: '1f', ftype: 'primitive' },
  [GL.FLOAT_VEC2]: { type: GL.FLOAT, size: 2, fn: '2fv', ftype: 'primitive' },
  [GL.FLOAT_VEC3]: { type: GL.FLOAT, size: 3, fn: '3fv', ftype: 'primitive' },
  [GL.FLOAT_VEC4]: { type: GL.FLOAT, size: 4, fn: '4fv', ftype: 'primitive' },
  [GL.FLOAT_MAT2]: { type: GL.FLOAT, size: 4, fn: '2fv', ftype: 'matrix' },
  [GL.FLOAT_MAT3]: { type: GL.FLOAT, size: 9, fn: '3fv', ftype: 'matrix' },
  [GL.FLOAT_MAT4]: { type: GL.FLOAT, size: 16, fn: '4fv', ftype: 'matrix' },
  [GL.SAMPLER_2D]: { type: GL.SAMPLER_2D, size: 1, fn: '1i', ftype: 'texture' }
}

const EX_ATTRIBUTE_TYPE = {
  byte4: { glslType: 'vec4', type: GL.BYTE },
  ubyte4: { glslType: 'vec4', type: GL.UNSIGNED_BYTE },
  short2: { glslType: 'vec2', type: GL.SHORT },
  ushort2: { glslType: 'vec2', type: GL.UNSIGNED_SHORT }
}

const TYPE_BYTE = {
  [GL.BYTE]: { byte: 1, name: 'Int8' },
  [GL.UNSIGNED_BYTE]: { byte: 1, name: 'Uint8' },
  [GL.SHORT]: { byte: 2, name: 'Int16' },
  [GL.UNSIGNED_SHORT]: { byte: 2, name: 'Uint16' },
  [GL.INT]: { byte: 4, name: 'Int32' },
  [GL.UNSIGNED_INT]: { byte: 4, name: 'Uint32' },
  [GL.FLOAT]: { byte: 4, name: 'Float32' }
}

// ---------------------------------------------------------
// Shader
// ---------------------------------------------------------

function createShader (gl, type, name, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(name + ' shader compile error: ' + gl.getShaderInfoLog(shader))
  }
  return shader
}

function createVertexShader (gl, source) {
  return createShader(gl, gl.VERTEX_SHADER, 'Vertex', source)
}

function createFragmentShader (gl, source) {
  return createShader(gl, gl.FRAGMENT_SHADER, 'Fragment', source)
}

function removeSourceComments (src) {
  return src.replace(/(\/\/.*\n)|(\/\**?\*\/)/g, v => (
    new Array(v.split('\n').length).join('\n') + ' '
  ))
}

function getShaderSourceExAttributeTypes (source) {
  const tmp = ';' + replaceAll.call(source, ';', ';;') + ';'
  const re = /;\s*attribute\s+\[\[(\w+)\]\]\s+(\w+)\s*;/g
  const types = Object.create(null)
  for (let result; (result = re.exec(tmp));) {
    const [, type, name] = result
    if (!EX_ATTRIBUTE_TYPE[type]) continue
    types[name] = type
  }
  return types
}

function replaceShaderSourcesParams (src) {
  let curr = src
  for (const [k, v] of Object.entries(EX_ATTRIBUTE_TYPE)) {
    curr = replaceAll.call(curr, '[[' + k + ']]', v.glslType)
  }
  return curr
}

export class GlsVertexShader {
  constructor (gls, source) {
    source = removeSourceComments(source)
    this.exAttribute = getShaderSourceExAttributeTypes(source)
    source = replaceShaderSourcesParams(source)
    this.shader = createVertexShader(gls.gl, source)
  }
}

export class GlsFragmentShader {
  constructor (gls, source) {
    source = removeSourceComments(source)
    source = replaceShaderSourcesParams(source)
    this.shader = createFragmentShader(gls.gl, source)
  }
}

// ---------------------------------------------------------
// Program
// ---------------------------------------------------------

function createProgram (gl, vertexShader, fragmentShader) {
  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Link error: ' + gl.getProgramInfoLog(program))
  }
  return program
}

function getAttributeInfos (gl, program) {
  const infos = []
  const l = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
  for (let i = 0; i < l; i++) {
    infos.push(gl.getActiveAttrib(program, i))
  }
  return infos
}

function getUniformInfos (gl, program) {
  const infos = []
  const l = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < l; i++) {
    const info = gl.getActiveUniform(program, i)
    const location = gl.getUniformLocation(program, info.name)
    infos.push([info, location])
  }
  return infos
}

function createUniform (uniformInfos) {
  const uniform = Object.create(null)
  for (const [info] of uniformInfos) {
    const size = ATTRIBUTE_TYPE[info.type].size
    if (size === 1) {
      uniform[info.name] = 0
    } else {
      uniform[info.name] = new Float32Array(size)
    }
  }
  return uniform
}

export class GlsProgram {
  constructor (gls, vertexShader, fragmentShader) {
    this.gls = gls
    if (typeof vertexShader === 'string') {
      vertexShader = new GlsVertexShader(gls, vertexShader)
    }
    if (typeof fragmentShader === 'string') {
      fragmentShader = new GlsFragmentShader(gls, fragmentShader)
    }
    this.vertexShader = vertexShader
    this.fragmentShader = fragmentShader
    this.program = createProgram(gls.gl, vertexShader.shader, fragmentShader.shader)
    this.attributeInfos = getAttributeInfos(gls.gl, this.program)
    this.exAttribute = vertexShader.exAttribute
    this.uniformInfos = getUniformInfos(gls.gl, this.program)
    this.uniform = createUniform(this.uniformInfos)
  }

  draw (buffer) {
    buffer.drawBy(this)
  }
}

// ---------------------------------------------------------
// Buffer
// ---------------------------------------------------------

function getBufferAttribute (buffer, offset, name) {
  const info = buffer.infos[name]
  const typeByte = TYPE_BYTE[info.type]
  return new GlsAttribute(buffer.vertexes, typeByte.name, buffer.stride * offset + info.offset, typeByte.byte, info.size)
}

function getBufferVertex (buffer, offset) {
  const vertex = Object.create(null)
  for (const [name, info] of Object.entries(buffer.infos)) {
    const attribute = getBufferAttribute(buffer, offset, name)
    if (info.size === 1) {
      Object.defineProperty(vertex, name, {
        get () {
          return attribute[0]
        },
        set (v) {
          attribute[0] = v
        }
      })
    } else {
      vertex[name] = attribute
    }
  }
  return vertex
}

function createBufferInfos (programs) {
  const infos = Object.create(null)
  let offset = 0
  for (const program of programs) {
    for (const [, info] of program.attributeInfos.entries()) {
      const { name } = info
      let { type, size } = ATTRIBUTE_TYPE[info.type]
      let bytes = size * 4
      if (program.exAttribute[name]) {
        type = EX_ATTRIBUTE_TYPE[program.exAttribute[name]].type
        bytes = 4
      }
      if (infos[name]) {
        if (infos[name].type !== type || infos[name].size !== size) {
          throw new Error('Same attribute name but different type: ' + name)
        }
        continue
      }
      infos[name] = { type, size, offset }
      offset += bytes
    }
  }
  return [infos, offset]
}

export class GlsBuffer {
  constructor (programs, vertexSize, indexSize, mode, usage) {
    this.programs = programs
    ;[this.infos, this.stride] = createBufferInfos(programs)
    this.mode = mode
    this.usage = usage
    this.vertexSize = vertexSize
    this.vertexes = new DataView(new ArrayBuffer(this.stride * vertexSize))
    this.indices = indexSize != null ? new (vertexSize <= 256 ? Int8Array : Int16Array)(indexSize) : null
    this.vbo = null
    this.ibo = null
    this.vao = new Map()
  }

  getVertex (offset) {
    return getBufferVertex(this, offset)
  }

  drawBy (program) {
    if (!this.programs.includes(program)) {
      throw new Error('Using a program with a different buffer')
    }
    drawProgramBuffer(program, this)
  }
}

// ---------------------------------------------------------
// Bind program and buffer
// ---------------------------------------------------------

function createArrayBuffer (gl, srcData, usage) {
  const curr = gl.getParameter(gl.ARRAY_BUFFER_BINDING)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, srcData, usage)
  gl.bindBuffer(gl.ARRAY_BUFFER, curr)
  return buffer
}

function createElementArrayBuffer (gl, srcData, usage) {
  if (!srcData) return null
  const curr = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, srcData, usage)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, curr)
  return buffer
}

function bindProgramBuffer (gl, attributeInfos, buffer, oesvao) {
  if (oesvao) {
    let vao = buffer.vao.get(attributeInfos)
    if (vao) {
      oesvao.bindVertexArrayOES(vao)
      return
    }
    vao = oesvao.createVertexArrayOES()
    buffer.vao.set(attributeInfos, vao)
    oesvao.bindVertexArrayOES(vao)
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vbo)
  for (const [index, attributeInfo] of attributeInfos.entries()) {
    const info = buffer.infos[attributeInfo.name]
    gl.enableVertexAttribArray(index)
    gl.vertexAttribPointer(index, info.size, info.type, false, buffer.stride, info.offset)
  }
  if (buffer.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.ibo)
}

function bindProgramUniform (gls, gl, program, uniform, uniformInfos) {
  for (const [info, location] of uniformInfos) {
    const name = info.name
    const { fn, ftype } = ATTRIBUTE_TYPE[info.type]
    const value = uniform[name]
    if (ftype === 'matrix') {
      gl['uniformMatrix' + fn](location, false, value)
    } else if (ftype === 'texture') {
      if (!gls._textureBinder) gls._textureBinder = new TextureBinder(gl)
      gls._textureBinder.bind(location, value.texture || value || null)
    } else {
      gl['uniform' + fn](location, value)
    }
  }
}

function drawProgramBuffer (program, buffer) {
  const gls = program.gls
  const gl = gls.gl
  const oesvao = gls._oesvao
  if (!buffer.vbo) {
    buffer.vbo = createArrayBuffer(gl, buffer.vertexes.buffer, buffer.usage)
    buffer.ibo = createElementArrayBuffer(gl, buffer.indices.buffer, buffer.usage)
  }
  bindProgramBuffer(gl, program.attributeInfos, buffer, oesvao)
  gl.useProgram(program.program)
  bindProgramUniform(gls, gl, program.program, program.uniform, program.uniformInfos)
  if (buffer.ibo) {
    gl.drawElements(buffer.mode, buffer.indices.length, buffer.vertexSize <= 256 ? gl.UNSIGNED_BYTE : gl.UNSIGNED_SHORT, 0)
  } else {
    gl.drawArrays(buffer.mode, 0, buffer.vertexSize)
  }
}

// ---------------------------------------------------------
// Attribute
// ---------------------------------------------------------

export class GlsAttribute {
  constructor (view, typeName, offset, byte, size) {
    this.view = view
    this.setterName = 'set' + typeName
    this.getterName = 'get' + typeName
    this.offset = offset
    this.byte = byte
    this.size = size
    this.littleEndian = true
  }

  get 0 () {
    return this.view[this.getterName](this.offset, this.littleEndian)
  }

  set 0 (v) {
    this.view[this.setterName](this.offset, v, this.littleEndian)
  }

  get 1 () {
    return this.view[this.getterName](this.offset + this.byte, this.littleEndian)
  }

  set 1 (v) {
    this.view[this.setterName](this.offset + this.byte, v, this.littleEndian)
  }

  get 2 () {
    if (this.size <= 2) return
    return this.view[this.getterName](this.offset + this.byte * 2, this.littleEndian)
  }

  set 2 (v) {
    if (this.size <= 2) return
    this.view[this.setterName](this.offset + this.byte * 2, v, this.littleEndian)
  }

  get 3 () {
    if (this.size <= 3) return
    return this.view[this.getterName](this.offset + this.byte * 3, this.littleEndian)
  }

  set 3 (v) {
    if (this.size <= 3) return
    this.view[this.setterName](this.offset + this.byte * 3, v, this.littleEndian)
  }

  get x () {
    return this[0]
  }

  set x (v) {
    this[0] = v
  }

  get y () {
    return this[1]
  }

  set y (v) {
    this[1] = v
  }

  get z () {
    return this[2]
  }

  set z (v) {
    this[2] = v
  }

  get w () {
    return this[3]
  }

  set w (v) {
    this[3] = v
  }

  get r () {
    return this[0]
  }

  set r (v) {
    this[0] = v
  }

  get g () {
    return this[1]
  }

  set g (v) {
    this[1] = v
  }

  get b () {
    return this[2]
  }

  set b (v) {
    this[2] = v
  }

  get a () {
    return this[3]
  }

  set a (v) {
    this[3] = v
  }
}

// ---------------------------------------------------------
// BufferController
// ---------------------------------------------------------

const MAX_BUFFER_SIZE = 65536
function createMesh (buffer, vertexOffset, indexOffset, ucount, vcount, callback, i, attrName = 'position') {
  const umax = ucount + 1
  for (let v = 0, n = vertexOffset; v <= vcount; v++) {
    for (let u = 0; u < umax; u++) {
      const vtx = buffer.getVertex(n++)
      vtx[attrName][0] = u / ucount * 2 - 1
      vtx[attrName][1] = v / vcount * 2 - 1
      if (callback) callback(vtx, i)
    }
  }
  const idx = buffer.indices
  for (let v = 0, n = indexOffset; v < vcount; v++) {
    idx[n++] = vertexOffset + v * umax
    for (let u = 0; u < umax; u++) {
      idx[n++] = vertexOffset + u + v * umax
      idx[n++] = vertexOffset + u + (v + 1) * umax
    }
    idx[n++] = vertexOffset + (umax - 1) + (v + 1) * umax
  }
}
function buildGlsBufferController (geom) {
  if (geom.currentVertexOffset > 0) {
    const buffer = new GlsBuffer(geom.programs, geom.currentVertexOffset, geom.currentIndexOffset, geom.mode, geom.usage)
    for (const [callback, vertexOffset, vertexSize, indexOffset, indexSize] of geom.callbacks) {
      callback(buffer, vertexOffset, vertexSize, indexOffset, indexSize)
    }
    geom.buffers.push(buffer)
  }
  geom.currentVertexOffset = 0
  geom.currentIndexOffset = 0
  geom.callbacks.length = 0
}
export class GlsBufferController {
  constructor (programs, mode, usage) {
    this.programs = programs
    this.mode = mode
    this.usage = usage
    this.buffers = []
    this.currentVertexOffset = 0
    this.currentIndexOffset = 0
    this.callbacks = []
  }

  allocate (vertexSize, indexSize, callback) {
    if (vertexSize > MAX_BUFFER_SIZE) {
      throw new RangeError('The size you tried to allocate exceeds the maximum value.')
    }
    if (this.currentVertexOffset + vertexSize > MAX_BUFFER_SIZE) {
      buildGlsBufferController(this)
    }
    this.callbacks.push([callback, this.currentVertexOffset, this.currentIndexOffset])
    this.currentVertexOffset += vertexSize
    this.currentIndexOffset += indexSize
  }

  addMesh (ucount = 1, vcount = 1, callback = null, attrName = 'position') {
    this.addMeshes(ucount, vcount, 1, callback, attrName)
  }

  addMeshes (ucount = 1, vcount = 1, count = 1, callback = null, attrName = 'position') {
    const vertexSize = (ucount + 1) * (vcount + 1)
    const indexSize = (ucount * 2 + 4) * vcount
    const maxBufferCount = Math.floor(MAX_BUFFER_SIZE / vertexSize)
    for (let offset = 0; offset < count; offset += maxBufferCount) {
      const subCount = Math.min(count - offset, maxBufferCount)
      this.allocate(vertexSize * subCount, indexSize * subCount, (buffer, vertexOffset, indexOffset) => {
        for (let i = 0; i < subCount; i++) {
          createMesh(buffer, vertexOffset, indexOffset, ucount, vcount, callback, offset + i, attrName)
          vertexOffset += vertexSize
          indexOffset += indexSize
        }
      })
    }
  }

  drawBy (program) {
    if (!this.programs.includes(program)) {
      throw new Error('Using a program with a different buffer')
    }
    buildGlsBufferController(this)
    for (const buffer of this.buffers) {
      drawProgramBuffer(program, buffer)
    }
  }
}

// ---------------------------------------------------------
// TextureBinder
// ---------------------------------------------------------

export class TextureBinder {
  constructor (gl) {
    this.gl = gl
    this.max = Math.max(2, gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS))
    this.units = [] // [{ number, locations[], texture }, ...]
  }

  bind (location, texture) {
    let unit = TextureBinderFetchByLocation(this, location)
    if (unit) {
      if (unit.texture === texture) {
        return TextureBinderMoveToLast(this, unit)
      }
      TextureBinderUnbind(this, unit, location)
    }
    if (!texture) return
    unit = TextureBinderFetchByTexture(this, texture) || TextureBinderBindTexture(this, texture)
    TextureBinderBindLocation(this, unit, location)
    TextureBinderMoveToLast(this, unit)
  }
}

function TextureBinderFetchByLocation (self, location) {
  return self.units.find(unit => unit.locations.includes(location))
}

function TextureBinderFetchByTexture (self, texture) {
  return self.units.find(unit => unit.texture === texture)
}

function TextureBinderBindTexture (self, texture) {
  const number = TextureBinderNewNumber(self)
  self.gl.activeTexture(self.gl['TEXTURE' + number])
  self.gl.bindTexture(self.gl.TEXTURE_2D, texture)
  return { number, locations: [], texture }
}

function TextureBinderNewNumber (self) {
  const fs = new Array(self.max).fill(false)
  self.units = self.units.slice(1 - self.max)
  for (const unit of self.units) fs[unit.number] = true
  return fs.indexOf(false)
}

function TextureBinderBindLocation (self, unit, location) {
  self.gl.uniform1i(location, unit.number)
  unit.locations.push(location)
}

function TextureBinderUnbind (self, unit, location) {
  if (unit.locations.length === 1) {
    self.units.splice(self.units.indexOf(unit), 1)
  } else {
    unit.locations.splice(unit.locations.indexOf(location), 1)
  }
}

function TextureBinderMoveToLast (self, unit) {
  const n = self.units.indexOf(unit)
  if (n >= 0) self.units.splice(n, 1)
  self.units.push(unit)
}

// ---------------------------------------------------------
// Texture
// ---------------------------------------------------------

function setTextureParameters (gl, parameter) {
  let mipmap = !parameter.MIN_FILTER
  for (const [key, value] of Object.entries(parameter)) {
    if (key === 'MIN_FILTER' && !(value === 'NEAREST' || value === 'LINEAR')) {
      mipmap = true
    }
    gl.texParameteri(gl.TEXTURE_2D, gl['TEXTURE_' + key], gl[value])
  }
  if (mipmap) gl.generateMipmap(gl.TEXTURE_2D)
}

function createImageTexture (gl, img, parameter) {
  parameter = parameter || {}
  const currentTexture = gl.getParameter(gl.TEXTURE_BINDING_2D)
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  setTextureParameters(gl, parameter)
  gl.bindTexture(gl.TEXTURE_2D, currentTexture)
  return texture
}

// ---------------------------------------------------------
// Framebuffer
// ---------------------------------------------------------

function createFramebuffer (gl, param) {
  const currentFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING)
  const framebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  let depthRenderbuffer = null
  if (param.depth !== false) {
    const currentRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING)
    depthRenderbuffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, param.width, param.height)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer)
    gl.bindRenderbuffer(gl.RENDERBUFFER, currentRenderbuffer)
  }
  const currentTexture = gl.getParameter(gl.TEXTURE_BINDING_2D)
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, param.width, param.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  setTextureParameters(gl, param.texture)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  gl.bindTexture(gl.TEXTURE_2D, currentTexture)
  gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer)
  return [framebuffer, depthRenderbuffer, texture]
}

export class GlsFramebuffer {
  constructor (gls, param = null) {
    param = Object.assign({
      width: gls.canvas.width,
      height: gls.canvas.height,
      texture: gls.NEAREST_CLAMP,
      depth: true
    }, param)
    ;[this.framebuffer, this.depthRenderbuffer, this.texture] = createFramebuffer(gls.gl, param)
    this.width = param.width
    this.height = param.height
  }
}

// ---------------------------------------------------------
// Gls
// ---------------------------------------------------------

export default class Gls {
  constructor (canvas, contextAttributes) {
    this.canvas = typeof canvas === 'string' ? document.querySelector(canvas) : canvas
    contextAttributes = Object.assign({ preserveDrawingBuffer: true }, contextAttributes)
    this.gl = this.canvas.getContext('webgl', contextAttributes) || this.canvas.getContext('experimental-webgl', contextAttributes)
    this._oesvao = this.gl.getExtension('OES_vertex_array_object')
    this._textureBinder = null
    this._clearMask = this.gl.COLOR_BUFFER_BIT |
      (contextAttributes.depth !== false ? this.gl.DEPTH_BUFFER_BIT : 0) |
      (contextAttributes.stencil ? this.gl.STENCIL_BUFFER_BIT : 0)
    if (contextAttributes.depth !== false) {
      this.gl.enable(this.gl.DEPTH_TEST)
      this.gl.clearDepth(1)
    }
  }

  createVertexShader (src) {
    return new GlsVertexShader(this, src)
  }

  createFragmentShader (src) {
    return new GlsFragmentShader(this, src)
  }

  createProgram (vertexShader, fragmentShader) {
    return new GlsProgram(this, vertexShader, fragmentShader)
  }

  createBuffer (programs, mode = this.gl.TRIANGLE_STRIP, usage = this.gl.DYNAMIC_DRAW) {
    return new GlsBufferController(programs, mode, usage)
  }

  createTexture (img, parameter) {
    return createImageTexture(this.gl, img, parameter)
  }

  createFramebuffer (param = null) {
    return new GlsFramebuffer(this, param)
  }

  bindFramebuffer (framebuffer) {
    if (framebuffer) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer.framebuffer)
      this.gl.viewport(0, 0, framebuffer.width, framebuffer.height)
    } else {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  clear (mask = this._clearMask) {
    this.gl.clear(mask)
  }
}

// ---------------------------------------------------------
// constant values
// ---------------------------------------------------------

Gls.prototype.NEAREST_CLAMP = {
  MIN_FILTER: 'NEAREST',
  MAG_FILTER: 'NEAREST',
  WRAP_S: 'CLAMP_TO_EDGE',
  WRAP_T: 'CLAMP_TO_EDGE'
}
Gls.prototype.LINEAR_CLAMP = {
  MIN_FILTER: 'LINEAR',
  MAG_FILTER: 'LINEAR',
  WRAP_S: 'CLAMP_TO_EDGE',
  WRAP_T: 'CLAMP_TO_EDGE'
}
Gls.prototype.NEAREST_REPEAT = {
  MIN_FILTER: 'NEAREST',
  MAG_FILTER: 'NEAREST',
  WRAP_S: 'REPEAT',
  WRAP_T: 'REPEAT'
}
Gls.prototype.LINEAR_REPEAT = {
  MIN_FILTER: 'LINEAR',
  MAG_FILTER: 'LINEAR',
  WRAP_S: 'REPEAT',
  WRAP_T: 'REPEAT'
}

// ---------------------------------------------------------
// WebGL methods and properties
// ---------------------------------------------------------

{
  const methodNames = ['clearColor', 'enable', 'disable', 'blendFunc', 'blendFuncSeparate', 'viewport']
  for (const name of methodNames) {
    Gls.prototype[name] = function (...args) { return this.gl[name](...args) }
  }
  const propertyNames = [
    'POINTS', 'LINES', 'LINE_STRIP', 'TRIANGLES', 'TRIANGLE_STRIP',
    'CULL_FACE',
    'BLEND', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ZERO'
  ]
  for (const name of propertyNames) {
    Gls[name] = Gls.prototype[name] = GL[name]
  }
}
