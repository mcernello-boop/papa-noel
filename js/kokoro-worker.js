// Worker que genera la voz de Papá Noel en el teléfono con Kokoro (voz em_santa, en español).
import { KokoroTTS, env } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
import { fonemizar } from "./g2p-es.js";

let tts = null;
let loading = null;

async function load() {
  if (tts) return tts;
  if (!loading) {
    loading = KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
      device: "wasm",
      progress_callback: (p) => {
        if (p && p.status === "progress" && /onnx/.test(p.file || "")) self.postMessage({ type: "progress", p: Math.round(p.progress || 0) });
      },
    }).then((t) => (tts = t));
  }
  return loading;
}

self.onmessage = async (e) => {
  const { id, type, text, speed } = e.data;
  try {
    if (type === "load") {
      await load();
      // calentar el modelo con una frase corta
      const { input_ids } = tts.tokenizer(fonemizar("Hola."), { truncation: true });
      await tts.generate_from_ids(input_ids, { voice: "em_santa", speed: 0.93 });
      self.postMessage({ id, type: "ready" });
      return;
    }
    if (type === "say") {
      await load();
      const { input_ids } = tts.tokenizer(fonemizar(text), { truncation: true });
      const audio = await tts.generate_from_ids(input_ids, { voice: "em_santa", speed: speed || 0.93 });
      const pcm = audio.audio instanceof Float32Array ? audio.audio : new Float32Array(audio.audio);
      self.postMessage({ id, type: "audio", pcm, sr: audio.sampling_rate || 24000 }, [pcm.buffer]);
    }
  } catch (err) {
    self.postMessage({ id, type: "error", error: String((err && err.message) || err) });
  }
};
