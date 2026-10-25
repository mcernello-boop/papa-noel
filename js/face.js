// Cara de Papá Noel: una foto animada con deformaciones en WebGL.
// Coordenadas en píxeles de la imagen original (1536 x 2752), medidas con MediaPipe Face Landmarker.

export const IMG_W = 1536, IMG_H = 2752;

// Párpados: y = a0 + a1*X + a2*X², con X = x - cx (ajuste cuadrático de los puntos de MediaPipe)
const EYES = {
  L: { cx: 613, x0: 545.6, x1: 680.6, up: [1223.322, 0.043234, 0.0066605], lo: [1266.057, 0.015113, -0.002501], iris: [610.4, 1243.1] },
  R: { cx: 938, x0: 867.8, x1: 1007.4, up: [1212.077, -0.111824, 0.0065501], lo: [1257.611, -0.071704, -0.002498], iris: [948.9, 1232.6] },
};

const f = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
const v3 = (a) => `vec3(${f(a[0])}, ${f(a[1])}, ${f(a[2])})`;

function buildEyeConsts(e) {
  return { up: e.up, lo: e.lo };
}

const VERT = `
attribute vec2 aPos;
uniform vec3 uMx; uniform vec3 uMy;
varying vec2 vImg;
void main(){
  vec2 uv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  vImg = vec2(dot(uMx, vec3(uv, 1.0)), dot(uMy, vec3(uv, 1.0)));
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

function fragSource(eyeL, eyeR) {
  return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vImg;
uniform sampler2D uTex;
uniform vec2 uImg;
uniform float uOpen, uRound, uWide, uSmile, uBlinkL, uBlinkR, uBrow, uBreath, uTime, uFlick, uSquint, uGrain, uExpo;
uniform vec4 uHead;   // tx, ty, rot, yaw (px)
uniform vec2 uGaze;

const vec2 PIVOT = vec2(780.0, 2150.0);
const vec2 HC = vec2(760.0, 1450.0);
const vec2 HR = vec2(640.0, 960.0);

float headW(vec2 p){ vec2 d = (p - HC) / HR; return 1.0 - smoothstep(0.92, 1.28, length(d)); }
float faceW(vec2 p){ vec2 d = (p - vec2(778.0, 1430.0)) / vec2(250.0, 290.0); return exp(-dot(d, d)); }

vec2 eyeWarp(vec2 p, float cx, float x0, float x1, vec3 up, vec3 lo, vec2 iris, float blink, float squint){
  float t = (p.x - x0) / (x1 - x0);
  if (t < -0.2 || t > 1.2) return p;
  float X = p.x - cx;
  float u = up.x + up.y * X + up.z * X * X;
  float l = lo.x + lo.y * X + lo.z * X * X;
  float h = max(l - u, 0.0);
  float wx = smoothstep(-0.08, 0.16, t) * (1.0 - smoothstep(0.84, 1.08, t));
  // mirada: solo el iris, dentro de la apertura
  float inside = smoothstep(u, u + 6.0, p.y) * (1.0 - smoothstep(l - 6.0, l, p.y));
  float wi = (1.0 - smoothstep(26.0, 58.0, length(p - iris))) * inside;
  p -= uGaze * wi;
  // parpadeo: el párpado superior baja hasta la línea del inferior
  if (p.y < l && p.y > u - 95.0) {
    float fall = (p.y >= u) ? 1.0 : smoothstep(u - 95.0, u, p.y);
    p.y -= clamp(blink, 0.0, 1.0) * max(h, 3.0) * fall * wx;
  }
  // entrecerrar al sonreír: sube el párpado inferior
  if (p.y > l - 12.0 && p.y < l + 70.0) {
    float g = (p.y < l) ? 1.0 : 1.0 - smoothstep(l, l + 70.0, p.y);
    p.y += squint * 7.0 * g * wx;
  }
  return p;
}

void main(){
  vec2 p = vImg;
  float outside = step(p.x, 0.0) + step(uImg.x, p.x) + step(p.y, 0.0) + step(uImg.y, p.y);

  // 1) cabeza: rotación + traslación alrededor del cuello
  float wh = headW(p);
  vec2 q = p - PIVOT;
  float a = -uHead.z * wh;
  float ca = cos(a), sa = sin(a);
  p = vec2(ca * q.x - sa * q.y, sa * q.x + ca * q.y) + PIVOT;
  p -= uHead.xy * wh;
  // giro leve: el centro de la cara se desplaza más que el contorno (paralaje)
  p.x -= uHead.w * faceW(p);
  // respiración: pecho y hombros
  p.y += uBreath * 5.0 * smoothstep(1850.0, 2600.0, p.y);

  // 2) cejas
  p.y += uBrow * 9.0 * exp(-pow((p.x - 585.0) / 120.0, 2.0) - pow((p.y - 1150.0) / 60.0, 2.0));
  p.y += uBrow * 9.0 * exp(-pow((p.x - 970.0) / 120.0, 2.0) - pow((p.y - 1132.0) / 60.0, 2.0));

  // 3) ojos
  p = eyeWarp(p, ${f(EYES.L.cx)}, ${f(EYES.L.x0)}, ${f(EYES.L.x1)}, ${v3(eyeL.up)}, ${v3(eyeL.lo)}, vec2(${f(EYES.L.iris[0])}, ${f(EYES.L.iris[1])}), uBlinkL, uSquint);
  p = eyeWarp(p, ${f(EYES.R.cx)}, ${f(EYES.R.x0)}, ${f(EYES.R.x1)}, ${v3(eyeR.up)}, ${v3(eyeR.lo)}, vec2(${f(EYES.R.iris[0])}, ${f(EYES.R.iris[1])}), uBlinkR, uSquint);

  // 4) sonrisa: comisuras y mejillas
  float gL = exp(-pow((p.x - 627.0) / 78.0, 2.0) - pow((p.y - 1618.0) / 66.0, 2.0));
  float gR = exp(-pow((p.x - 919.0) / 78.0, 2.0) - pow((p.y - 1603.0) / 66.0, 2.0));
  p.y += uSmile * 13.0 * (gL + gR);
  p.x += uSmile * 5.0 * (gL - gR);
  p.y += uSmile * 7.0 * exp(-pow((p.x - 600.0) / 125.0, 2.0) - pow((p.y - 1395.0) / 90.0, 2.0));
  p.y += uSmile * 7.0 * exp(-pow((p.x - 955.0) / 125.0, 2.0) - pow((p.y - 1385.0) / 90.0, 2.0));

  // 5) boca y mandíbula
  float X = p.x - 777.0;
  float yl = 1604.6 - 0.052303 * X + 0.00025621 * X * X;
  float wz = exp(-pow((p.x - 773.0) / 215.0, 2.0) - pow((p.y - (yl + 25.0)) / 125.0, 2.0));
  p.x = 773.0 + (p.x - 773.0) * (1.0 + 0.24 * uRound * wz - 0.08 * uWide * wz);
  float hw = 146.0 * (1.0 - 0.22 * uRound + 0.05 * uWide);
  float nx = (p.x - 773.0) / hw;
  float O = uOpen * 60.0 * (1.0 - 0.3 * uWide) * (1.0 + 0.12 * uRound);
  // el bigote acompaña un poco
  float dm = yl - p.y;
  if (dm > 0.0 && dm < 85.0) {
    p.y += uOpen * 6.0 * (1.0 - dm / 85.0) * (1.0 - smoothstep(0.9, 1.5, abs(nx)));
  }
  float cav = 0.0, cd = 0.0, hairMask = 0.0, lipShade = 0.0;
  vec3 hairCol = vec3(0.0);
  float depth = p.y - yl;
  if (depth > -1.0) {
    float hm = pow(max(1.0 - nx * nx, 0.0), 1.05);
    float hj = 1.0 - smoothstep(170.0, 440.0, abs(p.x - 773.0));
    float tt = smoothstep(0.0, 120.0, depth);
    float D = O * mix(hm, hj, tt) * (1.0 - smoothstep(560.0, 780.0, depth));
    float sy = p.y - D;
    if (sy < yl) {
      float edge = 1.0 - smoothstep(0.82, 0.98, abs(nx));
      cav = clamp((yl - sy) / 2.2, 0.0, 1.0) * edge * smoothstep(0.0, 2.5, depth);
      cd = clamp(depth / max(O * hm, 1.0), 0.0, 1.0);
      // pelos del bigote que cuelgan delante de la boca abierta (reflejo del bigote hacia abajo)
      vec2 hp = vec2(p.x + 3.0 * sin(p.x * 0.11), yl - 3.0 - depth * 0.75);
      hairCol = texture2D(uTex, hp / uImg).rgb;
      float hl = dot(hairCol, vec3(0.3, 0.55, 0.15));
      hairMask = smoothstep(0.52, 0.78, hl) * (1.0 - smoothstep(2.0, 16.0, depth));
      sy = yl + 0.5;
    } else if (O > 0.5) {
      // sombra interna del labio inferior, justo debajo de la apertura
      float k = 1.0 - clamp((sy - yl) / 9.0, 0.0, 1.0);
      lipShade = k * smoothstep(0.0, 6.0, O * hm) * (1.0 - smoothstep(0.85, 1.0, abs(nx)));
    }
    p.y = sy;
  }

  vec3 col = texture2D(uTex, clamp(p, vec2(0.5), uImg - 0.5) / uImg).rgb;
  col *= 1.0 - 0.28 * lipShade;

  if (cav > 0.0) {
    float gn = fract(sin(dot(floor(vImg * 0.5), vec2(27.1, 61.7))) * 9137.3);
    vec3 mc = mix(vec3(0.045, 0.012, 0.012), vec3(0.24, 0.065, 0.06), smoothstep(0.2, 1.0, cd));
    // lengua, más clara abajo al centro
    mc = mix(mc, vec3(0.42, 0.15, 0.15), smoothstep(0.62, 1.0, cd) * (1.0 - smoothstep(0.0, 0.6, abs(nx))) * smoothstep(0.25, 0.7, uOpen) * 0.7);
    // insinuación de dientes superiores
    float teeth = (1.0 - smoothstep(0.08, 0.32, cd)) * smoothstep(0.45, 0.85, uOpen) * (1.0 - smoothstep(0.35, 0.65, abs(nx)));
    mc = mix(mc, vec3(0.70, 0.66, 0.60), teeth * 0.42);
    mc *= (1.0 - 0.6 * smoothstep(0.5, 0.95, abs(nx))) * (0.92 + 0.16 * gn);
    vec3 base = mix(col, hairCol, hairMask);
    col = mix(base, mc, cav * (1.0 - 0.9 * hairMask));
  }

  // luz del fuego (izquierda) y exposición automática de la cámara
  float lf = 1.0 - smoothstep(0.0, 1150.0, vImg.x);
  col *= vec3(1.0) + uFlick * lf * vec3(0.11, 0.06, 0.015);
  col *= uExpo;
  // ruido de sensor
  float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 97.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col += n * uGrain;
  col = mix(col, vec3(0.0), clamp(outside, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;
}

export class FaceRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const opts = { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" };
    const gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    if (!gl) throw new Error("WebGL no disponible");
    this.gl = gl;
    this.params = { open: 0, round: 0, wide: 0, smile: 0.15, blinkL: 0, blinkR: 0, brow: 0, breath: 0, flick: 0, squint: 0,
      head: [0, 0, 0, 0], gaze: [0, 0], grain: 0.022, expo: 1, shake: [0, 0, 0, 1] };
    this.focus = [780, 1330];
    this._init();
  }

  _init() {
    const gl = this.gl;
    const eyeL = buildEyeConsts(EYES.L), eyeR = buildEyeConsts(EYES.R);
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fragSource(eyeL, eyeR)));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ["uTex", "uImg", "uOpen", "uRound", "uWide", "uSmile", "uBlinkL", "uBlinkR", "uBrow", "uBreath", "uTime", "uFlick",
      "uSquint", "uGrain", "uExpo", "uHead", "uGaze", "uMx", "uMy"]) this.u[n] = gl.getUniformLocation(prog, n);
    gl.uniform2f(this.u.uImg, IMG_W, IMG_H);
    gl.uniform1i(this.u.uTex, 0);
  }

  setImage(img) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    this.tex = tex;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.gl.viewport(0, 0, w, h);
  }

  // Mapea coordenadas de pantalla (0..1) a píxeles de la imagen, con encuadre tipo "cover" y movimiento de cámara en mano
  _matrix() {
    const W = this.canvas.clientWidth || 1, H = this.canvas.clientHeight || 1;
    const s = Math.max(W / IMG_W, H / IMG_H);
    let ox = W / 2 - this.focus[0] * s, oy = H / 2 - this.focus[1] * s;
    ox = Math.min(0, Math.max(W - IMG_W * s, ox));
    oy = Math.min(0, Math.max(H - IMG_H * s, oy));
    const [dx, dy, rot, zoom] = this.params.shake;
    const cx = W / 2, cy = H / 2;
    const c = Math.cos(-rot) / zoom, sn = Math.sin(-rot) / zoom;
    // pantalla (px) -> pantalla sin sacudida -> imagen
    // so = R(-rot)/zoom * (sp - C - d) + C ; img = (so - o) / s
    const a11 = c / s, a12 = -sn / s, a21 = sn / s, a22 = c / s;
    const tx = (-(c * (cx + dx) - sn * (cy + dy)) + cx - ox) / s;
    const ty = (-(sn * (cx + dx) + c * (cy + dy)) + cy - oy) / s;
    // entrada en uv (0..1): sp = uv * (W,H)
    return { mx: [a11 * W, a12 * H, tx], my: [a21 * W, a22 * H, ty] };
  }

  draw(time) {
    const gl = this.gl, u = this.u, p = this.params;
    if (!this.tex) return;
    this.resize();
    const m = this._matrix();
    gl.uniform3f(u.uMx, m.mx[0], m.mx[1], m.mx[2]);
    gl.uniform3f(u.uMy, m.my[0], m.my[1], m.my[2]);
    gl.uniform1f(u.uOpen, p.open); gl.uniform1f(u.uRound, p.round); gl.uniform1f(u.uWide, p.wide);
    gl.uniform1f(u.uSmile, p.smile); gl.uniform1f(u.uBlinkL, p.blinkL); gl.uniform1f(u.uBlinkR, p.blinkR);
    gl.uniform1f(u.uBrow, p.brow); gl.uniform1f(u.uBreath, p.breath); gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uFlick, p.flick); gl.uniform1f(u.uSquint, p.squint); gl.uniform1f(u.uGrain, p.grain); gl.uniform1f(u.uExpo, p.expo);
    gl.uniform4f(u.uHead, p.head[0], p.head[1], p.head[2], p.head[3]);
    gl.uniform2f(u.uGaze, p.gaze[0], p.gaze[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
