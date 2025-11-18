/**
 * DrawingCanvas - React component version of Board.js
 *
 * Handles canvas rendering, responsive sizing, and drawing
 * Preserves the GOLD double-buffering logic from Board.js
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePenEngine, StrokePoint } from '../../hooks/usePenEngine';

interface DrawingCanvasProps {
  onStroke?: (point: StrokePoint) => void;
  onStrokeEnd?: () => void;
  className?: string;
  isDrawer?: boolean; // Can this user draw?
  remoteStrokes?: StrokePoint[]; // Strokes from other players
}

export function DrawingCanvas({
  onStroke,
  onStrokeEnd,
  className = '',
  isDrawer = true,
  remoteStrokes = [],
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const memoryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const penEngine = usePenEngine();

  const RESOLUTION = 2; // 2x for Retina displays
  const BG_COLOR = '#ffffff';

  /**
   * Initialize canvas and memory buffer
   * Preserves Board.js double-buffering logic
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;

    // Create memory canvas (invisible, for buffering)
    if (!memoryCanvasRef.current) {
      memoryCanvasRef.current = document.createElement('canvas');
    }
    const memoryCanvas = memoryCanvasRef.current;
    const memoryCtx = memoryCanvas.getContext('2d');
    if (!memoryCtx) return;

    // Enable smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Size canvas to fit container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width * RESOLUTION;
      const height = rect.height * RESOLUTION;

      // Resize visible canvas
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Resize memory canvas
      memoryCanvas.width = width;
      memoryCanvas.height = height;

      // Clear and redraw
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      memoryCtx.fillStyle = BG_COLOR;
      memoryCtx.fillRect(0, 0, width, height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  /**
   * Get pointer position relative to canvas
   */
  const getPointerPos = useCallback((event: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * RESOLUTION,
      y: (event.clientY - rect.top) * RESOLUTION,
    };
  }, []);

  /**
   * Draw a line segment
   */
  const drawLine = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      from: { x: number; y: number },
      to: { x: number; y: number },
      lineWidth: number,
      color: string = penEngine.colors.foreground
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    [penEngine.colors.foreground]
  );

  /**
   * Handle pointer down (start drawing)
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawer) return; // Can't draw if not drawer

      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      penEngine.startStroke();

      const pos = getPointerPos(e);
      lastPointRef.current = pos;

      // Capture the point
      const point = penEngine.captureStrokePoint(e.nativeEvent);
      if (onStroke) {
        onStroke(point);
      }
    },
    [isDrawer, penEngine, getPointerPos, onStroke]
  );

  /**
   * Handle pointer move (draw)
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || !isDrawer) return;

      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const pos = getPointerPos(e);
      const lastPos = lastPointRef.current || pos;

      // Calculate line width based on pressure
      const lineWidth = penEngine.getLineWidth(e.nativeEvent);

      // Draw the line
      drawLine(ctx, lastPos, pos, lineWidth);

      lastPointRef.current = pos;

      // Capture the point
      const point = penEngine.captureStrokePoint(e.nativeEvent);
      penEngine.addStrokePoint(e.nativeEvent);

      if (onStroke) {
        onStroke(point);
      }
    },
    [isDrawing, isDrawer, penEngine, getPointerPos, drawLine, onStroke]
  );

  /**
   * Handle pointer up (end drawing)
   */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId);
      }

      setIsDrawing(false);
      penEngine.endStroke();
      lastPointRef.current = null;

      // Save to memory canvas
      const ctx = canvas?.getContext('2d');
      const memoryCtx = memoryCanvasRef.current?.getContext('2d');
      if (ctx && canvas && memoryCtx && memoryCanvasRef.current) {
        memoryCtx.drawImage(canvas, 0, 0);
      }

      if (onStrokeEnd) {
        onStrokeEnd();
      }
    },
    [isDrawing, penEngine, onStrokeEnd]
  );

  /**
   * Clear the canvas
   */
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    penEngine.clearStrokes();
  }, [penEngine]);

  /**
   * Render remote strokes (from other players)
   */
  useEffect(() => {
    if (remoteStrokes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Clear and redraw all remote strokes
    // This is simplified - in production, we'd be smarter about incremental updates
    clearCanvas();

    let lastPoint: StrokePoint | null = null;
    remoteStrokes.forEach((point) => {
      if (lastPoint) {
        const lineWidth = penEngine.getLineWidth(point as any);
        drawLine(
          ctx,
          { x: lastPoint.x, y: lastPoint.y },
          { x: point.x, y: point.y },
          lineWidth
        );
      }
      lastPoint = point;
    });
  }, [remoteStrokes, penEngine, drawLine, clearCanvas]);

  return (
    <canvas
      ref={canvasRef}
      className={`touch-none select-none ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        touchAction: 'none',
        width: '100%',
        height: '100%',
        cursor: isDrawer ? 'crosshair' : 'default',
      }}
    />
  );
}
