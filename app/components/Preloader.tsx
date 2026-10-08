"use client";

import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { STYLE_ICONS } from "./icons";
import { EASE, LOADER_BRAND_MS, LOADER_LOAD_MS } from "./motion";
import { label } from "./ui";

const WIPE = [0.76, 0, 0.24, 1] as const;
const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

type Phase = "loading" | "brand" | "done";

// The opening sequence: the wardrobe "loads" piece by piece, the wordmark lands, then the page lifts in.
export default function Preloader() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [active, setActive] = useState(0);
  const counter = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      const skip = setTimeout(() => setPhase("done"), 150);
      return () => clearTimeout(skip);
    }
    const count = animate(0, 100, {
      duration: LOADER_LOAD_MS / 1000,
      ease: [0.3, 0, 0.2, 1],
      onUpdate: (value) => {
        if (counter.current) counter.current.textContent = String(Math.round(value)).padStart(3, "0");
      },
    });
    const step = setInterval(
      () => setActive((index) => Math.min(index + 1, STYLE_ICONS.length - 1)),
      LOADER_LOAD_MS / STYLE_ICONS.length,
    );
    const toBrand = setTimeout(() => setPhase("brand"), LOADER_LOAD_MS + 120);
    const toDone = setTimeout(() => setPhase("done"), LOADER_LOAD_MS + 120 + LOADER_BRAND_MS);
    return () => {
      count.stop();
      clearInterval(step);
      clearTimeout(toBrand);
      clearTimeout(toDone);
    };
  }, [reduced]);

  const icon = STYLE_ICONS[active];

  return (
    // The wrapper slides away on its own after a few seconds, so the page is never stuck behind the loader.
    <div aria-hidden="true" className="animate-failsafe pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {phase !== "done" && (
          <motion.div
            key="accent"
            className="absolute inset-0 bg-gradient-to-br from-accent to-accent-2"
            exit={{ y: "-100%" }}
            transition={{ duration: 0.9, ease: WIPE, delay: 0.12 }}
          />
        )}
        {phase !== "done" && (
          <motion.div
            key="panel"
            className="pointer-events-auto absolute inset-0 flex flex-col overflow-hidden bg-background"
            exit={{ y: "-100%" }}
            transition={{ duration: 0.9, ease: WIPE }}
          >
            <div className="flex items-center justify-between px-5 py-5 sm:px-8">
              <p className="font-display text-xl">
                Wardrobe <span className="italic text-gradient">AI</span>
              </p>
              <p className={label}>Opening your wardrobe</p>
            </div>

            <div className="relative flex flex-1 items-center justify-center">
              <div className="animate-drift absolute h-80 w-80 rounded-full bg-accent/20 blur-[100px]" />

              <AnimatePresence mode="wait">
                {phase === "loading" ? (
                  <motion.div
                    key="loading"
                    className="relative flex flex-col items-center"
                    exit={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <div className="relative h-44 w-44 text-accent sm:h-52 sm:w-52">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                        <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="0.6" className="stroke-line" />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r={RING_RADIUS}
                          fill="none"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          stroke="currentColor"
                          strokeDasharray={RING_LENGTH}
                          initial={{ strokeDashoffset: RING_LENGTH }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ duration: LOADER_LOAD_MS / 1000, ease: [0.3, 0, 0.2, 1] }}
                        />
                      </svg>
                      <svg
                        key={icon.label}
                        viewBox="0 0 24 24"
                        className="absolute inset-[26%] text-foreground"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <motion.path
                          d={icon.path}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      </svg>
                    </div>
                    <div className="mt-6 h-5 overflow-hidden">
                      <motion.p
                        key={icon.label}
                        className={`${label} text-foreground`}
                        initial={{ y: 18, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.22, ease: EASE }}
                      >
                        {icon.label}
                      </motion.p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p
                    key="brand"
                    className="relative overflow-hidden font-display text-[clamp(3.5rem,13vw,11rem)] leading-none"
                  >
                    <motion.span
                      className="inline-block"
                      initial={{ y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.7, ease: WIPE }}
                    >
                      Wardrobe <span className="italic text-gradient">AI</span>
                    </motion.span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-end justify-between gap-6 px-5 pb-6 sm:px-8">
              <ul className="flex flex-wrap gap-3">
                {STYLE_ICONS.map((item, index) => (
                  <li
                    key={item.label}
                    className={`transition duration-500 ${
                      index <= active ? "text-accent" : "text-line"
                    } ${index === active && phase === "loading" ? "scale-125" : ""}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.path} />
                    </svg>
                  </li>
                ))}
              </ul>
              <p className="font-display text-6xl leading-none tabular-nums sm:text-8xl">
                <span ref={counter}>000</span>
              </p>
            </div>

            <motion.div
              className="h-0.5 origin-left bg-gradient-to-r from-accent to-accent-2"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: LOADER_LOAD_MS / 1000, ease: [0.3, 0, 0.2, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
