/**
 * DrawingCanvas - Pressure-sensitive drawing with full sensor capture
 * Captures: pressure, tilt, timing, accelerometer
 */

import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StrokePoint, Stroke } from '../types/drawing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DrawingCanvasProps {
  onStrokeComplete?: (stroke: Stroke) => void;
  onStrokeUpdate?: (point: StrokePoint) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  strokeColor?: string;
  minLineWidth?: number;
  maxLineWidth?: number;
}

export interface DrawingCanvasRef {
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  onStrokeComplete,
  onStrokeUpdate,
  onUndo,
  onRedo,
  canvasWidth = SCREEN_WIDTH,
  canvasHeight = SCREEN_HEIGHT * 0.7,
  backgroundColor = '#FFFFFF',
  strokeColor = '#000000',
  minLineWidth = 1,
  maxLineWidth = 10,
}, ref) => {
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [renderVersion, setRenderVersion] = useState(0); // Force re-render without array copy
  const currentPath = useRef<SkPath | null>(null);
  const currentStroke = useRef<StrokePoint[]>([]);
  const drawingStartTime = useRef<number>(0);
  const strokeStartTime = useRef<number>(0);

  // Convert pressure to line width
  const pressureToWidth = useCallback((pressure: number): number => {
    return minLineWidth + (maxLineWidth - minLineWidth) * pressure;
  }, [minLineWidth, maxLineWidth]);

  // Create path segment between two points
  const createSegmentPath = useCallback((p1: StrokePoint, p2: StrokePoint): SkPath => {
    const path = Skia.Path.Make();
    path.moveTo(p1.x * canvasWidth, p1.y * canvasHeight);
    path.lineTo(p2.x * canvasWidth, p2.y * canvasHeight);
    return path;
  }, [canvasWidth, canvasHeight]);

  // Create Skia path from points
  const createPath = useCallback((points: StrokePoint[]): SkPath => {
    const path = Skia.Path.Make();

    if (points.length === 0) return path;

    // Start path
    const firstPoint = points[0];
    path.moveTo(firstPoint.x * canvasWidth, firstPoint.y * canvasHeight);

    // Add all points with quadratic curves for smoothness
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const prevPoint = points[i - 1];

      // Calculate midpoint for smooth curves
      const midX = (prevPoint.x + point.x) / 2 * canvasWidth;
      const midY = (prevPoint.y + point.y) / 2 * canvasHeight;

      path.quadTo(
        prevPoint.x * canvasWidth,
        prevPoint.y * canvasHeight,
        midX,
        midY
      );
    }

    // End at last point
    const lastPoint = points[points.length - 1];
    path.lineTo(lastPoint.x * canvasWidth, lastPoint.y * canvasHeight);

    return path;
  }, [canvasWidth, canvasHeight]);

  // Extract stylus data from event (Apple Pencil on iOS)
  const extractStylusData = useCallback((event: any) => {
    // On iOS with Apple Pencil, these properties may be available
    // They're part of the native pointer event that RN Gesture Handler wraps
    const nativeEvent = event.nativeEvent || event;

    return {
      pressure: Platform.OS === 'ios' ? (event.force || nativeEvent.force || 0.5) : 0.5,
      tiltX: nativeEvent.tiltX || 0,  // Angle from vertical axis (-90 to 90)
      tiltY: nativeEvent.tiltY || 0,  // Angle from vertical axis (-90 to 90)
      twist: nativeEvent.twist || 0,  // Barrel rotation (0-359)
      azimuth: nativeEvent.azimuthAngle,  // Direction angle (0-360)
      altitude: nativeEvent.altitudeAngle,  // Angle from surface (0-90)
    };
  }, []);

  // Pan gesture for drawing
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      // Start new stroke
      strokeStartTime.current = Date.now();
      if (drawingStartTime.current === 0) {
        drawingStartTime.current = strokeStartTime.current;
      }

      const stylusData = extractStylusData(event);

      const point: StrokePoint = {
        x: event.x / canvasWidth,
        y: event.y / canvasHeight,
        pressure: stylusData.pressure,
        tiltX: stylusData.tiltX,
        tiltY: stylusData.tiltY,
        twist: stylusData.twist,
        azimuth: stylusData.azimuth,
        altitude: stylusData.altitude,
        timestamp: Date.now() - drawingStartTime.current,
        pointerType: 'pen',
      };

      currentStroke.current = [point];
      currentPath.current = createPath([point]);

      // Notify update
      onStrokeUpdate?.(point);
    })
    .onUpdate((event) => {
      const stylusData = extractStylusData(event);

      const point: StrokePoint = {
        x: event.x / canvasWidth,
        y: event.y / canvasHeight,
        pressure: stylusData.pressure,
        tiltX: stylusData.tiltX,
        tiltY: stylusData.tiltY,
        twist: stylusData.twist,
        azimuth: stylusData.azimuth,
        altitude: stylusData.altitude,
        timestamp: Date.now() - drawingStartTime.current,
        pointerType: 'pen',
      };

      currentStroke.current.push(point);

      // Update current path
      if (currentPath.current) {
        currentPath.current = createPath(currentStroke.current);

        // Force re-render WITHOUT copying paths array (performance fix)
        setRenderVersion(v => v + 1);
      }

      // Notify update
      onStrokeUpdate?.(point);
    })
    .onEnd(() => {
      // Complete stroke
      if (currentPath.current && currentStroke.current.length > 0) {
        const stroke: Stroke = {
          points: [...currentStroke.current],
          startTime: strokeStartTime.current,
          endTime: Date.now(),
        };

        // Add to completed strokes (includes pressure data)
        setCompletedStrokes((prev) => [...prev, stroke]);

        // Clear redo stack when new stroke added
        setRedoStack([]);

        // Notify completion
        onStrokeComplete?.(stroke);

        // Reset
        currentPath.current = null;
        currentStroke.current = [];
      }
    });

  // Undo last stroke
  const undo = useCallback(() => {
    if (completedStrokes.length === 0) {
      return false;
    }

    const lastStroke = completedStrokes[completedStrokes.length - 1];
    setCompletedStrokes((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastStroke]);
    onUndo?.();

    console.log(`Undo: removed stroke, ${completedStrokes.length - 1} strokes remaining`);
    return true;
  }, [completedStrokes, onUndo]);

  // Redo last undone stroke
  const redo = useCallback(() => {
    if (redoStack.length === 0) {
      return false;
    }

    const strokeToRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setCompletedStrokes((prev) => [...prev, strokeToRedo]);
    onRedo?.();

    console.log(`Redo: added stroke, ${completedStrokes.length + 1} strokes total`);
    return true;
  }, [redoStack, completedStrokes, onRedo]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setCompletedStrokes([]);
    setRedoStack([]);
    currentPath.current = null;
    currentStroke.current = [];
    drawingStartTime.current = 0;
  }, []);

  // Check if can undo/redo
  const canUndo = useCallback(() => completedStrokes.length > 0, [completedStrokes]);
  const canRedo = useCallback(() => redoStack.length > 0, [redoStack]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    undo,
    redo,
    clear: clearCanvas,
    canUndo,
    canRedo,
  }), [undo, redo, clearCanvas, canUndo, canRedo]);

  return (
    <View style={[styles.container, { width: canvasWidth, height: canvasHeight }]}>
      <GestureDetector gesture={panGesture}>
        <Canvas style={styles.canvas}>
          {/* Background */}
          <Path
            path={`M0 0 L${canvasWidth} 0 L${canvasWidth} ${canvasHeight} L0 ${canvasHeight} Z`}
            color={backgroundColor}
          />

          {/* Draw all completed strokes with pressure-based width */}
          {completedStrokes.map((stroke, strokeIndex) => (
            <React.Fragment key={strokeIndex}>
              {stroke.points.slice(0, -1).map((point, pointIndex) => {
                const nextPoint = stroke.points[pointIndex + 1];
                const avgPressure = (point.pressure + nextPoint.pressure) / 2;
                const segmentWidth = pressureToWidth(avgPressure);

                return (
                  <Path
                    key={`${strokeIndex}-${pointIndex}`}
                    path={createSegmentPath(point, nextPoint)}
                    color={strokeColor}
                    style="stroke"
                    strokeWidth={segmentWidth}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                );
              })}
            </React.Fragment>
          ))}

          {/* Draw current path being drawn (uses renderVersion to trigger updates) */}
          {currentPath.current && currentStroke.current.length > 0 && renderVersion >= 0 && (
            <React.Fragment>
              {currentStroke.current.slice(0, -1).map((point, index) => {
                const nextPoint = currentStroke.current[index + 1];
                const avgPressure = (point.pressure + nextPoint.pressure) / 2;
                const segmentWidth = pressureToWidth(avgPressure);

                return (
                  <Path
                    key={`current-${index}`}
                    path={createSegmentPath(point, nextPoint)}
                    color={strokeColor}
                    style="stroke"
                    strokeWidth={segmentWidth}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                );
              })}
            </React.Fragment>
          )}
        </Canvas>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});

export default DrawingCanvas;
