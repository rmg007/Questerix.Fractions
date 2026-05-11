import { useEffect, useRef } from 'react';
import { usePreferences } from '@app/services/PreferencesService';
import { easings } from '@app/utils/easings';

interface TweenConfig {
  from: number;
  to: number;
  duration: number;
  easing: keyof typeof easings;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export function useTween(config: TweenConfig) {
  const prefs = usePreferences();
  const startTimeRef = useRef<number | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefs.reducedMotion) {
      config.onUpdate(config.to);
      config.onComplete?.();
      return;
    }

    const animate = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }

      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / config.duration, 1);
      const easeFunc = easings[config.easing] || ((t: number) => t);
      const eased = easeFunc(progress);
      const value = config.from + (config.to - config.from) * eased;

      config.onUpdate(value);

      if (progress < 1) {
        animationIdRef.current = requestAnimationFrame(animate);
      } else {
        config.onComplete?.();
      }
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [config, prefs.reducedMotion]);
}
