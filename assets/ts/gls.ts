export const VERSION = '0.4.3';

const GL = window.WebGL2RenderingContext;

interface I_ATTRIBUTE_TYPE {
  type: number;
  size: number;
  fn: string;
  ftype: string;
}

const ATTRIBUTE_TYPE: { [key: string]: I_ATTRIBUTE_TYPE } = {
  [GL.FLOAT]: { type: GL.FLOAT, size: 1, fn: '1f', ftype: 'primitive' },
  [GL.FLOAT_VEC2]: { type: GL.FLOAT, size: 2, fn: '2fv', ftype: 'primitive' },
  [GL.FLOAT_VEC3]: { type: GL.FLOAT, size: 3, fn: '3fv', ftype: 'primitive' },
  [GL.FLOAT_VEC4]: { type: GL.FLOAT, size: 4, fn: '4fv', ftype: 'primitive' },
  [GL.FLOAT_MAT2]: { type: GL.FLOAT, size: 4, fn: '2fv', ftype: 'matrix' },
  [GL.FLOAT_MAT3]: { type: GL.FLOAT, size: 9, fn: '3fv', ftype: 'matrix' },
  [GL.FLOAT_MAT4]: { type: GL.FLOAT, size: 16, fn: '4fv', ftype: 'matrix' },
  [GL.SAMPLER_2D]: { type: GL.SAMPLER_2D, size: 1, fn: '1i', ftype: 'texture' }
};

interface I_EX_ATTRIBUTE_TYPE {
  glslType: string;
  type: number;
}

const EX_ATTRIBUTE_TYPE: { [key: string]: I_EX_ATTRIBUTE_TYPE } = {
  byte4: { glslType: 'vec4', type: GL.BYTE },
  ubyte4: { glslType: 'vec4', type: GL.UNSIGNED_BYTE },
  short2: { glslType: 'vec2', type: GL.SHORT },
  ushort2: { glslType: 'vec2', type: GL.UNSIGNED_SHORT }
};

interface I_TYPE_BYTE {
  byte: number;
  name: string;
  clamp: boolean;
  min?: number;
  max?: number;
}

const TYPE_BYTE: { [key: string]: I_TYPE_BYTE } = {
  [GL.BYTE]: { byte: 1, name: 'Int8', clamp: true, min: -128, max: 128 },
  [GL.UNSIGNED_BYTE]: { byte: 1, name: 'Uint8', clamp: true, min: 0, max: 255 },
  [GL.SHORT]: { byte: 2, name: 'Int16', clamp: true, min: -32768, max: 32767 },
  [GL.UNSIGNED_SHORT]: { byte: 2, name: 'Uint16', clamp: true, min: 0, max: 65535 },
  [GL.INT]: { byte: 4, name: 'Int32', clamp: true, min: -2147483648, max: 2147483647 },
  [GL.UNSIGNED_INT]: { byte: 4, name: 'Uint32', clamp: true, min: 0, max: 4294967295 },
  [GL.FLOAT]: { byte: 4, name: 'Float32', clamp: false }
};

// ---------------------------------------------------------
// Shader
// ---------------------------------------------------------

function createShader(gl: WebGL2RenderingContext, type: number, name: string, source: string) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(name + ' shader compile error: ' + gl.getShaderInfoLog(shader));
  }
  return shader;
}

function removeSourceComments(source: string) {
  return source.replace(/(\/\/.*\n)|(\/\**?\*\/)/g, v => (
    new Array(v.split('\n').length).join('\n') + ' '
  ));
}

interface GlsShaderSourceExAttributeType {
  name: string;
  type: string;
}

function getShaderSourceExAttributeTypes(source: string) {
  const tmp = ';' + source.replaceAll(';', ';;') + ';';
  const re = /;\s*(attribute|in)\s+\[\[(\w+)\]\]\s+(\w+)\s*;/g;
  const types: GlsShaderSourceExAttributeType[] = [];
  for (let result: RegExpExecArray; result = re.exec(tmp);) {
    const [, , type, name] = result;
    if (!EX_ATTRIBUTE_TYPE[type]) continue;
    types.push({ name, type });
  }
  return types;
}

function replaceShaderSourcesParams(source: string) {
  let curr = source;
  for (const [k, v] of Object.entries(EX_ATTRIBUTE_TYPE)) {
    curr = curr.replaceAll('[[' + k + ']]', v.glslType);
  }
  return curr;
}

export class GlsVertexShader {
  exAttribute: GlsShaderSourceExAttributeType[];
  shader: WebGLShader;

  constructor(gls: Gls, source: string, prefix = '#version 300 es\n') {
    source = removeSourceComments(source);
    this.exAttribute = getShaderSourceExAttributeTypes(source);
    source = replaceShaderSourcesParams(source);
    this.shader = createShader(gls.gl, gls.gl.VERTEX_SHADER, 'Vertex', prefix + source);
  }
}

export class GlsFragmentShader {
  shader: WebGLShader;

  constructor(gls: Gls, source: string, prefix = '#version 300 es\nprecision highp float;\n') {
    source = removeSourceComments(source);
    source = replaceShaderSourcesParams(source);
    this.shader = createShader(gls.gl, gls.gl.FRAGMENT_SHADER, 'Fragment', prefix + source);
  }
}

// ---------------------------------------------------------
// Program
// ---------------------------------------------------------

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Link error: ' + gl.getProgramInfoLog(program));
  }
  return program;
}

function getAttributeInfos(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const infos: WebGLActiveInfo[] = [];
  const l = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < l; i++) {
    infos.push(gl.getActiveAttrib(program, i));
  }
  return infos;
}

type GlsUniformInfo = [WebGLActiveInfo, WebGLUniformLocation];

function getUniformInfos(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const infos: GlsUniformInfo[] = [];
  const l = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < l; i++) {
    const info = gl.getActiveUniform(program, i);
    const location = gl.getUniformLocation(program, info.name);
    infos.push([info, location]);
  }
  return infos;
}

interface GlsUniform {
  [key: string]: number | Float32Array | WebGLTexture | GlsFramebuffer;
}

function createUniform(uniformInfos: GlsUniformInfo[]) {
  const uniform: GlsUniform = Object.create(null);
  for (const [info] of uniformInfos) {
    const size = ATTRIBUTE_TYPE[info.type].size;
    if (size === 1) {
      uniform[info.name] = 0;
    } else {
      uniform[info.name] = new Float32Array(size);
    }
  }
  return uniform;
}

export class GlsProgram {
  gls: Gls;
  vertexShader: GlsVertexShader;
  fragmentShader: GlsFragmentShader;
  program: WebGLProgram;
  attributeInfos: WebGLActiveInfo[];
  exAttributes: GlsShaderSourceExAttributeType[];
  uniformInfos: GlsUniformInfo[];
  uniform: GlsUniform;

  constructor(gls: Gls, vertexShader: string | GlsVertexShader, fragmentShader: string | GlsFragmentShader) {
    this.gls = gls;
    if (typeof vertexShader === 'string') {
      vertexShader = new GlsVertexShader(gls, vertexShader);
    }
    if (typeof fragmentShader === 'string') {
      fragmentShader = new GlsFragmentShader(gls, fragmentShader);
    }
    this.vertexShader = vertexShader;
    this.fragmentShader = fragmentShader;
    this.program = createProgram(gls.gl, vertexShader.shader, fragmentShader.shader);
    this.attributeInfos = getAttributeInfos(gls.gl, this.program);
    this.exAttributes = vertexShader.exAttribute;
    this.uniformInfos = getUniformInfos(gls.gl, this.program);
    this.uniform = createUniform(this.uniformInfos);
  }
}

// ---------------------------------------------------------
// Attribute
// ---------------------------------------------------------

function clampInt(val: number, min: number, max: number) {
  return Math.floor(Math.min(Math.max(min, val), max));
}

export class GlsAttribute {
  view: DataView;
  typeByte: I_TYPE_BYTE;
  offset: number;
  size: number;
  littleEndian: boolean;

  constructor(view: DataView, typeByte: I_TYPE_BYTE, offset: number, size: number) {
    this.view = view;
    this.typeByte = typeByte;
    this.offset = offset;
    this.size = size;
    this.littleEndian = true;
  }

  private get getterName() {
    return 'get' + this.typeByte.name;
  }

  private get setterName() {
    return 'set' + this.typeByte.name;
  }

  get 0() {
    return this.view[this.getterName](this.offset, this.littleEndian);
  }

  set 0(v: number) {
    if (this.typeByte.clamp) v = clampInt(v, this.typeByte.min, this.typeByte.max);
    this.view[this.setterName](this.offset, v, this.littleEndian);
  }

  get 1() {
    return this.view[this.getterName](this.offset + this.typeByte.byte, this.littleEndian);
  }

  set 1(v: number) {
    if (this.typeByte.clamp) v = clampInt(v, this.typeByte.min, this.typeByte.max);
    this.view[this.setterName](this.offset + this.typeByte.byte, v, this.littleEndian);
  }

  get 2() {
    if (this.size <= 2) return;
    return this.view[this.getterName](this.offset + this.typeByte.byte * 2, this.littleEndian);
  }

  set 2(v: number) {
    if (this.size <= 2) return;
    if (this.typeByte.clamp) v = clampInt(v, this.typeByte.min, this.typeByte.max);
    this.view[this.setterName](this.offset + this.typeByte.byte * 2, v, this.littleEndian);
  }

  get 3() {
    if (this.size <= 3) return;
    return this.view[this.getterName](this.offset + this.typeByte.byte * 3, this.littleEndian);
  }

  set 3(v: number) {
    if (this.size <= 3) return;
    if (this.typeByte.clamp) v = clampInt(v, this.typeByte.min, this.typeByte.max);
    this.view[this.setterName](this.offset + this.typeByte.byte * 3, v, this.littleEndian);
  }

  get x() {
    return this[0];
  }

  set x(v: number) {
    this[0] = v;
  }

  get y() {
    return this[1];
  }

  set y(v: number) {
    this[1] = v;
  }

  get z() {
    return this[2];
  }

  set z(v: number) {
    this[2] = v;
  }

  get w() {
    return this[3];
  }

  set w(v: number) {
    this[3] = v;
  }

  get r() {
    return this[0];
  }

  set r(v: number) {
    this[0] = v;
  }

  get g() {
    return this[1];
  }

  set g(v: number) {
    this[1] = v;
  }

  get b() {
    return this[2];
  }

  set b(v: number) {
    this[2] = v;
  }

  get a() {
    return this[3];
  }

  set a(v: number) {
    this[3] = v;
  }
}

// ---------------------------------------------------------
// Buffer
// ---------------------------------------------------------

function getBufferAttribute(buffer: GlsBuffer, name: string, offset: number) {
  const info = buffer.infos[name];
  const typeByte = TYPE_BYTE[info.type];
  return new GlsAttribute(buffer.vertexes, typeByte, buffer.stride * offset + info.offset, info.size);
}

interface GlsVertex {
  [key: string]: GlsAttribute;
}

function getBufferVertex(buffer: GlsBuffer, offset: number) {
  const vertex: GlsVertex = Object.create(null);
  for (const [name, info] of Object.entries(buffer.infos)) {
    const attribute = getBufferAttribute(buffer, name, offset);
    if (info.size === 1) {
      Object.defineProperty(vertex, name, {
        get () {
          return attribute[0];
        },
        set (v) {
          attribute[0] = v;
        }
      })
    } else {
      vertex[name] = attribute;
    }
  }
  return vertex;
}

interface GlsBufferInfo {
  type: number;
  size: number;
  offset: number;
}

interface GlsBufferInfos {
  [key: string]: GlsBufferInfo;
}

function createBufferInfos(programs: GlsProgram[]) {
  const infos: GlsBufferInfos = Object.create(null);
  let offset = 0;
  for (const program of programs) {
    for (const [, info] of program.attributeInfos.entries()) {
      const { name } = info;
      let { type, size } = ATTRIBUTE_TYPE[info.type];
      let bytes = size * 4;
      const attr = program.exAttributes.find(attr => attr.name === name);
      if (attr) {
        type = EX_ATTRIBUTE_TYPE[attr.type].type;
        bytes = 4;
      }
      if (infos[name]) {
        if (infos[name].type !== type || infos[name].size !== size) {
          throw new Error('Same attribute name but different type: ' + name);
        }
        continue;
      }
      infos[name] = { type, size, offset };
      offset += bytes;
    }
  }
  return [infos, offset] as [GlsBufferInfos, number];
}

export class GlsBuffer {
  programs: GlsProgram[];
  infos: GlsBufferInfos;
  stride: number;
  mode: number;
  usage: number;
  vertexSize: number;
  vertexes: DataView;
  indices: Int8Array | Int16Array;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
  vao: Map<WebGLActiveInfo[], WebGLVertexArrayObject>;

  constructor(programs: GlsProgram[], vertexSize: number, indexSize: number, mode: number, usage: number) {
    this.programs = programs;
    [this.infos, this.stride] = createBufferInfos(programs);
    this.mode = mode;
    this.usage = usage;
    this.vertexSize = vertexSize;
    this.vertexes = new DataView(new ArrayBuffer(this.stride * vertexSize));
    this.indices = indexSize != null ? new (vertexSize <= 256 ? Int8Array : Int16Array)(indexSize) : null;
    this.vao = new Map();
  }

  getVertex(offset: number) {
    return getBufferVertex(this, offset);
  }

  drawBy(program: GlsProgram) {
    if (!this.programs.includes(program)) {
      throw new Error('Using a program with a different buffer');
    }
    drawProgramBuffer(program, this);
  }
}

// ---------------------------------------------------------
// Bind program and buffer
// ---------------------------------------------------------

function createArrayBuffer(gl: WebGL2RenderingContext, dataSrc: ArrayBuffer, usage: number) {
  const curr = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, dataSrc, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, curr);
  return buffer;
}

function createElementArrayBuffer(gl: WebGL2RenderingContext, dataSrc: ArrayBuffer, usage: number) {
  if (!dataSrc) return null;
  const curr = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, dataSrc, usage);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, curr);
  return buffer;
}

function bindProgramBuffer(gl: WebGL2RenderingContext, attributeInfos: WebGLActiveInfo[], buffer: GlsBuffer) {
  let vao = buffer.vao.get(attributeInfos);
  if (vao) {
    gl.bindVertexArray(vao);
    return;
  }
  vao = gl.createVertexArray();
  buffer.vao.set(attributeInfos, vao);
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vbo);
  for (const [index, attributeInfo] of attributeInfos.entries()) {
    const info = buffer.infos[attributeInfo.name];
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index, info.size, info.type, false, buffer.stride, info.offset);
  }
  if (buffer.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.ibo);
}

function bindProgramUniform(gls: Gls, program: GlsProgram) {
  const gl = gls.gl;
  for (const [info, location] of program.uniformInfos) {
    const name = info.name;
    const { fn, ftype } = ATTRIBUTE_TYPE[info.type];
    const value = program.uniform[name];
    if (ftype === 'matrix') {
      gl['uniformMatrix' + fn](location, false, value);
    } else if (ftype === 'texture') {
      if (!gls._textureBinder) gls._textureBinder = new TextureBinder(gl);
      gls._textureBinder.bind(location, (value as GlsFramebuffer).texture || value || null);
    } else {
      gl['uniform' + fn](location, value);
    }
  }
}

function drawProgramBuffer(program: GlsProgram, buffer: GlsBuffer) {
  const gls = program.gls;
  const gl = gls.gl;
  if (!buffer.vbo) {
    buffer.vbo = createArrayBuffer(gl, buffer.vertexes.buffer, buffer.usage);
    buffer.ibo = createElementArrayBuffer(gl, buffer.indices.buffer, buffer.usage);
  }
  bindProgramBuffer(gl, program.attributeInfos, buffer);
  gl.useProgram(program.program);
  bindProgramUniform(gls, program);
  if (buffer.ibo) {
    gl.drawElements(buffer.mode, buffer.indices.length, buffer.vertexSize <= 256 ? gl.UNSIGNED_BYTE : gl.UNSIGNED_SHORT, 0);
  } else {
    gl.drawArrays(buffer.mode, 0, buffer.vertexSize);
  }
}

// ---------------------------------------------------------
// BufferController
// ---------------------------------------------------------

type glsCreateMeshCallback = (vtx: GlsVertex, i: number) => void;

const MAX_BUFFER_SIZE = 65536;
function createMesh(buffer: GlsBuffer, vertexOffset: number, indexOffset: number, ucount: number, vcount: number, callback: glsCreateMeshCallback, i: number, attrName = 'position') {
  const umax = ucount + 1;
  for (let v = 0, n = vertexOffset; v <= vcount; v++) {
    for (let u = 0; u < umax; u++) {
      const vtx = buffer.getVertex(n++);
      vtx[attrName][0] = u / ucount * 2 - 1;
      vtx[attrName][1] = v / vcount * 2 - 1;
      if (callback) callback(vtx, i);
    }
  }
  const idx = buffer.indices;
  for (let v = 0, n = indexOffset; v < vcount; v++) {
    idx[n++] = vertexOffset + v * umax;
    for (let u = 0; u < umax; u++) {
      idx[n++] = vertexOffset + u + v * umax;
      idx[n++] = vertexOffset + u + (v + 1) * umax;
    }
    idx[n++] = vertexOffset + (umax - 1) + (v + 1) * umax;
  }
}
function buildGlsBufferController(geom: GlsBufferController) {
  if (geom.currentVertexOffset > 0) {
    const buffer = new GlsBuffer(geom.programs, geom.currentVertexOffset, geom.currentIndexOffset, geom.mode, geom.usage);
    for (const [callback, vertexOffset, indexOffset] of geom.callbacks) {
      callback(buffer, vertexOffset, indexOffset);
    }
    geom.buffers.push(buffer);
  }
  geom.currentVertexOffset = 0;
  geom.currentIndexOffset = 0;
  geom.callbacks.length = 0;
}

type glsBufferAllocateCallback = (bufer: GlsBuffer, vertexOffset: number, indexOffset: number) => void;
type glsBufferAllocateControllerCallback = [glsBufferAllocateCallback, number, number];

export class GlsBufferController {
  programs: GlsProgram[];
  mode: number;
  usage: number;
  buffers: GlsBuffer[];
  currentVertexOffset: number;
  currentIndexOffset: number;
  callbacks: glsBufferAllocateControllerCallback[];

  constructor(programs: GlsProgram[], mode: number, usage: number) {
    this.programs = programs;
    this.mode = mode;
    this.usage = usage;
    this.buffers = [];
    this.currentVertexOffset = 0;
    this.currentIndexOffset = 0;
    this.callbacks = [];
  }

  allocate(vertexSize: number, indexSize: number, callback: glsBufferAllocateCallback) {
    if (vertexSize > MAX_BUFFER_SIZE) {
      throw new RangeError('The size you tried to allocate exceeds the maximum value.');
    }
    if (this.currentVertexOffset + vertexSize > MAX_BUFFER_SIZE) {
      buildGlsBufferController(this);
    }
    this.callbacks.push([callback, this.currentVertexOffset, this.currentIndexOffset]);
    this.currentVertexOffset += vertexSize;
    this.currentIndexOffset += indexSize;
  }

  addMesh(ucount = 1, vcount = 1, callback: glsCreateMeshCallback = null, attrName = 'position') {
    this.addMeshes(ucount, vcount, 1, callback, attrName);
  }

  addMeshes(ucount = 1, vcount = 1, count = 1, callback: glsCreateMeshCallback = null, attrName = 'position') {
    const vertexSize = (ucount + 1) * (vcount + 1);
    const indexSize = (ucount * 2 + 4) * vcount;
    const maxBufferCount = Math.floor(MAX_BUFFER_SIZE / vertexSize);
    for (let offset = 0; offset < count; offset += maxBufferCount) {
      const subCount = Math.min(count - offset, maxBufferCount);
      this.allocate(vertexSize * subCount, indexSize * subCount, (buffer, vertexOffset, indexOffset) => {
        for (let i = 0; i < subCount; i++) {
          createMesh(buffer, vertexOffset, indexOffset, ucount, vcount, callback, offset + i, attrName);
          vertexOffset += vertexSize;
          indexOffset += indexSize;
        }
      })
    }
  }
}

function drawBuffer(program: GlsProgram, buffer: GlsBufferController) {
  if (!buffer.programs.includes(program)) {
    throw new Error('Using a program with a different buffer');
  }
  buildGlsBufferController(buffer);
  for (const b of buffer.buffers) {
    drawProgramBuffer(program, b);
  }
}

// ---------------------------------------------------------
// TextureBinder
// ---------------------------------------------------------

interface TextureBinderUnit {
  number: number;
  locations: WebGLUniformLocation[];
  texture: WebGLTexture;
}

export class TextureBinder {
  gl: WebGL2RenderingContext;
  max: number;
  units: TextureBinderUnit[];

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.max = Math.max(2, gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
    this.units = [];
  }

  bind(location: WebGLUniformLocation, texture: WebGLTexture) {
    let unit = this.fetchByLocation(location);
    if (unit) {
      if (unit.texture === texture) {
        return this.moveToLast(unit);
      }
      this.unbind(unit, location);
    }
    if (!texture) return;
    unit = this.fetchByTexture(texture) || this.bindTexture(texture);
    this.bindLocation(unit, location);
    this.moveToLast(unit);
  }

  private fetchByLocation(location: WebGLUniformLocation) {
    return this.units.find(unit => unit.locations.includes(location));
  }

  private fetchByTexture(texture: WebGLTexture) {
    return this.units.find(unit => unit.texture === texture);
  }

  private bindTexture(texture: WebGLTexture) {
    const number = this.newNumber();
    this.gl.activeTexture(this.gl['TEXTURE' + number]);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    const unit: TextureBinderUnit = { number, locations: [], texture };
    return unit;
  }

  private newNumber() {
    const fs = new Array(this.max).fill(false);
    this.units = this.units.slice(1 - this.max);
    for (const unit of this.units) fs[unit.number] = true;
    return fs.indexOf(false);
  }

  private bindLocation(unit: TextureBinderUnit, location: WebGLUniformLocation) {
    this.gl.uniform1i(location, unit.number);
    unit.locations.push(location);
  }

  private unbind(unit: TextureBinderUnit, location: WebGLUniformLocation) {
    if (unit.locations.length === 1) {
      this.units.splice(this.units.indexOf(unit), 1);
    } else {
      unit.locations.splice(unit.locations.indexOf(location), 1);
    }
  }

  private moveToLast(unit: TextureBinderUnit) {
    const n = this.units.indexOf(unit);
    if (n >= 0) this.units.splice(n, 1);
    this.units.push(unit);
  }
}

// ---------------------------------------------------------
// Texture
// ---------------------------------------------------------

type glsTextureParameter = { [key: string]: string };

function setTextureParameters(gl: WebGL2RenderingContext, parameter: glsTextureParameter) {
  let mipmap = !parameter.MIN_FILTER;
  for (const [key, value] of Object.entries(parameter)) {
    if (key === 'MIN_FILTER' && !(value === 'NEAREST' || value === 'LINEAR')) {
      mipmap = true;
    }
    gl.texParameteri(gl.TEXTURE_2D, gl['TEXTURE_' + key], gl[value]);
  }
  if (mipmap) gl.generateMipmap(gl.TEXTURE_2D);
}

function createImageTexture(gl: WebGL2RenderingContext, img: TexImageSource, parameter?: glsTextureParameter) {
  parameter = parameter ?? {};
  const currentTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  setTextureParameters(gl, parameter);
  gl.bindTexture(gl.TEXTURE_2D, currentTexture);
  return texture;
}

// ---------------------------------------------------------
// Framebuffer
// ---------------------------------------------------------

interface glsFramebufferParams {
  width: number;
  height: number;
  depth?: boolean;
  texture?: glsTextureParameter;
}

export class GlsFramebuffer {
  gls: Gls;
  framebuffer: WebGLFramebuffer;
  depthRenderbuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
  
  constructor(gls: Gls, param: glsFramebufferParams = null) {
    this.gls = gls;
    param = Object.assign({
      width: gls.canvas.width,
      height: gls.canvas.height,
      texture: gls.NEAREST_CLAMP,
      depth: true
    }, param);
    [this.framebuffer, this.depthRenderbuffer, this.texture] = this.createFramebuffer(gls.gl, param);
    this.width = param.width;
    this.height = param.height;
  }

  clear(mask = this.gls._clearMask) {
    bindFramebuffer(this.gls, this);
    this.gls.gl.clear(mask);
  }

  draw(program: GlsProgram, buffer: GlsBufferController) {
    drawFrame(this.gls, this, program, buffer);
  }

  private createFramebuffer(gl: WebGL2RenderingContext, param: glsFramebufferParams) {
    const currentFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    let depthRenderbuffer = null;
    if (param.depth !== false) {
      const currentRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);
      depthRenderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, param.width, param.height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer);
      gl.bindRenderbuffer(gl.RENDERBUFFER, currentRenderbuffer);
    }
    const currentTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, param.width, param.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    setTextureParameters(gl, param.texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindTexture(gl.TEXTURE_2D, currentTexture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
    return [framebuffer, depthRenderbuffer, texture] as [WebGLFramebuffer, WebGLRenderbuffer, WebGLTexture];
  }
}

// ---------------------------------------------------------
// Gls
// ---------------------------------------------------------

function bindFramebuffer(gls: Gls, framebuffer: GlsFramebuffer = null) {
  if (gls._currentFrameBuffer == framebuffer) return;
  gls._currentFrameBuffer = framebuffer;

  if (framebuffer) {
    gls.gl.bindFramebuffer(gls.gl.FRAMEBUFFER, framebuffer.framebuffer);
    gls.gl.viewport(0, 0, framebuffer.width, framebuffer.height);
  } else {
    gls.gl.bindFramebuffer(gls.gl.FRAMEBUFFER, null);
    gls.gl.viewport(0, 0, gls.canvas.width, gls.canvas.height);
  }
}

function drawFrame(gls: Gls, framebuffer: GlsFramebuffer, program: GlsProgram, buffer: GlsBufferController) {
  bindFramebuffer(gls, framebuffer);
  drawBuffer(program, buffer);
}

export default class Gls {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  _textureBinder: TextureBinder;
  _clearMask: number;
  _currentFrameBuffer: GlsFramebuffer = null;

  NEAREST_CLAMP = {
    MIN_FILTER: 'NEAREST',
    MAG_FILTER: 'NEAREST',
    WRAP_S: 'CLAMP_TO_EDGE',
    WRAP_T: 'CLAMP_TO_EDGE'
  };

  LINEAR_CLAMP = {
    MIN_FILTER: 'LINEAR',
    MAG_FILTER: 'LINEAR',
    WRAP_S: 'CLAMP_TO_EDGE',
    WRAP_T: 'CLAMP_TO_EDGE'
  };

  NEAREST_REPEAT = {
    MIN_FILTER: 'NEAREST',
    MAG_FILTER: 'NEAREST',
    WRAP_S: 'REPEAT',
    WRAP_T: 'REPEAT'
  };

  LINEAR_REPEAT = {
    MIN_FILTER: 'LINEAR',
    MAG_FILTER: 'LINEAR',
    WRAP_S: 'REPEAT',
    WRAP_T: 'REPEAT'
  };

  constructor(canvas: HTMLCanvasElement | string, contextAttributes?: any) {
    this.canvas = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
    contextAttributes = Object.assign({ preserveDrawingBuffer: true }, contextAttributes);
    this.gl = this.canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext;
    this._clearMask = this.gl.COLOR_BUFFER_BIT |
      (contextAttributes.depth !== false ? this.gl.DEPTH_BUFFER_BIT : 0) |
      (contextAttributes.stencil ? this.gl.STENCIL_BUFFER_BIT : 0);
    if (contextAttributes.depth !== false) {
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.clearDepth(1);
    }
  }

  createVertexShader(source: string, prefix?: string) {
    return new GlsVertexShader(this, source, prefix);
  }

  createFragmentShader(source: string, prefix?: string) {
    return new GlsFragmentShader(this, source, prefix);
  }

  createProgram(vertexShader: string | GlsVertexShader, fragmentShader: string | GlsFragmentShader) {
    return new GlsProgram(this, vertexShader, fragmentShader);
  }

  createBuffer(program: GlsProgram | GlsProgram[], mode:number = this.gl.TRIANGLE_STRIP, usage:number = this.gl.DYNAMIC_DRAW) {
    return new GlsBufferController(Array.isArray(program) ? program : [program], mode, usage);
  }

  createTexture(img: TexImageSource, parameter?: glsTextureParameter) {
    return createImageTexture(this.gl, img, parameter);
  }

  createFramebuffer(param?: glsFramebufferParams) {
    return new GlsFramebuffer(this, param);
  }

  clearColor(red: number, green: number, blue: number, alpha: number) {
    return this.gl.clearColor(red, green, blue, alpha);
  }

  clear(mask = this._clearMask) {
    bindFramebuffer(this, null);
    this.gl.clear(mask);
  }

  draw(program: GlsProgram, buffer: GlsBufferController) {
    drawFrame(this, null, program, buffer);
  }
}

// ---------------------------------------------------------
// WebGL methods and properties
// ---------------------------------------------------------

{
  const methodNames = ['enable', 'disable', 'blendFunc', 'blendFuncSeparate', 'viewport'];
  for (const name of methodNames) {
    Gls.prototype[name] = function (...args: any[]) { return this.gl[name](...args) };
  }
  const propertyNames = [
    'POINTS', 'LINES', 'LINE_STRIP', 'TRIANGLES', 'TRIANGLE_STRIP',
    'CULL_FACE',
    'BLEND', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ZERO'
  ];
  for (const name of propertyNames) {
    Gls[name] = Gls.prototype[name] = GL[name];
  }
}
