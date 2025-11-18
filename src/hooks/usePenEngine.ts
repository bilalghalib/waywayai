/**
 * usePenEngine - React hook version of Pen.js
 *
 * Converts raw pointer events into pressure-sensitive strokes
 * This is the GOLD from the legacy Pen.js, now in React!
 */

import { useCallback, useRef } from 'react';

export interface StrokePoint {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  pressure: number;
  tangentialPressure?: number;
  tiltX?: number;
  tiltY?: number;
  twist?: number;
  altitudeAngle?: number;
  azimuthAngle?: number;
  width?: number;
  height?: number;
  timeStamp: number;
  pointerType: string;
}

export interface PenConfig {
  foregroundColor?: string;
  backgroundColor?: string;
  baseLineWidth?: number;
}

export function usePenEngine(config: PenConfig = {}) {
  const {
    foregroundColor = '#555',
    backgroundColor = '#FFF',
    baseLineWidth = 4,
  } = config;

  const strokesRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);

  /**
   * Calculate line width based on pointer input device and pressure
   * This is the SECRET SAUCE from original Pen.js!
   */
  const getLineWidth = useCallback((event: PointerEvent): number => {
    switch (event.pointerType) {
      case 'touch': {
        // Touch devices report contact area (width/height), not pressure
        const width = (event as any).width || 1;
        const height = (event as any).height || 1;

        if (width < 10 && height < 10) {
          // Small touches = stylus tips (Apple Pencil, S-Pen)
          return (width + height) * 2 + 1;
        } else {
          // Large touches = fingers
          return (width + height - 40) / 5;
        }
      }
      case 'pen':
        // True stylus with pressure sensor (0.0 - 1.0)
        return event.pressure * 8;
      default:
        // Mouse fallback (no pressure)
        return event.pressure ? event.pressure * 8 : baseLineWidth;
    }
  }, [baseLineWidth]);

  /**
   * Capture complete stroke data from pointer event
   * Stores ALL the data we need for AI training and replay
   */
  const captureStrokePoint = useCallback((event: PointerEvent): StrokePoint => {
    return {
      x: event.x,
      y: event.y,
      clientX: event.clientX,
      clientY: event.clientY,
      pressure: event.pressure,
      tangentialPressure: event.tangentialPressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      twist: event.twist,
      altitudeAngle: (event as any).altitudeAngle,
      azimuthAngle: (event as any).azimuthAngle,
      width: (event as any).width,
      height: (event as any).height,
      timeStamp: event.timeStamp,
      pointerType: event.pointerType,
    };
  }, []);

  /**
   * Check if erase keys are pressed
   */
  const checkEraseKeys = useCallback((event: PointerEvent): boolean => {
    if (event.buttons === 32) return true; // Eraser button
    if (event.buttons === 1 && event.shiftKey) return true; // Shift + draw
    return false;
  }, []);

  /**
   * Start a new stroke
   */
  const startStroke = useCallback(() => {
    isDrawingRef.current = true;
  }, []);

  /**
   * Add point to current stroke
   */
  const addStrokePoint = useCallback((event: PointerEvent) => {
    if (!isDrawingRef.current) return;

    const point = captureStrokePoint(event);
    strokesRef.current.push(point);

    return point;
  }, [captureStrokePoint]);

  /**
   * End current stroke
   */
  const endStroke = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  /**
   * Clear all strokes
   */
  const clearStrokes = useCallback(() => {
    strokesRef.current = [];
  }, []);

  /**
   * Get all captured strokes
   */
  const getStrokes = useCallback(() => {
    return [...strokesRef.current];
  }, []);

  /**
   * Undo last stroke segment
   */
  const undoLastStroke = useCallback(() => {
    // Find the last "pen up" moment and remove everything after
    const strokes = strokesRef.current;
    if (strokes.length === 0) return;

    // Simple: just remove last 10 points (roughly one stroke segment)
    const removeCount = Math.min(10, strokes.length);
    strokesRef.current = strokes.slice(0, -removeCount);
  }, []);

  return {
    // Core functions
    getLineWidth,
    captureStrokePoint,
    checkEraseKeys,

    // Stroke management
    startStroke,
    addStrokePoint,
    endStroke,
    clearStrokes,
    undoLastStroke,
    getStrokes,

    // State
    isDrawing: isDrawingRef.current,

    // Config
    colors: {
      foreground: foregroundColor,
      background: backgroundColor,
    },
  };
}
