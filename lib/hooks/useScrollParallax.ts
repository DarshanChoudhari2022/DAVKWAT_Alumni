'use client';

import { useEffect, useState } from 'react';

export function useScrollParallax(strength = 0.08) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setOffset(window.scrollY * strength);
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
    };
  }, [strength]);

  return offset;
}
