import { getContext, getMaster, resume, uiSound, pauseAll } from "./audio.js";

// Binaural object panner. Room coordinates follow the ADM cartesian
// convention used by the Atmos tool: x -1 (left) .. 1 (right),
// y -1 (back) .. 1 (front), z 0 (ear level) .. 1 (ceiling).

const ROOM_METERS = 3;

const SPEAKERS = [
  // 7.1 ear-level
  [-0.7, 1, "L"], [0, 1, "C"], [0.7, 1, "R"],
  [-1, 0, "Ls"], [1, 0, "Rs"], [-0.7, -1, "Lrs"], [0.7, -1, "Rrs"],
];
const TOPS = [[-0.5, 0.5, "Ltf"], [0.5, 0.5, "Rtf"], [-0.5, -0.5, "Ltr"], [0.5, -0.5, "Rtr"]];

export function spatialLab(els) {
  const { canvas, play, source, file, height, heightOut, orbit, ro } = els;
  const g = canvas.getContext("2d");
  const pos = { x: 0.55, y: 0.55, z: 0 };
  const trail = [];
  let orbitAngle = Math.atan2(pos.y, pos.x);
  let running = false, visible = false, dragging = false;
  let nodes = null, srcNode = null, userBuffer = null;
  const buffers = {};
  const levelBuf = new Float32Array(512);
  let level = 0;

  // ---------- synthesis ----------

  function makeBuffer(kind) {
    const ctx = getContext();
    const sr = ctx.sampleRate;
    const secs = kind === "steps" ? 4 : kind === "drone" ? 4 : 2;
    const buf = ctx.createBuffer(1, sr * secs, sr);
    const d = buf.getChannelData(0);
    let seed = 1;
    const noise = () => ((seed = (seed * 16807) % 2147483647) / 1073741823.5 - 1);

    if (kind === "pulse") {
      // 16th-note hats with an accented thump on each beat (120 bpm)
      const step = sr * 0.125;
      for (let n = 0; n < 16; n++) {
        const start = Math.floor(n * step);
        const accent = n % 4 === 0;
        for (let i = 0; i < step && start + i < d.length; i++) {
          const t = i / sr;
          let v = noise() * Math.exp(-t * (accent ? 30 : 60)) * (accent ? 0.5 : 0.25);
          if (accent) v += Math.sin(2 * Math.PI * 70 * t * (1 - t * 2)) * Math.exp(-t * 18) * 0.7;
          d[start + i] = v;
        }
      }
    } else if (kind === "steps") {
      // heel + toe noise bursts through a one-pole lowpass, slight variation
      const interval = sr * 0.52;
      for (let n = 0; n < 7; n++) {
        const start = Math.floor(n * interval + 0.15 * sr);
        let lp = 0;
        const bright = 0.2 + 0.1 * Math.sin(n * 2.1);
        for (let i = 0; i < sr * 0.25 && start + i < d.length; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 40) + 0.6 * (t > 0.06 ? Math.exp(-(t - 0.06) * 55) : 0);
          lp += bright * (noise() - lp);
          d[start + i] = lp * env * 1.6;
        }
      }
    } else {
      // drone: partials on a 0.25 Hz grid so the 4 s buffer loops seamlessly
      const partials = [[55, 0.5], [110, 0.35], [110.5, 0.3], [165, 0.18], [220.25, 0.12], [330, 0.06], [440.5, 0.04]];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let v = 0;
        for (const [f, a] of partials) v += Math.sin(2 * Math.PI * f * t) * a;
        d[i] = v * 0.45 * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.5 * t)) + noise() * 0.01;
      }
    }
    return buf;
  }

  function graph() {
    if (nodes) return nodes;
    const ctx = getContext();
    const panner = new PannerNode(ctx, {
      panningModel: "HRTF",
      distanceModel: "inverse",
      refDistance: 1,
      rolloffFactor: 1.2,
    });
    const gain = new GainNode(ctx, { gain: 0.9 });
    const analyser = new AnalyserNode(ctx, { fftSize: 512 });
    gain.connect(analyser);
    gain.connect(panner).connect(getMaster());
    nodes = { panner, gain, analyser };
    applyPosition(true);
    return nodes;
  }

  function startSource() {
    const ctx = getContext();
    stopSource();
    const kind = source.value;
    let buf;
    if (kind === "file") buf = userBuffer;
    else buf = buffers[kind] ||= makeBuffer(kind);
    if (!buf) return;
    srcNode = new AudioBufferSourceNode(ctx, { buffer: buf, loop: true });
    srcNode.connect(graph().gain);
    srcNode.start();
  }

  function stopSource() {
    if (srcNode) { try { srcNode.stop(); } catch {} srcNode.disconnect(); srcNode = null; }
  }

  async function setRunning(on) {
    if (on) {
      await resume();
      pauseAll();
      startSource();
    } else {
      stopSource();
    }
    running = on && !!srcNode;
    play.textContent = running ? "■ Stop audio" : "▶ Start audio";
    play.classList.toggle("btn--primary", !running);
  }

  // ---------- position ----------

  function applyPosition(immediate) {
    const { x, y, z } = pos;
    ro.x.textContent = x.toFixed(2);
    ro.y.textContent = y.toFixed(2);
    ro.z.textContent = z.toFixed(2);
    ro.az.textContent = `${Math.round(Math.atan2(x, y) * 180 / Math.PI)}°`;
    ro.el.textContent = `${Math.round(Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI)}°`;
    ro.dist.textContent = Math.hypot(x, y, z).toFixed(2);
    if (!nodes) return;
    const p = nodes.panner, ctx = getContext();
    const target = [x * ROOM_METERS, z * ROOM_METERS * 0.8, -y * ROOM_METERS];
    [p.positionX, p.positionY, p.positionZ].forEach((param, i) => {
      if (immediate) param.value = target[i];
      else param.setTargetAtTime(target[i], ctx.currentTime, 0.03);
    });
  }

  const clamp = v => Math.max(-1, Math.min(1, v));

  // ---------- drawing ----------

  let size = 0, pad = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    size = canvas.clientWidth;
    canvas.width = size * dpr; canvas.height = size * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    pad = size * 0.09;
  }
  const toPx = (x, y) => [pad + (x + 1) / 2 * (size - pad * 2), pad + (1 - (y + 1) / 2) * (size - pad * 2)];
  const fromPx = (px, py) => [clamp(((px - pad) / (size - pad * 2)) * 2 - 1), clamp(1 - ((py - pad) / (size - pad * 2)) * 2)];

  function draw() {
    g.clearRect(0, 0, size, size);
    const inner = size - pad * 2;

    // room + grid
    g.strokeStyle = "#262a32";
    g.lineWidth = 1;
    g.strokeRect(pad, pad, inner, inner);
    g.setLineDash([2, 6]);
    for (let i = 1; i < 4; i++) {
      const o = pad + inner * i / 4;
      g.beginPath(); g.moveTo(o, pad); g.lineTo(o, pad + inner); g.stroke();
      g.beginPath(); g.moveTo(pad, o); g.lineTo(pad + inner, o); g.stroke();
    }
    g.setLineDash([]);
    const [cx, cy] = toPx(0, 0);
    for (const r of [0.33, 0.66, 1]) {
      g.beginPath(); g.arc(cx, cy, inner / 2 * r, 0, Math.PI * 2); g.stroke();
    }

    // speakers
    g.font = `500 ${Math.max(9, size * 0.017)}px "JetBrains Mono", monospace`;
    g.textAlign = "center";
    for (const [x, y, name] of SPEAKERS) {
      const [px, py] = toPx(x, y);
      g.fillStyle = "#3a3f49"; g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#8d919a"; g.fillText(name, px, py + (y > 0 ? -12 : y < 0 ? 20 : -12));
    }
    for (const [x, y, name] of TOPS) {
      const [px, py] = toPx(x, y);
      g.strokeStyle = "#4a505c"; g.beginPath(); g.arc(px, py, 6, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#5d626d"; g.fillText(name, px, py + 20);
    }
    g.fillStyle = "#8d919a";
    g.fillText("FRONT", cx, pad - 14 > 10 ? pad - 14 : 12);

    // listener head
    const hr = size * 0.028;
    g.fillStyle = "#181b21"; g.strokeStyle = "#ecebe6"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, hr, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - hr * 0.35, cy - hr * 0.9); g.lineTo(cx, cy - hr * 1.5); g.lineTo(cx + hr * 0.35, cy - hr * 0.9); g.stroke();
    g.beginPath(); g.ellipse(cx - hr, cy, hr * 0.18, hr * 0.38, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(cx + hr, cy, hr * 0.18, hr * 0.38, 0, 0, Math.PI * 2); g.stroke();

    // trail
    trail.forEach((p, i) => {
      const [tx, ty] = toPx(p.x, p.y);
      g.fillStyle = `rgba(255,106,43,${(i / trail.length) * 0.35})`;
      g.beginPath(); g.arc(tx, ty, 2, 0, Math.PI * 2); g.fill();
    });

    // object: shadow stays on the floor, the body lifts and grows with height
    const [ox, oy] = toPx(pos.x, pos.y);
    const lift = pos.z * size * 0.05;
    const r = size * (0.026 + pos.z * 0.016);
    g.fillStyle = "rgba(0,0,0,0.5)";
    g.beginPath(); g.ellipse(ox, oy, r, r * 0.45, 0, 0, Math.PI * 2); g.fill();
    if (lift > 1) {
      g.strokeStyle = "rgba(255,106,43,0.35)"; g.setLineDash([2, 3]);
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox, oy - lift); g.stroke(); g.setLineDash([]);
    }
    const ring = r + 4 + level * size * 0.25;
    g.strokeStyle = `rgba(255,106,43,${0.15 + level * 2})`;
    g.lineWidth = 2;
    g.beginPath(); g.arc(ox, oy - lift, ring, 0, Math.PI * 2); g.stroke();
    const grad = g.createRadialGradient(ox - r * 0.3, oy - lift - r * 0.3, 1, ox, oy - lift, r);
    grad.addColorStop(0, "#ffb08a"); grad.addColorStop(1, "#ff6a2b");
    g.fillStyle = grad;
    g.beginPath(); g.arc(ox, oy - lift, r, 0, Math.PI * 2); g.fill();

    // line of sound to the head
    g.strokeStyle = "rgba(111,211,255,0.25)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(ox, oy - lift); g.stroke();
  }

  function frame() {
    if (orbit.checked && !dragging) {
      orbitAngle += 0.012;
      pos.x = Math.cos(orbitAngle) * 0.72;
      pos.y = Math.sin(orbitAngle) * 0.72;
      applyPosition(false);
    }
    if (running && nodes) {
      nodes.analyser.getFloatTimeDomainData(levelBuf);
      let s = 0;
      for (const v of levelBuf) s += v * v;
      level += (Math.sqrt(s / levelBuf.length) - level) * 0.3;
    } else {
      level *= 0.9;
    }
    trail.push({ x: pos.x, y: pos.y });
    if (trail.length > 50) trail.shift();
    draw();
    if (visible) requestAnimationFrame(frame);
  }

  // ---------- input ----------

  const pointerTo = e => {
    const r = canvas.getBoundingClientRect();
    [pos.x, pos.y] = fromPx(e.clientX - r.left, e.clientY - r.top);
    orbitAngle = Math.atan2(pos.y, pos.x);
    applyPosition(false);
  };
  canvas.addEventListener("pointerdown", e => {
    dragging = true;
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture(e.pointerId);
    pointerTo(e);
  });
  canvas.addEventListener("pointermove", e => dragging && pointerTo(e));
  const end = () => { dragging = false; canvas.classList.remove("is-dragging"); };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("keydown", e => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return;
    e.preventDefault();
    pos.x = clamp(pos.x + d[0] * 0.05);
    pos.y = clamp(pos.y + d[1] * 0.05);
    orbitAngle = Math.atan2(pos.y, pos.x);
    applyPosition(false);
  });

  play.addEventListener("click", () => { uiSound("toggle"); setRunning(!running); });
  height.addEventListener("input", () => {
    pos.z = +height.value;
    heightOut.textContent = pos.z.toFixed(2);
    applyPosition(false);
  });
  source.addEventListener("change", () => {
    if (source.value === "file" && !userBuffer) { file.click(); return; }
    if (running) startSource();
  });
  file.addEventListener("change", async () => {
    const f = file.files[0];
    if (!f) { source.value = "pulse"; return; }
    try {
      userBuffer = await getContext().decodeAudioData(await f.arrayBuffer());
      source.value = "file";
      setRunning(true);
    } catch {
      source.value = "pulse";
      alert("That file couldn't be decoded. Try a WAV or MP3.");
    }
  });

  // Stop the lab when another player takes over the speakers.
  document.addEventListener("player:claim", () => running && setRunning(false));

  resize();
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    const was = visible;
    visible = entry.isIntersecting;
    if (visible && !was) requestAnimationFrame(frame);
  }).observe(canvas);
  applyPosition(true);
  draw();
}
