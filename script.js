// Config
const DEFAULT_TEXT = "Every legacy starts with a vision shaped by determination and carried forward " +"through consistent effort and belief in possibilities beyond the ordinary " +"what we create today becomes the foundation for tomorrow and every small step " +"taken with purpose adds to a story that will be remembered and continued by others";
const FONT_SIZE = 14;
const FONT_FACE = "monospace";
const LINE_H = FONT_SIZE * 1.7;
const EASE = 0.08;
const REPEL_DIST = 90;
const REPEL_FORCE = 5.5;
const PADDING = 48;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;
let particles = [];
let mode = "text";
let mouse = { x: -9999, y: -9999 };
let tick = 0;
let sourceText = DEFAULT_TEXT;

class Particle {
  constructor(ch, bx, by, idx, total) {
    this.char = ch;
    this.baseX = bx; this.baseY = by;
    this.x = Math.random() * W; this.y = Math.random() * H;
    this.vx = 0; this.vy = 0;
    this.targetX = bx; this.targetY = by;
    this.hue = (idx / total) * 280 + 160;
  }
  update() {
    const dx = this.x - mouse.x, dy = this.y - mouse.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < REPEL_DIST && d > 0) {
      const f = ((REPEL_DIST - d) / REPEL_DIST) ** 2 * REPEL_FORCE;
      this.vx += (dx/d)*f; this.vy += (dy/d)*f;
    }
    this.vx += (this.targetX - this.x) * EASE;
    this.vy += (this.targetY - this.y) * EASE;
    this.vx *= 0.78; this.vy *= 0.78;
    this.x += this.vx; this.y += this.vy;
  }
  draw() {
    const spd = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
    const lit = 60 + Math.min(spd*5, 30);
    const glow = Math.min(spd*3, 18);
    const col = `hsl(${this.hue},90%,${lit}%)`;
    ctx.save();
    ctx.font = `${FONT_SIZE}px ${FONT_FACE}`;
    ctx.fillStyle = col;
    if (glow > 2) { ctx.shadowColor = col; ctx.shadowBlur = glow; }
    ctx.fillText(this.char, this.x, this.y);
    ctx.restore();
  }
}

function buildLayout(text) {
  const tmp = document.createElement("canvas");
  tmp.width = W; tmp.height = H;
  const tc = tmp.getContext("2d");
  tc.font = `${FONT_SIZE}px ${FONT_FACE}`;
  const maxW = W - PADDING * 2;
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (tc.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  const totalH = lines.length * LINE_H;
  const startY = Math.max(FONT_SIZE + 10, (H - totalH) / 2 + FONT_SIZE);
  const positions = [];
  for (let li = 0; li < lines.length; li++) {
    const row = lines[li];
    const y = startY + li * LINE_H;
    let x = PADDING;
    for (let ci = 0; ci < row.length; ci++) {
      positions.push({ x, y });
      x += tc.measureText(row[ci]).width;
    }
    if (li < lines.length - 1) positions.push({ x, y });
  }
  return positions;
}

function buildParticles(text) {
  const chars = [...text].slice(0, 1800);
  const pos = buildLayout(text);
  const n = chars.length;
  particles = chars.map((ch, i) => {
    const p = pos[i] || pos[pos.length - 1];
    return new Particle(ch, p.x, p.y, i, n);
  });
}

function setModeText() { particles.forEach(p => { p.targetX = p.baseX; p.targetY = p.baseY; }); }

function setModeWave() {
  const n = particles.length;
  const cols = Math.ceil(Math.sqrt(n * (W / H)));
  const rows = Math.ceil(n / cols);
  const cw = W / cols, rh = H / rows;
  particles.forEach((p, i) => {
    p._wc = i % cols; p._wr = Math.floor(i / cols);
    p._wa = 28 + (p._wr % 4) * 10;
    p._wf = 0.03 + (p._wr % 5) * 0.008;
    p._wy = p._wr * rh + rh / 2;
    p.targetX = p._wc * cw + cw / 2; p.targetY = p._wy;
  });
}

function setModeScatter() {
  particles.forEach(p => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.min(W, H) * (0.25 + Math.random() * 0.4);
    p.targetX = W/2 + Math.cos(a)*r; p.targetY = H/2 + Math.sin(a)*r;
  });
}

function setModeGravity() {
  const n = particles.length;
  particles.forEach((p, i) => {
    p.targetX = PADDING + (i/n) * (W - PADDING*2);
    p.targetY = H - FONT_SIZE*2 - Math.random()*70;
  });
}

function tickWave() {
  particles.forEach(p => {
    if (p._wc === undefined) return;
    p.targetY = p._wy + Math.sin(p._wc * p._wf + tick * 0.04) * p._wa;
  });
}

function tickSpiral() {
  const n = particles.length;
  const cx = W/2, cy = H/2;
  const maxR = Math.min(W,H) * 0.42;
  const ph = tick * 0.009;
  particles.forEach((p, i) => {
    const t = i/n;
    const a = t * Math.PI * 2 * 7 + ph;
    p.targetX = cx + Math.cos(a)*t*maxR;
    p.targetY = cy + Math.sin(a)*t*maxR;
  });
}

function applyMode(m) {
  mode = m;
  if (m === "text")    setModeText();
  else if (m === "wave")    setModeWave();
  else if (m === "spiral")  tickSpiral();
  else if (m === "scatter") setModeScatter();
  else if (m === "gravity") setModeGravity();
}

function loop() {
  requestAnimationFrame(loop);
  tick++;
  ctx.fillStyle = "rgba(8,8,16,0.22)";
  ctx.fillRect(0, 0, W, H);
  if (mode === "wave")   tickWave();
  if (mode === "spiral") tickSpiral();
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
  }
}

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  buildParticles(sourceText);
  applyMode(mode);
}

window.addEventListener("resize", resize);
window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
window.addEventListener("touchmove", e => {
  e.preventDefault();
  mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
}, { passive: false });
window.addEventListener("touchend", () => { mouse.x = -9999; mouse.y = -9999; });

document.querySelectorAll(".btn[data-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".btn[data-mode]").forEach(b => {
      b.classList.remove("active"); b.setAttribute("aria-pressed","false");
    });
    btn.classList.add("active"); btn.setAttribute("aria-pressed","true");
    applyMode(btn.dataset.mode);
  });
});

document.getElementById("apply-btn").addEventListener("click", () => {
  const val = document.getElementById("text-input").value.trim();
  if (val.length > 2) { sourceText = val; buildParticles(sourceText); applyMode(mode); }
});

document.getElementById("text-input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("apply-btn").click();
});

buildParticles(sourceText);
applyMode(mode);
loop();
loop();

