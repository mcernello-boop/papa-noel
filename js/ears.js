// Escucha a la nena con el reconocimiento de voz del navegador (Chrome en Android, Safari en iPhone).
export class Ears {
  constructor() {
    this.SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    this.supported = !!this.SR;
    this.denied = false;
    this.rec = null;
    this.onInterim = null;
    this.onSound = null;
    this._cancel = null;
  }

  // Escucha una vez. Devuelve { text, heard } (heard: se detectó sonido o voz aunque no haya texto)
  listen({ maxWaitMs = 9000, lang = "es-AR" } = {}) {
    if (!this.supported || this.denied) return Promise.resolve({ text: "", heard: false, unsupported: true });
    return new Promise((resolve) => {
      let finalText = "", interim = "", heard = false, done = false;
      let silenceTimer = null, waitTimer = null, interimTimer = null;
      const rec = new this.SR();
      this.rec = rec;
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 3;

      const finish = (reason) => {
        if (done) return;
        done = true;
        clearTimeout(silenceTimer); clearTimeout(waitTimer); clearTimeout(interimTimer);
        try { rec.onresult = rec.onend = rec.onerror = null; rec.abort(); } catch (e) {}
        this.rec = null; this._cancel = null;
        resolve({ text: (finalText || interim).trim(), heard: heard || !!(finalText || interim), reason });
      };
      this._cancel = () => finish("cancel");

      waitTimer = setTimeout(() => finish(heard ? "timeout-heard" : "silence"), maxWaitMs);
      rec.onsoundstart = rec.onspeechstart = () => { heard = true; this.onSound?.(); };
      rec.onresult = (ev) => {
        heard = true;
        let fin = "", tmp = "";
        for (let i = 0; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) fin += r[0].transcript + " "; else tmp += r[0].transcript + " ";
        }
        if (fin) finalText = fin;
        interim = tmp;
        this.onInterim?.(finalText + interim);
        clearTimeout(silenceTimer);
        // Safari a veces no cierra solo: si hay una pausa, damos por terminada la frase
        silenceTimer = setTimeout(() => finish("pause"), finalText ? 700 : 1500);
      };
      rec.onerror = (ev) => {
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { this.denied = true; finish("denied"); }
        else if (ev.error === "no-speech") finish("silence");
        else if (ev.error === "aborted") finish("aborted");
        else finish("error:" + ev.error);
      };
      rec.onend = () => finish("end");
      try { rec.start(); } catch (e) { finish("start-failed"); }
    });
  }

  cancel() { this._cancel?.(); }
}
