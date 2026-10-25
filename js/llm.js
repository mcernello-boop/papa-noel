// IA opcional que corre dentro del teléfono (WebLLM + WebGPU). Solo se usa cuando el guion no sabe qué responder.
import { buildSystemPrompt, FEW_SHOT, sanitizeLLM } from "./brain.js";

const WEBLLM = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm";
export const LLM_MODEL = "gemma3-1b-it-q4f16_1-MLC";

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

export class LocalLLM {
  constructor() {
    this.ready = false; this.loading = false; this.error = null; this.progress = 0;
    this.engine = null; this.onProgress = null;
  }

  supported() { return typeof navigator !== "undefined" && !!navigator.gpu; }

  async load() {
    if (this.ready || this.loading) return;
    this.loading = true; this.error = null;
    try {
      const webllm = await import(WEBLLM);
      const worker = new Worker(new URL("./llm-worker.js", import.meta.url), { type: "module" });
      this.engine = await webllm.CreateWebWorkerMLCEngine(worker, LLM_MODEL, {
        initProgressCallback: (r) => { this.progress = Math.round((r.progress || 0) * 100); this.onProgress?.(); },
      });
      this.ready = true;
    } catch (e) {
      this.error = String((e && e.message) || e);
      throw e;
    } finally {
      this.loading = false;
      this.onProgress?.();
    }
  }

  async reply(text, profile, memory, turns) {
    if (!this.ready) return null;
    const sys = buildSystemPrompt(profile, memory);
    const msgs = [];
    for (const [u, a] of FEW_SHOT) msgs.push({ role: "user", content: u }, { role: "assistant", content: a });
    // últimas frases de esta llamada, alternando nena / Papá Noel
    const recent = [];
    for (const t of (turns || []).slice(-8)) {
      const role = t.who === "nena" ? "user" : "assistant";
      const last = recent[recent.length - 1];
      if (last && last.role === role) last.content += " " + t.text; else recent.push({ role, content: t.text });
    }
    while (recent.length && recent[0].role !== "user") recent.shift();
    if (!recent.length || recent[recent.length - 1].role !== "user") recent.push({ role: "user", content: text });
    msgs.push(...recent);
    // Gemma no acepta rol de sistema: va dentro del primer mensaje
    if (/gemma/i.test(LLM_MODEL)) msgs[0] = { role: "user", content: sys + "\n\n" + msgs[0].content };
    else msgs.unshift({ role: "system", content: sys });
    const r = await withTimeout(this.engine.chat.completions.create({ messages: msgs, max_tokens: 60, temperature: 0.6, top_p: 0.9 }), 9000);
    return sanitizeLLM(r.choices?.[0]?.message?.content || "", profile);
  }
}
