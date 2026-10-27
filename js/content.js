// ============================================================================
// SITE CONTENT: edit this file to change text, add projects, and attach media.
//
// Media paths are relative to the site root (e.g. "assets/audio/clip.mp3").
// A missing file shows a tasteful "coming soon" state, so it is safe to list
// media here before you have rendered it.
//
// video: { provider: "vimeo", id: "123456789" }
//        { provider: "youtube", id: "dQw4w9WgXcQ" }
//        { provider: "file", src: "assets/video/clip.mp4", poster: "assets/img/poster.jpg" }
// ============================================================================

export const site = {
  name: "Hayden Gonzales",
  role: "Sound Designer",
  lede: "Game audio, implementation and spatial sound. I design sounds, wire them into the engine, and build tools when the workflow gets in the way.",
  email: "", // add the address you want public, e.g. "hello@haydengonzales.com"
  links: [
    { label: "GitHub", href: "https://github.com/HaydenGonnzoo" },
    // { label: "LinkedIn", href: "https://www.linkedin.com/in/your-handle" },
    // { label: "Resume (PDF)", href: "assets/Hayden-Gonzales-Resume.pdf" },
  ],
  bio: [
    "I'm a sound designer focused on games and spatial audio: I like the whole chain, from recording and designing a sound to the systems that decide when and how it plays.",
    "My recent work includes a fully native Unreal Engine 5 audio pass built on MetaSounds and a C++ audio subsystem, a sound redesign of Call of Duty: Modern Warfare II gameplay, and a tool that turns video motion tracking into Dolby Atmos panning automation.",
  ],
  skills: [
    { group: "Sound design", items: ["Pro Tools", "iZotope RX", "Field & Foley recording", "Weapons & UI", "Ambience"] },
    { group: "Implementation", items: ["Unreal Engine 5", "MetaSounds", "C++", "Blueprints", "Data-driven audio"] },
    { group: "Spatial / post", items: ["Dolby Atmos", "ADM / BWF", "Object panning", "Binaural", "Dialogue editing"] },
    { group: "Tools & code", items: ["Python", "SAM 2 tracking", "OpenCV", "Web Audio API"] },
  ],
};

// Background for the reviews section. Swap in a video later with
// reviewsBackground: { video: "assets/video/session.mp4" }
export const reviewsBackground = { image: "assets/img/protools-session.avif" };

export const reviews = [
  {
    name: "Nick White",
    role: "Mixing Engineer",
    quote: "Hayden is a very bright and hardworking young man. He has brought a level of professionalism and curiosity to our studio and was a joy to have over the summer.",
  },
  {
    name: "Ronnie Levy",
    role: "Songwriter",
    quote: "I've been working with Hayden for over 3 years and he has always been prompt and professional. He has delivered me quality mixes and has had quick turnarounds for final mastering.",
  },
  {
    name: "Aiden Thomason",
    role: "Game Developer",
    quote: "Hayden has been a pleasure to work with. He has brought many game demos to life with high quality audio syncing and mixing of new sounds.",
  },
];

export const projects = [
  {
    id: "signal-zero",
    title: "Signal Zero",
    subtitle: "Full audio pass for a UE5 horror shooter",
    year: "2026",
    category: "Game audio · Implementation",
    summary: "Designed and implemented every sound in a playable Unreal Engine 5.7 game, natively with MetaSounds and a C++ audio subsystem. No middleware.",
    tags: ["Unreal Engine 5.7", "MetaSounds", "C++", "Sound design"],
    facts: [
      ["Role", "Sound design & implementation"],
      ["Engine", "Unreal Engine 5.7"],
      ["Audio", "Native UE / MetaSounds"],
      ["Scope", "81 cues, data-driven bank"],
    ],
    cover: null, // e.g. "assets/img/signal-zero.jpg"
    hoverVideo: null, // short silent loop, e.g. "assets/video/signal-zero-loop.mp4"
    video: null, // e.g. { provider: "vimeo", id: "123456789" }
    body: `
      <h3>Overview</h3>
      <p>Signal Zero is an arena/horror shooter built from Unreal's first-person template, which shipped with no audio. I authored the entire soundscape and the systems that drive it: weapons, footsteps, ambience, UI and an AI stalker that hunts the player through a haunted level.</p>
      <h3>Implementation</h3>
      <ul>
        <li>A C++ <code>AudioSubsystem</code> exposes one call, <code>PlayCue</code>, so gameplay code never references a sound asset directly.</li>
        <li>All 81 cues live in a single data-asset audio bank, so sounds can be swapped or rebalanced without touching code.</li>
        <li>Surface-aware footsteps across wood, concrete, carpet and leaves.</li>
        <li>MetaSounds handle randomization and variation, so repeated sounds never play back identically.</li>
      </ul>
      <h3>What I'd point out</h3>
      <p>Replace this with what you're proudest of: a specific MetaSound graph, how the stalker's audio tells you where it is, or a mix decision.</p>
    `,
    gallery: [
      // { src: "assets/img/sz-metasound.png", caption: "Weapon fire MetaSound graph" },
    ],
    audio: [
      { title: "Weapon fire: layered", src: "assets/audio/signal-zero/weapon-fire.mp3", note: "Mechanics, body and tail layers" },
      { title: "Haunted cabin ambience", src: "assets/audio/signal-zero/ambience.mp3", note: "Looping bed + randomized one-shots" },
    ],
    compare: [],
  },
  {
    id: "mw2-redesign",
    title: "MW2 Sound Redesign",
    subtitle: "Call of Duty: Modern Warfare II, re-sounded from scratch",
    year: "2026",
    category: "Sound redesign",
    summary: "Stripped the original audio from a Modern Warfare II gameplay clip and rebuilt every weapon, foley, ambience and UI sound.",
    tags: ["Sound design", "Pro Tools", "Weapons", "Mix"],
    facts: [
      ["Role", "Sound design & mix"],
      ["Source", "MW2 gameplay capture"],
      ["DAW", "Pro Tools"],
      ["Length", "TBD"],
    ],
    cover: null,
    hoverVideo: null,
    video: null, // put the finished redesign on Vimeo and add its id here
    body: `
      <h3>Brief</h3>
      <p>Replace this with your goal for the redesign, e.g. a heavier, more grounded weapon palette than the original.</p>
      <h3>Process</h3>
      <p>Describe your sources (recordings, libraries, synthesis), how you layered the weapons, and how you handled the mix around dialogue and music.</p>
      <p class="muted">Gameplay footage © Activision. Used for non-commercial portfolio purposes; all audio is my own.</p>
    `,
    gallery: [],
    audio: [],
    compare: [
      {
        title: "Original vs. redesign",
        note: "Toggle mid-playback to hear the difference",
        a: { label: "Original", src: "assets/audio/mw2/original.mp3" },
        b: { label: "Redesign", src: "assets/audio/mw2/redesign.mp3" },
      },
    ],
  },
  {
    id: "atmos-panning",
    title: "Atmos Panning Automation",
    subtitle: "From video motion tracking to Dolby Atmos object automation",
    year: "2026",
    category: "Spatial audio · Tool development",
    summary: "A Python tool that tracks on-screen objects with SAM 2 and exports Dolby Atmos panning automation straight into an existing Pro Tools session.",
    tags: ["Python", "SAM 2", "Dolby Atmos", "ADM / BWF", "Pro Tools"],
    facts: [
      ["Role", "Design & development"],
      ["Language", "Python"],
      ["Tracking", "SAM 2"],
      ["Output", "ADM BWF → Pro Tools"],
    ],
    cover: null,
    hoverVideo: null,
    video: null, // screen recording of the renderer's object view + binaural audio
    body: `
      <h3>The problem</h3>
      <p>Panning Atmos objects to follow on-screen motion means hours of manual keyframing. This tool generates that automation from the picture and applies it to audio that's already on the tracks. It never creates or replaces audio.</p>
      <h3>Pipeline</h3>
      <ol>
        <li><strong>Shot detection</strong> splits the video at cuts and dissolves, since tracking can't cross a cut.</li>
        <li><strong>Click-and-pan</strong>: I click the object in a shot and SAM 2 tracks it frame by frame. Camera motion is separated from object motion.</li>
        <li><strong>Export</strong> writes an ADM/BWF WAV (<code>axml</code> + <code>chna</code> chunks) carrying the position automation.</li>
        <li><strong>Import</strong> through Pro Tools' Session Data dialog, mapping each object onto its existing track.</li>
      </ol>
      <h3>Validation</h3>
      <p>A reverse reader pulls real automation out of hand-mixed Atmos bounces so generated paths can be scored against a reference, and a preview plots each path on a top-down room map before it goes near Pro Tools. The <a href="#lab">Spatial Lab</a> on this site uses the same room coordinate space.</p>
      <h3>Honest limitations</h3>
      <p>Depth (Y) inferred from apparent object size is unreliable because bloom, occlusion and framing corrupt it. X and Z are the validated axes.</p>
    `,
    gallery: [],
    audio: [
      { title: "Binaural render (headphones)", src: "assets/audio/atmos/binaural.mp3", note: "Rendered from the Dolby Atmos Renderer" },
    ],
    compare: [],
    links: [
      // { label: "View code on GitHub", href: "https://github.com/HaydenGonnzoo/atmos-panning-automation" },
    ],
  },
  {
    id: "tbd",
    title: "Next project",
    subtitle: "",
    year: "Soon",
    category: "Post production",
    summary: "A post-production mix is on the way: dialogue cleanup, sound effects and a final mix.",
    tags: ["Post production"],
    comingSoon: true,
  },
];
