/**
 * @license
 * SPDX-License-Identifier: MIT
*/

import React, { useEffect, useRef, useState } from 'react';

interface DeferredSectionProps {
  /** Rendered once the placeholder scrolls near the viewport. */
  children: React.ReactNode;
  /** Shown until then; should reserve roughly the final height. */
  fallback?: React.ReactNode;
  /** How far ahead of the viewport to start mounting. */
  rootMargin?: string;
  className?: string;
}

/**
 * Mounts its children only once they are about to be scrolled into view.
 *
 * The analytics charts and the Leaflet map are the two heaviest things on the
 * page -- six SVG charts and a tile layer with up to a hundred markers. Both
 * sit well below the fold but were mounted on first paint, so their DOM was
 * being laid out and composited during every scroll of the page above them.
 *
 * Rendering is deferred rather than lazily imported so the components keep
 * their normal data-fetching behaviour once visible.
 */
const DeferredSection: React.FC<DeferredSectionProps> = ({
  children,
  fallback = null,
  rootMargin = '200px',
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || isVisible) return;

    // Without IntersectionObserver, just render immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
};

export default DeferredSection;
