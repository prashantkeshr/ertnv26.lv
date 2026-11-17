/**
 * Decorative hero globe: a rotating dot-matrix Earth with animated great-circle "lanes"
 * between well-known port cities. It is an illustration of a global network — it shows no
 * vessels, positions or traffic, and is labelled as illustrative on the page.
 *
 * Canvas-rendered for smoothness; pauses when off-screen or the tab is hidden; renders a
 * single static frame when the visitor prefers reduced motion.
 */
import { geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import { useEffect, useRef } from 'react';
import { z } from 'zod';
import { prefersReducedMotion } from '@/components/common/motion';
import { useAsync } from '@/hooks/useAsync';
import { loadFile } from '@/services/data/loader';

const Dots = z.array(z.tuple([z.number(), z.number()]));

/** Major container-port cities (lon, lat). Geographic facts only. */
const HUBS: Record<string, [number, number]> = {
  shanghai: [121.5, 31.2],
  singapore: [103.8, 1.3],
  rotterdam: [4.4, 51.9],
  mumbai: [72.9, 18.9],
  dubai: [55.1, 25.0],
  losAngeles: [-118.3, 33.7],
  newYork: [-74.0, 40.7],
  santos: [-46.3, -23.9],
  durban: [31.0, -29.9],
  suez: [32.5, 30.0],
};
const LANES: Array<[keyof typeof HUBS, keyof typeof HUBS]> = [
  ['mumbai', 'rotterdam'],
  ['shanghai', 'losAngeles'],
  ['singapore', 'dubai'],
  ['rotterdam', 'newYork'],
  ['shanghai', 'rotterdam'],
  ['dubai', 'durban'],
  ['santos', 'rotterdam'],
  ['mumbai', 'singapore'],
  ['newYork', 'santos'],
  ['suez', 'mumbai'],
];
const SAMPLES = 64;

export default function HeroGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dots = useAsync('geo:land-dots', () => loadFile('geo/land-dots.json', Dots));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    const land = dots.data ?? [];
    const projection = geoOrthographic().clipAngle(90);
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule10();
    const lanes = LANES.map(([a, b]) => {
      const interpolate = geoInterpolate(HUBS[a]!, HUBS[b]!);
      return Array.from({ length: SAMPLES + 1 }, (_, k) => interpolate(k / SAMPLES));
    });
    const hubList = Object.values(HUBS);

    let size = 0;
    let dpr = 1;
    let raf = 0;
    let onScreen = true;
    const t0 = performance.now();

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      size = canvas!.clientWidth;
      canvas!.width = canvas!.height = Math.round(size * dpr);
    }

    function draw(now: number) {
      const px = canvas!.width;
      const r = px * 0.455;
      const c = px / 2;
      const elapsed = reduced ? 0 : (now - t0) / 1000;
      const lon0 = 58 + elapsed * 4.5;
      projection.rotate([-lon0, -16]).scale(r).translate([c, c]);
      ctx!.clearRect(0, 0, px, px);

      // Atmosphere
      const glow = ctx!.createRadialGradient(c, c, r * 0.92, c, c, r * 1.3);
      glow.addColorStop(0, 'rgba(63,184,232,0.30)');
      glow.addColorStop(1, 'rgba(63,184,232,0)');
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(c, c, r * 1.3, 0, Math.PI * 2);
      ctx!.fill();

      // Sphere
      const body = ctx!.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
      body.addColorStop(0, '#16507a');
      body.addColorStop(0.6, '#0c2c4a');
      body.addColorStop(1, '#071a2e');
      ctx!.fillStyle = body;
      ctx!.beginPath();
      ctx!.arc(c, c, r, 0, Math.PI * 2);
      ctx!.fill();

      // Graticule
      ctx!.beginPath();
      path(graticule);
      ctx!.strokeStyle = 'rgba(159,208,238,0.11)';
      ctx!.lineWidth = Math.max(1, dpr * 0.7);
      ctx!.stroke();

      // Land dots (the projection clips the far hemisphere by returning null)
      const dot = Math.max(1.1, px / 330);
      ctx!.fillStyle = '#9fd0ee';
      for (const pt of land) {
        const p = projection(pt);
        if (!p) continue;
        const d = Math.hypot(p[0] - c, p[1] - c) / r;
        ctx!.globalAlpha = 0.85 - 0.6 * d * d;
        ctx!.fillRect(p[0] - dot / 2, p[1] - dot / 2, dot, dot);
      }
      ctx!.globalAlpha = 1;

      // Lanes: a faint full route plus a bright travelling head
      lanes.forEach((pts, i) => {
        const projected = pts.map((pt) => projection(pt));
        ctx!.lineWidth = Math.max(1, dpr * 1.1);
        ctx!.lineCap = 'round';
        // base route
        ctx!.strokeStyle = reduced ? 'rgba(92,200,239,0.45)' : 'rgba(92,200,239,0.16)';
        ctx!.beginPath();
        let pen = false;
        for (const p of projected) {
          if (!p) pen = false;
          else if (!pen) (ctx!.moveTo(p[0], p[1]), (pen = true));
          else ctx!.lineTo(p[0], p[1]);
        }
        ctx!.stroke();
        if (reduced) return;
        // head
        const head = ((elapsed / 7 + i * 0.137) % 1) * (SAMPLES + 18);
        for (let k = Math.max(1, Math.floor(head - 18)); k <= Math.min(SAMPLES, Math.floor(head)); k++) {
          const a = projected[k - 1];
          const b = projected[k];
          if (!a || !b) continue;
          ctx!.strokeStyle = `rgba(190,235,255,${((k - (head - 18)) / 18) * 0.95})`;
          ctx!.beginPath();
          ctx!.moveTo(a[0], a[1]);
          ctx!.lineTo(b[0], b[1]);
          ctx!.stroke();
        }
      });

      // Hubs
      hubList.forEach((h, i) => {
        const p = projection(h);
        if (!p) return;
        const phase = reduced ? 0.4 : (elapsed * 0.55 + i * 0.13) % 1;
        ctx!.strokeStyle = `rgba(92,200,239,${(1 - phase) * 0.55})`;
        ctx!.lineWidth = Math.max(1, dpr);
        ctx!.beginPath();
        ctx!.arc(p[0], p[1], (2.5 + 9 * phase) * dpr, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.fillStyle = '#ffffff';
        ctx!.beginPath();
        ctx!.arc(p[0], p[1], 2.4 * dpr, 0, Math.PI * 2);
        ctx!.fill();
      });

      // Limb
      ctx!.strokeStyle = 'rgba(159,208,238,0.28)';
      ctx!.lineWidth = Math.max(1, dpr);
      ctx!.beginPath();
      ctx!.arc(c, c, r, 0, Math.PI * 2);
      ctx!.stroke();
    }

    const frame = (now: number) => {
      if (onScreen && !document.hidden) draw(now);
      raf = requestAnimationFrame(frame);
    };

    resize();
    draw(performance.now());
    if (!reduced) raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => (onScreen = Boolean(entry?.isIntersecting)));
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [dots.data]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
