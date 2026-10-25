// Conversor de texto en español a fonemas para Kokoro (estilo espeak "es", con seseo).
// Reglas ortográficas del español: es muy regular, así que se puede hacer sin diccionario.

const UNIDADES = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez",
  "once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve","veinte",
  "veintiuno","veintidós","veintitrés","veinticuatro","veinticinco","veintiséis","veintisiete","veintiocho","veintinueve"];
const DECENAS = { 3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa" };

export function numeroATexto(n) {
  n = Math.floor(n);
  if (n < 30) return UNIDADES[n];
  if (n < 100) { const d = Math.floor(n / 10), u = n % 10; return DECENAS[d] + (u ? " y " + UNIDADES[u] : ""); }
  if (n === 100) return "cien";
  if (n < 200) return "ciento " + numeroATexto(n - 100);
  if (n < 1000) {
    const c = Math.floor(n / 100), r = n % 100;
    const cs = { 2: "doscientos", 3: "trescientos", 4: "cuatrocientos", 5: "quinientos", 6: "seiscientos", 7: "setecientos", 8: "ochocientos", 9: "novecientos" }[c];
    return cs + (r ? " " + numeroATexto(r) : "");
  }
  if (n < 2000) return "mil" + (n % 1000 ? " " + numeroATexto(n % 1000) : "");
  if (n < 10000) return numeroATexto(Math.floor(n / 1000)) + " mil" + (n % 1000 ? " " + numeroATexto(n % 1000) : "");
  return String(n).split("").map(d => UNIDADES[+d]).join(" ");
}

// Palabras átonas (sin acento de frase)
const ATONAS = new Set(["el","la","los","las","lo","le","les","un","una","unos","unas","de","del","al","a","en","con","por","para",
  "y","e","o","u","que","se","me","te","nos","os","mi","mis","tu","tus","su","sus","si","sin","como","cuando","donde","pero","ni"]);

const VOCALES = "aeiouáéíóúü";
const FUERTES = "aeoáéóíú"; // í/ú acentuadas cuentan como vocal plena
const ACENTO = { "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u" };

function esVocal(c) { return c && VOCALES.includes(c); }

// Pasa una palabra en grafemas a una lista de "segmentos" (consonantes y vocales) con marcas
function segmentar(w) {
  const out = []; // {t:'C'|'V', p: fonema, acento: bool, g: grafema base}
  let i = 0;
  const prev = () => out.length ? out[out.length - 1] : null;
  while (i < w.length) {
    const c = w[i], n = w[i + 1], nn = w[i + 2];
    const inicio = out.length === 0;
    const p = prev();
    if (esVocal(c)) {
      // "y" final ya se trata abajo; aquí vocales normales
      const base = ACENTO[c] || c;
      out.push({ t: "V", p: base, acento: "áéíóú".includes(c), g: c });
      i++; continue;
    }
    switch (c) {
      case "b": case "v": {
        const oclusiva = inicio || (p && (p.p === "m" || p.p === "n" || p.p === "ŋ"));
        out.push({ t: "C", p: oclusiva ? "b" : "β" }); i++; break;
      }
      case "d": {
        const oclusiva = inicio || (p && (p.p === "n" || p.p === "l"));
        out.push({ t: "C", p: oclusiva ? "d" : "ð" }); i++; break;
      }
      case "g": {
        if (n === "u" && (nn === "e" || nn === "i" || nn === "é" || nn === "í")) {
          const oc = inicio || (p && (p.p === "n" || p.p === "ŋ"));
          out.push({ t: "C", p: oc ? "ɡ" : "ɣ" }); i += 2; break; // u muda
        }
        if (n === "ü") { const oc = inicio || (p && p.p === "n"); out.push({ t: "C", p: oc ? "ɡ" : "ɣ" }); out.push({ t: "C", p: "w" }); i += 2; break; }
        if (n === "e" || n === "i" || n === "é" || n === "í") { out.push({ t: "C", p: "x" }); i++; break; }
        const oc = inicio || (p && (p.p === "n" || p.p === "ŋ"));
        out.push({ t: "C", p: oc ? "ɡ" : "ɣ" }); i++; break;
      }
      case "c": {
        if (n === "h") { out.push({ t: "C", p: "ʧ" }); i += 2; break; }
        if (n === "e" || n === "i" || n === "é" || n === "í") { out.push({ t: "C", p: "s" }); i++; break; }
        out.push({ t: "C", p: "k" }); i++; break;
      }
      case "q": { out.push({ t: "C", p: "k" }); i += (n === "u" ? 2 : 1); break; }
      case "z": out.push({ t: "C", p: "s" }); i++; break;
      case "j": out.push({ t: "C", p: "x" }); i++; break;
      case "h": i++; break; // muda
      case "l": {
        if (n === "l") { out.push({ t: "C", p: "ʝ" }); i += 2; break; }
        out.push({ t: "C", p: "l" }); i++; break;
      }
      case "y": {
        // vocal si es final de palabra o va sola / antes de consonante
        if (!esVocal(n)) { out.push({ t: "V", p: "i", acento: false, g: "y", semi: true }); i++; break; }
        out.push({ t: "C", p: "ʝ" }); i++; break;
      }
      case "ñ": out.push({ t: "C", p: "ɲ" }); i++; break;
      case "r": {
        if (n === "r") { out.push({ t: "C", p: "r" }); i += 2; break; }
        const fuerte = inicio || (p && ["n", "l", "s"].includes(p.p));
        out.push({ t: "C", p: fuerte ? "r" : "ɾ" }); i++; break;
      }
      case "x": {
        if (inicio) { out.push({ t: "C", p: "s" }); i++; break; }
        out.push({ t: "C", p: "k" }); out.push({ t: "C", p: "s" }); i++; break;
      }
      case "n": {
        const sig = n;
        out.push({ t: "C", p: (sig === "g" || sig === "k" || sig === "c" && !"eiéí".includes(nn || "") || sig === "q" || sig === "j") ? "ŋ" : "n" });
        i++; break;
      }
      case "w": out.push({ t: "C", p: "w" }); i++; break;
      case "k": case "f": case "m": case "p": case "s": case "t":
        out.push({ t: "C", p: c }); i++; break;
      default: i++; // ignora símbolos raros
    }
  }
  return out;
}

// Agrupa vocales en núcleos silábicos (diptongos) y decide cuál es la tónica
function fonemizarPalabra(palabra) {
  const w = palabra.toLowerCase();
  if (!w) return "";
  const seg = segmentar(w);
  // Núcleos: secuencias de vocales; diptongo si una de ellas es débil (i,u) sin tilde
  const nucleos = []; // índices de segmentos que forman cada núcleo
  for (let i = 0; i < seg.length; i++) {
    if (seg[i].t !== "V") continue;
    const ultimo = nucleos[nucleos.length - 1];
    const anterior = seg[i - 1];
    if (ultimo && anterior && anterior.t === "V") {
      const a = anterior, b = seg[i];
      const debilA = (a.p === "i" || a.p === "u") && !a.acento;
      const debilB = (b.p === "i" || b.p === "u") && !b.acento;
      if (debilA || debilB) { ultimo.push(i); continue; } // diptongo
    }
    nucleos.push([i]);
  }
  if (!nucleos.length) return seg.map(s => s.p).join("");

  // Sílaba tónica
  let tonica = -1;
  nucleos.forEach((nu, k) => { if (nu.some(i => seg[i].acento)) tonica = k; });
  if (tonica < 0) {
    const fin = w.replace(/[^a-záéíóúüñ]/g, "");
    const ult = fin[fin.length - 1];
    if (nucleos.length === 1) tonica = 0;
    else if ("aeiouns".includes(ult) || (ult === "y" && false)) tonica = nucleos.length - 2;
    else tonica = nucleos.length - 1;
  }
  const atona = nucleos.length === 1 && ATONAS.has(w);

  // Dentro de cada núcleo: la vocal débil se vuelve semivocal (j / w); marca acento antes de la vocal fuerte
  const marca = new Map();
  nucleos.forEach((nu, k) => {
    let fuerte = nu.find(i => FUERTES.includes(seg[i].g) || seg[i].acento) ?? nu[nu.length - 1];
    if (nu.length > 1 && nu.every(i => (seg[i].p === "i" || seg[i].p === "u") && !seg[i].acento)) fuerte = nu[nu.length - 1]; // "ui", "iu": tónica la segunda
    nu.forEach(i => {
      if (i !== fuerte && (seg[i].p === "i" || seg[i].p === "u")) seg[i].p = seg[i].p === "i" ? "j" : "w";
    });
    if (k === tonica && !atona) marca.set(fuerte, true);
  });

  let s = "";
  seg.forEach((sg, i) => { if (marca.get(i)) s += "ˈ"; s += sg.p; });
  // "y" conjunción entre palabras queda como "i"
  return s;
}

export function normalizar(texto) {
  return texto
    .replace(/\d+/g, m => " " + numeroATexto(parseInt(m, 10)) + " ")
    .replace(/[¡¿"«»“”()*_#~`]/g, " ")
    .replace(/[—–]/g, ", ")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

// Texto -> cadena de fonemas para el tokenizador de Kokoro
export function fonemizar(texto) {
  const t = normalizar(texto);
  const partes = t.split(/(\s+|[,.;:!?]+)/).filter(x => x !== "" && x !== undefined);
  let out = "";
  for (const p of partes) {
    if (/^\s+$/.test(p)) { out += " "; continue; }
    if (/^[,.;:!?]+$/.test(p)) { out = out.replace(/\s+$/, ""); out += p.replace(/;/g, ",").replace(/:/g, ","); continue; }
    let limpio = p.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
    if (!limpio) continue;
    // onomatopeyas sin vocales: grrr, brrr, shhh
    if (!/[aeiouáéíóúü]/.test(limpio)) {
      const m = limpio.match(/^([bgpt]?)r+$/);
      if (m) { out += ({ b: "b", g: "ɡ", p: "p", t: "t", "": "" }[m[1]]) + "rrr"; continue; }
      if (/^s+h*$|^sh+$/.test(limpio)) { out += "ʃːː"; continue; }
      if (/^m+$/.test(limpio)) { out += "mːː"; continue; }
    }
    // "muuuu", "holaaa": vocal estirada
    let largo = false;
    limpio = limpio.replace(/([aeiouáéíóú])\1{1,}/g, (m, v) => { largo = true; return v; });
    let f = fonemizarPalabra(limpio);
    if (largo) f = f.replace(/([aeiou])(?!.*[aeiou])/, "$1ː");
    out += f;
  }
  return out.replace(/\s+/g, " ").trim();
}
