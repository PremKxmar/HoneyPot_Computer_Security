
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';
import { motion } from 'framer-motion';
import { Threat } from '../types';
import { ShieldAlert, Activity } from 'lucide-react';

interface ThreatCardProps {
  threat: Threat;
  /* Takes the threat rather than closing over it, so the parent can pass one
     stable callback instead of a fresh arrow per card -- which would make the
     React.memo below a no-op. */
  onSelect: (threat: Threat) => void;
}

const ThreatCard: React.FC<ThreatCardProps> = ({ threat, onSelect }) => {
  const getSeverityColor = (s: string) => {
    switch(s) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <motion.div
      /* content-visibility lets the browser skip layout and paint for cards
         scrolled out of view. With ~20 cards at 500px each, that is the
         difference between compositing one screenful and all of them. The
         intrinsic size keeps the scrollbar from jumping as they skip. */
      className="group relative h-[400px] md:h-[500px] w-full overflow-hidden border-b md:border-r border-white/10 bg-black cursor-pointer [content-visibility:auto] [contain-intrinsic-size:auto_500px]"
      initial="rest"
      whileHover="hover"
      whileTap="hover"
      animate="rest"
      data-hover="true"
      onClick={() => onSelect(threat)}
    >
      {/* Image Background with Glitch Effect */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Greyscale is a CSS class toggled on hover rather than a Framer
            `filter` animation: animating filter re-rasterises the image every
            frame, while the class change is a single GPU-side transition. */}
        <motion.img
          src={threat.image}
          alt={threat.type}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-[filter] duration-500 will-change-transform"
          variants={{
            rest: { scale: 1 },
            hover: { scale: 1.05 }
          }}
          transition={{ duration: 0.6 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Overlay Info */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between pointer-events-none">
        <div className="flex justify-between items-start">
           <div className="flex flex-col gap-1">
             <span className="text-xs font-mono border border-white/30 px-2 py-1 bg-black/70 text-[#a8fbd3]">
               {threat.timestamp}
             </span>
             <span className="text-xs font-mono text-white/70 tracking-widest">
               IP: {threat.ip}
             </span>
           </div>
           
           <motion.div
             variants={{
               rest: { opacity: 0, x: 20 },
               hover: { opacity: 1, x: 0 }
             }}
             className="bg-red-500/20 border border-red-500 text-red-500 rounded-full p-2"
           >
             <ShieldAlert className="w-5 h-5" />
           </motion.div>
        </div>

        <div>
          <div className="overflow-hidden">
            <motion.h3 
              className="font-heading text-2xl md:text-3xl font-bold uppercase text-white will-change-transform leading-none mb-2"
              variants={{
                rest: { y: 0 },
                hover: { x: 5 }
              }}
              transition={{ duration: 0.4 }}
            >
              {threat.type}
            </motion.h3>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <Activity className={`w-4 h-4 ${getSeverityColor(threat.severity)}`} />
            <motion.p 
              className={`text-sm font-medium uppercase tracking-widest ${getSeverityColor(threat.severity)}`}
              variants={{
                rest: { opacity: 0.7 },
                hover: { opacity: 1 }
              }}
            >
              {threat.location}
            </motion.p>
          </div>
          
          <div className="mt-3 w-full bg-white/10 h-1 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#4fb7b3]" 
              style={{ width: `${threat.confidence}%` }} 
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] font-mono text-gray-400 uppercase">
            <span>ML Confidence</span>
            <span>{threat.confidence}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* Memoised: the dashboard re-renders on every poll, SSE message and search
   keystroke, and each card carries an image plus several animated layers. */
export default React.memo(ThreatCard);
