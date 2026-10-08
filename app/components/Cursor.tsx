"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

// A soft ring that trails the pointer and swells over anything clickable. Mouse users only;
// the normal cursor stays visible.
export default function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const scale = useMotionValue(1);
  const springX = useSpring(x, { stiffness: 350, damping: 30, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 350, damping: 30, mass: 0.5 });
  const springScale = useSpring(scale, { stiffness: 300, damping: 22 });

  useEffect(() => {
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      x.set(event.clientX);
      y.set(event.clientY);
      const target = event.target as Element | null;
      scale.set(target?.closest("a, button, label, [role='tab']") ? 2.1 : 1);
    }
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y, scale]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[70] -ml-4 -mt-4 hidden h-8 w-8 rounded-full border border-accent/80 mix-blend-difference [@media(pointer:fine)]:block"
      style={{ x: springX, y: springY, scale: springScale }}
    />
  );
}
