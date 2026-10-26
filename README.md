# Hayden Gonzales: Portfolio

A hand-built portfolio site: plain HTML/CSS/JS with the Web Audio API, and no
framework or build step. Edit a file, refresh, done.

## What's in it

- **Live hero oscilloscope**: idle sine traces that follow the cursor and turn
  into a real scope (plus L/R meters) whenever anything on the site plays.
- **Waveform players**: waveforms are computed in the browser from the audio
  file itself. Click or drag to seek.
- **A/B before/after player**: both versions play in sync; press **A** / **B**
  (or click) to crossfade between them at the same moment in the clip.
- **Spatial Lab**: a binaural (HRTF) object panner. Drag a source around a
  7.1.4 room in the same ADM X/Y/Z space as the Atmos Panning Automation tool.
- **UI sounds**: synthesized interface ticks, off by default (nav toggle).
- Generative cover art for any project without an image.

## Editing content

Everything you'll normally change is in **`js/content.js`**: your bio, skills,
links, and every project. Each field is commented.

### Adding media

| Kind | Where | Notes |
|---|---|---|
| Audio clips | `assets/audio/<project>/` | MP3, 320 kbps. Paths already listed in `content.js` light up as soon as the file exists. |
| Long video (reel, gameplay) | **Vimeo** | Upload, then set `video: { provider: "vimeo", id: "123456789" }`. Keeps the repo small and the player ad-free. |
| Short clips (< ~20 MB) | `assets/video/` | `video: { provider: "file", src: "assets/video/x.mp4" }` |
| Card hover loop | `assets/video/` | Silent 3–6 s MP4, set as `hoverVideo`. Plays when the card is hovered. |
| Cover / screenshots | `assets/img/` | Set `cover`, or add to a project's `gallery`. |

Missing files show a "coming soon" state, so it's safe to list them early.

**For the Atmos project:** export a **binaural** render from the Dolby Atmos
Renderer to `assets/audio/atmos/binaural.mp3`, and screen-record the renderer's
object view for the video.

## Previewing locally

The site uses ES modules, so open it through a local server, not by
double-clicking `index.html`:

```bash
python3 -m http.server 8765 --directory "/Users/haydengonzales/Documents/Game DEV/portfolio-site"
```

Then visit http://localhost:8765.

## Publishing on GitHub Pages

1. On GitHub, create a **public** repository named **`HaydenGonnzoo.github.io`**.
2. Push this folder to it:
   ```bash
   cd "/Users/haydengonzales/Documents/Game DEV/portfolio-site"
   git init && git add . && git commit -m "Portfolio site"
   git branch -M main
   git remote add origin https://github.com/HaydenGonnzoo/HaydenGonnzoo.github.io.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Source: Deploy from a branch → main / root**.
4. After a minute it's live at **https://haydengonnzoo.github.io**.

**Custom domain (optional, ~$12/yr):** buy e.g. `haydengonzales.com`, add it under
Settings → Pages → Custom domain, and follow GitHub's DNS instructions.

GitHub limits: 100 MB per file, ~1 GB per site, so keep long video on Vimeo.
