// Animación de Papá Noel: parpadeo, mirada, cabeza, respiración, expresiones y boca según el audio.
export class Rig {
  constructor(face, mouthFn, rand = Math.random) {
    this.face = face;
    this.mouthFn = mouthFn;
    this.rand = rand;
    this.state = "idle";
    this.nextBlink = 1.2;
    this.blinkT = -1; this.doubleBlink = false;
    this.gaze = [0, 0]; this.gazeTarget = [0, 0]; this.nextSaccade = 2;
    this.laughUntil = 0; this.nod = 0;
    this.m = { open: 0, round: 0, wide: 0 };
    this.ph = Array.from({ length: 8 }, () => this.rand() * 6.28);
    this.lineText = "";
    this.lineStart = 0;
  }
  speak(text, now) { this.lineText = text || ""; this.lineStart = now; if (/^¡?jo, jo/i.test(this.lineText)) this.laughUntil = now + 1.25; }
  impulse() { this.nod = 1; }
  update(t, dt) {
    const p = this.face.params, ph = this.ph;
    // parpadeo
    if (this.blinkT < 0 && t > this.nextBlink) { this.blinkT = 0; this.doubleBlink = this.rand() < 0.18; }
    let b = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const x = this.blinkT;
      b = x < 0.065 ? x / 0.065 : x < 0.095 ? 1 : x < 0.2 ? 1 - (x - 0.095) / 0.105 : 0;
      if (x >= 0.2) {
        if (this.doubleBlink) { this.blinkT = -1; this.nextBlink = t + 0.12; this.doubleBlink = false; }
        else { this.blinkT = -1; this.nextBlink = t + 2.2 + this.rand() * 3.8; }
      }
    }
    // mirada: pequeños movimientos y vuelta a la cámara
    if (t > this.nextSaccade) {
      this.gazeTarget = this.rand() < 0.6 ? [0, 0] : [(this.rand() - 0.5) * 5, (this.rand() - 0.5) * 2.5];
      if (this.state === "thinking") this.gazeTarget = [-4, -2.5];
      this.nextSaccade = t + 1.2 + this.rand() * 2.6;
    }
    this.gaze[0] += (this.gazeTarget[0] - this.gaze[0]) * Math.min(1, dt * 18);
    this.gaze[1] += (this.gazeTarget[1] - this.gaze[1]) * Math.min(1, dt * 18);

    // boca según el audio
    const vm = this.mouthFn();
    const tgt = vm || { open: 0, round: 0, wide: 0 };
    const k = Math.min(1, dt * 30);
    this.m.open += (tgt.open * 0.92 - this.m.open) * k;
    this.m.round += (tgt.round - this.m.round) * k;
    this.m.wide += (tgt.wide - this.m.wide) * k;

    const speaking = !!vm;
    const listening = this.state === "listening";
    const laughing = t < this.laughUntil && speaking;
    this.nod = Math.max(0, this.nod - dt * 2.2);

    // cabeza
    let tx = 3 * Math.sin(0.31 * t + ph[0]) + 1.4 * Math.sin(0.73 * t + ph[1]);
    let ty = 2 * Math.sin(0.27 * t + ph[2]) + 1 * Math.sin(0.9 * t + ph[3]);
    let rot = 0.006 * Math.sin(0.23 * t + ph[4]) + 0.003 * Math.sin(0.61 * t + ph[5]);
    let yaw = 4 * Math.sin(0.19 * t + ph[6]) + 2 * Math.sin(0.47 * t + ph[7]);
    if (speaking) { ty += 5 * this.m.open; yaw *= 1.5; rot += 0.004 * Math.sin(1.7 * t); }
    if (listening) { rot += 0.014; }
    if (laughing) { ty += 6 * Math.abs(Math.sin(2 * Math.PI * 3.2 * t)); }
    ty += 7 * Math.sin(this.nod * Math.PI);
    p.head = [tx, ty, rot, yaw];
    p.breath = Math.sin(2 * Math.PI * 0.22 * t);

    // expresión
    const qEnd = speaking && this.lineText.trim().endsWith("?") && (t - this.lineStart) > 0.4;
    const smileT = laughing ? 1 : listening ? 0.38 : speaking ? 0.3 : 0.22;
    p.smile += (smileT - p.smile) * Math.min(1, dt * 4);
    const browT = qEnd ? 0.75 : listening ? 0.35 : this.state === "thinking" ? 0.3 : 0;
    p.brow += (browT - p.brow) * Math.min(1, dt * 5);
    const sq = laughing ? 0.55 : p.smile * 0.3;
    p.squint += (sq - p.squint) * Math.min(1, dt * 6);
    p.blinkL = p.blinkR = Math.max(b, laughing ? 0.12 : 0);
    p.gaze = this.gaze;
    p.open = this.m.open * (laughing ? 1.1 : 1);
    p.round = this.m.round; p.wide = this.m.wide;

    // cámara en la mano, fuego y exposición
    p.shake = [1.2 * Math.sin(0.7 * t) + 0.6 * Math.sin(1.9 * t + 1), 1.0 * Math.sin(0.5 * t + 1) + 0.5 * Math.sin(2.3 * t), 0.0022 * Math.sin(0.4 * t), 1.018 + 0.004 * Math.sin(0.13 * t)];
    p.flick = 0.5 + 0.25 * Math.sin(7.3 * t) + 0.15 * Math.sin(13.1 * t + 2) + 0.1 * Math.sin(23.7 * t);
    p.expo = 1 + 0.012 * Math.sin(0.09 * t) + 0.006 * Math.sin(0.37 * t);
  }
}

