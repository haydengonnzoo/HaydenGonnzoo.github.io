import { site, projects } from "./content.js";
import { WavePlayer, ABPlayer, setUiSound, uiSound, resume, onStateChange, getContext, pauseAll } from "./audio.js";
import { heroScope, drawCover } from "./visuals.js";
import { spatialLab } from "./spatial.js";

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- static content ----------

$("#heroLede").textContent = site.lede;
$("#year").textContent = new Date().getFullYear();
$("#aboutBio").innerHTML = site.bio.map(p => `<p>${esc(p)}</p>`).join("");
$("#aboutSkills").innerHTML = site.skills.map(s => `
  <div class="skill-group">
    <h3>${esc(s.group)}</h3>
    <ul class="tags">${s.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
  </div>`).join("");
$("#contactLinks").innerHTML = [
  site.email && `<a class="btn btn--primary" href="mailto:${esc(site.email)}">${esc(site.email)}</a>`,
  ...site.links.map(l => `<a class="btn" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} <span aria-hidden="true">↗</span></a>`),
].filter(Boolean).join("");

// ---------- project grid ----------

const HUES = [20, 195, 280, 140];
const grid = $("#projectGrid");
projects.forEach((p, i) => {
  const card = document.createElement(p.comingSoon ? "div" : "button");
  card.className = "card";
  if (p.comingSoon) card.setAttribute("aria-disabled", "true");
  else card.addEventListener("click", () => { location.hash = `#/${p.id}`; });
  card.innerHTML = `
    <div class="card__media">
      ${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : `<canvas aria-hidden="true"></canvas>`}
      ${p.hoverVideo ? `<video src="${esc(p.hoverVideo)}" muted loop playsinline preload="none"></video>` : ""}
      ${p.comingSoon ? `<span class="badge mono">In progress</span>` : ""}
    </div>
    <div class="card__body">
      <div class="card__meta mono"><span>${esc(p.category)}</span><span>${esc(p.year)}</span></div>
      <h3 class="card__title">${esc(p.title)}</h3>
      <p class="card__summary">${esc(p.summary)}</p>
      <ul class="tags">${p.tags.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      ${p.comingSoon ? "" : `<span class="card__more">Open project →</span>`}
    </div>`;
  grid.append(card);
  const cv = card.querySelector("canvas");
  if (cv) requestAnimationFrame(() => drawCover(cv, p.id, HUES[i % HUES.length]));
  const vid = card.querySelector("video");
  if (vid) {
    card.addEventListener("mouseenter", () => vid.play().catch(() => {}));
    card.addEventListener("mouseleave", () => vid.pause());
  }
  card.addEventListener("mouseenter", () => uiSound("tick"));
});

// ---------- project detail ----------

const dialog = $("#projectDialog");
const body = $("#projectBody");
let mounted = [];

function videoBlock(v, title) {
  if (!v) return `<div class="video"><div class="placeholder"><canvas data-cover="${esc(title)}"></canvas><span class="mono">Video coming soon</span></div></div>`;
  if (v.provider === "vimeo") return `<div class="video"><iframe src="https://player.vimeo.com/video/${esc(v.id)}?dnt=1&title=0&byline=0&portrait=0&color=ff6a2b" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(title)}"></iframe></div>`;
  if (v.provider === "youtube") return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${esc(title)}"></iframe></div>`;
  return `<div class="video"><video src="${esc(v.src)}" ${v.poster ? `poster="${esc(v.poster)}"` : ""} controls playsinline preload="metadata"></video></div>`;
}

function openProject(id) {
  const p = projects.find(x => x.id === id && !x.comingSoon);
  if (!p) return closeProject();
  unmount();
  body.innerHTML = `
    <div class="project__top">
      <span class="mono eyebrow" style="margin:0">${esc(p.category)}</span>
      <button class="project__close" id="closeProject">Close ✕</button>
    </div>
    <h2 id="projectTitle">${esc(p.title)}</h2>
    <p class="project__subtitle">${esc(p.subtitle)}</p>
    <dl class="facts">${(p.facts || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    ${videoBlock(p.video, p.title)}
    ${p.compare?.length ? `<h3 class="block-title">Before / after</h3><p class="block-sub">Both versions play in sync. Switch at any point to compare the same moment.</p><div class="stack" data-compare></div>` : ""}
    <div class="prose">${p.body || ""}</div>
    ${p.audio?.length ? `<h3 class="block-title">Listen</h3><p class="block-sub">Click the waveform to seek.</p><div class="stack" data-audio></div>` : ""}
    ${p.gallery?.length ? `<h3 class="block-title">Gallery</h3><div class="gallery">${p.gallery.map(g => `<figure class="figure"><img src="${esc(g.src)}" alt="${esc(g.caption || "")}" loading="lazy"><figcaption>${esc(g.caption || "")}</figcaption></figure>`).join("")}</div>` : ""}
    ${p.links?.length ? `<div class="contact__links">${p.links.map(l => `<a class="btn" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div>` : ""}
  `;
  const audioWrap = body.querySelector("[data-audio]");
  p.audio?.forEach(a => { const pl = new WavePlayer(a); audioWrap.append(pl.el); mounted.push(pl); });
  const cmpWrap = body.querySelector("[data-compare]");
  p.compare?.forEach(c => { const pl = new ABPlayer(c); cmpWrap.append(pl.el); mounted.push(pl); });
  body.querySelector("#closeProject").addEventListener("click", () => { location.hash = "#work"; });
  if (!dialog.open) { dialog.showModal(); uiSound("open"); }
  dialog.scrollTop = 0;
  document.title = `${p.title} — ${site.name}`;
  requestAnimationFrame(() => body.querySelectorAll("canvas[data-cover]").forEach(c => drawCover(c, p.id, 20)));
}

function unmount() {
  pauseAll();
  mounted.forEach(m => m.destroy?.());
  mounted = [];
}

function closeProject() {
  if (!dialog.open) return;
  unmount();
  dialog.close();
  uiSound("close");
  document.title = `${site.name} — ${site.role}`;
}

dialog.addEventListener("cancel", e => { e.preventDefault(); location.hash = "#work"; });
dialog.addEventListener("click", e => { if (e.target === dialog) location.hash = "#work"; });

function route() {
  const m = location.hash.match(/^#\/([\w-]+)/);
  if (m) openProject(m[1]); else closeProject();
}
addEventListener("hashchange", route);
route();

// ---------- engine status + UI sound toggle ----------

const dot = $("#engineDot"), status = $("#engineStatus");
onStateChange(state => {
  const live = state === "running";
  dot.classList.toggle("is-live", live);
  status.textContent = live ? "Audio engine live" : "Audio engine on standby";
});

const toggle = $("#soundToggle");
toggle.addEventListener("click", async () => {
  const on = toggle.getAttribute("aria-pressed") !== "true";
  toggle.setAttribute("aria-pressed", String(on));
  toggle.querySelector(".sound-toggle__label").textContent = on ? "UI sound on" : "UI sound off";
  getContext();
  setUiSound(on);
  await resume();
  uiSound("toggle");
});
document.querySelectorAll(".btn, .nav__links a").forEach(el => el.addEventListener("mouseenter", () => uiSound("tick")));

// ---------- visuals ----------

heroScope($("#heroScope"), { l: $("#meterL"), r: $("#meterR") });

spatialLab({
  canvas: $("#labCanvas"),
  play: $("#labPlay"),
  source: $("#labSource"),
  file: $("#labFile"),
  height: $("#labHeight"),
  heightOut: $("#labHeightOut"),
  orbit: $("#labOrbit"),
  ro: { x: $("#roX"), y: $("#roY"), z: $("#roZ"), az: $("#roAz"), el: $("#roEl"), dist: $("#roDist") },
});
