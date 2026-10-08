"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { EASE } from "./motion";

const LETTERS = "Wardrobe AI".split("");

// How far, in letter-widths, the pointer's pull reaches.
const REACH = 2.4;

// The giant footer wordmark. Letters rise in one by one as it scrolls into view, then lift
// and glow in a wave that follows the pointer.
export default function FooterWordmark() {
  const letters = useRef<(HTMLSpanElement | null)[]>([]);

  function setLift(clientX: number | null) {
    for (const letter of letters.current) {
      if (!letter) continue;
      let pull = 0;
      if (clientX !== null) {
        const box = letter.getBoundingClientRect();
        const distance = Math.abs(clientX - (box.left + box.width / 2)) / box.width;
        pull = Math.max(0, 1 - distance / REACH);
      }
      // Ease the falloff so the wave has a soft crest.
      letter.style.setProperty("--pull", String(pull * pull));
    }
  }

  return (
    <p
      aria-hidden="true"
      onPointerMove={(event) => setLift(event.clientX)}
      onPointerLeave={() => setLift(null)}
      className="-mb-[0.22em] mt-4 cursor-default select-none whitespace-nowrap text-center font-display text-[clamp(4rem,21vw,20rem)] leading-none"
    >
      {LETTERS.map((letter, index) => (
        <motion.span
          key={index}
          className="inline-block"
          initial={{ opacity: 0, y: "45%", rotate: 8 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, ease: EASE, delay: index * 0.05 }}
        >
          <span
            ref={(node) => {
              letters.current[index] = node;
            }}
            className={`wordmark-letter inline-block text-gradient ${index > 8 ? "italic" : ""}`}
          >
            {letter === " " ? " " : letter}
          </span>
        </motion.span>
      ))}
    </p>
  );
}
