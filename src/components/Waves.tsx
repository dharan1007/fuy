// src/components/Waves.tsx
"use client";

import React, { useRef, useEffect } from "react";
import "./Waves.css";

/* ---------- Perlin noise (unchanged algorithm, ported minimally) ---------- */
class Grad {
  x: number; y: number; z: number;
  constructor(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
  dot2(x: number, y: number) { return this.x * x + this.y * y; }
}

class Noise {
  grad3: Grad[]; p: number[]; perm: number[]; gradP: Grad[];
  constructor(seed = 0) {
    this.grad3 = [
      new Grad(1,1,0), new Grad(-1,1,0), new Grad(1,-1,0), new Grad(-1,-1,0),
      new Grad(1,0,1), new Grad(-1,0,1), new Grad(1,0,-1), new Grad(-1,0,-1),
      new Grad(0,1,1), new Grad(0,-1,1), new Grad(0,1,-1), new Grad(0,-1,-1)
    ];
    this.p = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,
      21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,
      237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,
      111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,
      80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,
      3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,
      17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,
      129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,
      238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,
      184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,
      195,78,66,215,61,156,180
    ];
    this.perm = new Array(512);
    this.gradP = new Array(512);
    this.seed(seed);
  }

  seed(seed: number) {
    if (seed > 0 && seed < 1) seed *= 65536;
    seed = Math.floor(seed);
    if (seed < 256) seed |= seed << 8;
    for (let i = 0; i < 256; i++) {
      const v = (i & 1) ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255);
      this.perm[i] = this.perm[i + 256] = v;
      this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
    }
  }

  fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(a: number, b: number, t: number) { return (1 - t) * a + t * b; }

  perlin2(x: number, y: number) {
    let X = Math.floor(x), Y = Math.floor(y);
    x -= X; y -= Y;
    X &= 255; Y &= 255;
    const n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
    const n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
    const n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
    const n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);
    const u = this.fade(x);
    return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y));
  }
}

/* -------------------- Component & props -------------------- */
interface WavesProps {
  lineColor?: string;
  backgroundColor?: string;
  waveSpeedX?: number;
  waveSpeedY?: number;
  waveAmpX?: number;
  waveAmpY?: number;
  xGap?: number;
  yGap?: number;
  friction?: number;
  tension?: number;
  maxCursorMove?: number;
  style?: React.CSSProperties;
  className?: string;
}

const Waves: React.FC<WavesProps> = ({
  lineColor = "rgba(255,255,255,0.18)",
  backgroundColor = "transparent",
  waveSpeedX = 0.0125,
  waveSpeedY = 0.005,
  waveAmpX = 32,
  waveAmpY = 16,
  xGap = 10,
  yGap = 32,
  friction = 0.925,
  tension = 0.005,
  maxCursorMove = 100,
  style = {},
  className = ""
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const boundingRef = useRef<{ width: number; height: number; left: number; top: number }>({ width: 0, height: 0, left: 0, top: 0 });
  const noiseRef = useRef<Noise>(new Noise(Math.random()));
  const linesRef = useRef<any[][]>([]);
  const mouseRef = useRef<any>({
    x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false, inside: false
  });
  const configRef = useRef<any>({
    lineColor, waveSpeedX, waveSpeedY, waveAmpX, waveAmpY, friction, tension, maxCursorMove, xGap, yGap
  });
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    configRef.current = { lineColor, waveSpeedX, waveSpeedY, waveAmpX, waveAmpY, friction, tension, maxCursorMove, xGap, yGap };
  }, [lineColor, waveSpeedX, waveSpeedY, waveAmpX, waveAmpY, friction, tension, maxCursorMove, xGap, yGap]);

  useEffect(() => {
    // runtime guard
    if (!canvasRef.current || !containerRef.current) return;

    // capture non-null locals and assert non-null with `!` for TypeScript
    const canvasEl = canvasRef.current!;
    const containerEl = containerRef.current!;
    const ctxLocal = canvasEl.getContext("2d")!; // assert non-null here
    ctxRef.current = ctxLocal;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    function setSize() {
      const b = containerEl.getBoundingClientRect();
      boundingRef.current = { width: b.width, height: b.height, left: b.left, top: b.top };
      canvasEl.style.width = `${b.width}px`;
      canvasEl.style.height = `${b.height}px`;
      canvasEl.width = Math.round(b.width * dpr);
      canvasEl.height = Math.round(b.height * dpr);
      ctxLocal.setTransform(dpr, 0, 0, dpr, 0, 0); // use captured non-null ctxLocal
    }

    function setLines() {
      const { width, height } = boundingRef.current;
      linesRef.current = [];
      const oWidth = width + 200, oHeight = height + 30;
      const { xGap: cfgXGap, yGap: cfgYGap } = configRef.current;
      const totalLines = Math.ceil(oWidth / cfgXGap);
      const totalPoints = Math.ceil(oHeight / cfgYGap);
      const xStart = (width - cfgXGap * totalLines) / 2;
      const yStart = (height - cfgYGap * totalPoints) / 2;
      for (let i = 0; i <= totalLines; i++) {
        const pts: any[] = [];
        for (let j = 0; j <= totalPoints; j++) {
          pts.push({
            x: xStart + cfgXGap * i,
            y: yStart + cfgYGap * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 }
          });
        }
        linesRef.current.push(pts);
      }
    }

    function movePoints(time: number) {
      const lines = linesRef.current;
      const mouse = mouseRef.current;
      const noise = noiseRef.current;
      const { waveSpeedX: sX, waveSpeedY: sY, waveAmpX: aX, waveAmpY: aY, friction: fric, tension: tens, maxCursorMove: maxC } = configRef.current;

      for (let i = 0; i < lines.length; i++) {
        const pts = lines[i];
        for (let k = 0; k < pts.length; k++) {
          const p = pts[k];
          const move = noise.perlin2((p.x + time * sX) * 0.002, (p.y + time * sY) * 0.0015) * 12;
          p.wave.x = Math.cos(move) * aX;
          p.wave.y = Math.sin(move) * aY;

          const dx = p.x - mouse.sx, dy = p.y - mouse.sy;
          const dist = Math.hypot(dx, dy);
          const l = Math.max(175, mouse.vs || 0);
          if (mouse.inside && dist < l) {
            const s = 1 - dist / l;
            const f = Math.cos(dist * 0.001) * s;
            p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065;
            p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065;
          }

          p.cursor.vx += (0 - p.cursor.x) * tens;
          p.cursor.vy += (0 - p.cursor.y) * tens;
          p.cursor.vx *= fric;
          p.cursor.vy *= fric;
          p.cursor.x += p.cursor.vx * 2;
          p.cursor.y += p.cursor.vy * 2;
          p.cursor.x = Math.min(maxC, Math.max(-maxC, p.cursor.x));
          p.cursor.y = Math.min(maxC, Math.max(-maxC, p.cursor.y));
        }
      }
    }

    function moved(point: any, withCursor = true) {
      const x = point.x + point.wave.x + (withCursor ? point.cursor.x : 0);
      const y = point.y + point.wave.y + (withCursor ? point.cursor.y : 0);
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    }

    function drawLines() {
      const { width, height } = boundingRef.current;
      ctxLocal.clearRect(0, 0, width, height); // safe: ctxLocal non-null
      ctxLocal.beginPath();
      ctxLocal.strokeStyle = configRef.current.lineColor;
      ctxLocal.lineWidth = 1;
      for (let i = 0; i < linesRef.current.length; i++) {
        const points = linesRef.current[i];
        for (let j = 0; j < points.length; j++) {
          const p = moved(points[j], true);
          if (j === 0) ctxLocal.moveTo(p.x, p.y);
          else ctxLocal.lineTo(p.x, p.y);
        }
      }
      ctxLocal.stroke();
    }

    function tick(t: number) {
      const mouse = mouseRef.current;
      mouse.sx += (mouse.x - mouse.sx) * 0.1;
      mouse.sy += (mouse.y - mouse.sy) * 0.1;

      const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d;
      mouse.vs += (d - mouse.vs) * 0.1;
      mouse.vs = Math.min(100, mouse.vs);
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.a = d > 0.001 ? Math.atan2(dy, dx) : mouse.a || 0;

      containerEl.style.setProperty("--x", `${mouse.sx}px`);
      containerEl.style.setProperty("--y", `${mouse.sy}px`);

      movePoints(t);
      drawLines();
      frameIdRef.current = window.requestAnimationFrame(tick);
    }

    function updateMouseFromClient(clientX: number, clientY: number, inside: boolean) {
      const mouse = mouseRef.current;
      const b = containerEl.getBoundingClientRect();
      boundingRef.current = { width: b.width, height: b.height, left: b.left, top: b.top };

      mouse.x = clientX - boundingRef.current.left;
      mouse.y = clientY - boundingRef.current.top;
      mouse.inside = inside;
      if (!mouse.set) {
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
        mouse.lx = mouse.x;
        mouse.ly = mouse.y;
        mouse.set = true;
      }
    }

    const onPointerMove = (e: PointerEvent) => updateMouseFromClient(e.clientX, e.clientY, true);
    const onPointerEnter = (e: PointerEvent) => { updateMouseFromClient(e.clientX, e.clientY, true); mouseRef.current.inside = true; };
    const onPointerLeave = () => { mouseRef.current.inside = false; };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        const t = e.touches[0];
        updateMouseFromClient(t.clientX, t.clientY, true);
      }
    };

    // initialize
    setSize();
    setLines();
    frameIdRef.current = window.requestAnimationFrame(tick);

    // attach listeners to the container element (locals)
    containerEl.addEventListener("pointermove", onPointerMove);
    containerEl.addEventListener("pointerenter", onPointerEnter);
    containerEl.addEventListener("pointerleave", onPointerLeave);
    containerEl.addEventListener("touchmove", onTouchMove, { passive: true });

    function onResize() { setSize(); setLines(); }
    window.addEventListener("resize", onResize);

    // cleanup
    return () => {
      containerEl.removeEventListener("pointermove", onPointerMove);
      containerEl.removeEventListener("pointerenter", onPointerEnter);
      containerEl.removeEventListener("pointerleave", onPointerLeave);
      containerEl.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("resize", onResize);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`waves ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        margin: 0,
        padding: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor,
        ...style
      }}
    >
      <canvas ref={canvasRef} className="waves-canvas" />
    </div>
  );
};

export default Waves;
