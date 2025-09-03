export const VERSION = '0.4.5';

// ---------------------------------------------------------
// Constants and Definitions
// ---------------------------------------------------------

const GL = window.WebGL2RenderingContext;

const ATTRIBUTE_TYPE_MAP = {
  [GL.FLOAT]: { type: GL.FLOAT, size: 1, fn: '1f', ftype: 'primitive' },
  [GL.FLOAT_VEC2]: { type: GL.FLOAT, size: 2, fn: '2fv', ftype: 'primitive' },
  [GL.FLOAT_VEC3]: { type: GL.FLOAT, size: 3, fn: '3fv', ftype: 'primitive' },
  [GL.FLOAT_VEC4]: { type: GL.FLOAT, size: 4, fn: '4fv', ftype: 'primitive' },
  [GL.FLOAT_MAT2]: { type: GL.FLOAT, size: 4, fn: '2fv', ftype: 'matrix' },
  [GL.FLOAT_MAT3]: { type: GL.FLOAT, size: 9, fn: '3fv', ftype: 'matrix' },
  [GL.FLOAT_MAT4]: { type: GL.FLOAT, size: 16, fn: '4fv', ftype: 'matrix' },
  [GL.SAMPLER_2D]: { type: GL.SAMPLER_2D, size: 1, fn: '1i', ftype: 'texture' },
} as const;

type AttributeType = keyof typeof ATTRIBUTE_TYPE_MAP;

const EX_ATTRIBUTE_TYPE_MAP = {
  byte4: { glslType: 'vec4', type: GL.BYTE },
  ubyte4: { glslType: 'vec4', type: GL.UNSIGNED_BYTE },
  short2: { glslType: 'vec2', type: GL.SHORT },
  ushort2: { glslType: 'vec2', type: GL.UNSIGNED_SHORT },
} as const;

type ExAttributeType = keyof typeof EX_ATTRIBUTE_TYPE_MAP;

const TYPE_BYTE_MAP = {
  [GL.BYTE]: { byte: 1, name: 'Int8', clamp: true, min: -128, max: 127 },
  [GL.UNSIGNED_BYTE]: { byte: 1, name: 'Uint8', clamp: true, min: 0, max: 255 },
  [GL.SHORT]: { byte: 2, name: 'Int16', clamp: true, min: -32768, max: 32767 },
  [GL.UNSIGNED_SHORT]: {
    byte: 2,
    name: 'Uint16',
    clamp: true,
    min: 0,
    max: 65535,
  },
  [GL.INT]: {
    byte: 4,
    name: 'Int32',
    clamp: true,
    min: -2147483648,
    max: 2147483647,
  },
  [GL.UNSIGNED_INT]: {
    byte: 4,
    name: 'Uint32',
    clamp: true,
    min: 0,
    max: 4294967295,
  },
  [GL.FLOAT]: { byte: 4, name: 'Float32', clamp: false },
} as const;

type TypeByteKey = keyof typeof TYPE_BYTE_MAP;
type TypeByte = (typeof TYPE_BYTE_MAP)[TypeByteKey];

// ---------------------------------------------------------
// Utils
// ---------------------------------------------------------

export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${JSON.stringify(x)}`);
}

export function hasKey<O extends object, K extends PropertyKey>(
  obj: O,
  key: K,
): obj is O & Record<K, unknown> {
  return key in obj;
}

export function clampInt(val: number, min: number, max: number) {
  return Math.floor(Math.min(Math.max(min, val), max));
}

// ---------------------------------------------------------
// Shader
// ---------------------------------------------------------

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  name: string,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error(`Failed to create ${name} shader object.`);
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(
      `${name} shader compile error: ${gl.getShaderInfoLog(shader) ?? ''}`,
    );
  }
  return shader;
}

function removeSourceComments(source: string) {
  return source.replace(
    /(\/\/.*\n)|(\/\**?\*\/)/gu,
    (v) => `${'\n'.repeat(v.split('\n').length)} `,
  );
}

interface GlsShaderSourceExAttributeType {
  name: string;
  type: ExAttributeType;
}

function getShaderSourceExAttributeTypes(source: string) {
  source = `;${source.replaceAll(';', ';;')};`;
  const re = /;\s*(attribute|in)\s+\[\[(\w+)\]\]\s+(\w+)\s*;/gu;
  const types: GlsShaderSourceExAttributeType[] = [];
  for (let result: RegExpExecArray | null; (result = re.exec(source)); ) {
    const [, , type, name] = result;
    if (name && type && type in EX_ATTRIBUTE_TYPE_MAP) {
      types.push({ name, type: type as ExAttributeType });
    }
  }
  return types;
}

function replaceShaderSourcesParams(source: string) {
  for (const [k, v] of Object.entries(EX_ATTRIBUTE_TYPE_MAP)) {
    source = source.replaceAll(`[[${k}]]`, v.glslType);
  }
  return source;
}

export class GlsVertexShader {
  exAttribute: GlsShaderSourceExAttributeType[];
  shader: WebGLShader;

  constructor(gls: Gls, source: string, prefix = '#version 300 es\n') {
    source = removeSourceComments(source);
    this.exAttribute = getShaderSourceExAttributeTypes(source);
    source = replaceShaderSourcesParams(source);
    this.shader = createShader(
      gls.gl,
      GL.VERTEX_SHADER,
      'Vertex',
      prefix + source,
    );
  }
}

export class GlsFragmentShader {
  shader: WebGLShader;

  constructor(
    gls: Gls,
    source: string,
    prefix = '#version 300 es\nprecision highp float;\n',
  ) {
    source = removeSourceComments(source);
    source = replaceShaderSourcesParams(source);
    this.shader = createShader(
      gls.gl,
      GL.FRAGMENT_SHADER,
      'Fragment',
      prefix + source,
    );
  }
}

// ---------------------------------------------------------
// Program
// ---------------------------------------------------------

function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Link error: ${gl.getProgramInfoLog(program) ?? ''}`);
  }
  return program;
}

function getAttributeInfos(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const infos: WebGLActiveInfo[] = [];
  const count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveAttrib(program, i)!;
    infos.push(info);
  }
  return infos;
}

type GlsUniformInfo = [
  WebGLActiveInfo & { type: AttributeType },
  WebGLUniformLocation,
];

function validateUniformInfo(
  info: WebGLActiveInfo,
): info is WebGLActiveInfo & { type: AttributeType } {
  return info.type in ATTRIBUTE_TYPE_MAP;
}

function getUniformInfos(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const infos: GlsUniformInfo[] = [];
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    if (!validateUniformInfo(info)) {
      throw new Error(`Undefined attribute type: ${String(info.type)}`);
    }
    const location = gl.getUniformLocation(program, info.name);
    if (!location) {
      throw new Error(`Failed to get uniform location: ${info.name}`);
    }
    infos.push([info, location]);
  }
  return infos;
}

type GlsUniform = Record<
  string,
  number | Float32Array | WebGLTexture | GlsFramebuffer
>;

function createUniform(uniformInfos: GlsUniformInfo[]) {
  const uniform: GlsUniform = Object.create(null) as GlsUniform;
  for (const [info] of uniformInfos) {
    const size = ATTRIBUTE_TYPE_MAP[info.type].size;
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

  constructor(
    gls: Gls,
    vertexShader: string | GlsVertexShader,
    fragmentShader: string | GlsFragmentShader,
  ) {
    this.gls = gls;
    this.vertexShader =
      typeof vertexShader === 'string' ?
        new GlsVertexShader(gls, vertexShader)
      : vertexShader;
    this.fragmentShader =
      typeof fragmentShader === 'string' ?
        new GlsFragmentShader(gls, fragmentShader)
      : fragmentShader;
    this.program = createProgram(
      gls.gl,
      this.vertexShader.shader,
      this.fragmentShader.shader,
    );
    this.attributeInfos = getAttributeInfos(gls.gl, this.program);
    this.exAttributes = this.vertexShader.exAttribute;
    this.uniformInfos = getUniformInfos(gls.gl, this.program);
    this.uniform = createUniform(this.uniformInfos);
  }
}

// ---------------------------------------------------------
// Attribute
// ---------------------------------------------------------

export class GlsAttribute {
  view: DataView;
  typeByte: TypeByte;
  offset: number;
  size: number;
  littleEndian: boolean;

  constructor(
    view: DataView,
    typeByte: TypeByte,
    offset: number,
    size: number,
  ) {
    this.view = view;
    this.typeByte = typeByte;
    this.offset = offset;
    this.size = size;
    this.littleEndian = true;
  }

  private getter(byteOffset: number) {
    const view = this.view;
    const le = this.littleEndian;
    switch (this.typeByte.name) {
      case 'Int8':
        return view.getInt8(byteOffset);
      case 'Uint8':
        return view.getUint8(byteOffset);
      case 'Int16':
        return view.getInt16(byteOffset, le);
      case 'Uint16':
        return view.getUint16(byteOffset, le);
      case 'Int32':
        return view.getInt32(byteOffset, le);
      case 'Uint32':
        return view.getUint32(byteOffset, le);
      case 'Float32':
        return view.getFloat32(byteOffset, le);
      default:
        return assertNever(this.typeByte);
    }
  }

  private setter(byteOffset: number, value: number) {
    const view = this.view;
    const le = this.littleEndian;
    switch (this.typeByte.name) {
      case 'Int8':
        view.setInt8(byteOffset, value);
        return;
      case 'Uint8':
        view.setUint8(byteOffset, value);
        return;
      case 'Int16':
        view.setInt16(byteOffset, value, le);
        return;
      case 'Uint16':
        view.setUint16(byteOffset, value, le);
        return;
      case 'Int32':
        view.setInt32(byteOffset, value, le);
        return;
      case 'Uint32':
        view.setUint32(byteOffset, value, le);
        return;
      case 'Float32':
        view.setFloat32(byteOffset, value, le);
        return;
      default:
        assertNever(this.typeByte);
    }
  }

  get 0() {
    return this.getter(this.offset);
  }

  set 0(v: number) {
    if (this.typeByte.clamp) {
      v = clampInt(v, this.typeByte.min, this.typeByte.max);
    }
    this.setter(this.offset, v);
  }

  get 1() {
    return this.getter(this.offset + this.typeByte.byte);
  }

  set 1(v: number) {
    if (this.typeByte.clamp) {
      v = clampInt(v, this.typeByte.min, this.typeByte.max);
    }
    this.setter(this.offset + this.typeByte.byte, v);
  }

  get 2() {
    if (this.size <= 2) return 0;
    return this.getter(this.offset + this.typeByte.byte * 2);
  }

  set 2(v: number) {
    if (this.size <= 2) return;
    if (this.typeByte.clamp) {
      v = clampInt(v, this.typeByte.min, this.typeByte.max);
    }
    this.setter(this.offset + this.typeByte.byte * 2, v);
  }

  get 3() {
    if (this.size <= 3) return 0;
    return this.getter(this.offset + this.typeByte.byte * 3);
  }

  set 3(v: number) {
    if (this.size <= 3) return;
    if (this.typeByte.clamp) {
      v = clampInt(v, this.typeByte.min, this.typeByte.max);
    }
    this.setter(this.offset + this.typeByte.byte * 3, v);
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
  if (!info) {
    throw new Error(`Undefined buffer name: ${name}`);
  }
  const typeByte = TYPE_BYTE_MAP[info.type];
  return new GlsAttribute(
    buffer.vertexes,
    typeByte,
    buffer.stride * offset + info.offset,
    info.size,
  );
}

type GlsVertex = Record<string, GlsAttribute>;

function getBufferVertex(buffer: GlsBuffer, offset: number) {
  const vertex = Object.create(null) as GlsVertex;
  for (const [name, info] of Object.entries(buffer.infos)) {
    const attribute = getBufferAttribute(buffer, name, offset);
    if (info.size === 1) {
      Object.defineProperty(vertex, name, {
        get() {
          return attribute[0];
        },
        set(v: number) {
          attribute[0] = v;
        },
      });
    } else {
      vertex[name] = attribute;
    }
  }
  return vertex;
}

interface GlsBufferInfo {
  type: TypeByteKey;
  size: number;
  offset: number;
}

type GlsBufferInfos = Record<string, GlsBufferInfo>;

function getAttributeSize(program: GlsProgram, info: WebGLActiveInfo) {
  const { type: attrType, size } =
    ATTRIBUTE_TYPE_MAP[info.type as AttributeType];
  let type: TypeByteKey;
  let bytes = size * 4;
  const attr = program.exAttributes.find((attr) => attr.name === info.name);
  if (attr) {
    type = EX_ATTRIBUTE_TYPE_MAP[attr.type].type;
    bytes = 4;
  } else {
    type = attrType as TypeByteKey;
  }
  return { type, size, bytes };
}

function createBufferInfos(programs: GlsProgram[]) {
  const infos = Object.create(null) as GlsBufferInfos;
  let offset = 0;
  for (const program of programs) {
    for (const info of program.attributeInfos) {
      const name = info.name;
      if (!(info.type in ATTRIBUTE_TYPE_MAP)) {
        throw new Error(`Unexpected attribute: ${name}`);
      }
      const { type, size, bytes } = getAttributeSize(program, info);
      if (infos[name]) {
        if (infos[name].type !== type || infos[name].size !== size) {
          throw new Error(`Same attribute name but different type: ${name}`);
        }
      } else {
        infos[name] = { type, size, offset };
        offset += bytes;
      }
    }
  }
  return [infos, offset] as const;
}

export class GlsBuffer {
  programs: GlsProgram[];
  infos: GlsBufferInfos;
  stride: number;
  mode: number;
  usage: number;
  vertexSize: number;
  vertexes: DataView;
  indices: Int8Array | Int16Array | null;
  vbo: WebGLBuffer | null = null;
  ibo: WebGLBuffer | null = null;
  vao: Map<WebGLActiveInfo[], WebGLVertexArrayObject>;

  constructor(
    programs: GlsProgram[],
    vertexSize: number,
    indexSize: number | null,
    mode: number,
    usage: number,
  ) {
    this.programs = programs;
    [this.infos, this.stride] = createBufferInfos(programs);
    this.mode = mode;
    this.usage = usage;
    this.vertexSize = vertexSize;
    this.vertexes = new DataView(new ArrayBuffer(this.stride * vertexSize));
    this.indices =
      indexSize == null ? null : (
        new (vertexSize <= 256 ? Int8Array : Int16Array)(indexSize)
      );
    this.vao = new Map();
  }

  getVertex(offset: number) {
    return getBufferVertex(this, offset);
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
    this.max = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) as number;
    this.units = [];
  }

  bind(location: WebGLUniformLocation, texture: WebGLTexture | null) {
    let unit = this.fetchByLocation(location);
    if (unit) {
      if (unit.texture === texture) {
        this.moveToLast(unit);
        return;
      }
      this.unbind(unit, location);
    }
    if (texture) {
      unit = this.fetchByTexture(texture) ?? this.bindTexture(texture);
      this.bindLocation(unit, location);
      this.moveToLast(unit);
    }
  }

  private fetchByLocation(location: WebGLUniformLocation) {
    return this.units.find((unit) => unit.locations.includes(location));
  }

  private fetchByTexture(texture: WebGLTexture) {
    return this.units.find((unit) => unit.texture === texture);
  }

  private bindTexture(texture: WebGLTexture) {
    const number = this.newNumber();
    this.gl.activeTexture(this.gl.TEXTURE0 + number);
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

  private bindLocation(
    unit: TextureBinderUnit,
    location: WebGLUniformLocation,
  ) {
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

type GlsTextureParameter = Record<string, string>;

function setTextureParameters(
  gl: WebGL2RenderingContext,
  parameter: GlsTextureParameter,
) {
  let mipmap = !parameter.MIN_FILTER;
  for (const [key, value] of Object.entries(parameter)) {
    if (key === 'MIN_FILTER' && value !== 'NEAREST' && value !== 'LINEAR') {
      mipmap = true;
    }
    const pname = `TEXTURE_${key}`;
    if (
      !(
        hasKey(gl, pname) &&
        typeof gl[pname] === 'number' &&
        hasKey(gl, value) &&
        typeof gl[value] === 'number'
      )
    ) {
      throw new Error(
        `Invalid texture parameters: { pname: ${pname}, param: ${value} }`,
      );
    }
    gl.texParameteri(gl.TEXTURE_2D, gl[pname], gl[value]);
  }
  if (mipmap) gl.generateMipmap(gl.TEXTURE_2D);
}

function createImageTexture(
  gl: WebGL2RenderingContext,
  img: TexImageSource,
  parameter: GlsTextureParameter = {},
): WebGLTexture {
  const currentTexture = gl.getParameter(
    gl.TEXTURE_BINDING_2D,
  ) as WebGLTexture | null;
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

interface GlsFramebufferParams {
  width: number;
  height: number;
  depth: boolean;
  texture: GlsTextureParameter;
}

function bindFramebuffer(gls: Gls, framebuffer: GlsFramebuffer | null = null) {
  if (framebuffer) {
    gls.gl.bindFramebuffer(gls.gl.FRAMEBUFFER, framebuffer.framebuffer);
    gls.gl.viewport(0, 0, framebuffer.width, framebuffer.height);
  } else {
    gls.gl.bindFramebuffer(gls.gl.FRAMEBUFFER, null);
    gls.gl.viewport(0, 0, gls.canvas.width, gls.canvas.height);
  }
}

function createFramebufferTerxture(
  gl: WebGL2RenderingContext,
  param: GlsFramebufferParams,
) {
  const currentTexture = gl.getParameter(
    gl.TEXTURE_BINDING_2D,
  ) as WebGLTexture | null;
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    param.width,
    param.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  setTextureParameters(gl, param.texture);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  gl.bindTexture(gl.TEXTURE_2D, currentTexture);
  return texture;
}

function createFramebuffer(
  gl: WebGL2RenderingContext,
  param: GlsFramebufferParams,
) {
  const currentFramebuffer = gl.getParameter(
    gl.FRAMEBUFFER_BINDING,
  ) as WebGLFramebuffer | null;
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  let depthRenderbuffer = null;
  if (!param.depth) {
    const currentRenderbuffer = gl.getParameter(
      gl.RENDERBUFFER_BINDING,
    ) as WebGLRenderbuffer | null;
    depthRenderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16,
      param.width,
      param.height,
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      depthRenderbuffer,
    );
    gl.bindRenderbuffer(gl.RENDERBUFFER, currentRenderbuffer);
  }

  const texture = createFramebufferTerxture(gl, param);

  gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
  return [framebuffer, depthRenderbuffer, texture] as const;
}

export class GlsFramebuffer {
  gls: Gls;
  framebuffer: WebGLFramebuffer;
  depthRenderbuffer: WebGLFramebuffer | null;
  texture: WebGLTexture;
  width: number;
  height: number;

  constructor(gls: Gls, params: Partial<GlsFramebufferParams> = {}) {
    this.gls = gls;
    const fParams = {
      width: gls.canvas.width,
      height: gls.canvas.height,
      texture: gls.NEAREST_CLAMP,
      depth: true,
      ...params,
    };
    [this.framebuffer, this.depthRenderbuffer, this.texture] =
      createFramebuffer(gls.gl, fParams);
    this.width = fParams.width;
    this.height = fParams.height;
  }

  clear(mask = this.gls.clearMask) {
    bindFramebuffer(this.gls, this);
    this.gls.gl.clear(mask);
  }

  draw(program: GlsProgram, buffer: GlsBufferController) {
    bindFramebuffer(this.gls, this);
    /* eslint-disable @typescript-eslint/no-use-before-define */
    drawBuffer(program, buffer);
    /* eslint-enable @typescript-eslint/no-use-before-define */
  }
}

// ---------------------------------------------------------
// Bind program and buffer
// ---------------------------------------------------------

function createArrayBuffer(
  gl: WebGL2RenderingContext,
  dataSrc: ArrayBufferLike,
  usage: number,
) {
  const curr = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, dataSrc, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, curr);
  return buffer;
}

function createElementArrayBuffer(
  gl: WebGL2RenderingContext,
  srcData: ArrayBufferLike,
  usage: number,
) {
  const curr = gl.getParameter(
    gl.ELEMENT_ARRAY_BUFFER_BINDING,
  ) as WebGLBuffer | null;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, srcData, usage);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, curr);
  return buffer;
}

function bindProgramBuffer(
  gl: WebGL2RenderingContext,
  attributeInfos: WebGLActiveInfo[],
  buffer: GlsBuffer,
) {
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
    const info = buffer.infos[attributeInfo.name]!;
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(
      index,
      info.size,
      info.type,
      true,
      buffer.stride,
      info.offset,
    );
  }
  if (buffer.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.ibo);
}

function bindProgramUniform(gls: Gls, program: GlsProgram) {
  const gl = gls.gl;
  for (const [info, location] of program.uniformInfos) {
    const name = info.name;
    const { fn, ftype } = ATTRIBUTE_TYPE_MAP[info.type];
    const value = program.uniform[name];
    if (ftype === 'matrix') {
      if (!(Array.isArray(value) || value instanceof Float32Array)) {
        throw new Error(
          `Invalid uniform type: ${name} must be of type Float32Array`,
        );
      }
      gl[`uniformMatrix${fn}`](location, false, value);
    } else if (ftype === 'texture') {
      if (
        !(
          value instanceof WebGLTexture ||
          value instanceof GlsFramebuffer ||
          value == null
        )
      ) {
        throw new Error(
          `Invalid uniform type: ${name} must be of type WebGLTexture, GlsFramebuffer or null`,
        );
      }
      gls.textureBinder ??= new TextureBinder(gl);
      gls.textureBinder.bind(
        location,
        value instanceof GlsFramebuffer ? value.texture : (value ?? null),
      );
    } else if (fn === '1f') {
      if (typeof value !== 'number') {
        throw new Error(`Invalid uniform type: ${name} must be of type number`);
      }
      gl.uniform1f(location, value);
    } else {
      if (!(Array.isArray(value) || value instanceof Float32Array)) {
        throw new Error(
          `Invalid uniform type: ${name} must be of type Float32Array`,
        );
      }
      gl[`uniform${fn}`](location, value);
    }
  }
}

function drawProgramBuffer(program: GlsProgram, buffer: GlsBuffer) {
  const gls = program.gls;
  const gl = gls.gl;
  if (!buffer.vbo) {
    buffer.vbo = createArrayBuffer(gl, buffer.vertexes.buffer, buffer.usage);
    buffer.ibo =
      buffer.indices ?
        createElementArrayBuffer(gl, buffer.indices.buffer, buffer.usage)
      : null;
  }
  bindProgramBuffer(gl, program.attributeInfos, buffer);
  gl.useProgram(program.program);
  bindProgramUniform(gls, program);
  if (buffer.indices) {
    gl.drawElements(
      buffer.mode,
      buffer.indices.length,
      buffer.vertexSize <= 256 ? gl.UNSIGNED_BYTE : gl.UNSIGNED_SHORT,
      0,
    );
  } else {
    gl.drawArrays(buffer.mode, 0, buffer.vertexSize);
  }
}

// ---------------------------------------------------------
// BufferController
// ---------------------------------------------------------

type GlsCreateMeshCallback = (vtx: GlsVertex, i: number) => void;

const MAX_BUFFER_SIZE = 65536;
function createMesh({
  buffer,
  vertexOffset,
  indexOffset,
  ucount,
  vcount,
  callback,
  i,
  attrName,
}: {
  buffer: GlsBuffer;
  vertexOffset: number;
  indexOffset: number;
  ucount: number;
  vcount: number;
  callback: GlsCreateMeshCallback | null;
  i: number;
  attrName: string;
}) {
  if (!buffer.indices) {
    throw new Error('Could not create the mesh without index buffer');
  }
  if (!buffer.infos[attrName]) {
    throw new Error(`The attribute has not been defined: ${attrName}`);
  }
  const umax = ucount + 1;
  for (let n = vertexOffset, v = 0; v <= vcount; v++) {
    for (let u = 0; u < umax; u++, n++) {
      const vtx = buffer.getVertex(n);
      vtx[attrName]![0] = (u / ucount) * 2 - 1;
      vtx[attrName]![1] = (v / vcount) * 2 - 1;
      if (callback) callback(vtx, i);
    }
  }
  const idx = buffer.indices;
  for (let n = indexOffset, v = 0; v < vcount; v++) {
    /* eslint-disable no-plusplus */
    idx[n++] = vertexOffset + v * umax;
    for (let u = 0; u < umax; u++) {
      idx[n++] = vertexOffset + u + v * umax;
      idx[n++] = vertexOffset + u + (v + 1) * umax;
    }
    idx[n++] = vertexOffset + (umax - 1) + (v + 1) * umax;
    /* eslint-enable no-plusplus */
  }
}
function buildGlsBufferController(geom: GlsBufferController) {
  if (geom.currentVertexOffset > 0) {
    const buffer = new GlsBuffer(
      geom.programs,
      geom.currentVertexOffset,
      geom.currentIndexOffset,
      geom.mode,
      geom.usage,
    );
    for (const [callback, vertexOffset, indexOffset] of geom.callbacks) {
      callback(buffer, vertexOffset, indexOffset);
    }
    geom.buffers.push(buffer);
  }
  geom.currentVertexOffset = 0;
  geom.currentIndexOffset = 0;
  geom.callbacks.length = 0;
}

type GlsBufferAllocateCallback = (
  bufer: GlsBuffer,
  vertexOffset: number,
  indexOffset: number,
) => void;
type GlsBufferAllocateControllerCallback = [
  GlsBufferAllocateCallback,
  number,
  number,
];

export class GlsBufferController {
  programs: GlsProgram[];
  mode: number;
  usage: number;
  buffers: GlsBuffer[];
  currentVertexOffset: number;
  currentIndexOffset: number;
  callbacks: GlsBufferAllocateControllerCallback[];

  constructor(programs: GlsProgram[], mode: number, usage: number) {
    this.programs = programs;
    this.mode = mode;
    this.usage = usage;
    this.buffers = [];
    this.currentVertexOffset = 0;
    this.currentIndexOffset = 0;
    this.callbacks = [];
  }

  allocate(
    vertexSize: number,
    indexSize: number,
    callback: GlsBufferAllocateCallback,
  ) {
    if (vertexSize > MAX_BUFFER_SIZE) {
      throw new RangeError(
        'The size you tried to allocate exceeds the maximum value.',
      );
    }
    if (this.currentVertexOffset + vertexSize > MAX_BUFFER_SIZE) {
      buildGlsBufferController(this);
    }
    this.callbacks.push([
      callback,
      this.currentVertexOffset,
      this.currentIndexOffset,
    ]);
    this.currentVertexOffset += vertexSize;
    this.currentIndexOffset += indexSize;
  }

  addMesh(
    ucount = 1,
    vcount = 1,
    callback: GlsCreateMeshCallback | null = null,
    attrName = 'position',
  ) {
    this.addMeshes(ucount, vcount, 1, callback, attrName);
  }

  addMeshes(
    ucount = 1,
    vcount = 1,
    count = 1,
    callback: GlsCreateMeshCallback | null = null,
    attrName = 'position',
  ) {
    const vertexSize = (ucount + 1) * (vcount + 1);
    const indexSize = (ucount * 2 + 4) * vcount;
    const maxBufferCount = Math.floor(MAX_BUFFER_SIZE / vertexSize);
    for (let offset = 0; offset < count; offset += maxBufferCount) {
      const subCount = Math.min(count - offset, maxBufferCount);
      this.allocate(
        vertexSize * subCount,
        indexSize * subCount,
        (buffer, vertexOffset, indexOffset) => {
          for (let i = 0; i < subCount; i++) {
            createMesh({
              buffer,
              vertexOffset,
              indexOffset,
              ucount,
              vcount,
              callback,
              i: offset + i,
              attrName,
            });
            vertexOffset += vertexSize;
            indexOffset += indexSize;
          }
        },
      );
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
// Gls
// ---------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
export class Gls {
  /* eslint-enable @typescript-eslint/no-unsafe-declaration-merging */
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  readonly clearMask: number;
  textureBinder: TextureBinder | null = null;

  readonly NEAREST_CLAMP = {
    MIN_FILTER: 'NEAREST',
    MAG_FILTER: 'NEAREST',
    WRAP_S: 'CLAMP_TO_EDGE',
    WRAP_T: 'CLAMP_TO_EDGE',
  } as const;

  readonly LINEAR_CLAMP = {
    MIN_FILTER: 'LINEAR',
    MAG_FILTER: 'LINEAR',
    WRAP_S: 'CLAMP_TO_EDGE',
    WRAP_T: 'CLAMP_TO_EDGE',
  } as const;

  readonly NEAREST_REPEAT = {
    MIN_FILTER: 'NEAREST',
    MAG_FILTER: 'NEAREST',
    WRAP_S: 'REPEAT',
    WRAP_T: 'REPEAT',
  } as const;

  readonly LINEAR_REPEAT = {
    MIN_FILTER: 'LINEAR',
    MAG_FILTER: 'LINEAR',
    WRAP_S: 'REPEAT',
    WRAP_T: 'REPEAT',
  } as const;

  constructor(
    canvas: HTMLCanvasElement | string,
    contextAttributes?: Record<string, unknown>,
  ) {
    if (typeof canvas === 'string') {
      const selected = document.querySelector(canvas);
      if (!(selected instanceof HTMLCanvasElement)) {
        throw new Error(
          `HTMLCanvasElement was not selected in the selector: ${canvas}`,
        );
      }
      canvas = selected;
    }
    this.canvas = canvas;
    contextAttributes = { preserveDrawingBuffer: true, ...contextAttributes };
    this.gl = this.canvas.getContext(
      'webgl2',
      contextAttributes,
    ) as WebGL2RenderingContext;
    /* eslint-disable no-bitwise */
    this.clearMask =
      this.gl.COLOR_BUFFER_BIT |
      (contextAttributes.depth === false ? 0 : this.gl.DEPTH_BUFFER_BIT) |
      (contextAttributes.stencil ? this.gl.STENCIL_BUFFER_BIT : 0);
    /* eslint-enable no-bitwise */
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

  createProgram(
    vertexShader: string | GlsVertexShader,
    fragmentShader: string | GlsFragmentShader,
  ) {
    return new GlsProgram(this, vertexShader, fragmentShader);
  }

  createBuffer(
    program: GlsProgram | GlsProgram[],
    mode: number = this.gl.TRIANGLE_STRIP,
    usage: number = this.gl.DYNAMIC_DRAW,
  ) {
    return new GlsBufferController(
      Array.isArray(program) ? program : [program],
      mode,
      usage,
    );
  }

  createTexture(img: TexImageSource, parameter?: GlsTextureParameter) {
    return createImageTexture(this.gl, img, parameter);
  }

  createFramebuffer(param?: GlsFramebufferParams) {
    return new GlsFramebuffer(this, param);
  }

  clearColor(red: number, green: number, blue: number, alpha: number) {
    this.gl.clearColor(red, green, blue, alpha);
  }

  clear(mask = this.clearMask) {
    bindFramebuffer(this, null);
    this.gl.clear(mask);
  }

  draw(program: GlsProgram, buffer: GlsBufferController) {
    bindFramebuffer(this, null);
    drawBuffer(program, buffer);
  }
}

// ---------------------------------------------------------
// Proxy WebGL methods and properties
// ---------------------------------------------------------

const proxiedMethods = [
  'enable',
  'disable',
  'blendFunc',
  'blendFuncSeparate',
] as const;

const proxiedProperties = [
  'POINTS',
  'LINES',
  'LINE_STRIP',
  'TRIANGLES',
  'TRIANGLE_STRIP',
  'CULL_FACE',
  'BLEND',
  'SRC_ALPHA',
  'ONE_MINUS_SRC_ALPHA',
  'ONE',
  'ZERO',
] as const;

type ProxiedMethodName = (typeof proxiedMethods)[number];
type ProxiedPropertyName = (typeof proxiedProperties)[number];

type GlWrapperMethods = Pick<WebGL2RenderingContext, ProxiedMethodName>;
type GlWrapperProperties = Pick<
  typeof WebGL2RenderingContext,
  ProxiedPropertyName
>;

/* eslint-disable */
export interface Gls extends GlWrapperMethods, GlWrapperProperties {}

for (const name of proxiedMethods) {
  (Gls.prototype as any)[name] = function (this: Gls, ...args: any[]) {
    return (this.gl[name] as (...a: any[]) => any)(...args);
  };
}

for (const name of proxiedProperties) {
  const value = WebGL2RenderingContext[name];
  (Gls as any)[name] = value;
  (Gls.prototype as any)[name] = value;
}
/* eslint-enable */

// ---------------------------------------------------------
// Export default
// ---------------------------------------------------------

export default Gls;
