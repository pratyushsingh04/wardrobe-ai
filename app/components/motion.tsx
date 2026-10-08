"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

export const EASE = [0.2, 0.8, 0.2, 1] as const;

// Preloader timing: the wardrobe loads, the wordmark holds, then the panel lifts.
export const LOADER_LOAD_MS = 2400;
export const LOADER_BRAND_MS = 950;

// Above-the-fold animation waits until the preloader has started lifting.
export const INTRO_SECONDS = (LOADER_LOAD_MS + LOADER_BRAND_MS + 450) / 1000;

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

// Fades and lifts its children in the first time they scroll into view.
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

type Word = { text: string; className?: string };

// Each word slides up from behind a mask, one after another.
export function WordReveal({ words, delay = 0 }: { words: Word[]; delay?: number }) {
  return (
    <>
      <span className="sr-only">{words.map((word) => word.text).join(" ")}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <span key={index} className="inline-block overflow-hidden pb-[0.14em] align-bottom">
            <motion.span
              className={`inline-block ${word.className ?? ""}`}
              initial={{ y: "115%", rotate: 6 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ duration: 1, ease: EASE, delay: delay + index * 0.07 }}
            >
              {word.text}
              {index < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </span>
    </>
  );
}

// Counts up to `value` when it scrolls into view.
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    if (reduced) {
      node.textContent = String(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: EASE,
      onUpdate: (latest) => {
        node.textContent = String(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [inView, reduced, value]);

  return <span ref={ref}>0</span>;
}

// Updates --mx / --my on the element so a `spotlight` background follows the pointer.
export function usePointerGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    function move(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = node!.getBoundingClientRect();
        node!.style.setProperty("--mx", `${event.clientX - box.left}px`);
        node!.style.setProperty("--my", `${event.clientY - box.top}px`);
      });
    }
    node.addEventListener("pointermove", move);
    return () => {
      node.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
