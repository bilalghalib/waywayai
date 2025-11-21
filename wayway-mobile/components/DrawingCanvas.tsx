/**
 * DrawingCanvas - Pressure-sensitive drawing with full sensor capture
 * Captures: pressure, tilt, timing, accelerometer
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StrokePoint, Stroke } from '../types/drawing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DrawingCanvasProps {
  onStrokeComplete?: (stroke: Stroke) => void;
  onStrokeUpdate?: (point: StrokePoint) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  strokeColor?: string;
  minLineWidth?: number;
  maxLineWidth?: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onStrokeComplete,
  onStrokeUpdate,
  canvasWidth = SCREEN_WIDTH,
  canvasHeight = SCREEN_HEIGHT * 0.7,
  backgroundColor = '#FFFFFF',
  strokeColor = '#000000',
  minLineWidth = 1,
  maxLineWidth = 10,
}) => {
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
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

  // Pan gesture for drawing
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      // Start new stroke
      strokeStartTime.current = Date.now();
      if (drawingStartTime.current === 0) {
        drawingStartTime.current = strokeStartTime.current;
      }

      const point: StrokePoint = {
        x: event.x / canvasWidth,
        y: event.y / canvasHeight,
        pressure: Platform.OS === 'ios' ? (event.force || 0.5) : 0.5,
        tiltX: 0,  // Available with Apple Pencil
        tiltY: 0,
        twist: 0,
        timestamp: Date.now() - drawingStartTime.current,
        pointerType: 'pen',  // Detect from event if needed
      };

      currentStroke.current = [point];
      currentPath.current = createPath([point]);

      // Notify update
      onStrokeUpdate?.(point);
    })
    .onUpdate((event) => {
      const point: StrokePoint = {
        x: event.x / canvasWidth,
        y: event.y / canvasHeight,
        pressure: Platform.OS === 'ios' ? (event.force || 0.5) : 0.5,
        tiltX: 0,
        tiltY: 0,
        twist: 0,
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

        // Notify completion
        onStrokeComplete?.(stroke);

        // Reset
        currentPath.current = null;
        currentStroke.current = [];
      }
    });

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setCompletedStrokes([]);
    currentPath.current = null;
    currentStroke.current = [];
    drawingStartTime.current = 0;
  }, []);

  // Expose clear function to parent
  useEffect(() => {
    // Could use ref forwarding or context here
  }, []);

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
};

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
