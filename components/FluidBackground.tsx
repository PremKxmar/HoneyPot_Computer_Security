/**
 * @license
 * SPDX-License-Identifier: MIT
*/


import React, { useMemo } from 'react';

/**
 * Ambient background.
 *
 * Two deliberate choices here, both for scroll performance:
 *
 * The glow is drawn with radial gradients rather than blurred, screen-blended
 * divs. A `filter: blur(40px)` on a 90vw element forces the compositor to
 * re-blur a ~1700px layer every frame, and `mix-blend-screen` makes it read
 * back everything underneath. Radial gradients are soft by construction.
 *
 * The motion is CSS keyframes rather than Framer Motion. Framer animates from
 * JavaScript, writing inline styles every frame on the main thread -- the same
 * thread that handles scrolling. Keyframed transforms run on the compositor.
 * See index.css for the keyframes.
 */

const StarField = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 2,
      opacity: Math.random() * 0.7 + 0.3,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            '--star-opacity': star.opacity,
            '--star-duration': `${star.duration}s`,
            '--star-delay': `${star.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

const FluidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-[#31326f] via-[#28295c] to-[#1f2048]">

      <StarField />

      <div
        className="absolute top-[-10%] left-[-10%] w-[90vw] h-[90vw] rounded-full animate-drift-a will-change-transform"
        style={{ background: 'radial-gradient(circle closest-side, rgba(168, 251, 211, 0.30), transparent)' }}
      />

      <div
        className="absolute top-[20%] right-[-20%] w-[100vw] h-[80vw] rounded-full animate-drift-b will-change-transform"
        style={{ background: 'radial-gradient(circle closest-side, rgba(79, 183, 179, 0.22), transparent)' }}
      />

      <div
        className="absolute bottom-[-20%] left-[20%] w-[80vw] h-[80vw] rounded-full animate-drift-c will-change-transform"
        style={{ background: 'radial-gradient(circle closest-side, rgba(99, 122, 185, 0.22), transparent)' }}
      />
    </div>
  );
};

export default FluidBackground;
