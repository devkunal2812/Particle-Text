import { useRef, useEffect, useCallback } from "react";

const DEFAULT_TEXT =
  "Every legacy starts with a vision shaped by determination and carried forward " +
  "through consistent effort and belief in possibilities beyond the ordinary " +
  "what we create today becomes the foundation for tomorrow and every small step " +
  "taken with purpose adds to a story that will be remembered and continued by others";

const MAX       = 1800;
const EASE      = 0.075;
const DAMPING   = 0.78;
const REPEL_R   = 90;
const REPEL_F   = 5.5;
const FONT_SIZE = 16;
const FONT_FACE = "monospace";
const LINE_H    = FONT_SIZE * 1.8;
const PADDING   = 60;
const TRAIL     = 0.18;

function buildLayout(text, W, H) {
  const tmp = document.createElement("canvas");
  const tc  = tmp.getContext("2d");
  tc.font   = FONT_SIZE + "px " + FONT_FACE;
  const maxW  = W - PADDING * 2;
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (tc.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  const blockH = lines.length * LINE_H;
  const startY = Math.max(FONT_SIZE + 10, (H - blockH) / 2 + FONT_SIZE);
  const out = [];
  for (let li = 0; li < lines.length; li++) {
    const row = lines[li];
    const sy  = startY + li * LINE_H;
    let sx    = PADDING;
    for (let ci = 0; ci < row.length; ci++) {
      out.push({ sx, sy });
      sx += tc.measureText(row[ci]).width;
    }
    if (li < lines.length - 1) out.push({ sx, sy });
  }
  return out;
}

export default function ParticleCanvas({ text = DEFAULT_TEXT, mode }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const modeRef   = useRef(mode);
  const tickRef   = useRef(0);
  const rafRef    = useRef(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const build = useCallback((txt, W, H) => {
    const chars = [...txt].slice(0, MAX);
    const n     = chars.length;
    const layout = buildLayout(txt, W, H);
    const pos  = new Float32Array(n * 2);
    const vel  = new Float32Array(n * 2);
    const tgt  = new Float32Array(n * 2);
    const base = new Float32Array(n * 2);
    // extra per-particle data: phase offset, arm assignment
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = layout[i] || layout[layout.length - 1];
      base[i*2] = p.sx; base[i*2+1] = p.sy;
      tgt[i*2]  = p.sx; tgt[i*2+1]  = p.sy;
      pos[i*2]  = Math.random() * W;
      pos[i*2+1]= Math.random() * H;
      phase[i]  = Math.random() * Math.PI * 2;
    }
    stateRef.current = { pos, vel, tgt, base, chars, count: n, phase };
  }, []);

  const applyMode = useCallback((m, W, H) => {
    const s = stateRef.current;
    if (!s) return;
    const { tgt, base, vel, count: n, phase } = s;

    if (m === "text") {
      for (let i = 0; i < n; i++) {
        tgt[i*2] = base[i*2]; tgt[i*2+1] = base[i*2+1];
      }

    } else if (m === "scatter") {
      // Explosive burst: give each particle a strong outward velocity kick
      // so they visibly explode from their current position
      for (let i = 0; i < n; i++) {
        const a = phase[i] * 2; // unique angle per particle
        const speed = 8 + Math.random() * 14;
        vel[i*2]   = Math.cos(a) * speed;
        vel[i*2+1] = Math.sin(a) * speed;
        // target: spread across full canvas in clusters
        const ta = Math.random() * Math.PI * 2;
        const tr = Math.min(W, H) * (0.1 + Math.random() * 0.46);
        tgt[i*2]   = W/2 + Math.cos(ta) * tr;
        tgt[i*2+1] = H/2 + Math.sin(ta) * tr;
      }

    } else if (m === "gravity") {
      // Stack particles in a pile at the bottom — staggered columns
      const cols  = Math.ceil(Math.sqrt(n * (W / (H * 0.3))));
      const colW  = (W - PADDING * 2) / cols;
      for (let i = 0; i < n; i++) {
        const col  = i % cols;
        const row  = Math.floor(i / cols);
        tgt[i*2]   = PADDING + col * colW + colW * 0.5 + (Math.random() - 0.5) * colW * 0.4;
        tgt[i*2+1] = H - FONT_SIZE * 1.2 - row * (FONT_SIZE * 1.1);
        // give a downward velocity kick so they visibly fall
        vel[i*2]   = (Math.random() - 0.5) * 4;
        vel[i*2+1] = -(6 + Math.random() * 10);
      }
    }
    // wave & spiral updated per-frame
  }, []);

  const startLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      tickRef.current++;
      const tick = tickRef.current;
      const m    = modeRef.current;
      const s    = stateRef.current;
      if (!s || s.count === 0) return;

      const { pos, vel, tgt, chars, count: n, phase } = s;
      const W  = canvas.width, H = canvas.height;
      const mx = mouseRef.current.x, my = mouseRef.current.y;

      // ── Per-frame animated targets ──────────────────────────────────────
      if (m === "wave") {
        const cols = Math.ceil(Math.sqrt(n*(W/H)));
        const rows = Math.ceil(n/cols);
        const cw = W/cols, rh = H/rows;
        for (let i = 0; i < n; i++) {
          const c_ = i%cols, r_ = Math.floor(i/cols);
          tgt[i*2]   = c_*cw + cw/2;
          tgt[i*2+1] = r_*rh + rh/2 + Math.sin(c_*(0.03+(r_%5)*0.007)+tick*0.04)*(26+(r_%4)*9);
        }

      } else if (m === "spiral") {
        // Dual counter-rotating arms with pulsing radius
        const baseR = Math.min(W,H) * 0.40;
        const pulse = 1 + 0.08 * Math.sin(tick * 0.025);
        const ph    = tick * 0.012;
        for (let i = 0; i < n; i++) {
          const t    = i / n;
          // alternate particles between two arms (clockwise + counter)
          const arm  = i % 2 === 0 ? 1 : -1;
          const turns = 6;
          const angle = arm * (t * Math.PI * 2 * turns + ph) + phase[i] * 0.15;
          const r     = t * baseR * pulse;
          tgt[i*2]   = W/2 + Math.cos(angle) * r;
          tgt[i*2+1] = H/2 + Math.sin(angle) * r;
        }

      } else if (m === "gravity") {
        // Add real gravity pull downward each frame
        for (let i = 0; i < n; i++) {
          vel[i*2+1] += 0.35; // gravity acceleration
          // floor bounce
          if (pos[i*2+1] > H - FONT_SIZE && vel[i*2+1] > 0) {
            vel[i*2+1] *= -0.38; // bounce with energy loss
            vel[i*2]   *= 0.85;  // friction
          }
        }

      } else if (m === "scatter") {
        // Slow orbital drift after explosion — each particle orbits its target
        for (let i = 0; i < n; i++) {
          const drift = 0.008 + (i % 7) * 0.001;
          const orbitR = 12 + (i % 5) * 6;
          const ox = Math.cos(tick * drift + phase[i]) * orbitR;
          const oy = Math.sin(tick * drift + phase[i] * 1.3) * orbitR;
          // tgt was set on mode switch; add orbit on top
          // we nudge vel slightly toward orbit offset
          const bx = tgt[i*2] + ox, by = tgt[i*2+1] + oy;
          vel[i*2]   += (bx - pos[i*2])   * 0.004;
          vel[i*2+1] += (by - pos[i*2+1]) * 0.004;
        }
      }

      // ── Integrate ───────────────────────────────────────────────────────
      for (let i = 0; i < n; i++) {
        const i2 = i*2;
        const px = pos[i2], py = pos[i2+1];
        const dx = px-mx, dy = py-my, d2 = dx*dx+dy*dy;

        if (d2 < REPEL_R*REPEL_R && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = ((REPEL_R-d)/REPEL_R)**2*REPEL_F;
          vel[i2] += (dx/d)*f; vel[i2+1] += (dy/d)*f;
        }

        // spring toward target (skip for gravity — it has its own physics)
        if (m !== "gravity" && m !== "scatter") {
          vel[i2]   += (tgt[i2]   - px) * EASE;
          vel[i2+1] += (tgt[i2+1] - py) * EASE;
        } else if (m === "gravity") {
          // gentle horizontal spring only
          vel[i2] += (tgt[i2] - px) * 0.012;
        }

        vel[i2]   *= DAMPING; vel[i2+1] *= DAMPING;
        pos[i2]   += vel[i2]; pos[i2+1] += vel[i2+1];

        // clamp to canvas bounds for scatter/gravity
        if (m === "scatter" || m === "gravity") {
          if (pos[i2]   < 0)   { pos[i2]   = 0;   vel[i2]   *= -0.4; }
          if (pos[i2]   > W)   { pos[i2]   = W;   vel[i2]   *= -0.4; }
          if (pos[i2+1] < 0)   { pos[i2+1] = 0;   vel[i2+1] *= -0.4; }
          if (pos[i2+1] > H)   { pos[i2+1] = H;   vel[i2+1] *= -0.4; }
        }
      }

      // ── Draw ────────────────────────────────────────────────────────────
      ctx.fillStyle = "rgba(8,8,16," + TRAIL + ")";
      ctx.fillRect(0, 0, W, H);
      ctx.font = FONT_SIZE + "px " + FONT_FACE;

      for (let i = 0; i < n; i++) {
        const i2  = i*2;
        const px  = pos[i2], py = pos[i2+1];
        const spd = Math.sqrt(vel[i2]*vel[i2]+vel[i2+1]*vel[i2+1]);

        // mode-specific color palettes
        let hue, sat, lit;
        if (m === "spiral") {
          // warm orange-red-pink rotating palette
          hue = (i/n)*180 + 10 + tick * 0.3;
          sat = 90 + Math.min(spd*2, 10);
          lit = 58 + Math.min(spd*4, 30);
        } else if (m === "scatter") {
          // electric cyan-white burst
          hue = 180 + (i/n)*80 + tick * 0.5;
          sat = 85 + Math.min(spd*1.5, 15);
          lit = 55 + Math.min(spd*6, 35);
        } else if (m === "gravity") {
          // amber-orange falling embers
          hue = 25 + (i/n)*40;
          sat = 90 + Math.min(spd*2, 10);
          lit = 50 + Math.min(spd*7, 38);
        } else {
          // default teal-violet
          hue = (i/n)*300+160;
          sat = 88+Math.min(spd*2,12);
          lit = 62+Math.min(spd*5,28);
        }

        const col = "hsl(" + hue + "," + sat + "%," + lit + "%)";
        ctx.save();
        ctx.fillStyle = col;
        const glow = m === "scatter" ? Math.min(spd*4, 22)
                   : m === "spiral"  ? Math.min(spd*3+2, 18)
                   : m === "gravity" ? Math.min(spd*3, 14)
                   : Math.min(spd*2, 12);
        if (glow > 1) { ctx.shadowColor = col; ctx.shadowBlur = glow; }
        ctx.fillText(chars[i], px, py);
        ctx.restore();
      }
    }

    loop();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#080810";
    ctx.fillRect(0, 0, W, H);
    build(resolvedText, W, H);
    applyMode(modeRef.current, W, H);
    startLoop();
    function onResize() {
      const nW = window.innerWidth, nH = window.innerHeight;
      canvas.width = nW; canvas.height = nH;
      build(resolvedText, nW, nH);
      applyMode(modeRef.current, nW, nH);
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    build(resolvedText, canvas.width, canvas.height);
    applyMode(modeRef.current, canvas.width, canvas.height);
  }, [resolvedText, build, applyMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    applyMode(mode, canvas.width, canvas.height);
  }, [mode, applyMode]);

  const onMouseMove  = useCallback((e) => { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; }, []);
  const onMouseLeave = useCallback(() => { mouseRef.current.x = -9999; mouseRef.current.y = -9999; }, []);
  const onTouchMove  = useCallback((e) => { e.preventDefault(); mouseRef.current.x = e.touches[0].clientX; mouseRef.current.y = e.touches[0].clientY; }, []);
  const onTouchEnd   = useCallback(() => { mouseRef.current.x = -9999; mouseRef.current.y = -9999; }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, display: "block", background: "#080810", touchAction: "none" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  );
}
