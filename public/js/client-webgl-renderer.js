(function initCWWebGLWorld(global) {
  const params = new URLSearchParams(global.location?.search || '');
  const nativeUeMode = String(params.get('native') || '').trim().toLowerCase() === 'ue';
  if (global.cwDisableWebRenderer || nativeUeMode) {
    global.CWWebGLWorld = {
      clear() {},
      clearTextureCache() {},
      isAvailable() { return false; },
      renderWorld() { return false; },
      resize() {},
      warmTextures() { return 0; },
    };
    return;
  }

  const canvas = document.getElementById('game-webgl');
  const state = {
    gl: null,
    program: null,
    colorProgram: null,
    positionBuffer: null,
    texCoordBuffer: null,
    colorBuffer: null,
    posLoc: -1,
    uvLoc: -1,
    colorPosLoc: -1,
    colorLoc: -1,
    resLoc: null,
    tintLoc: null,
    adjustLoc: null,
    colorResLoc: null,
    whiteTexture: null,
    shadowCanvas: null,
    overlayCanvas: null,
    overlaySignature: '',
    textures: new WeakMap(),
    positions: new Float32Array(12),
    texCoords: new Float32Array(12),
    colorVertices: new Float32Array(4096 * 6),
    colorVertexCount: 0,
    width: 0,
    height: 0,
    failed: false,
  };

  const vertexShaderSource = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
uniform vec2 u_resolution;
varying vec2 v_texCoord;
void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 clipSpace = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

  const fragmentShaderSource = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec4 u_tint;
uniform vec3 u_adjust;
varying vec2 v_texCoord;
void main() {
  vec4 tex = texture2D(u_texture, v_texCoord);
  vec3 rgb = tex.rgb * u_tint.rgb;
  float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
  rgb = mix(vec3(luma), rgb, u_adjust.z);
  rgb = (rgb - vec3(0.5)) * u_adjust.y + vec3(0.5);
  rgb *= u_adjust.x;
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), tex.a * u_tint.a);
}`;

  const colorVertexShaderSource = `
attribute vec2 a_position;
attribute vec4 a_color;
uniform vec2 u_resolution;
varying vec4 v_color;
void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 clipSpace = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  v_color = a_color;
}`;

  const colorFragmentShaderSource = `
precision mediump float;
varying vec4 v_color;
void main() {
  gl_FragColor = v_color;
}`;

  const NON_ROTATING_VEHICLE_MAP_OBJECT_KEYS = new Set([
    'abandoned_bus',
    'ambulance',
    'ambulance_van',
    'burnt_sedan',
    'bus_yellow',
    'car_blue',
    'car_red',
    'futuristic_police_vehicle',
    'military_ambulance',
    'post_apocalyptic_car',
    'red_hatchback',
    'wrecked_police_car',
    'yellow_bus',
  ]);

  function getMapObjectRenderAngle(obj) {
    const kind = String(obj?.kind || '').trim();
    const spriteKey = String(obj?.spriteKey || '').trim();
    if (NON_ROTATING_VEHICLE_MAP_OBJECT_KEYS.has(kind) || NON_ROTATING_VEHICLE_MAP_OBJECT_KEYS.has(spriteKey)) return 0;
    return Number(obj?.angle) || 0;
  }

  function ensureMapPropDirectionImage(meta) {
    if (!meta || typeof meta !== 'object') return null;
    if (meta.image) return meta.image;
    const src = String(meta.src || '').trim();
    if (!src || typeof global.Image === 'undefined') return null;
    const img = new global.Image();
    img.decoding = 'async';
    img.src = src;
    meta.image = img;
    return img;
  }

  function getMapPropDirectionFrame(obj, directionSprites) {
    const key = String(obj?.spriteKey || '').trim();
    if (!key) return null;
    const meta = directionSprites?.[key];
    const image = ensureMapPropDirectionImage(meta);
    if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null;
    const frames = Math.max(1, Math.floor(Number(meta.frames) || 1));
    const columns = Math.max(1, Math.min(frames, Math.floor(Number(meta.columns) || frames)));
    const rows = Math.max(1, Math.ceil(frames / columns));
    const frameW = Math.floor(image.naturalWidth / columns);
    const frameH = Math.floor(image.naturalHeight / rows);
    if (frameW <= 0 || frameH <= 0) return null;
    const fullTurn = Math.PI * 2;
    const direction = Number(meta.direction) || 1;
    const angle = ((getMapObjectRenderAngle(obj) * direction + (Number(meta.angleOffset) || 0)) % fullTurn + fullTurn) % fullTurn;
    const frame = Math.round((angle / fullTurn) * frames) % frames;
    return {
      image,
      sx: (frame % columns) * frameW,
      sy: Math.floor(frame / columns) * frameH,
      sw: frameW,
      sh: frameH,
    };
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(info || 'WebGL shader compile failed');
    }
    return shader;
  }

  function createProgram(gl) {
    return createProgramFromSources(gl, vertexShaderSource, fragmentShaderSource);
  }

  function createProgramFromSources(gl, vertexSource, fragmentSource) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(info || 'WebGL program link failed');
    }
    return program;
  }

  function ensureInit() {
    if (state.failed || !canvas) return false;
    if (state.gl) return true;
    try {
      const gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      });
      if (!gl) throw new Error('WebGL context unavailable');
      state.gl = gl;
      state.program = createProgram(gl);
      state.colorProgram = createProgramFromSources(gl, colorVertexShaderSource, colorFragmentShaderSource);
      state.positionBuffer = gl.createBuffer();
      state.texCoordBuffer = gl.createBuffer();
      state.colorBuffer = gl.createBuffer();
      gl.useProgram(state.program);
      state.posLoc = gl.getAttribLocation(state.program, 'a_position');
      state.uvLoc = gl.getAttribLocation(state.program, 'a_texCoord');
      state.resLoc = gl.getUniformLocation(state.program, 'u_resolution');
      state.tintLoc = gl.getUniformLocation(state.program, 'u_tint');
      state.adjustLoc = gl.getUniformLocation(state.program, 'u_adjust');
      state.colorPosLoc = gl.getAttribLocation(state.colorProgram, 'a_position');
      state.colorLoc = gl.getAttribLocation(state.colorProgram, 'a_color');
      state.colorResLoc = gl.getUniformLocation(state.colorProgram, 'u_resolution');
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

      const white = document.createElement('canvas');
      white.width = 1;
      white.height = 1;
      const g = white.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 1, 1);
      state.whiteTexture = uploadTexture(white);
      resize(canvas.width || window.innerWidth || 1280, canvas.height || window.innerHeight || 720);
      return true;
    } catch (error) {
      state.failed = true;
      console.warn('CW WebGL renderer disabled:', error);
      return false;
    }
  }

  function resize(width, height) {
    if (!canvas) return;
    const w = Math.max(1, Math.floor(Number(width) || canvas.clientWidth || 1));
    const h = Math.max(1, Math.floor(Number(height) || canvas.clientHeight || 1));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    if (!state.gl && !ensureInit()) return;
    state.width = w;
    state.height = h;
    state.gl.viewport(0, 0, w, h);
  }

  function uploadTexture(source) {
    const gl = state.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    return texture;
  }

  function getTexture(source) {
    if (!source || !state.gl) return null;
    if (source instanceof HTMLImageElement && (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0)) return null;
    const width = source.naturalWidth || source.videoWidth || source.width || 0;
    const height = source.naturalHeight || source.videoHeight || source.height || 0;
    if (width <= 0 || height <= 0) return null;

    const version = Number(source.__cwWebglVersion) || 0;
    const linear = source.__cwWebglLinear === true;
    const cached = state.textures.get(source);
    if (cached && cached.width === width && cached.height === height && cached.version === version && cached.linear === linear) return cached.texture;

    const texture = cached?.texture || state.gl.createTexture();
    state.gl.bindTexture(state.gl.TEXTURE_2D, texture);
    state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_WRAP_S, state.gl.CLAMP_TO_EDGE);
    state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_WRAP_T, state.gl.CLAMP_TO_EDGE);
    state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_MIN_FILTER, linear ? state.gl.LINEAR : state.gl.NEAREST);
    state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_MAG_FILTER, linear ? state.gl.LINEAR : state.gl.NEAREST);
    state.gl.texImage2D(state.gl.TEXTURE_2D, 0, state.gl.RGBA, state.gl.RGBA, state.gl.UNSIGNED_BYTE, source);
    state.textures.set(source, { texture, width, height, version, linear });
    return texture;
  }

  function clearTextureCache() {
    state.textures = new WeakMap();
  }

  function warmTextures(sources) {
    if (!ensureInit()) return 0;
    const list = Array.isArray(sources) ? sources : [sources];
    let warmed = 0;
    for (const source of list) {
      if (getTexture(source)) warmed += 1;
    }
    return warmed;
  }

  function ensureShadowCanvas() {
    if (state.shadowCanvas) return state.shadowCanvas;
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 48;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(48, 24, 2, 48, 24, 46);
    grad.addColorStop(0, 'rgba(0,0,0,0.82)');
    grad.addColorStop(0.48, 'rgba(0,0,0,0.42)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(48, 24, 46, 21, 0, 0, Math.PI * 2);
    g.fill();
    state.shadowCanvas = c;
    return c;
  }

  function colorToRgba(color, alpha) {
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    const raw = String(color || '').trim();
    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    if (/^[0-9a-f]{3}$/i.test(hex) || /^[0-9a-f]{6}$/i.test(hex)) {
      const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex;
      const value = Number.parseInt(full, 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r},${g},${b},${safeAlpha.toFixed(3)})`;
    }
    return raw || `rgba(255,255,255,${safeAlpha.toFixed(3)})`;
  }

  function colorToArray(color, alpha = 1) {
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    const raw = String(color || '').trim();
    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    if (/^[0-9a-f]{3}$/i.test(hex) || /^[0-9a-f]{6}$/i.test(hex)) {
      const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex;
      const value = Number.parseInt(full, 16);
      return [
        ((value >> 16) & 255) / 255,
        ((value >> 8) & 255) / 255,
        (value & 255) / 255,
        safeAlpha,
      ];
    }
    return [1, 1, 1, safeAlpha];
  }

  function resetColorBatch() {
    state.colorVertexCount = 0;
  }

  function ensureColorVertices(additionalVertices) {
    const need = (state.colorVertexCount + Math.max(0, additionalVertices | 0)) * 6;
    if (need <= state.colorVertices.length) return;
    let nextLength = state.colorVertices.length;
    while (nextLength < need) nextLength *= 2;
    const next = new Float32Array(nextLength);
    next.set(state.colorVertices);
    state.colorVertices = next;
  }

  function pushColorVertex(x, y, color) {
    ensureColorVertices(1);
    const data = state.colorVertices;
    let i = state.colorVertexCount * 6;
    data[i++] = Number(x) || 0;
    data[i++] = Number(y) || 0;
    data[i++] = color[0] ?? 1;
    data[i++] = color[1] ?? 1;
    data[i++] = color[2] ?? 1;
    data[i++] = color[3] ?? 1;
    state.colorVertexCount += 1;
  }

  function pushColorTri(x1, y1, x2, y2, x3, y3, color) {
    ensureColorVertices(3);
    pushColorVertex(x1, y1, color);
    pushColorVertex(x2, y2, color);
    pushColorVertex(x3, y3, color);
  }

  function pushColorQuad(x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ensureColorVertices(6);
    pushColorVertex(x1, y1, color);
    pushColorVertex(x2, y2, color);
    pushColorVertex(x3, y3, color);
    pushColorVertex(x3, y3, color);
    pushColorVertex(x2, y2, color);
    pushColorVertex(x4, y4, color);
  }

  function pushLineQuad(x1, y1, x2, y2, width, color) {
    const dx = (Number(x2) || 0) - (Number(x1) || 0);
    const dy = (Number(y2) || 0) - (Number(y1) || 0);
    const len = Math.hypot(dx, dy);
    if (len <= 0.001) return;
    const nx = -dy / len * width * 0.5;
    const ny = dx / len * width * 0.5;
    pushColorQuad(x1 + nx, y1 + ny, x1 - nx, y1 - ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, color);
  }

  function pushDiamond(cx, cy, dirX, dirY, forward, side, color) {
    const len = Math.hypot(dirX, dirY) || 1;
    const ux = dirX / len;
    const uy = dirY / len;
    const nx = -uy;
    const ny = ux;
    const x1 = cx + ux * forward;
    const y1 = cy + uy * forward;
    const x2 = cx + nx * side;
    const y2 = cy + ny * side;
    const x3 = cx - ux * forward * 0.62;
    const y3 = cy - uy * forward * 0.62;
    const x4 = cx - nx * side;
    const y4 = cy - ny * side;
    pushColorQuad(x1, y1, x2, y2, x4, y4, x3, y3, color);
  }

  function pushCircle(cx, cy, radius, color, segments = 14) {
    const r = Math.max(0.5, Number(radius) || 0);
    const count = Math.max(6, Math.min(24, segments | 0));
    let px = cx + r;
    let py = cy;
    for (let i = 1; i <= count; i += 1) {
      const a = (Math.PI * 2 * i) / count;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      pushColorTri(cx, cy, px, py, x, y, color);
      px = x;
      py = y;
    }
  }

  function flushColorBatch(options = {}) {
    const gl = state.gl;
    const count = state.colorVertexCount;
    if (!gl || !state.colorProgram || count <= 0) return 0;
    gl.useProgram(state.colorProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, state.colorVertices.subarray(0, count * 6), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(state.colorPosLoc);
    gl.vertexAttribPointer(state.colorPosLoc, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(state.colorLoc);
    gl.vertexAttribPointer(state.colorLoc, 4, gl.FLOAT, false, 24, 8);
    gl.uniform2f(state.colorResLoc, state.width || canvas.width || 1, state.height || canvas.height || 1);
    if (options.additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.TRIANGLES, 0, count);
    if (options.additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return count;
  }

  function ensureGroundOverlayCanvas(params) {
    if (params.groundOverlayEnabled === false) return null;
    const accent = String(params.groundOverlayAccent || '#f97316');
    const w = Math.max(1, state.width || canvas.width || 1);
    const h = Math.max(1, state.height || canvas.height || 1);
    const signature = `${w}:${h}:${accent}`;
    if (state.overlayCanvas && state.overlaySignature === signature) return state.overlayCanvas;

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(w * 0.5, h * 0.55, 70, w * 0.5, h * 0.55, Math.max(w, h) * 0.8);
    grad.addColorStop(0, colorToRgba(accent, 0.13));
    grad.addColorStop(1, 'rgba(16,8,8,0.02)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    state.overlayCanvas = c;
    state.overlaySignature = signature;
    return c;
  }

  function drawGroundOverlay(params) {
    const overlay = ensureGroundOverlayCanvas(params);
    if (!overlay) return;
    drawSource(overlay, 0, 0, overlay.width, overlay.height, 0, 0, state.width, state.height);
  }

  function drawSource(source, sx, sy, sw, sh, dx, dy, dw, dh, options = {}) {
    const gl = state.gl;
    if (!gl || dw === 0 || dh === 0) return false;
    const tex = source ? getTexture(source) : state.whiteTexture;
    if (!tex) return false;

    const sourceW = source ? (source.naturalWidth || source.width || 1) : 1;
    const sourceH = source ? (source.naturalHeight || source.height || 1) : 1;
    const u0 = (Number(sx) || 0) / sourceW;
    const v0 = (Number(sy) || 0) / sourceH;
    const u1 = ((Number(sx) || 0) + (Number(sw) || sourceW)) / sourceW;
    const v1 = ((Number(sy) || 0) + (Number(sh) || sourceH)) / sourceH;
    const flipX = options.flipX === true;
    const left = Number(dx) || 0;
    const top = Number(dy) || 0;
    const right = left + (Number(dw) || 0);
    const bottom = top + (Number(dh) || 0);
    const positions = state.positions;
    const rotation = Number(options.rotation) || 0;
    if (rotation) {
      const originX = Number.isFinite(Number(options.rotationOriginX)) ? Number(options.rotationOriginX) : (left + right) * 0.5;
      const originY = Number.isFinite(Number(options.rotationOriginY)) ? Number(options.rotationOriginY) : (top + bottom) * 0.5;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const setPosition = (offset, x, y) => {
        const ox = x - originX;
        const oy = y - originY;
        positions[offset] = originX + ox * cos - oy * sin;
        positions[offset + 1] = originY + ox * sin + oy * cos;
      };
      setPosition(0, left, top);
      setPosition(2, right, top);
      setPosition(4, left, bottom);
      setPosition(6, left, bottom);
      setPosition(8, right, top);
      setPosition(10, right, bottom);
    } else {
      positions[0] = left; positions[1] = top;
      positions[2] = right; positions[3] = top;
      positions[4] = left; positions[5] = bottom;
      positions[6] = left; positions[7] = bottom;
      positions[8] = right; positions[9] = top;
      positions[10] = right; positions[11] = bottom;
    }

    const texCoords = state.texCoords;
    texCoords[0] = flipX ? u1 : u0; texCoords[1] = v0;
    texCoords[2] = flipX ? u0 : u1; texCoords[3] = v0;
    texCoords[4] = flipX ? u1 : u0; texCoords[5] = v1;
    texCoords[6] = flipX ? u1 : u0; texCoords[7] = v1;
    texCoords[8] = flipX ? u0 : u1; texCoords[9] = v0;
    texCoords[10] = flipX ? u0 : u1; texCoords[11] = v1;

    gl.useProgram(state.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(state.posLoc);
    gl.vertexAttribPointer(state.posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, state.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(state.uvLoc);
    gl.vertexAttribPointer(state.uvLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(state.resLoc, state.width || canvas.width || 1, state.height || canvas.height || 1);
    const tint = Array.isArray(options.tint) ? options.tint : [1, 1, 1];
    gl.uniform4f(state.tintLoc, tint[0] ?? 1, tint[1] ?? 1, tint[2] ?? 1, Math.max(0, Math.min(1, Number(options.alpha ?? 1))));
    gl.uniform3f(
      state.adjustLoc,
      Math.max(0, Number(options.brightness ?? 1)),
      Math.max(0, Number(options.contrast ?? 1)),
      Math.max(0, Number(options.saturation ?? 1)),
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }

  function drawShadow(sx, sy, rx, ry, alpha) {
    const shadow = ensureShadowCanvas();
    drawSource(shadow, 0, 0, shadow.width, shadow.height, sx - rx, sy - ry, rx * 2, ry * 2, { alpha });
  }

  function getEnemyBrightnessTint(isBoss) {
    return isBoss ? [0.98, 0.92, 0.86] : [0.98, 0.95, 0.9];
  }

  function getMapObjectAdjust(obj) {
    if (obj?.destroyed) return { brightness: 0.72, contrast: 1.08, saturation: 0.62 };
    const damaged = obj?.destructible && (Number(obj.hp) || 0) < Math.max(1, Number(obj.maxHp) || 1);
    if (damaged) return { brightness: 0.98, contrast: 1.08, saturation: 1.08 };
    return { brightness: 1.08, contrast: 1.08, saturation: 1.18 };
  }

  function drawGroundChunks(params) {
    const chunks = params.groundChunks || [];
    for (const chunk of chunks) {
      if (!chunk?.canvas) continue;
      drawSource(
        chunk.canvas,
        0,
        0,
        chunk.canvas.width,
        chunk.canvas.height,
        chunk.x - params.camera.x,
        chunk.y - params.camera.y,
        chunk.canvas.width,
        chunk.canvas.height,
      );
    }
  }

  function drawGroundDecals(params) {
    const decals = Array.isArray(params.groundDecals) ? params.groundDecals : [];
    for (const decal of decals) {
      const source = decal?.canvas || decal?.source;
      if (!source) continue;
      const w = source.naturalWidth || source.width || 0;
      const h = source.naturalHeight || source.height || 0;
      if (w <= 0 || h <= 0) continue;
      const alpha = Math.max(0, Math.min(1, Number(decal.alpha ?? 1)));
      if (alpha <= 0.01) continue;
      drawSource(
        source,
        0,
        0,
        w,
        h,
        (Number(decal.x) || 0) - params.camera.x - (Number(decal.halfW) || w * 0.5),
        (Number(decal.y) || 0) - params.camera.y - (Number(decal.halfH) || h * 0.5),
        w,
        h,
        { alpha },
      );
    }
  }

  function drawMapObjects(params) {
    const objects = Array.isArray(params.mapObjects) ? params.mapObjects : [];
    const sprites = params.sprites?.mapProps || {};
    const directionSprites = params.sprites?.mapPropDirections || {};
    for (const obj of objects) {
      if (!obj || (obj.destroyed && obj.hideAfterDestroyed)) continue;
      if (typeof params.isVisibleWorld === 'function') {
        const radius = Math.max(Number(obj.w) || 0, Number(obj.h) || 0) * 0.55;
        if (!params.isVisibleWorld(Number(obj.x) || 0, Number(obj.y) || 0, radius + 40)) continue;
      }
      const directionalFrame = getMapPropDirectionFrame(obj, directionSprites);
      const sprite = sprites[obj.spriteKey];
      if (!directionalFrame && (!sprite || !sprite.complete || sprite.naturalWidth <= 0)) continue;
      const width = Math.max(22, Number(obj.w) || 22);
      const height = Math.max(22, Number(obj.h) || 22);
      const anchorY = Math.max(0.45, Math.min(0.72, Number(obj.anchorY) || 0.56));
      const sx = (Number(obj.x) || 0) - params.camera.x;
      const sy = (Number(obj.y) || 0) - params.camera.y;
      if (params.shadowsEnabled) {
        drawShadow(sx, sy + 10, Math.max(16, width * 0.22 * (Number(obj.shadowScale) || 1)), Math.max(6, height * 0.1), obj.destroyed ? 0.12 : 0.22);
      }
      const adjust = getMapObjectAdjust(obj);
      const source = directionalFrame?.image || sprite;
      drawSource(
        source,
        directionalFrame ? directionalFrame.sx : 0,
        directionalFrame ? directionalFrame.sy : 0,
        directionalFrame ? directionalFrame.sw : source.naturalWidth,
        directionalFrame ? directionalFrame.sh : source.naturalHeight,
        sx - width * 0.5,
        sy - height * anchorY,
        width,
        height,
        {
          alpha: obj.destroyed ? 0.72 : 1,
          brightness: adjust.brightness,
          contrast: adjust.contrast,
          saturation: adjust.saturation,
          rotation: directionalFrame ? 0 : getMapObjectRenderAngle(obj),
          rotationOriginX: sx,
          rotationOriginY: sy,
        },
      );
    }
  }

  function drawEnemies(params) {
    const enemies = Array.isArray(params.enemies) ? params.enemies : [];
    const sprite = params.sprites?.enemy;
    if (!sprite?.complete || sprite.naturalWidth <= 0) return;
    const fw = 37;
    const fh = 45;
    const frames = Math.max(2, Math.floor((sprite.naturalWidth || (fw * 2)) / fw));
    const t = Number(params.t) || 0;
    for (const e of enemies) {
      const re = params.getEnemyRenderPos ? params.getEnemyRenderPos(e) : e;
      const er = Math.max(18, Number(e.radius) || 18);
      if (params.isVisibleWorld && !params.isVisibleWorld(re.x, re.y, Math.max(60, er + 24))) continue;
      const x = re.x - params.camera.x;
      const y = re.y - params.camera.y;
      const isBoss = e.type === 'boss';
      const mobRender = params.getMobRenderDef ? params.getMobRenderDef(e.mobId || e.type) : null;
      const tint = params.getEnemyRenderColor ? params.getEnemyRenderColor(e) : '#ef4444';
      const scaleBase = Number(e.spriteScale) || Number(mobRender?.spriteScale) || (isBoss ? 2.6 : 1);
      const scale = isBoss ? Math.max(2.2, scaleBase) : Math.max(0.65, scaleBase);
      const sw = 42 * scale;
      const sh = 50 * scale;
      const frame = Math.floor(t * (isBoss ? 9 : 12)) % frames;
      const hasFaceLeft = typeof re.faceLeft === 'boolean' || typeof e.faceLeft === 'boolean';
      const faceLeft = hasFaceLeft
        ? Boolean(re.faceLeft ?? e.faceLeft)
        : ((Math.abs(Number(re.vx) || 0) > 0.15) ? ((Number(re.vx) || 0) < 0) : false);
      drawShadow(
        x,
        y + (isBoss ? 50 : 30),
        Math.max(17, 16 * scale),
        Math.max(7, 7 * scale),
        params.shadowsEnabled ? (isBoss ? 0.58 : 0.48) : (isBoss ? 0.32 : 0.24),
      );
      const frameSource = params.getTintedEnemyFrame
        ? params.getTintedEnemyFrame(frame, tint, isBoss, fw, fh)
        : null;
      const enemyTint = getEnemyBrightnessTint(isBoss);
      const enemyAdjust = isBoss
        ? { brightness: 0.92, contrast: 1.16, saturation: 1.18 }
        : { brightness: 0.96, contrast: 1.12, saturation: 1.2 };
      if (frameSource) {
        drawSource(frameSource, 0, 0, fw, fh, x - sw * 0.5, y + (isBoss ? 6 : 2) - sh * 0.52, sw, sh, {
          flipX: faceLeft,
          tint: enemyTint,
          brightness: enemyAdjust.brightness,
          contrast: enemyAdjust.contrast,
          saturation: enemyAdjust.saturation,
        });
      } else {
        drawSource(sprite, frame * fw, 0, fw, fh, x - sw * 0.5, y + (isBoss ? 6 : 2) - sh * 0.52, sw, sh, {
          flipX: faceLeft,
          tint: enemyTint,
          brightness: enemyAdjust.brightness,
          contrast: enemyAdjust.contrast,
          saturation: enemyAdjust.saturation,
        });
      }
    }
  }

  function drawPlayers(params) {
    const playersByDepth = Array.isArray(params.playersByDepth) ? params.playersByDepth : [];
    const input = params.input || {};
    const mobile = params.mobile || {};
    for (const item of playersByDepth) {
      const p = item?.p;
      const rp = item?.rp;
      if (!p?.alive || !rp) continue;
      if (params.isVisibleWorld && !params.isVisibleWorld(rp.x, rp.y, 50)) continue;
      const variant = params.getPlayerVariant ? params.getPlayerVariant(p.playerClass || (p.id === params.myId ? params.selectedPlayerClass : 'cyber')) : null;
      const sprite = variant ? params.sprites?.players?.[variant.id] : null;
      if (!variant || !sprite?.complete || sprite.naturalWidth <= 0) continue;
      const fw = Math.max(8, Number(variant.frameW) || 32);
      const fh = Math.max(8, Number(variant.frameH) || 48);
      if (sprite.naturalWidth < fw || sprite.naturalHeight < fh) continue;
      const isCompanion = Boolean(p.isCompanion);
      const x = rp.x - params.camera.x;
      const y = rp.y - params.camera.y;
      const scale = Math.max(0.5, Number(variant.scale) || 1) * (isCompanion ? 0.84 : 1);
      const dw = fw * scale;
      const dh = fh * scale;
      if (params.shadowsEnabled) drawShadow(x, y + dh * 0.34, Math.max(10, dw * 0.33), Math.max(4, dh * 0.1), 0.3);

      const frameCount = Math.max(1, Math.floor(sprite.naturalWidth / fw));
      const rowCount = Math.max(1, Math.floor(sprite.naturalHeight / fh));
      const fps = Math.max(2, Number(variant.fps) || 9);
      const idleFrame = Math.max(0, Math.min(frameCount - 1, Number(variant.idleFrame) || 1));
      const keyMoving = input.up || input.down || input.left || input.right;
      const mobileMoving = mobile.enabled && mobile.moveStrength > 0.08;
      const velMoving = Math.hypot(rp?.vx || 0, rp?.vy || 0) > 10;
      const moving = p.id === params.myId ? (keyMoving || mobileMoving || velMoving) : velMoving;
      const phase = p.id === params.myId ? 0 : (String(p.id || 'x').charCodeAt(0) % 3);
      const frame = moving ? (Math.floor((Number(params.t) || 0) * fps + phase) % frameCount) : idleFrame;

      const aimDx = (Number(p.aimX) || rp.x) - rp.x;
      const aimDy = (Number(p.aimY) || rp.y) - rp.y;
      const hasAim = Math.hypot(aimDx, aimDy) > 0.001;
      const useLocalPointerLook = p.id === params.myId && !params.replayActive;
      const lookDx = hasAim ? aimDx : (useLocalPointerLook ? (input.pointerX - x) : (rp?.vx || 0));
      const lookDy = hasAim ? aimDy : (useLocalPointerLook ? (input.pointerY - y) : (rp?.vy || 0));
      let dir = 'down';
      if (Math.abs(lookDx) > Math.abs(lookDy)) dir = lookDx < 0 ? 'left' : 'right';
      else if (Math.abs(lookDy) > 0.0001) dir = lookDy < 0 ? 'up' : 'down';
      const rows = variant.rows || { down: 0, left: 1, right: 2, up: 3 };
      const selectedRow = Number(rows[dir]);
      const row = Number.isFinite(selectedRow) ? Math.max(0, Math.min(rowCount - 1, selectedRow)) : 0;
      drawSource(sprite, frame * fw, row * fh, fw, fh, x - dw / 2, y + 2 - dh * 0.6, dw, dh);
    }
  }

  function getProjectilePalette(projectile) {
    const weaponKey = String(projectile?.weaponKey || '').toLowerCase();
    const base = projectile?.color || '#f59e0b';
    if (weaponKey.includes('sniper')) return { core: '#ffffff', hot: '#e0f2fe', edge: '#93c5fd', glow: '#38bdf8' };
    if (weaponKey.includes('smg')) return { core: '#ecfeff', hot: '#a5f3fc', edge: '#22d3ee', glow: '#0891b2' };
    if (weaponKey.includes('shotgun')) return { core: '#fff7ed', hot: '#fed7aa', edge: '#fb923c', glow: '#ef4444' };
    return { core: '#fff7d6', hot: '#fde68a', edge: base, glow: '#fb923c' };
  }

  function drawFastProjectiles(params) {
    const projectiles = Array.isArray(params.projectiles) ? params.projectiles : [];
    const camera = params.camera || { x: 0, y: 0 };
    const tracersEnabled = params.bulletTracersEnabled !== false;
    for (const projectile of projectiles) {
      if (!projectile) continue;
      const x = (Number(projectile.x) || 0) - (Number(camera.x) || 0);
      const y = (Number(projectile.y) || 0) - (Number(camera.y) || 0);
      const vx = Number(projectile.vx) || 0;
      const vy = Number(projectile.vy) || 0;
      const speed = Math.hypot(vx, vy);
      const dirX = speed > 0.001 ? vx / speed : 1;
      const dirY = speed > 0.001 ? vy / speed : 0;
      const radius = Math.max(2, Number(projectile.radius) || 3);
      const weaponKey = String(projectile.weaponKey || '').toLowerCase();
      const palette = getProjectilePalette(projectile);
      const tracerLen = tracersEnabled
        ? Math.min(48, Math.max(18, speed * (weaponKey.includes('sniper') ? 0.018 : 0.034)))
        : Math.max(8, radius * 2.4);
      const tailX = x - dirX * tracerLen;
      const tailY = y - dirY * tracerLen;

      if (tracersEnabled) {
        pushLineQuad(tailX, tailY, x, y, Math.max(5.5, radius * 3.2), colorToArray(palette.glow, 0.12));
        pushLineQuad(
          x - dirX * tracerLen * 0.82,
          y - dirY * tracerLen * 0.82,
          x + dirX * radius * 1.1,
          y + dirY * radius * 1.1,
          Math.max(2.4, radius * 1.35),
          colorToArray(palette.edge, 0.46),
        );
        pushLineQuad(
          x - dirX * tracerLen * 0.35,
          y - dirY * tracerLen * 0.35,
          x + dirX * radius * 1.2,
          y + dirY * radius * 1.2,
          Math.max(0.9, radius * 0.45),
          colorToArray('#ffffff', weaponKey.includes('sniper') ? 0.74 : 0.54),
        );
      }

      pushCircle(x, y, Math.max(7, radius * 3.4), colorToArray(palette.glow, 0.12), 12);
      pushDiamond(x, y, dirX, dirY, radius * 2.2, radius * 0.9, colorToArray(palette.core, 0.96));
      pushLineQuad(
        x - dirX * radius * 0.45,
        y - dirY * radius * 0.45,
        x + dirX * radius * 1.45,
        y + dirY * radius * 1.45,
        Math.max(1.1, radius * 0.42),
        colorToArray(palette.hot, 0.9),
      );
    }
    return projectiles.length;
  }

  function drawFastXpOrbs(params) {
    const orbs = Array.isArray(params.xpOrbs) ? params.xpOrbs : [];
    const camera = params.camera || { x: 0, y: 0 };
    const nowMs = Number(params.nowMs) || performance.now();
    for (const orb of orbs) {
      if (!orb) continue;
      const x = (Number(orb.x) || 0) - (Number(camera.x) || 0);
      const y = (Number(orb.y) || 0) - (Number(camera.y) || 0);
      const pulse = 1 + Math.sin(nowMs / 140 + (Number(orb.seed) || 0)) * 0.18;
      pushCircle(x, y, 7.5 * pulse, colorToArray('#38bdf8', 0.22), 12);
      pushDiamond(x, y, 0, 1, 6.2 * pulse, 5.1 * pulse, colorToArray('#22d3ee', 0.94));
      pushDiamond(x, y, 0, 1, 3.6 * pulse, 2.8 * pulse, colorToArray('#e0faff', 0.82));
    }
    return orbs.length;
  }

  function renderFastFx(params = {}) {
    if (!ensureInit()) return { used: false, projectiles: false, xpOrbs: false };
    if (params.enabled === false) return { used: false, projectiles: false, xpOrbs: false };
    resetColorBatch();
    const projectileCount = drawFastProjectiles(params);
    const xpOrbCount = drawFastXpOrbs(params);
    const vertices = flushColorBatch({ additive: true });
    const used = vertices > 0;
    return {
      used,
      projectiles: used && projectileCount > 0,
      xpOrbs: used && xpOrbCount > 0,
      vertices,
    };
  }

  function renderWorld(params = {}) {
    if (!ensureInit()) return false;
    const gl = state.gl;
    resize(params.width || canvas.width, params.height || canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (params.enabled === false) return false;
    drawGroundChunks(params);
    drawGroundOverlay(params);
    drawGroundDecals(params);
    drawMapObjects(params);
    drawEnemies(params);
    drawPlayers(params);
    return true;
  }

  function clear() {
    if (!ensureInit()) return;
    state.gl.clearColor(0, 0, 0, 0);
    state.gl.clear(state.gl.COLOR_BUFFER_BIT);
  }

  global.CWWebGLWorld = {
    clear,
    clearTextureCache,
    isAvailable: ensureInit,
    renderFastFx,
    renderWorld,
    resize,
    warmTextures,
  };
})(globalThis);
