import { FaceRenderer } from "./face.js";
import { Rig } from "./rig.js";
import { Voice } from "./voice.js";
import { Ears } from "./ears.js";
import { ScriptBrain, norm, quienDe, regaloTxt } from "./brain.js";
import { LINES, fill } from "./lines.js";
import * as mem from "./memory.js";
import { LocalLLM } from "./llm.js";

const $ = (s) => document.querySelector(s);
const screens = ["home", "calling", "call", "ended", "pin", "panel"];
function show(id) { for (const s of screens) $("#" + s).classList.toggle("active", s === id); }

const voice = new Voice();
const ears = new Ears();
const llm = new LocalLLM();
let face = null;
let santaImg = null;

// ---------------- nieve ----------------
function snow(canvas) {
  const ctx = canvas.getContext("2d");
  let flakes = [], w = 0, h = 0, running = true;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = Array.from({ length: Math.round((w * h) / 9000) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 2.6, s: 0.3 + Math.random() * 0.9, d: Math.random() * 6 }));
  }
  function step(t) {
    if (!running) return;
    if (canvas.offsetParent !== null || canvas.closest(".screen.active")) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (const f of flakes) {
        if (!reduce) { f.y += f.s; f.x += Math.sin(t / 1400 + f.d) * 0.35; }
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
        ctx.globalAlpha = 0.35 + f.r / 5;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    requestAnimationFrame(step);
  }
  resize(); addEventListener("resize", resize); requestAnimationFrame(step);
}

let rig = null, rafOn = false, lastT = 0;
function loop(ts) {
  if (!rafOn) return;
  const t = ts / 1000, dt = Math.min(0.05, lastT ? t - lastT : 0.016);
  lastT = t;
  rig.update(t, dt);
  face.draw(t);
  requestAnimationFrame(loop);
}
function startRender() { if (!rafOn) { rafOn = true; lastT = 0; requestAnimationFrame(loop); } }
function stopRender() { rafOn = false; }

// ---------------- sonidos de llamada ----------------
function ring(times = 2) {
  const ctx = voice.ctx;
  if (!ctx) return Promise.resolve();
  const start = ctx.currentTime + 0.1;
  const notes = [659.25, 783.99, 987.77];
  for (let r = 0; r < times; r++) {
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t0 = start + r * 1.7 + i * 0.16;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.18, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
      o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + 1);
    });
  }
  return new Promise((r) => setTimeout(r, times * 1700 + 200));
}

// ---------------- llamada ----------------
let inCall = false, session = null, brain = null, callStart = 0, timerInt = null, camStream = null, wakeLock = null;
let typedResolve = null, pendingTyped = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function speakLines(lines) {
  if (!lines) return;
  // prepara la siguiente mientras suena la actual
  let next = lines[0] ? voice.getClip(lines[0]).catch(() => null) : null;
  for (let i = 0; i < lines.length; i++) {
    if (!inCall) return;
    const text = lines[i];
    rig.state = "speaking";
    // si la voz natural tarda demasiado, mejor la del teléfono que un silencio largo
    let clip = await Promise.race([next, sleep(4500).then(() => null)]);
    next = lines[i + 1] && voice.mode !== "sistema" ? voice.getClip(lines[i + 1]).catch(() => null) : null;
    rig.speak(text, performance.now() / 1000);
    mem.addTurn(session, "noel", text);
    if (clip && voice.mode !== "sistema") await voice.playClip(clip);
    else await voice.speakNative(text);
    if (i < lines.length - 1) await sleep(260);
  }
  rig.state = "idle";
}

async function listen() {
  rig.state = "listening";
  $("#listening").hidden = false;
  $("#listening").classList.remove("hot");
  if (pendingTyped) {
    const text = pendingTyped; pendingTyped = null;
    $("#listening").hidden = true; rig.state = "idle";
    return { text, heard: true, typed: true };
  }
  const typed = new Promise((r) => { typedResolve = r; });
  // sin micrófono: Papá Noel espera un ratito y sigue, como si la nena hubiera contestado con gestos
  const noMic = (ms) => Promise.race([sleep(ms).then(() => ({ text: "", heard: Math.random() < 0.7, nomic: true })), typed]);
  let res;
  const t0 = Date.now();
  if (ears.supported && !ears.denied && !ears.broken) {
    ears.onSound = () => { $("#listening").classList.add("hot"); rig.impulse(); };
    ears.onInterim = (s) => { $("#heard-text").textContent = s || "—"; };
    res = await Promise.race([ears.listen({ maxWaitMs: 9000 }), typed]);
    ears.cancel();
    const quick = !res.typed && !res.text && !res.heard && Date.now() - t0 < 4000;
    if (!res.typed && (quick || /^(error|start-failed|denied)/.test(res.reason || ""))) {
      // el reconocimiento falló: no apurar a Papá Noel; si falla seguido, seguimos sin micrófono
      ears.fails = (ears.fails || 0) + 1;
      if (ears.fails >= 2 || res.reason === "denied") { ears.broken = true; $("#heard-text").textContent = "(el micrófono no está disponible: usá los botones)"; }
      res = await noMic(Math.max(0, 7000 - (Date.now() - t0)));
    } else if (!res.typed && (res.text || res.heard)) ears.fails = 0;
  } else {
    res = await noMic(7000);
  }
  typedResolve = null;
  $("#listening").hidden = true;
  rig.state = "idle";
  if (res.text) $("#heard-text").textContent = res.text;
  return res;
}

async function think(text) {
  const r = brain.respond(text);
  const p = mem.profile();
  // con IA activada: solo para lo que el guion no sabe responder
  if (p.brain === "ia" && llm.ready && text && (r.intent === "eco" || r.intent === "respuesta" || r.intent === "cuento")) {
    rig.state = "thinking";
    const filler = voice.say(LINES.filler[Math.floor(Math.random() * LINES.filler.length)]);
    const ans = await llm.reply(text, p, mem.load(), session.turns).catch(() => null);
    await filler;
    if (ans) return { lines: [ans], intent: "ia", end: false };
  }
  return r;
}

function timeUp() {
  const m = mem.profile().sessionMinutes;
  return m > 0 && Date.now() - callStart > m * 60000;
}

async function conversation() {
  await speakLines(brain.greeting(mem.load()));
  let silences = 0;
  while (inCall) {
    if (timeUp()) { await speakLines(brain.goodbyeTime()); return endCall(); }
    const res = await listen();
    if (!inCall) return;
    if (!res.text && !res.heard) {
      if (!res.nomic) silences++;
      if (silences >= 6) { await speakLines(brain.goodbyeTime()); return endCall(); }
      await speakLines(brain.silence(Math.max(1, silences)));
      continue;
    }
    silences = 0;
    mem.addTurn(session, "nena", res.text || "(sonidos)");
    const out = await think(res.text);
    await speakLines(out.lines);
    if (out.end) { await sleep(400); return endCall(); }
  }
}

async function startCall() {
  const p = mem.profile();
  await voice.unlock();
  voice.mode = p.voiceMode === "sistema" ? "sistema" : "auto";
  show("calling");
  $("#calling-text").textContent = "Llamando…";
  inCall = true;
  voice.pausePregen = true;
  pendingTyped = null; ears.broken = false; ears.fails = 0;
  session = mem.startSession();
  brain = new ScriptBrain(() => mem.profile());
  const greetPreview = brain.greeting(mem.load());
  brain.used.clear();
  // precarga del saludo mientras suena
  const pre = Promise.all(greetPreview.map((l) => voice.getClip(l, { allowLive: false }).catch(() => null)));
  try { wakeLock = await navigator.wakeLock?.request("screen"); } catch (e) {}
  if (p.selfView) startSelfView();
  await ring(2);
  if (!inCall) return;
  await pre;
  show("call");
  $("#connecting").classList.remove("gone");
  startRender();
  callStart = Date.now();
  $("#timer").textContent = "00:00";
  timerInt = setInterval(() => {
    const s = Math.floor((Date.now() - callStart) / 1000);
    $("#timer").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);
  await sleep(1100);
  $("#connecting").classList.add("gone");
  await sleep(500);
  // vuelve a armar el cerebro para que el saludo sea el precargado
  brain = new ScriptBrain(() => mem.profile());
  conversation().catch((e) => { console.error(e); endCall(); });
}

async function startSelfView() {
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 480 } }, audio: false });
    const v = $("#selfview");
    v.srcObject = camStream; v.hidden = false;
    $("#btn-cam").classList.remove("off");
  } catch (e) { $("#selfview").hidden = true; }
}
function stopSelfView() {
  camStream?.getTracks().forEach((t) => t.stop());
  camStream = null;
  $("#selfview").hidden = true;
  $("#btn-cam").classList.add("off");
}

function endCall() {
  if (!inCall) return;
  inCall = false;
  voice.pausePregen = false;
  voice.stop(); ears.cancel();
  typedResolve?.({ text: "", heard: false });
  clearInterval(timerInt);
  stopSelfView();
  try { wakeLock?.release(); } catch (e) {}
  stopRender();
  $("#helper").hidden = true;
  const s = Math.max(0, Math.floor((Date.now() - (callStart || Date.now())) / 1000));
  mem.endSession(session, brain ? [...brain.topics] : []);
  $("#end-duration").textContent = callStart ? `Duración ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "";
  callStart = 0;
  show("ended");
}

// ---------------- ayuda para los papás durante la llamada ----------------
const CHIPS = ["Hola", "Te quiero", "Quiero un regalo", "Jo, jo, jo", "Guau guau", "Muuu", "Cantame", "Rojo", "Sí", "No", "Chau"];
function setupHelper() {
  const chips = $("#chips");
  for (const c of CHIPS) {
    const b = document.createElement("button");
    b.className = "chip"; b.type = "button"; b.textContent = c;
    b.addEventListener("click", () => sendTyped(c));
    chips.appendChild(b);
  }
  $("#btn-helper").addEventListener("click", () => { $("#helper").hidden = !$("#helper").hidden; });
  $("#helper-close").addEventListener("click", () => { $("#helper").hidden = true; });
  $("#helper-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#helper-input").value.trim();
    if (v) { sendTyped(v); $("#helper-input").value = ""; }
  });
}
function sendTyped(text) {
  if (typedResolve) { ears.cancel(); typedResolve({ text, heard: true, typed: true }); }
  else pendingTyped = text; // Papá Noel está hablando: lo usa en cuanto termine
  $("#heard-text").textContent = text;
}

// ---------------- panel de los papás ----------------
let pinBuffer = "", pinMode = "check", pinFirst = "", pinFails = 0;
function openPin() {
  const p = mem.profile();
  pinBuffer = ""; pinFails = 0;
  pinMode = p.pin ? "check" : "create";
  $("#pin-title").textContent = p.pin ? "Solo para mamá y papá" : "Creá un PIN";
  $("#pin-sub").textContent = p.pin ? "Ingresá el PIN" : "Elegí 4 números para que la nena no entre al panel";
  drawPin();
  show("pin");
}
function drawPin() { [...$("#pin-dots").children].forEach((d, i) => d.classList.toggle("on", i < pinBuffer.length)); }
function pinKey(k) {
  if (k === "⌫") { pinBuffer = pinBuffer.slice(0, -1); drawPin(); return; }
  if (pinBuffer.length >= 4) return;
  pinBuffer += k; drawPin();
  if (pinBuffer.length < 4) return;
  setTimeout(() => {
    const p = mem.profile();
    if (pinMode === "check") {
      if (pinBuffer === p.pin) openPanel();
      else { pinFails++; shakePin(); }
    } else if (pinMode === "create" || pinMode === "change") {
      pinFirst = pinBuffer; pinMode = "confirm"; pinBuffer = "";
      $("#pin-sub").textContent = "Repetí el PIN"; drawPin();
    } else if (pinMode === "confirm") {
      if (pinBuffer === pinFirst) { mem.setProfile({ pin: pinBuffer }); openPanel(); }
      else { pinMode = "create"; $("#pin-sub").textContent = "No coinciden. Elegí 4 números otra vez"; shakePin(); }
    }
  }, 120);
}
function shakePin() {
  pinBuffer = ""; drawPin();
  const d = $("#pin-dots"); d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake");
}
function setupPin() {
  const pad = $("#pin-pad");
  for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = k;
    if (!k) b.style.visibility = "hidden";
    else b.addEventListener("click", () => pinKey(k));
    if (k === "⌫") b.setAttribute("aria-label", "Borrar");
    pad.appendChild(b);
  }
  $("#pin-back").addEventListener("click", () => show("home"));
}

function linesTo(text) { return text.split(/\n+/).map((s) => s.trim()).filter(Boolean); }
function parsePets(text) { return linesTo(text).map((l) => { const [name, type] = l.split(/\s*[,;-]\s*/); return { name: (name || "").trim(), type: (type || "").trim() }; }).filter((x) => x.name); }
function parseFamily(text) { return linesTo(text).map((l) => { const [rel, name] = l.split(/\s*[,;-]\s*/); return name ? { rel: rel.trim(), name: name.trim() } : { rel: "", name: rel.trim() }; }).filter((x) => x.name); }
function parseList(text) { return text.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean); }

function fillPanel() {
  const p = mem.profile();
  $("#card-setup").hidden = !!p.setupDone;
  $("#f-name").value = p.childName || "";
  $("#f-age").value = p.age || 2;
  $("#f-pets").value = (p.pets || []).map((x) => x.type ? `${x.name}, ${x.type}` : x.name).join("\n");
  $("#f-family").value = (p.family || []).map((x) => x.rel ? `${x.rel}, ${x.name}` : x.name).join("\n");
  $("#f-likes").value = (p.likes || []).join(", ");
  $("#f-gifts").value = (p.gifts || []).join(", ");
  $("#f-news").value = p.newsDate === new Date().toDateString() ? p.news : "";
  $("#f-voice").value = p.voiceMode === "sistema" ? "sistema" : "auto";
  $("#f-minutes").value = String(p.sessionMinutes);
  $("#f-selfview").checked = !!p.selfView;
  $("#f-brain").value = p.brain || "guion";
  renderHistory();
  renderVoiceStatus();
  renderBrainStatus();
}

function renderHistory() {
  const d = mem.load();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  $("#facts").innerHTML = d.facts.length ? d.facts.slice(-12).reverse().map((f) => `<p>• ${esc(f.text)}</p>`).join("") : `<p class="muted">Todavía nada.</p>`;
  $("#requests").innerHTML = d.requests.length ? d.requests.slice(-12).reverse().map((f) => `<p>• ${esc(f.text)} <span class="muted">(${new Date(f.t).toLocaleDateString("es-AR")})</span></p>`).join("") : `<p class="muted">Todavía nada.</p>`;
  const ss = d.sessions.filter((s) => s.end).slice(-8).reverse();
  $("#history").innerHTML = ss.length ? ss.map((s) => {
    const dur = Math.round((s.end - s.start) / 1000);
    const turns = s.turns.slice(0, 40).map((t) => `<p><span class="${t.who === "nena" ? "who-nena" : "muted"}">${t.who === "nena" ? "Nena" : "Papá Noel"}:</span> ${esc(t.text)}</p>`).join("");
    return `<details class="hist-item"><summary>${new Date(s.start).toLocaleString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}</summary>${turns}</details>`;
  }).join("") : `<p class="muted">Todavía no hubo llamadas.</p>`;
}

// Frases con datos de la familia que conviene generar de antemano
function personalLines() {
  const p = mem.profile();
  const out = new Set();
  const add = (list, vars) => list.forEach((s) => { const f = fill(s, vars); if (!/\{[a-z]+\}/.test(f)) out.add(f); });
  const base = { nombre: p.childName };
  if (p.childName) {
    for (const k of ["greet_first", "greet_again", "r_hola", "r_amor", "r_nombre_nene", "r_silencio_n", "bye", "bye_time"]) add(LINES[k], base);
  }
  for (const pet of p.pets || []) { add(LINES.mem_pet, { mascota: pet.name }); add(LINES.r_mascota, { mascota: pet.name }); add(LINES.a_mascota, { mascota: pet.name }); }
  for (const f of p.family || []) add(LINES.r_familia, { quien: quienDe(f) });
  for (const g of p.gifts || []) add(LINES.r_regalo_ok, { regalo: regaloTxt(g) });
  for (const g of p.likes || []) add(LINES.mem_like, { gusto: g, gusta: /^(los|las)\b|s$/i.test(g.trim()) ? "gustan" : "gusta" });
  if (p.news && p.newsDate === new Date().toDateString()) add(LINES.news, { noticia: p.news });
  return [...out];
}

let preparing = false;
async function prepareVoice() {
  if (preparing) return;
  const p = mem.profile();
  if (p.voiceMode === "sistema") { renderVoiceStatus(); return; }
  preparing = true;
  try {
    if (voice.kokoro !== "ready") {
      voice.startKokoro();
      await new Promise((res) => {
        const iv = setInterval(() => { if (voice.kokoro === "ready" || voice.kokoro === "error") { clearInterval(iv); res(); } }, 500);
      });
    }
    if (voice.kokoro !== "ready") return;
    const lines = personalLines();
    $("#voice-progress").hidden = false;
    await voice.pregenerate(lines, (d, n) => {
      $("#voice-progress i").style.width = `${Math.round((d / n) * 100)}%`;
      $("#voice-status").textContent = `Preparando frases con su nombre: ${d} de ${n}…`;
    });
    mem.setProfile({ voiceReadyFor: lines.length, voiceReadyAt: Date.now() });
  } finally {
    preparing = false;
    $("#voice-progress").hidden = true;
    renderVoiceStatus();
  }
}

function renderVoiceStatus() {
  const p = mem.profile();
  const el = $("#voice-status");
  if (!el) return;
  if (p.voiceMode === "sistema") el.textContent = "Usa la voz del teléfono (suena menos a Papá Noel).";
  else if (voice.kokoro === "loading") el.textContent = `Descargando la voz de Papá Noel… ${voice.kokoroProgress || 0}%`;
  else if (voice.kokoro === "error") el.textContent = "Este teléfono no pudo cargar la voz natural. Las frases generales igual suenan con la voz de Papá Noel; las que llevan nombres usan la voz del teléfono.";
  else if (preparing) {}
  else if (p.voiceReadyAt) el.textContent = `Listo: ${p.voiceReadyFor || 0} frases con sus datos ya tienen la voz de Papá Noel.`;
  else el.textContent = "Falta preparar las frases con su nombre.";
  updateHomeBadge();
}

function renderBrainStatus() {
  const p = mem.profile();
  const el = $("#brain-status");
  if (p.brain !== "ia") { el.textContent = "Responde con frases pensadas para chiquitos. No necesita descargar nada."; return; }
  if (!llm.supported()) { el.textContent = "Este navegador no tiene WebGPU, así que la IA no puede funcionar acá. Se usa el guion."; return; }
  el.textContent = llm.ready ? "IA lista. Se usa solo cuando el guion no sabe qué responder, y pasa por filtros de seguridad." :
    llm.loading ? `Descargando IA… ${llm.progress}%` : llm.error ? "No se pudo cargar la IA en este teléfono. Se usa el guion." : "La IA se descarga al guardar (usá wifi).";
}

function updateHomeBadge() {
  const p = mem.profile();
  const b = $("#voice-badge");
  if (!p.setupDone) { b.hidden = false; b.textContent = "Mamá o papá: entren al panel (arriba a la derecha) para preparar a Papá Noel."; return; }
  if (voice.kokoro === "loading") { b.hidden = false; b.textContent = `Preparando la voz de Papá Noel… ${voice.kokoroProgress || 0}%`; return; }
  b.hidden = true;
}

function openPanel() { fillPanel(); show("panel"); }

function setupPanel() {
  $("#save-profile").addEventListener("click", async () => {
    const age = parseInt($("#f-age").value, 10);
    mem.setProfile({
      childName: $("#f-name").value.trim(),
      age: Number.isFinite(age) ? age : 2,
      pets: parsePets($("#f-pets").value),
      family: parseFamily($("#f-family").value),
      likes: parseList($("#f-likes").value),
      gifts: parseList($("#f-gifts").value),
      voiceMode: $("#f-voice").value,
      sessionMinutes: parseInt($("#f-minutes").value, 10),
      selfView: $("#f-selfview").checked,
      brain: $("#f-brain").value,
      setupDone: true,
    });
    $("#save-msg").textContent = "Guardado.";
    $("#card-setup").hidden = true;
    voice.mode = mem.profile().voiceMode === "sistema" ? "sistema" : "auto";
    if (mem.profile().brain === "ia") startLLM();
    prepareVoice();
  });
  $("#save-news").addEventListener("click", () => {
    mem.setProfile({ news: $("#f-news").value.trim().replace(/[.!]+$/, ""), newsDate: new Date().toDateString() });
    $("#save-msg").textContent = "";
    prepareVoice();
  });
  for (const id of ["#f-voice", "#f-minutes", "#f-selfview", "#f-brain"]) {
    $(id).addEventListener("change", () => {
      mem.setProfile({ voiceMode: $("#f-voice").value, sessionMinutes: parseInt($("#f-minutes").value, 10), selfView: $("#f-selfview").checked, brain: $("#f-brain").value });
      voice.mode = mem.profile().voiceMode === "sistema" ? "sistema" : "auto";
      if (id === "#f-brain" && mem.profile().brain === "ia") startLLM();
      renderVoiceStatus(); renderBrainStatus();
    });
  }
  $("#btn-prepare").addEventListener("click", async () => { await voice.unlock(); prepareVoice(); });
  $("#btn-test-voice").addEventListener("click", async () => {
    await voice.unlock();
    const p = mem.profile();
    voice.mode = p.voiceMode === "sistema" ? "sistema" : "auto";
    await voice.say(p.childName ? fill(LINES.greet_again[0], { nombre: p.childName }) : LINES.greet_generic[1]);
  });
  $("#btn-change-pin").addEventListener("click", () => {
    pinMode = "change"; pinBuffer = "";
    $("#pin-title").textContent = "PIN nuevo"; $("#pin-sub").textContent = "Elegí 4 números"; drawPin(); show("pin");
  });
  let confirmReset = 0, confirmClear = 0;
  $("#btn-clear-history").addEventListener("click", () => {
    if (Date.now() - confirmClear > 4000) { confirmClear = Date.now(); $("#confirm-msg").textContent = "Tocá otra vez “Borrar charlas” para confirmar."; return; }
    mem.clearHistory(); renderHistory(); $("#confirm-msg").textContent = "Charlas borradas.";
  });
  $("#btn-reset").addEventListener("click", async () => {
    if (Date.now() - confirmReset > 4000) { confirmReset = Date.now(); $("#confirm-msg").textContent = "Tocá otra vez “Borrar todo” para confirmar. Se borran los datos, el PIN y las charlas."; return; }
    mem.resetAll(); await voice.clearPersonal(); $("#confirm-msg").textContent = "Todo borrado."; fillPanel(); show("home"); updateHomeBadge();
  });
  $("#panel-close").addEventListener("click", () => { show("home"); updateHomeBadge(); });
}

function startLLM() {
  if (!llm.supported() || llm.ready || llm.loading) { renderBrainStatus(); return; }
  llm.onProgress = () => renderBrainStatus();
  llm.load().catch(() => {}).finally(renderBrainStatus);
  renderBrainStatus();
}

// ---------------- arranque ----------------
async function boot() {
  mem.load();
  mem.askPersistence();
  snow($("#snow")); snow($("#snow2"));
  setupHelper(); setupPin(); setupPanel();
  voice.onKokoroState = () => renderVoiceStatus();
  voice.loadIndex();
  try {
    face = new FaceRenderer($("#face"));
    rig = new Rig(face, () => voice.mouth());
    santaImg = new Image();
    santaImg.src = "img/santa.jpg";
    await santaImg.decode();
    face.setImage(santaImg);
  } catch (e) {
    console.error(e);
    $("#home-hint").textContent = "Este teléfono no puede mostrar la videollamada (falta WebGL).";
  }

  $("#btn-call").addEventListener("click", () => {
    const p = mem.profile();
    if (!p.setupDone && !p.childName) { openPin(); return; }
    startCall().catch((e) => { console.error(e); endCall(); });
  });
  $("#btn-cancel").addEventListener("click", () => { inCall = false; voice.pausePregen = false; voice.stop(); session && mem.endSession(session, []); stopSelfView(); show("home"); });
  $("#btn-hang").addEventListener("click", () => endCall());
  $("#btn-home").addEventListener("click", () => show("home"));
  $("#btn-parents").addEventListener("click", () => openPin());
  $("#btn-cam").addEventListener("click", () => { if (camStream) stopSelfView(); else startSelfView(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && inCall) endCall(); });

  // la voz natural se descarga sola si ya está configurado (la primera vez, desde el panel)
  const p = mem.profile();
  voice.mode = p.voiceMode === "sistema" ? "sistema" : "auto";
  if (p.setupDone && p.voiceMode !== "sistema") voice.startKokoro();
  if (p.setupDone && p.brain === "ia") startLLM();
  updateHomeBadge();

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
}

window.__noel = { voice, ears, mem, llm, get rig() { return rig; }, get inCall() { return inCall; } };
boot();
