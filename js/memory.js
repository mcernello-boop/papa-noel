// Memoria en el teléfono: datos de la nena (cargados por los papás), charlas anteriores y cosas que contó.
const KEY = "papanoel.v1";

const DEFAULT = {
  profile: {
    childName: "", age: 2, pets: [], family: [], likes: [], gifts: [], news: "", newsDate: "",
    pin: "", sessionMinutes: 5, brain: "guion", voiceMode: "auto", selfView: true, setupDone: false,
  },
  sessions: [], // {start, end, turns:[{who, text, t}], topics:[]}
  facts: [],    // {t, text}
  requests: [], // {t, text}
};

let memoryOK = true;
let cache = null;

export function load() {
  if (cache) return cache;
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { memoryOK = false; }
  cache = data ? { ...structuredClone(DEFAULT), ...data, profile: { ...DEFAULT.profile, ...(data.profile || {}) } } : structuredClone(DEFAULT);
  return cache;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); return true; } catch (e) { memoryOK = false; return false; }
}

export function storageWorks() { return memoryOK; }

export async function askPersistence() {
  try { if (navigator.storage?.persist) return await navigator.storage.persist(); } catch (e) {}
  return false;
}

export function profile() { return load().profile; }

export function setProfile(patch) { Object.assign(load().profile, patch); save(); }

export function startSession() {
  const s = { start: Date.now(), end: null, turns: [], topics: [] };
  load().sessions.push(s);
  if (cache.sessions.length > 40) cache.sessions.splice(0, cache.sessions.length - 40);
  save();
  return s;
}

export function addTurn(session, who, text) {
  if (!text) return;
  session.turns.push({ who, text, t: Date.now() });
  if (who === "nena") extractFacts(text);
  save();
}

export function endSession(session, topics) {
  session.end = Date.now();
  session.topics = [...(topics || [])];
  // una charla sin nada es ruido: no la guardamos
  if (!session.turns.some((t) => t.who === "nena")) {
    const i = cache.sessions.indexOf(session);
    if (i >= 0 && session.turns.length < 3) cache.sessions.splice(i, 1);
  }
  save();
}

function extractFacts(text) {
  const t = text.toLowerCase().trim();
  const now = Date.now();
  const add = (list, s) => {
    if (!s || s.length < 3 || s.length > 60) return;
    if (cache[list].some((f) => f.text === s)) return;
    cache[list].push({ t: now, text: s });
    if (cache[list].length > 50) cache[list].shift();
  };
  let m;
  if ((m = t.match(/me gustan? (?:mucho |muchísimo )?(.{3,40})/))) add("facts", "le gusta " + m[1].replace(/[.!?]+$/, ""));
  if ((m = t.match(/(?:mi|mis) (perr\w*|gat\w*|herman\w*|amig\w*|abuel\w*) (?:se llama |es )?(\w+)/))) add("facts", `contó de su ${m[1]} ${m[2]}`);
  if ((m = t.match(/(?:quiero|traeme|me traés|me traes|pido) (?:un |una |unos |unas |el |la )?(.{3,40})/))) add("requests", m[1].replace(/[.!?]+$/, ""));
}

export function clearHistory() {
  const c = load();
  c.sessions = []; c.facts = []; c.requests = [];
  save();
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  cache = null;
  return load();
}
