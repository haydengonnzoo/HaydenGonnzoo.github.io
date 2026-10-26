import { getAnalysers } from "./audio.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- hero oscilloscope ----------
// Idle: a stack of slow interfering sine traces that bend toward the cursor.
// When anything plays through the master bus, the traces become a live scope.

export function heroScope(canvas, meters) {
  const g = canvas.getContext("2d");
  const mouse = { x: 0.7, y: 0.4, tx: 0.7, ty: 0.4 };
  const buf = new Float32Array(2048);
  let w = 0, h = 0, t = 0, level = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", e => {
    mouse.tx = e.clientX / innerWidth;
    mouse.ty = e.clientY / innerHeight;
  });

  const rms = a => {
    a.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  };

  const LINES = 7;
  const frame = () => {
    t += reduceMotion ? 0 : 0.006;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    g.clearRect(0, 0, w, h);

    const analysers = getAnalysers();
    let liveL = 0, liveR = 0;
    if (analysers) { liveL = rms(analysers[0]); liveR = rms(analysers[1]); }
    const live = Math.max(liveL, liveR);
    level += (live - level) * 0.2;
    meters.l.style.width = `${Math.min(100, liveL * 300)}%`;
    meters.r.style.width = `${Math.min(100, liveR * 300)}%`;

    if (live > 0.002 && analysers) analysers[0].getFloatTimeDomainData(buf);

    for (let l = 0; l < LINES; l++) {
      const k = l / (LINES - 1);
      const baseY = h * (0.18 + k * 0.5);
      g.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const nx = x / w;
        const pull = Math.exp(-((nx - mouse.x) ** 2) * 18) * (mouse.y * h - baseY) * 0.25;
        let y = baseY + pull
          + Math.sin(nx * (6 + l) + t * (1 + k) * 3) * 14 * (1 - k * 0.5)
          + Math.sin(nx * 23 - t * 5 + l) * 4;
        if (level > 0.002) {
          const idx = Math.floor(nx * (buf.length - 1));
          y += buf[idx] * h * 0.35 * (1 - Math.abs(k - 0.5));
        }
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      const hot = l === Math.floor(LINES / 2);
      g.strokeStyle = hot ? `rgba(255,106,43,${0.55 + level * 4})` : `rgba(236,235,230,${0.05 + k * 0.06})`;
      g.lineWidth = hot ? 1.6 : 1;
      g.stroke();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- generative project covers ----------
// Each project without an image gets a unique waveform composition derived
// from its id, so the grid looks intentional before real art exists.

export function drawCover(canvas, seed, hue = 20) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 400, h = canvas.clientHeight || 250;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext("2d");
  g.scale(dpr, dpr);

  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100000, 7);
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${hue} 30% 9%)`);
  bg.addColorStop(1, "#0b0c0f");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  // grid
  g.strokeStyle = "rgba(255,255,255,0.04)";
  for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }

  const freqs = Array.from({ length: 4 }, () => 2 + rnd() * 14);
  const phases = freqs.map(() => rnd() * Math.PI * 2);
  const lines = 26;
  for (let l = 0; l < lines; l++) {
    const k = l / lines;
    g.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const nx = x / w;
      const env = Math.sin(nx * Math.PI) ** 2;
      let y = 0;
      freqs.forEach((f, i) => (y += Math.sin(nx * f + phases[i] + k * (i + 1) * 1.3)));
      y = h / 2 + y * env * h * 0.09 + (k - 0.5) * h * 0.55 * (1 - env * 0.7);
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    const accent = Math.abs(k - 0.5) < 0.04;
    g.strokeStyle = accent ? `hsl(${hue} 100% 60%)` : `hsla(${hue} 40% 85% / ${0.08 + 0.18 * Math.sin(k * Math.PI)})`;
    g.lineWidth = accent ? 1.8 : 1;
    g.stroke();
  }
}
