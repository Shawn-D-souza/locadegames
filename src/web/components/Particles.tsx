import { useEffect, useRef } from "react";
import { colors as themeColors } from "../../theme";
import { stepParticle, type Particle } from "../utils/particles";

interface ParticlesProps {
  /** Built once when the celebration starts; birth times are ms from mount. */
  spawn: () => Particle[];
}

const STAR_POINTS = 5;
const STAR_INNER = 0.45;
/** Last share of a particle's life spent fading out. */
const FADE_FROM = 0.75;

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  for (let i = 0; i < STAR_POINTS * 2; i++) {
    const r = i % 2 === 0 ? size : size * STAR_INNER;
    const a = (i / (STAR_POINTS * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

/** Full-screen canvas that plays one burst of particles, then stops. Never blocks taps; skipped with reduced motion. */
export function Particles({ spawn }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spawnRef = useRef(spawn);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ratio = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
    };
    resize();
    window.addEventListener("resize", resize);

    let particles = spawnRef.current();
    const start = performance.now();
    let last = start;
    let frame = requestAnimationFrame(function tick(nowMs) {
      const t = nowMs - start;
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles = particles.filter((p) => t < p.bornMs + p.lifeMs);
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i]!;
        if (t < p.bornMs) continue;
        p = particles[i] = stepParticle(p, dt);
        const age = (t - p.bornMs) / p.lifeMs;
        ctx.save();
        ctx.globalAlpha = age < FADE_FROM ? 1 : 1 - (age - FADE_FROM) / (1 - FADE_FROM);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = themeColors.ink;
        ctx.lineWidth = 1.5;
        if (p.kind === "confetti") {
          // Turning over in 3D: squash one side by the flip.
          ctx.scale(1, Math.cos(p.flip));
          ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
          ctx.strokeRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        } else if (p.kind === "spark") {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 3;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (1 - age), 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, p.size * (1 - age * 0.5));
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      if (particles.length > 0) frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 size-full" aria-hidden="true" />;
}
