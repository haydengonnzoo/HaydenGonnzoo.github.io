// Shared Web Audio engine: one context, one master bus feeding a stereo
// analyser that the hero visualizer and meters read from.

let ctx = null;
let master = null;
let analyserL = null;
let analyserR = null;
const listeners = new Set();

export function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    const splitter = ctx.createChannelSplitter(2);
    analyserL = ctx.createAnalyser();
    analyserR = ctx.createAnalyser();
    for (const a of [analyserL, analyserR]) { a.fftSize = 2048; a.smoothingTimeConstant = 0.6; }
    master.connect(ctx.destination);
    master.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);
    ctx.onstatechange = () => listeners.forEach(fn => fn(ctx.state));
  }
  return ctx;
}

export async function resume() {
  const c = getContext();
  if (c.state !== "running") await c.resume();
  return c;
}

export const getMaster = () => (getContext(), master);
export const getAnalysers = () => (ctx ? [analyserL, analyserR] : null);
export const onStateChange = fn => listeners.add(fn);

// ---------- one-at-a-time playback ----------

let current = null;
function claim(player) {
  if (current && current !== player) current.pause();
  current = player;
  document.dispatchEvent(new CustomEvent("player:claim"));
}
export function pauseAll() { if (current) current.pause(); }

// ---------- interface sounds ----------
// Tiny synthesized ticks; off by default, toggled from the nav.

let uiOn = false;
export function setUiSound(on) { uiOn = on; if (on) resume(); }
export function uiSound(kind = "tick") {
  if (!uiOn || !ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const settings = {
    tick: [2400, 1800, 0.035, 0.05],
    open: [520, 880, 0.12, 0.08],
    close: [880, 440, 0.1, 0.07],
    toggle: [1200, 1600, 0.06, 0.06],
  }[kind];
  const [f0, f1, dur, vol] = settings;
  osc.type = "sine";
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// ---------- waveform analysis ----------

async function loadPeaks(src, bars) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = await res.arrayBuffer();
  const audio = await getContext().decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const step = Math.floor(data.length / bars) || 1;
  const peaks = new Float32Array(bars);
  for (let i = 0; i < bars; i++) {
    let max = 0;
    for (let j = i * step, end = j + step; j < end && j < data.length; j++) {
      const v = Math.abs(data[j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  const norm = Math.max(...peaks) || 1;
  return { peaks: peaks.map(p => p / norm), duration: audio.duration };
}

const fmt = s => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function sizeCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [g, w, h];
}

// Shared seek behaviour for both player types.
function bindSeek(canvas, getDuration, seek) {
  let dragging = false;
  const at = e => {
    const r = canvas.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * getDuration();
  };
  canvas.addEventListener("pointerdown", e => {
    if (!getDuration()) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    seek(at(e));
  });
  canvas.addEventListener("pointermove", e => dragging && seek(at(e)));
  canvas.addEventListener("pointerup", () => (dragging = false));
}

function makeElement(src) {
  const el = new Audio();
  el.preload = "auto";
  el.crossOrigin = "anonymous";
  el.src = src;
  return el;
}

// ---------- single track player ----------

export class WavePlayer {
  constructor({ title, src, note }) {
    this.src = src;
    this.el = document.createElement("div");
    this.el.className = "player is-empty";
    this.el.innerHTML = `
      <button class="player__btn" disabled aria-label="Play ${title}">${ICON_PLAY}</button>
      <div class="player__main">
        <div class="player__title">${title}</div>
        <div class="player__note">${note || ""}</div>
        <canvas class="player__wave" aria-hidden="true"></canvas>
      </div>
      <span class="player__time mono">Loading</span>`;
    this.btn = this.el.querySelector("button");
    this.canvas = this.el.querySelector("canvas");
    this.timeEl = this.el.querySelector(".player__time");
    this.peaks = null;
    this.duration = 0;
    this.btn.addEventListener("click", () => this.toggle());
    bindSeek(this.canvas, () => this.duration, t => { this.audio.currentTime = t; this.draw(); });
    this.init();
  }

  async init() {
    try {
      const { peaks, duration } = await loadPeaks(this.src, 160);
      this.peaks = peaks;
      this.duration = duration;
      this.audio = makeElement(this.src);
      this.audio.addEventListener("ended", () => this.setPlaying(false));
      this.btn.disabled = false;
      this.el.classList.remove("is-empty");
      this.timeEl.textContent = fmt(duration);
    } catch {
      this.peaks = placeholderPeaks(160, this.src);
      this.timeEl.textContent = "Coming soon";
    }
    this.draw();
    new ResizeObserver(() => this.draw()).observe(this.canvas);
  }

  async toggle() {
    if (!this.audio) return;
    if (this.audio.paused) {
      await resume();
      if (!this.node) {
        this.node = ctx.createMediaElementSource(this.audio);
        this.node.connect(master);
      }
      claim(this);
      await this.audio.play();
      this.setPlaying(true);
      this.loop();
    } else {
      this.pause();
    }
  }

  pause() { this.audio?.pause(); this.setPlaying(false); }

  setPlaying(on) {
    this.playing = on;
    this.btn.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    this.draw();
  }

  loop() {
    this.draw();
    if (this.playing) requestAnimationFrame(() => this.loop());
  }

  draw() {
    if (!this.peaks) return;
    const [g, w, h] = sizeCanvas(this.canvas);
    const progress = this.duration ? (this.audio?.currentTime || 0) / this.duration : 0;
    drawBars(g, w, h, this.peaks, progress, this.duration ? cssVar("--accent") : cssVar("--line"), cssVar("--line"), "full");
    if (this.duration) this.timeEl.textContent = `${fmt(this.audio.currentTime)} / ${fmt(this.duration)}`;
  }
}

// ---------- A/B comparison player ----------
// Both versions play in lockstep; the switch crossfades between them (20 ms)
// so you hear the change at the exact same moment in the clip.

export class ABPlayer {
  constructor({ title, note, a, b }) {
    this.sides = { a, b };
    this.active = "b";
    this.el = document.createElement("div");
    this.el.className = "player player--ab is-empty";
    this.el.innerHTML = `
      <button class="player__btn" disabled aria-label="Play ${title}">${ICON_PLAY}</button>
      <div class="player__main">
        <div class="player__title">${title}</div>
        <div class="player__note">${note || ""}</div>
        <canvas class="player__wave" aria-hidden="true"></canvas>
        <div class="ab">
          <div class="ab__switch" role="group" aria-label="Choose version">
            <button data-side="a" aria-pressed="false">A · ${a.label}</button>
            <button data-side="b" aria-pressed="true">B · ${b.label}</button>
          </div>
          <span class="ab__hint mono">Press A / B</span>
          <span class="ab__time mono">Loading</span>
        </div>
      </div>`;
    this.btn = this.el.querySelector(".player__btn");
    this.canvas = this.el.querySelector("canvas");
    this.timeEl = this.el.querySelector(".ab__time");
    this.switches = [...this.el.querySelectorAll(".ab__switch button")];
    this.btn.addEventListener("click", () => this.toggle());
    this.switches.forEach(s => s.addEventListener("click", () => this.select(s.dataset.side)));
    this.onKey = e => {
      if (!this.el.isConnected || e.target.closest("input, select, textarea")) return;
      const k = e.key.toLowerCase();
      if (k === "a" || k === "b") this.select(k);
    };
    document.addEventListener("keydown", this.onKey);
    bindSeek(this.canvas, () => this.duration, t => this.seek(t));
    this.init();
  }

  async init() {
    try {
      const [pa, pb] = await Promise.all([loadPeaks(this.sides.a.src, 160), loadPeaks(this.sides.b.src, 160)]);
      this.peaks = { a: pa.peaks, b: pb.peaks };
      this.duration = Math.min(pa.duration, pb.duration);
      this.audio = { a: makeElement(this.sides.a.src), b: makeElement(this.sides.b.src) };
      this.audio.a.addEventListener("ended", () => this.setPlaying(false));
      this.btn.disabled = false;
      this.el.classList.remove("is-empty");
      this.timeEl.textContent = fmt(this.duration);
    } catch {
      this.peaks = { a: placeholderPeaks(160, "a"), b: placeholderPeaks(160, "b") };
      this.timeEl.textContent = "Coming soon";
    }
    this.draw();
    new ResizeObserver(() => this.draw()).observe(this.canvas);
  }

  wire() {
    if (this.gains) return;
    this.gains = {};
    for (const side of ["a", "b"]) {
      const g = ctx.createGain();
      g.gain.value = side === this.active ? 1 : 0;
      ctx.createMediaElementSource(this.audio[side]).connect(g).connect(master);
      this.gains[side] = g;
    }
  }

  select(side) {
    if (side === this.active) return;
    this.active = side;
    this.switches.forEach(s => s.setAttribute("aria-pressed", String(s.dataset.side === side)));
    if (this.gains) {
      const t = ctx.currentTime;
      for (const s of ["a", "b"]) {
        const p = this.gains[s].gain;
        p.cancelScheduledValues(t);
        p.setValueAtTime(p.value, t);
        p.linearRampToValueAtTime(s === side ? 1 : 0, t + 0.02);
      }
    }
    uiSound("toggle");
    this.draw();
  }

  seek(t) {
    if (!this.audio) return;
    this.audio.a.currentTime = t;
    this.audio.b.currentTime = t;
    this.draw();
  }

  async toggle() {
    if (!this.audio) return;
    if (this.audio.a.paused) {
      await resume();
      this.wire();
      claim(this);
      this.audio.b.currentTime = this.audio.a.currentTime;
      await Promise.all([this.audio.a.play(), this.audio.b.play()]);
      this.setPlaying(true);
      this.loop();
    } else {
      this.pause();
    }
  }

  pause() {
    if (!this.audio) return;
    this.audio.a.pause();
    this.audio.b.pause();
    this.setPlaying(false);
  }

  setPlaying(on) {
    this.playing = on;
    this.btn.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    this.draw();
  }

  loop() {
    // Keep B locked to A; HTML media elements drift a few ms over time.
    if (Math.abs(this.audio.a.currentTime - this.audio.b.currentTime) > 0.04) {
      this.audio.b.currentTime = this.audio.a.currentTime;
    }
    this.draw();
    if (this.playing) requestAnimationFrame(() => this.loop());
  }

  draw() {
    if (!this.peaks) return;
    const [g, w, h] = sizeCanvas(this.canvas);
    const progress = this.duration ? this.audio.a.currentTime / this.duration : 0;
    const accent = cssVar("--accent"), text = cssVar("--text"), line = cssVar("--line");
    const live = !!this.duration;
    // A mirrors upward, B downward, so both versions are visible at once.
    g.globalAlpha = this.active === "a" ? 1 : 0.35;
    drawBars(g, w, h, this.peaks.a, progress, live ? text : line, line, "top");
    g.globalAlpha = this.active === "b" ? 1 : 0.35;
    drawBars(g, w, h, this.peaks.b, progress, live ? accent : line, line, "bottom");
    g.globalAlpha = 1;
    if (live) this.timeEl.textContent = `${fmt(this.audio.a.currentTime)} / ${fmt(this.duration)}`;
  }

  destroy() { this.pause(); document.removeEventListener("keydown", this.onKey); }
}

function drawBars(g, w, h, peaks, progress, played, rest, mode) {
  if (mode !== "bottom") g.clearRect(0, 0, w, h);
  const n = peaks.length;
  const bw = w / n;
  const mid = h / 2;
  for (let i = 0; i < n; i++) {
    const amp = Math.max(1, peaks[i] * (mode === "full" ? h * 0.48 : mid - 2));
    g.fillStyle = i / n < progress ? played : rest;
    const x = i * bw + bw * 0.2, bwid = Math.max(1, bw * 0.6);
    if (mode === "full") g.fillRect(x, mid - amp, bwid, amp * 2);
    else if (mode === "top") g.fillRect(x, mid - amp - 1, bwid, amp);
    else g.fillRect(x, mid + 1, bwid, amp);
  }
  if (progress > 0) {
    g.fillStyle = played;
    g.fillRect(progress * w, 0, 1, h);
  }
}

// Deterministic fake waveform for media that hasn't been added yet.
function placeholderPeaks(n, seed) {
  let s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Float32Array.from({ length: n }, (_, i) =>
    0.15 + 0.5 * Math.abs(Math.sin(i / 9 + s)) * rnd() + 0.2 * rnd());
}
