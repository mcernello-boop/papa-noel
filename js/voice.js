// Voz de Papá Noel: frases pregrabadas, voz generada en el teléfono (Kokoro, em_santa) y voz del sistema como respaldo.
// De cada audio se calcula, cuadro a cuadro, cuánto se abre la boca y qué forma tiene (sincronía labial).
import { lineKey } from "./lines.js";

const FPS = 100; // cuadros de análisis por segundo
const PERSONAL_CACHE = "noel-voz-personal-v1";

// ---------- análisis del audio ----------
function fftMag(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

export function analyze(samples, sr) {
  const hop = Math.round(sr / FPS);
  const N = sr > 32000 ? 2048 : 1024;
  const frames = Math.ceil(samples.length / hop);
  const e = new Float32Array(frames), cen = new Float32Array(frames), hf = new Float32Array(frames);
  const re = new Float32Array(N), im = new Float32Array(N);
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  const binHz = sr / N;
  const b150 = Math.floor(150 / binHz), b4k = Math.floor(4000 / binHz), b8k = Math.min(N / 2 - 1, Math.floor(8000 / binHz));
  for (let f = 0; f < frames; f++) {
    const start = f * hop - N / 2;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const s = samples[start + i] || 0;
      re[i] = s * win[i]; im[i] = 0; sum += s * s;
    }
    e[f] = Math.sqrt(sum / N);
    fftMag(re, im);
    let num = 0, den = 0, hi = 0, all = 0;
    for (let k = b150; k <= b8k; k++) {
      const m = re[k] * re[k] + im[k] * im[k];
      all += m;
      if (k <= b4k) { num += m * k * binHz; den += m; } else hi += m;
    }
    cen[f] = den > 0 ? num / den : 0;
    hf[f] = all > 0 ? hi / all : 0;
  }
  const sorted = Array.from(e).sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1e-3;
  const open = new Float32Array(frames), round = new Float32Array(frames), wide = new Float32Array(frames);
  let o = 0, r = 0, w = 0;
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let f = 0; f < frames; f++) {
    let tgt = e[f] < ref * 0.07 ? 0 : Math.pow(Math.min(1, e[f] / ref), 0.75);
    let tr = 1 - sm(650, 1150, cen[f]), tw = sm(1500, 2350, cen[f]);
    if (hf[f] > 0.42) { tgt = Math.min(tgt, 0.22); tw = 0.55; tr = 0; } // s, f, j: dientes, boca casi cerrada
    if (tgt === 0) { tr *= 0.3; tw *= 0.3; }
    o += (tgt - o) * (tgt > o ? 0.55 : 0.3);
    r += (tr - r) * 0.22;
    w += (tw - w) * 0.22;
    open[f] = o; round[f] = r * Math.min(1, o * 3); wide[f] = w * Math.min(1, o * 3 + 0.2);
  }
  return { open, round, wide, fps: FPS, duration: samples.length / sr };
}

// Rasgos sintéticos a partir del texto (para la voz del sistema, que no deja leer el audio)
function textFeatures(text, rate) {
  const syl = [];
  const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const ch of t) {
    if ("aeiou".includes(ch)) syl.push(ch);
    else if (",;".includes(ch)) syl.push(","), syl.push(",");
    else if (".!?".includes(ch)) syl.push(","), syl.push(","), syl.push(",");
  }
  const sylDur = 0.17 / rate;
  const frames = Math.ceil(syl.length * sylDur * FPS) + 10;
  const open = new Float32Array(frames), round = new Float32Array(frames), wide = new Float32Array(frames);
  syl.forEach((v, i) => {
    if (v === ",") return;
    const c = Math.round((i + 0.5) * sylDur * FPS), half = Math.round(sylDur * FPS * 0.55);
    const amp = v === "a" ? 0.85 : v === "o" ? 0.65 : v === "e" ? 0.55 : 0.4;
    for (let k = -half; k <= half; k++) {
      const f = c + k; if (f < 0 || f >= frames) continue;
      const g = 0.5 + 0.5 * Math.cos((Math.PI * k) / half);
      open[f] = Math.max(open[f], amp * g);
      if (v === "o" || v === "u") round[f] = Math.max(round[f], g);
      if (v === "e" || v === "i") wide[f] = Math.max(wide[f], g * 0.8);
    }
  });
  return { open, round, wide, fps: FPS, duration: frames / FPS };
}

function encodeWav(f32, sr) {
  const n = f32.length, buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767))), true);
  return new Blob([buf], { type: "audio/wav" });
}

// recorta silencio inicial/final y normaliza el volumen de lo generado en el teléfono
function tidy(f32, sr) {
  let a = 0, b = f32.length - 1;
  const th = 0.004;
  while (a < b && Math.abs(f32[a]) < th) a++;
  while (b > a && Math.abs(f32[b]) < th) b--;
  a = Math.max(0, a - Math.round(sr * 0.02)); b = Math.min(f32.length - 1, b + Math.round(sr * 0.06));
  const out = f32.slice(a, b + 1);
  let peak = 0; for (const s of out) peak = Math.max(peak, Math.abs(s));
  const g = peak > 0 ? Math.min(3, 0.85 / peak) : 1;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return out;
}

export class Voice {
  constructor() {
    this.ctx = null;
    this.mem = new Map();
    this.index = {};
    this.worker = null;
    this.kokoro = "off"; // off | loading | ready | error
    this.kokoroProgress = 0;
    this.onKokoroState = null;
    this.reqId = 0;
    this.pending = new Map();
    this.current = null; // { feats, startAt, native }
    this.nativeVoice = null;
    this.mode = "auto"; // auto | natural | sistema
  }

  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 1;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state !== "running") await this.ctx.resume().catch(() => {});
    const b = this.ctx.createBuffer(1, 1, 22050);
    const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    if ("speechSynthesis" in window) { try { speechSynthesis.getVoices(); } catch (e) {} }
  }

  async loadIndex() {
    try { this.index = await (await fetch("voz/index.json")).json(); } catch (e) { this.index = {}; }
  }

  // ---------- Kokoro en un worker ----------
  startKokoro() {
    if (this.worker || this.mode === "sistema") return;
    try {
      this.worker = new Worker(new URL("./kokoro-worker.js", import.meta.url), { type: "module" });
    } catch (e) { this._setKokoro("error"); return; }
    this.worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === "progress") { this.kokoroProgress = m.p; this.onKokoroState?.(this.kokoro, m.p); return; }
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      if (m.type === "error") p.reject(new Error(m.error)); else p.resolve(m);
    };
    this.worker.onerror = () => this._setKokoro("error");
    this._setKokoro("loading");
    this._call({ type: "load" }, 300000).then(() => this._setKokoro("ready")).catch(() => this._setKokoro("error"));
  }

  _setKokoro(s) { this.kokoro = s; this.onKokoroState?.(s, this.kokoroProgress); }

  _call(msg, timeout = 60000) {
    const id = ++this.reqId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...msg, id });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("timeout")); } }, timeout);
    });
  }

  async _generate(text) {
    const m = await this._call({ type: "say", text }, 90000);
    return tidy(m.pcm, m.sr);
  }

  // ---------- obtener el audio de una frase ----------
  async _decode(arrayBuf) {
    return await new Promise((res, rej) => {
      const p = this.ctx.decodeAudioData(arrayBuf, res, rej);
      if (p && p.then) p.then(res, rej);
    });
  }

  async _personalCache() { try { return await caches.open(PERSONAL_CACHE); } catch (e) { return null; } }

  async hasClip(text) {
    const key = lineKey(text);
    if (this.mem.has(key) || this.index[key]) return true;
    const c = await this._personalCache();
    return !!(c && await c.match(`voz-personal/${key}.wav`));
  }

  // Devuelve {buffer, feats} o null si no hay forma de tenerla ya (allowLive: generar en el momento)
  async getClip(text, { allowLive = true } = {}) {
    const key = lineKey(text);
    if (this.mem.has(key)) return this.mem.get(key);
    let ab = null;
    if (this.index[key]) {
      try { ab = await (await fetch(`voz/${key}.mp3`)).arrayBuffer(); } catch (e) { ab = null; }
    }
    if (!ab) {
      const c = await this._personalCache();
      const r = c && await c.match(`voz-personal/${key}.wav`);
      if (r) ab = await r.arrayBuffer();
    }
    if (!ab && allowLive && this.kokoro === "ready" && this.mode !== "sistema") {
      try {
        const pcm = await this._generate(text);
        const blob = encodeWav(pcm, 24000);
        const c = await this._personalCache();
        if (c) await c.put(`voz-personal/${key}.wav`, new Response(blob, { headers: { "Content-Type": "audio/wav" } }));
        ab = await blob.arrayBuffer();
      } catch (e) { ab = null; }
    }
    if (!ab) return null;
    try {
      const buffer = await this._decode(ab);
      const clip = { buffer, feats: analyze(buffer.getChannelData(0), buffer.sampleRate) };
      if (this.mem.size > 60) this.mem.delete(this.mem.keys().next().value);
      this.mem.set(key, clip);
      return clip;
    } catch (e) { return null; }
  }

  // Genera y guarda de antemano las frases con el nombre, la mascota, etc.
  async pregenerate(texts, onProgress) {
    let done = 0;
    for (const t of texts) {
      if (!(await this.hasClip(t))) {
        try {
          const pcm = await this._generate(t);
          const c = await this._personalCache();
          if (c) await c.put(`voz-personal/${lineKey(t)}.wav`, new Response(encodeWav(pcm, 24000), { headers: { "Content-Type": "audio/wav" } }));
        } catch (e) { /* sigue con la próxima */ }
      }
      done++;
      onProgress?.(done, texts.length);
    }
  }

  async clearPersonal() { try { await caches.delete(PERSONAL_CACHE); } catch (e) {} this.mem.clear(); }

  // ---------- reproducir ----------
  playClip(clip) {
    return new Promise((resolve) => {
      const src = this.ctx.createBufferSource();
      src.buffer = clip.buffer;
      src.connect(this.gain);
      const startAt = this.ctx.currentTime + 0.05;
      this.current = { feats: clip.feats, startAt, src };
      src.onended = () => { if (this.current && this.current.src === src) this.current = null; resolve(); };
      src.start(startAt);
    });
  }

  stop() {
    try { this.current?.src?.stop(); } catch (e) {}
    try { if (this.current?.native) speechSynthesis.cancel(); } catch (e) {}
    this.current = null;
  }

  pickNativeVoice() {
    if (!("speechSynthesis" in window)) return null;
    const vs = speechSynthesis.getVoices().filter((v) => /^es/i.test(v.lang));
    if (!vs.length) return null;
    const male = /diego|jorge|juan|carlos|pablo|enrique|miguel|andr[eé]s|male|hombre|masculin/i;
    const score = (v) => (/es-AR/i.test(v.lang) ? 6 : /es-(US|MX|419|CO|CL|UY)/i.test(v.lang) ? 4 : 2) + (male.test(v.name) ? 5 : 0) + (v.localService ? 1 : 0);
    return vs.sort((a, b) => score(b) - score(a))[0];
  }

  speakNative(text) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text.replace(/jo, jo, jo/gi, "jo jo jo"));
      const v = this.nativeVoice || (this.nativeVoice = this.pickNativeVoice());
      if (v) u.voice = v;
      u.lang = v?.lang || "es-AR";
      u.rate = 0.92; u.pitch = 0.72; u.volume = 1;
      const feats = textFeatures(text, u.rate);
      const cur = { feats, startAt: Infinity, native: true };
      this.current = cur;
      const done = () => { if (this.current === cur) this.current = null; resolve(); };
      u.onstart = () => { cur.startAt = this.ctx ? this.ctx.currentTime : performance.now() / 1000; };
      u.onend = done; u.onerror = done;
      setTimeout(done, feats.duration * 1000 * 1.8 + 3000);
      speechSynthesis.speak(u);
    });
  }

  // Dice una frase: pregrabada / personalizada / generada / voz del sistema
  async say(text, { allowLive = true } = {}) {
    const clip = this.mode === "sistema" ? null : await this.getClip(text, { allowLive });
    if (clip) return this.playClip(clip);
    return this.speakNative(text);
  }

  // Forma de la boca en este instante
  mouth() {
    const c = this.current;
    if (!c) return null;
    const now = this.ctx ? this.ctx.currentTime : performance.now() / 1000;
    const t = now - c.startAt + 0.035;
    if (t < 0) return { open: 0, round: 0, wide: 0 };
    const f = c.feats, x = t * f.fps, i = Math.floor(x), k = x - i;
    if (i >= f.open.length - 1) return { open: 0, round: 0, wide: 0 };
    const lerp = (a) => a[i] * (1 - k) + a[i + 1] * k;
    return { open: lerp(f.open), round: lerp(f.round), wide: lerp(f.wide) };
  }
}
