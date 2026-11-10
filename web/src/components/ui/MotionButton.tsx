"use client";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
export function MotionButton(props: HTMLMotionProps<"button">) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      {...props}
      whileHover={reduced ? undefined : props.whileHover}
      whileTap={reduced ? undefined : props.whileTap}
    />
  );
}
