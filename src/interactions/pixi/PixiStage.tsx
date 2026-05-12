/**
 * React wrapper for PIXI.Application lifecycle management.
 * Handles canvas creation, resize, cleanup, and accessibility.
 * Per React+PixiJS migration plan §5
 */

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { BREAKPOINTS } from './tokens';

interface PixiStageProps {
  /**
   * Container width in pixels. If not provided, uses full parent width.
   */
  width?: number;
  /**
   * Container height in pixels. If not provided, uses full parent height.
   */
  height?: number;
  /**
   * Background color (0xRRGGBB format). Default: white.
   */
  backgroundColor?: number;
  /**
   * Callback when Pixi app is ready. Receives the PIXI.Application instance.
   */
  onReady?: (app: Application) => void;
  /**
   * Callback when canvas resizes.
   */
  onResize?: (width: number, height: number) => void;
  /**
   * Cleanup callback — fired on unmount.
   */
  onCleanup?: () => void;
  /**
   * CSS class for the container element.
   */
  className?: string;
  /**
   * Accessibility label for the canvas element.
   */
  ariaLabel?: string;
}

/**
 * PixiStage: a React component that manages a PIXI.Application.
 *
 * Usage:
 * ```tsx
 * <PixiStage
 *   width={500}
 *   height={400}
 *   onReady={(app) => {
 *     // app.stage is the root container
 *     // Render your scene
 *   }}
 * />
 * ```
 */
export function PixiStage({
  width,
  height,
  backgroundColor = 0xffffff,
  onReady,
  onResize,
  onCleanup,
  className,
  ariaLabel = 'Interactive canvas',
}: PixiStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  // Initialize Pixi application
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const canvasWidth = width || rect.width || BREAKPOINTS.mobile;
    const canvasHeight = height || rect.height || 400;

    let isMounted = true;
    const initializeApp = async () => {
      const app = new Application();
      await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (!isMounted) {
        app.destroy(true);
        return;
      }

      // Append canvas to container
      container.appendChild(app.canvas);
      app.canvas.setAttribute('aria-label', ariaLabel);
      app.canvas.setAttribute('role', 'application');
      app.canvas.setAttribute('tabindex', '0');

      appRef.current = app;

      if (onReady) {
        onReady(app);
      }
    };

    initializeApp();

    // Handle window resize
    const handleResize = () => {
      if (!appRef.current || !containerRef.current) return;

      const newRect = containerRef.current.getBoundingClientRect();
      const newWidth = width || newRect.width || BREAKPOINTS.mobile;
      const newHeight = height || newRect.height || 400;

      appRef.current.renderer.resize(newWidth, newHeight);

      if (onResize) {
        onResize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);

      if (onCleanup) {
        onCleanup();
      }

      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [width, height, backgroundColor, ariaLabel, onReady, onResize, onCleanup]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
}
