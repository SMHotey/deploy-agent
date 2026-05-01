'use client';

import { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
}

export function AnimatedNumber({ value, duration = 900, decimals = 0 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const startValue = displayValue;
    
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayValue(startValue + (value - startValue) * eased);
      
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    
    raf = requestAnimationFrame(tick);
    
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  
  return <span>{displayValue.toFixed(decimals)}</span>;
}
