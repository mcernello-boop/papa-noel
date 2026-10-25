// Cerebro de Papá Noel: entiende palabras clave de una nena de 2 años y arma respuestas cortas del guion.
// Opcionalmente usa un modelo de IA local (WebLLM) para lo que el guion no cubre, con filtros de seguridad.
import { LINES, fill } from "./lines.js";

export function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zñ0-9\s]/g, " ").replace(/(.)\1{2,}/g, "$1$1").replace(/\s+/g, " ").trim();
}

const has = (t, re) => re.test(t);

const ANIMALES = {
  perro: /\b(perr\w*|guau|guaguau|cachorr\w*|pichicho)\b/, gato: /\b(gat\w*|miau|michi\w*)\b/, vaca: /\b(vac\w*|mu+)\b/,
  pato: /\b(pat(o|ito|itos|os)|cuac)\b/, oveja: /\b(ovej\w*|be+)\b/, caballo: /\b(caball\w*|pony|poni)\b/, leon: /\b(leon\w*|tigre\w*)\b/,
  pollito: /\b(poll\w*|gallin\w*|pio)\b/, chancho: /\b(chanch\w*|cerdit\w*|oink)\b/, dinosaurio: /\b(dino\w*)\b/,
  pez: /\b(pez|peces|pececit\w*|pescad\w*)\b/, mono: /\b(mon(o|ito|itos|os))\b/, pajaro: /\b(pajar\w*)\b/, oso: /\b(os(o|ito|itos|os))\b/,
  conejo: /\b(conej\w*)\b/, rana: /\b(ran(a|ita|itas|as)|sapo\w*)\b/, elefante: /\b(elefant\w*)\b/, jirafa: /\b(jiraf\w*)\b/,
};
const COLORES = { rojo: /\b(roj\w*|colorad\w*)\b/, azul: /\b(azul\w*|celeste)\b/, verde: /\b(verde\w*)\b/, amarillo: /\b(amarill\w*)\b/,
  blanco: /\b(blanc\w*)\b/, rosa: /\b(rosa\w*|fucsia)\b/, violeta: /\b(violet\w*|lila)\b/, naranja: /\b(naranj\w*)\b/, negro: /\b(negr\w*)\b/ };

// Orden de prioridad de las intenciones
const INTENTS = [
  ["chau", /\b(chau|chao|adios|nos vemos|me voy|bye)\b/],
  ["mal", /\b(triste|llor\w*|miedo|me duele|duele|pupa|me pegue|me lastime|me cai|enferm\w*|mal)\b/],
  ["amor", /\b(te quiero|te amo|te adoro|abrazo\w*)\b/],
  ["beso", /\b(beso\w*|muac|mua)\b/],
  ["regalo", /\b(quiero|traeme|trae|traes|traigas|regal\w*|pedir|pido|compra\w*|me das|dame)\b/],
  ["jojo", /\b(jo jo|jojo|jo|ho ho|hoho)\b/],
  ["risa", /\b(ja ja|jaja|jeje|jiji)\b/],
  ["hola", /\b(hola\w*|holi\w*|buen dia|buenas|hello|hi)\b/],
  ["quien", /\b(quien sos|como te llamas|sos papa noel|papa noel)\b/],
  ["polo", /\b(polo norte|nieve|frio|hielo)\b/],
  ["renos", /\b(reno\w*)\b/],
  ["duendes", /\b(duende\w*|taller)\b/],
  ["trineo", /\b(trineo\w*)\b/],
  ["navidad", /\b(navidad\w*|arbolito\w*|arbol|nochebuena)\b/],
  ["cancion", /\b(cant\w*|cancion\w*|musica)\b/],
  ["baile", /\b(bail\w*|danz\w*)\b/],
  ["cuento", /\b(cuento\w*|historia)\b/],
  ["edad", /\b(anos|cuantos)\b/],
  ["comida", /\b(galletit\w*|galleta\w*|leche|zanahori\w*|comi\w*|torta\w*|caramel\w*|chocolat\w*|helado\w*|rico)\b/],
  ["dormir", /\b(dormir|duermo|noni|nono|a la cama|tuto)\b/],
  ["gracias", /\b(gracias)\b/],
  ["bien", /\b(bien|contenta|contento|feliz)\b/],
  ["si", /^(si|sii|sip|claro|dale|bueno|ok|aja)\b/],
  ["no", /^(no|nop|nooo)\b/],
];

const FAMILIA = { mama: /\b(mama\w*|mami|ma)\b/, papa: /\b(papa(?! noel)\w*|papi|pa)\b/, abuela: /\b(abuel(a|ita)|nona|bobe|yaya)\b/,
  abuelo: /\b(abuel(o|ito)|nono|zeide)\b/, hermano: /\b(herman(o|ito))\b/, hermana: /\b(herman(a|ita))\b/ };

const QUESTION_KEYS = Object.keys(LINES.q);

// "abuela, Marta" -> "la abuela Marta"; "mamá" -> "mamá"
export function quienDe(m) {
  const rel = (m.rel || "").trim().toLowerCase();
  const name = (m.name || "").trim();
  if (!rel) return name;
  if (/^(mam[aá]|pap[aá]|mami|papi)$/.test(rel)) return rel.replace("mama", "mamá").replace("papa", "papá");
  const fem = /a$|ita$/.test(rel) && !/^(papa|tata)$/.test(rel);
  return `${fem ? "la" : "el"} ${rel} ${name}`.trim();
}

export function regaloTxt(g) {
  const s = (g || "").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function pickFrom(arr, used) {
  const opts = arr.filter((x) => !used.has(x));
  const list = opts.length ? opts : arr;
  const v = list[Math.floor(Math.random() * list.length)];
  used.add(v);
  return v;
}

export class ScriptBrain {
  constructor(profileGetter) {
    this.getProfile = profileGetter;
    this.used = new Set();
    this.askedQ = new Set();
    this.lastQ = null;
    this.turn = 0;
    this.topics = new Set();
  }

  vars() {
    const p = this.getProfile();
    return { nombre: p.childName || "", mascota: p.pets?.[0]?.name || "", noticia: p.news || "" };
  }

  // Elige una frase de una lista evitando repetir; descarta las que tienen marcadores que no se pueden completar
  say(list, extra = {}) {
    const vars = { ...this.vars(), ...extra };
    const ok = list.filter((s) => !/\{[a-z]+\}/.test(fill(s, vars)));
    const pool = ok.length ? ok : list.filter((s) => !/\{/.test(s));
    if (!pool.length) return null;
    return fill(pickFrom(pool, this.used), vars);
  }

  nextQuestion() {
    const avail = QUESTION_KEYS.filter((k) => !this.askedQ.has(k));
    if (!avail.length) this.askedQ.clear();
    const keys = avail.length ? avail : QUESTION_KEYS;
    const k = keys[Math.floor(Math.random() * keys.length)];
    this.askedQ.add(k);
    this.lastQ = k;
    return this.say(LINES.q[k].q);
  }

  // Saludo al empezar la llamada (usa la memoria de charlas anteriores)
  greeting(memory) {
    const p = this.getProfile();
    const out = [];
    const first = !memory.sessions?.length;
    if (p.childName) out.push(this.say(first ? LINES.greet_first : LINES.greet_again));
    else out.push(this.say(LINES.greet_generic));
    if (p.news && p.newsDate === new Date().toDateString()) out.push(this.say(LINES.news, { noticia: p.news }));
    else if (!first) {
      const last = memory.sessions[memory.sessions.length - 1];
      const t = last?.topics || [];
      const opts = [];
      if (p.pets?.length) opts.push(() => this.say(LINES.mem_pet, { mascota: p.pets[Math.floor(Math.random() * p.pets.length)].name }));
      if (p.likes?.length) {
        const g = p.likes[Math.floor(Math.random() * p.likes.length)];
        opts.push(() => this.say(LINES.mem_like, { gusto: g, gusta: /^(los|las)\b|s$/i.test(g.trim()) ? "gustan" : "gusta" }));
      }
      if (t.includes("animales")) opts.push(() => this.say(LINES.mem_animales));
      if (t.includes("cancion")) opts.push(() => this.say(LINES.mem_cancion));
      if (t.includes("regalo")) opts.push(() => this.say(LINES.mem_regalo));
      if (t.includes("renos")) opts.push(() => this.say(LINES.mem_renos));
      if (!opts.length) opts.push(() => this.say(LINES.mem_general));
      out.push(opts[Math.floor(Math.random() * opts.length)]());
    }
    out.push(this.say(LINES.how_are_you));
    this.lastQ = null;
    return out.filter(Boolean);
  }

  // Lo que dijo la nena -> lista de frases de Papá Noel + metadatos
  respond(heard) {
    const t = norm(heard);
    const p = this.getProfile();
    this.turn++;
    const out = [];
    let intent = null, end = false;
    const lastQ = this.lastQ;
    this.lastQ = null;

    if (!t) {
      // se escuchó sonido pero no se entendieron palabras
      if (lastQ && LINES.q[lastQ].a) out.push(this.say(LINES.q[lastQ].a));
      else out.push(this.say(LINES.r_eco));
      intent = "eco";
    } else {
      // nombre propio de la nena
      const nombre = norm(p.childName);
      if (nombre && new RegExp(`\\b(me llamo|soy|yo soy) ${nombre}\\b`).test(t)) intent = "nombre";
      for (const [k, re] of INTENTS) { if (intent) break; if (has(t, re)) intent = k; }
      // regalo aprobado por los papás
      if (intent === "regalo") {
        const ok = (p.gifts || []).find((g) => g && t.includes(norm(g).split(" ").slice(-1)[0]));
        if (ok) { out.push(this.say(LINES.r_regalo_ok, { regalo: regaloTxt(ok) })); this.topics.add("regalo"); }
      }
      let animal = null, color = null, familia = null;
      for (const [k, re] of Object.entries(ANIMALES)) if (re.test(t)) { animal = k; break; }
      for (const [k, re] of Object.entries(COLORES)) if (re.test(t)) { color = k; break; }
      for (const [k, re] of Object.entries(FAMILIA)) if (re.test(t)) { familia = k; break; }
      const pet = (p.pets || []).find((x) => x.name && t.includes(norm(x.name)));
      const famNamed = (p.family || []).find((x) => x.name && t.includes(norm(x.name)));

      if (out.length) { /* ya respondido */ }
      else if (intent === "chau") { out.push(this.say(LINES.bye)); end = true; }
      else if (intent === "mal") out.push(this.say(LINES.r_mal));
      else if (intent === "regalo") { out.push(this.say(LINES.r_regalo)); this.topics.add("regalo"); }
      else if (pet) out.push(this.say(LINES.r_mascota, { mascota: pet.name }));
      else if (animal) {
        const mascota = (p.pets || []).find((x) => x.type && norm(x.type).startsWith(animal.slice(0, 3)));
        out.push(mascota ? this.say(LINES.a_mascota, { mascota: mascota.name }) : this.say(LINES.a[animal]));
        this.topics.add(animal === "reno" ? "renos" : "animales");
      }
      else if (intent === "nombre") out.push(this.say(LINES.r_nombre_nene));
      else if (lastQ === "edad" && /\b(dos|2)\b/.test(t)) out.push(this.say(LINES.r_dos));
      else if (color) out.push(this.say(LINES.c[color]));
      else if (famNamed) out.push(this.say(LINES.r_familia, { quien: quienDe(famNamed) }));
      else if (familia && intent !== "quien") out.push(this.say(LINES.r_familia_g[familia]));
      else if (intent === "si" && lastQ === "cantar") { out.push(this.say(LINES.r_cancion)); this.topics.add("cancion"); }
      else if (intent && LINES["r_" + intent]) {
        out.push(this.say(LINES["r_" + intent]));
        if (["cancion", "renos"].includes(intent)) this.topics.add(intent);
      }
      else if (lastQ && LINES.q[lastQ].a) { out.push(this.say(LINES.q[lastQ].a)); intent = "respuesta"; }
      else { out.push(this.say(LINES.r_eco)); intent = "eco"; }
    }

    // Seguir la charla con una pregunta fácil (casi siempre)
    const selfAsk = ["edad", "cancion", "cuento"].includes(intent) || (out[0] || "").trim().endsWith("?");
    if (!end && !selfAsk && Math.random() < 0.8) out.push(this.nextQuestion());
    if (intent === "edad") this.lastQ = "edad";
    return { lines: out.filter(Boolean), intent, end };
  }

  silence(count) {
    const p = this.getProfile();
    const out = [p.childName && count === 1 ? this.say(LINES.r_silencio_n) : this.say(LINES.r_silencio)];
    if (count >= 2) out.push(this.nextQuestion());
    return out.filter(Boolean);
  }

  goodbyeTime() { return [this.say(LINES.bye_time)]; }
}

// ---- Filtro de seguridad para respuestas del modelo de IA ----
const PROHIBIDO = /(secret|no le (digas|cuentes)|no se lo (digas|cuentes)|direcci|donde viv|tu casa|escuela|jardin de|colegio|foto|camara|contrase|telefono|celular|whatsapp|encontrarnos|vení solo|veni sola|sin tus pap|matar|muert|morir|sangre|arma|pistola|cuchill|monstru|fantasm|diablo|demonio|infierno|droga|alcohol|cerveza|vino|cigarr|sexo|desnud|beso en la boca|novi[oa]|odio|estupid|tont[oa]|idiota|callate|feo|fea|malo|mala|castig|carbon|no vas a tener regalo|portaste mal)/;

export function sanitizeLLM(text, profile) {
  if (!text) return null;
  let t = text.replace(/[*_#`~>\[\]{}<>]/g, "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ").trim();
  // como mucho dos oraciones
  const parts = t.match(/[^.!?]+[.!?]+/g) || [t];
  t = parts.slice(0, 2).join(" ").trim();
  if (t.length > 170) t = t.slice(0, 170).replace(/\s+\S*$/, "") + ".";
  const n = norm(t);
  if (PROHIBIDO.test(n)) return null;
  // no prometer regalos que los papás no aprobaron
  if (/\b(te (voy a|vamos a) (traer|regalar|dar)|te lo (traigo|llevo)|vas a tener)\b/.test(n)) {
    const ok = (profile.gifts || []).some((g) => n.includes(norm(g)));
    if (!ok) return null;
  }
  // tiene que estar en castellano
  if (!/[áéíóúñ¿¡]|\b(que|el|la|los|mi|tu|vos|sos|muy|con|para|de)\b/.test(t.toLowerCase())) return null;
  if (/\b(the|you|and|is|are|what)\b/i.test(t)) return null;
  return t;
}

export function buildSystemPrompt(profile, memory) {
  const p = profile;
  const nombre = p.childName || "la nena";
  const datos = [];
  if (p.pets?.length) datos.push("Mascotas: " + p.pets.map((x) => `${x.name}${x.type ? " (" + x.type + ")" : ""}`).join(", ") + ".");
  if (p.family?.length) datos.push("Familia: " + p.family.map((x) => `${x.rel ? x.rel + " " : ""}${x.name}`).join(", ") + ".");
  if (p.likes?.length) datos.push("Le gusta: " + p.likes.join(", ") + ".");
  if (p.news && p.newsDate === new Date().toDateString()) datos.push("Novedad de hoy: " + p.news + ".");
  const regalos = p.gifts?.length ? ` Los papás aprobaron estos regalos, podés decir que se lo vas a contar a los duendes: ${p.gifts.join(", ")}.` : "";
  const facts = (memory.facts || []).slice(-6).map((f) => "- " + f.text).join("\n");
  return `Sos Papá Noel en una videollamada con ${nombre}, una nena de ${p.age || 2} años. Llamás desde el Polo Norte. Hablás en español de Argentina, con voseo, como un abuelo cariñoso, alegre y tranquilo.
Reglas:
- Respondé con una o dos oraciones muy cortas, máximo 20 palabras en total, con palabras simples.
- Sé cálido, juguetón y positivo. A veces decí "¡Jo, jo, jo!".
- Si no entendés lo que dijo, respondé con cariño y hacé una pregunta fácil.
- Nunca prometas regalos. Si pide un regalo, decí que lo anotás en tu lista mágica y que lo vas a charlar con los duendes.${regalos}
- Nunca pidas secretos, direcciones, fotos ni datos. Nunca digas que no le cuente algo a mamá o papá.
- Si está triste, tiene miedo o se lastimó, decile que vaya a darle un abrazo a mamá o a papá.
- Nunca hables de cosas que dan miedo, peligros, enfermedades ni temas de grandes.
- No uses emojis, asteriscos ni listas: solo lo que decís en voz alta.
${datos.join("\n")}${facts ? "\nCosas que contó en otras charlas:\n" + facts : ""}`;
}

export const FEW_SHOT = [
  ["hola papá noel", "¡Jo, jo, jo! ¡Hola! ¡Qué alegría verte! ¿Cómo estás?"],
  ["quiero una pelota", "¡Qué lindo! Lo anoto en mi lista mágica y lo charlo con los duendes."],
  ["mmm ta ta", "¡Me encanta cómo hablás! ¿Me mostrás tu juguete favorito?"],
  ["me caí", "¡Ay, mi amor! Andá a darle un abrazo grande a mamá o a papá, ¿sí?"],
];
