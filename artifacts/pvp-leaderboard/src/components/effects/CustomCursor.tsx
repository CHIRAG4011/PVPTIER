import { useEffect, useRef, useState } from "react";

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const posRef = useRef({ x: -100, y: -100 });
  const ringPosRef = useRef({ x: -100, y: -100 });
  const hoveredRef = useRef(false);
  const rafRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const isMobile = () =>
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile()) return;

    document.documentElement.style.cursor = "none";

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      trailRef.current.push({ x: e.clientX, y: e.clientY, age: 0 });
      if (trailRef.current.length > 12) trailRef.current.shift();
    };

    const onEnter = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      hoveredRef.current = !!(el.closest("a,button,[role=button],[tabindex]"));
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onEnter);

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      const dot = dotRef.current;
      const ring = ringRef.current;
      if (!dot || !ring) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const { x, y } = posRef.current;
      dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`;

      const rx = ringPosRef.current.x + (x - ringPosRef.current.x) * 0.12;
      const ry = ringPosRef.current.y + (y - ringPosRef.current.y) * 0.12;
      ringPosRef.current = { x: rx, y: ry };
      ring.style.transform = `translate(${rx - 20}px, ${ry - 20}px) scale(${hoveredRef.current ? 1.6 : 1})`;

      trailRef.current.forEach(p => { p.age += dt * 0.004; });
      trailRef.current = trailRef.current.filter(p => p.age < 1);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.documentElement.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-cyan-400 pointer-events-none z-[9999]"
        style={{
          boxShadow: "0 0 8px 2px rgba(0,212,255,0.8), 0 0 20px 4px rgba(0,212,255,0.4)",
          willChange: "transform",
        }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[9998]"
        style={{
          border: "1.5px solid rgba(0,212,255,0.5)",
          boxShadow: "0 0 12px rgba(0,212,255,0.25)",
          transition: "transform 0.08s ease, border-color 0.2s, box-shadow 0.2s",
          willChange: "transform",
        }}
      />
    </>
  );
}
