'use client';

import { useEffect, useMemo, useState } from 'react';

interface TextGenerateEffectProps {
  text: string;
  className?: string;
  speed?: number;
}

export function TextGenerateEffect({ text, className, speed = 22 }: TextGenerateEffectProps) {
  const words = useMemo(() => text.split(' '), [text]);
  const [visibleWords, setVisibleWords] = useState(0);

  useEffect(() => {
    setVisibleWords(0);

    const interval = window.setInterval(() => {
      setVisibleWords((current) => {
        if (current >= words.length) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, speed);

    return () => window.clearInterval(interval);
  }, [words.length, speed]);

  return (
    <span className={className} aria-label={text}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block transition-all duration-500"
          style={{
            opacity: index < visibleWords ? 1 : 0,
            filter: index < visibleWords ? 'blur(0px)' : 'blur(10px)',
            transform: index < visibleWords ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {word}
          {index < words.length - 1 ? '\u00a0' : ''}
        </span>
      ))}
    </span>
  );
}
