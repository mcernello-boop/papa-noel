// Guion de Papá Noel. Frases cortas, para una nena de 2 años, en castellano rioplatense.
// Las frases sin {marcadores} se graban de antemano con la voz de Papá Noel.
// Las que llevan {nombre}, {mascota}, {quien}, {regalo}, {gusto} o {noticia} las genera el teléfono
// cuando mamá o papá cargan los datos en el panel.

export const LINES = {
  // ---- Saludos ----
  greet_first: [
    "¡Jo, jo, jo! ¡Hola, {nombre}! Soy Papá Noel y te estoy llamando desde el Polo Norte.",
  ],
  greet_again: [
    "¡Jo, jo, jo! ¡Hola de nuevo, {nombre}! ¡Qué alegría verte!",
    "¡Hola, {nombre}! ¡Jo, jo, jo! ¡Te extrañaba!",
    "¡Jo, jo, jo! ¡Hola, {nombre}! ¡Qué lindo verte otra vez!",
  ],
  greet_generic: [
    "¡Jo, jo, jo! ¡Hola, hola! Soy Papá Noel y te estoy llamando desde el Polo Norte.",
    "¡Jo, jo, jo! ¡Hola, mi amor! ¡Qué alegría verte!",
  ],
  how_are_you: ["¿Cómo estás hoy?", "¿Cómo andás, mi amor?", "¿Qué hiciste hoy?"],
  news: ["Me contaron los duendes que {noticia}. ¡Estoy muy orgulloso!"],

  // ---- Recuerdos de charlas anteriores ----
  mem_pet: ["¿Cómo está {mascota}? ¡Mandale un saludo de mi parte!"],
  mem_like: ["Los duendes me contaron que te {gusta} {gusto}. ¡A mí también!"],
  mem_animales: ["¡La otra vez hicimos ruidos de animales! ¡Fue muy divertido!"],
  mem_cancion: ["¡La otra vez cantamos juntos! ¡Me encantó!"],
  mem_regalo: ["Ya anoté tu pedido en mi lista mágica, ¿eh?"],
  mem_renos: ["¡Los renos se acuerdan de vos! ¡Te mandan saludos!"],
  mem_general: ["¡La otra vez charlamos un montón! ¡Me encantó!"],

  // ---- Respuestas ----
  r_hola: ["¡Hola, hola! ¡Qué lindo escucharte!", "¡Hola, mi amor! ¡Jo, jo, jo!", "¡Hola, {nombre}! ¡Qué alegría!"],
  r_bien: ["¡Qué bueno! ¡Yo también estoy muy contento!", "¡Me alegro mucho! Acá en el Polo Norte estamos todos felices."],
  r_mal: [
    "¡Ay, mi amor! Andá a darle un abrazo bien grande a mamá o a papá, ¿sí?",
    "Te mando un abrazo de oso polar. Y ahora buscá a mamá o a papá para un abrazo de verdad.",
  ],
  r_amor: ["¡Yo también te quiero muchísimo!", "¡Yo también te quiero mucho, {nombre}!", "¡Muac! ¡Te mando un beso enorme desde el Polo Norte!"],
  r_beso: ["¡Muac! ¡Lo atrapé! ¡Te mando otro!", "¡Qué beso tan lindo! ¡Muac, muac!"],
  r_regalo: [
    "¡Qué lindo pedido! Lo anoto en mi lista mágica.",
    "¡Ajá! Lo voy a charlar con los duendes, ¿sí?",
    "¡Mmm, qué buena idea! Lo anoto en mi libreta de regalos.",
  ],
  r_regalo_ok: ["¡{regalo}! ¡Qué buena idea! Se lo voy a contar a los duendes."],
  r_jojo: ["¡Jo, jo, jo! ¡Te sale igualito a mí!", "¡Jo, jo, jo! ¡Qué risa tan linda!"],
  r_risa: ["¡Jo, jo, jo! ¡Me hacés reír mucho!"],
  r_quien: ["¡Soy Papá Noel! Vivo en el Polo Norte con los duendes y los renos."],
  r_nombre_nene: ["¡Ya sé! ¡Sos {nombre}! Los duendes me contaron."],
  r_polo: [
    "¡Acá hay muchísima nieve! Por eso tengo esta barba tan grande y abrigada.",
    "¡En el Polo Norte hace mucho frío! ¡Brrr! Pero mi chimenea está calentita.",
  ],
  r_renos: [
    "¡Mis renos están comiendo zanahorias! ¡Ñam, ñam!",
    "Los renos tiran del trineo y vuelan por el cielo. ¡Fiuuu!",
  ],
  r_duendes: ["¡Los duendes están en el taller haciendo juguetes! ¡Tac, tac, tac!"],
  r_trineo: ["¡Mi trineo es rojo y vuela con los renos! ¡Fiuuu!"],
  r_navidad: ["¡Ya falta poquito para Navidad! ¡Estamos preparando todo!", "¡En Navidad hay lucecitas por todos lados! ¡Qué lindo!"],
  r_cancion: [
    "¡A cantar! Jo, jo, jo, la, la, la. ¡Navidad ya va a llegar! Jo, jo, jo, la, la, la. ¡Todos juntos a cantar!",
    "¡Tilín, tilín, suenan las campanitas! ¡Tilín, tilín, en el trineo de Papá Noel!",
  ],
  r_baile: ["¡A bailar! ¡Mirá cómo me muevo yo! ¡Jo, jo, jo!"],
  r_cuento: ["Había una vez un reno chiquito que quería volar. Practicó y practicó, ¡y un día voló altísimo! Fin."],
  r_edad: ["¡Yo tengo muchos, muchos años! ¿Y vos cuántos tenés? ¡Mostrame con los deditos!"],
  r_dos: ["¡Dos años! ¡Qué grande que estás!"],
  r_comida: ["¡Mmm! ¡A mí me encantan las galletitas con leche!", "¡Qué rico! ¿Me guardás una galletita para Nochebuena?"],
  r_si: ["¡Muy bien!", "¡Qué bueno!", "¡Genial!"],
  r_no: ["¡Ah, bueno! No pasa nada.", "¡Está bien, mi amor!"],
  r_gracias: ["¡De nada, mi amor!"],
  r_dormir: ["¡Que tengas dulces sueños! Los renos también se van a dormir."],
  r_familia_g: {
    mama: ["¡Mandale un beso enorme a mamá de mi parte!"],
    papa: ["¡Mandale un beso enorme a papá de mi parte!"],
    abuela: ["¡Mandale un beso enorme a la abuela!"],
    abuelo: ["¡Mandale un beso enorme al abuelo!"],
    hermano: ["¡Qué lindo jugar con tu hermano!"],
    hermana: ["¡Qué lindo jugar con tu hermana!"],
  },
  r_familia: ["¡Mandale un beso enorme a {quien} de mi parte!", "¡Qué suerte que tenés a {quien}!"],
  r_mascota: ["¡{mascota}! ¡Mandale un abrazo de mi parte!"],
  r_eco: ["¡Qué lindo lo que me contás!", "¡Ajá! ¡Me encanta!", "¡Mirá vos! ¡Qué interesante!", "¡Jo, jo, jo! ¡Qué divertido!"],
  r_silencio: ["¿Hola? ¿Estás ahí? ¡Te estoy esperando!", "¿Dónde estás? ¡Yo te veo! ¡Jo, jo, jo!"],
  r_silencio_n: ["¿{nombre}? ¿Estás ahí? ¡Yo te veo!"],
  filler: ["¡Mmm, a ver, a ver!", "¡Ajá!", "¡Jo, jo!"],
  laugh: ["¡Jo, jo, jo!"],

  // ---- Animales ----
  a: {
    perro: ["¡Guau, guau! ¡Me encantan los perritos!"],
    gato: ["¡Miau, miau! ¡Qué lindos los gatitos!"],
    vaca: ["¡Muuu! ¡La vaca hace muuu!"],
    pato: ["¡Cuac, cuac! ¡Los patitos nadan en el agua!"],
    oveja: ["¡Beee! ¡Las ovejitas tienen lana para el frío!"],
    caballo: ["¡Iiih! ¡El caballo corre rapidísimo!"],
    leon: ["¡Grrr! ¡El león hace grrr!"],
    pollito: ["¡Pío, pío! ¡Qué chiquitito el pollito!"],
    chancho: ["¡Oink, oink! ¡El chanchito juega en el barro!"],
    dinosaurio: ["¡Roarrr! ¡Los dinosaurios son enormes!"],
    pez: ["¡Glu, glu! ¡Los pececitos nadan en el agua!"],
    mono: ["¡Uh, uh, ah, ah! ¡Los monitos saltan en los árboles!"],
    pajaro: ["¡Pío, pío! ¡Los pajaritos vuelan alto!"],
    oso: ["¡En el Polo Norte hay osos polares blancos! ¡Grrr!"],
    conejo: ["¡Los conejitos saltan así: hop, hop, hop!"],
    rana: ["¡Croac, croac! ¡La ranita salta!"],
    elefante: ["¡El elefante tiene una trompa larguísima!"],
    jirafa: ["¡La jirafa tiene un cuello larguísimo!"],
    reno: ["¡Mis renos están comiendo zanahorias! ¡Ñam, ñam!"],
  },
  a_mascota: ["¡{mascota}! ¿Cómo está? ¡Mandale un abrazo!"],

  // ---- Colores ----
  c: {
    rojo: ["¡Rojo, como mi traje!"],
    azul: ["¡Azul, como el cielo del Polo Norte!"],
    verde: ["¡Verde, como el arbolito de Navidad!"],
    amarillo: ["¡Amarillo, como las lucecitas del árbol!"],
    blanco: ["¡Blanco, como la nieve y como mi barba!"],
    rosa: ["¡Rosa! ¡Qué lindo color!"],
    violeta: ["¡Violeta! ¡Qué lindo color!"],
    naranja: ["¡Naranja, como las zanahorias de los renos!"],
    negro: ["¡Negro, como mis botas!"],
  },

  // ---- Preguntas (con la respuesta que da después, diga lo que diga) ----
  q: {
    juguete: { q: ["¿Me mostrás tu juguete favorito?"], a: ["¡Qué lindo! ¡Me encanta!"] },
    perro: { q: ["¿Cómo hace el perrito?"], a: ["¡Guau, guau! ¡Muy bien!"] },
    vaca: { q: ["¿Y cómo hace la vaca?"], a: ["¡Muuu! ¡Igualito!"] },
    gato: { q: ["¿Cómo hace el gatito?"], a: ["¡Miau! ¡Muy bien!"] },
    reno: { q: ["¿Sabés hacer como un reno? ¡Poné las manos así, como cuernitos!"], a: ["¡Jo, jo, jo! ¡Sos un renito!"] },
    beso: { q: ["¿Me tirás un beso?"], a: ["¡Muac! ¡Lo atrapé!"] },
    manito: { q: ["¿Me saludás con la manito?"], a: ["¡Hola, hola con la manito! ¡Muy bien!"] },
    color: { q: ["¿De qué color es tu ropa hoy?"], a: ["¡Qué linda ropa!"] },
    cantar: { q: ["¿Cantamos juntos?"], a: null },
    bailar: { q: ["¿Me mostrás cómo bailás?"], a: ["¡Qué bien que bailás! ¡Jo, jo, jo!"] },
    comida: { q: ["¿Qué comiste hoy?"], a: ["¡Mmm, qué rico!"] },
    edad: { q: ["¿Cuántos años tenés?"], a: ["¡Qué grande que estás!"] },
    aplauso: { q: ["¿Aplaudimos juntos? ¡Plas, plas, plas!"], a: ["¡Muy bien! ¡Qué lindo aplauso!"] },
    nariz: { q: ["¿Dónde está tu nariz?"], a: ["¡Ahí está! ¡Muy bien!"] },
    ojos: { q: ["¿Dónde están tus ojitos?"], a: ["¡Qué lindos ojitos!"] },
    conejo: { q: ["¿Sabés saltar como un conejito?"], a: ["¡Hop, hop, hop! ¡Muy bien!"] },
    navidad: { q: ["¿Ya armaron el arbolito de Navidad?"], a: ["¡Qué lindo! ¡Me encantan los arbolitos!"] },
  },

  // ---- Despedidas ----
  bye: [
    "¡Chau, {nombre}! Portate bien y dale un abrazo grande a mamá y a papá. ¡Jo, jo, jo!",
    "¡Chau, chau! ¡Te mando un beso enorme! ¡Jo, jo, jo!",
  ],
  bye_time: [
    "¡Uy, {nombre}! Me tengo que ir a darle de comer a los renos. ¡Te quiero mucho! ¡Chau, chau!",
    "¡Uy! Me tengo que ir a darle de comer a los renos. ¡Te quiero mucho! ¡Chau, chau!",
  ],
};

// Todas las frases del guion en una lista plana (para pregrabar)
export function allLines() {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(LINES);
  return [...new Set(out)];
}

export function hasPlaceholder(s) { return /\{[a-z]+\}/.test(s); }

export function fill(s, vars) {
  return s.replace(/\{([a-z]+)\}/g, (m, k) => (vars[k] != null && vars[k] !== "" ? vars[k] : m));
}

// Clave estable para el archivo de audio de una frase
export function lineKey(text) {
  const t = text.normalize("NFC").trim();
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ (c + 31 * i), 2246822519) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}
