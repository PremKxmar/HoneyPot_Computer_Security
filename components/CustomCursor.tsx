/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

const CustomCursor: React.FC = () => {
  const [isHovering, setIsHovering] = useState(false);
  
  // Initialize off-screen to prevent flash
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  
  // Smooth spring animation
  const springConfig = { damping: 20, stiffness: 350, mass: 0.1 }; 
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      // One combined selector instead of three separate closest() walks up
      // the tree, on an event that fires at pointer rate.
      const target = e.target as HTMLElement;
      setIsHovering(!!target.closest('button, a, [data-hover="true"]'));
    };

    window.addEventListener('mousemove', updateMousePosition, { passive: true });
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, [mouseX, mouseY]);

  return (
    /* No mix-blend-difference here: a blended element forces the browser to
       composite everything beneath it as a group and re-blend on each move.
       The cursor sits above a dark page, so a plain light disc reads the same
       at a fraction of the cost. */
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none flex items-center justify-center hidden md:flex will-change-transform"
      style={{ x, y, translateX: '-50%', translateY: '-50%' }}
    >
      {/* This div is the actual cursor "body" and will handle the scaling and text centering */}
      {/* Changed base size to 80px diameter (40px radius) */}
      <motion.div
        className="relative rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.3)] flex items-center justify-center"
        style={{ width: 80, height: 80 }}
        animate={{
          // Scaled by 1.5 to become 120px diameter (60px radius) when hovering
          scale: isHovering ? 1.5 : 1, 
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Text directly inside the scalable cursor body, centered by flex parent */}
        <motion.span 
          className="z-10 text-black font-black uppercase tracking-widest text-sm overflow-hidden whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: isHovering ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          View
        </motion.span>
      </motion.div>
    </motion.div>
  );
};

export default CustomCursor;