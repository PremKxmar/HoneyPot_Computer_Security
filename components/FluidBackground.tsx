/**
 * @license
 * SPDX-License-Identifier: MIT
*/


import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const StarField = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
      opacity: Math.random() * 0.7 + 0.3
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          initial={{ opacity: star.opacity }}
          animate={{ opacity: [star.opacity, 1, star.opacity] }}
          transition={{
            duration: star.duration * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: star.delay,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Ambient background.
 *
 * The glow is drawn with radial gradients rather than blurred, screen-blended
 * divs. A `filter: blur(40px)` on a 90vw element forces the compositor to
 * re-blur a ~1700px layer every frame, and `mix-blend-screen` makes it read
 * back everything underneath -- with three of them animating on an infinite
 * loop, nothing downstream can ever cache, which is what dragged scrolling to
 * ~10fps. Radial gradients are soft by construction and cost nothing to paint.
 *
 * Motion is kept, but only as `transform` on unblurred, unblended layers,
 * which the GPU handles without repainting.
 */
const Blob: React.FC<{
  className: string;
  color: string;
  animate: { x: number[]; y: number[] };
  duration: number;
  ease?: string;
}> = ({ className, color, animate, duration, ease = "easeInOut" }) => (
  <motion.div
    className={`absolute rounded-full will-change-transform ${className}`}
    style={{
      background: `radial-gradient(circle closest-side, ${color}, transparent)`,
      transform: 'translateZ(0)',
    }}
    animate={animate}
    transition={{ duration, repeat: Infinity, ease }}
  />
);

const FluidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-[#31326f] via-[#28295c] to-[#1f2048]">

      <StarField />

      <Blob
        className="top-[-10%] left-[-10%] w-[90vw] h-[90vw]"
        color="rgba(168, 251, 211, 0.30)"
        animate={{ x: [0, 50, -25, 0], y: [0, -25, 25, 0] }}
        duration={25}
        ease="linear"
      />

      <Blob
        className="top-[20%] right-[-20%] w-[100vw] h-[80vw]"
        color="rgba(79, 183, 179, 0.22)"
        animate={{ x: [0, -50, 25, 0], y: [0, 50, -25, 0] }}
        duration={30}
      />

      <Blob
        className="bottom-[-20%] left-[20%] w-[80vw] h-[80vw]"
        color="rgba(99, 122, 185, 0.22)"
        animate={{ x: [0, 75, -75, 0], y: [0, -50, 50, 0] }}
        duration={35}
      />
    </div>
  );
};

export default FluidBackground;
