"use client";

import { useRef } from "react";

const MAX_TILT = 7;

type Props = {
  children: React.ReactNode;
  className?: string;
};

// A card that leans towards the pointer in 3D and carries a light that follows it.
// The tilt and light positions are CSS variables read by the `tilt-card` styles.
export default function TiltCard({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function move(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    const node = ref.current;
    if (!node) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const box = node.getBoundingClientRect();
      const x = (clientX - box.left) / box.width;
      const y = (clientY - box.top) / box.height;
      node.style.setProperty("--ry", `${(x - 0.5) * 2 * MAX_TILT}deg`);
      node.style.setProperty("--rx", `${(0.5 - y) * 2 * MAX_TILT}deg`);
      node.style.setProperty("--mx", `${x * 100}%`);
      node.style.setProperty("--my", `${y * 100}%`);
    });
  }

  function leave() {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt-card group ${className}`}>
      <span aria-hidden="true" className="tilt-card-light" />
      {children}
    </div>
  );
}
