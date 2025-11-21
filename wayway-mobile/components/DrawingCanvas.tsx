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
  const [paths, setPaths] = useState<SkPath[]>([]);
  const currentPath = useRef<SkPath | null>(null);
  const currentStroke = useRef<StrokePoint[]>([]);
  const drawingStartTime = useRef<number>(0);
  const strokeStartTime = useRef<number>(0);

  // Convert pressure to line width
  const pressureToWidth = useCallback((pressure: number): number => {
    return minLineWidth + (maxLineWidth - minLineWidth) * pressure;
  }, [minLineWidth, maxLineWidth]);

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

      // Update path
      if (currentPath.current) {
        currentPath.current = createPath(currentStroke.current);

        // Force re-render
        setPaths([...paths, currentPath.current]);
      }

      // Notify update
      onStrokeUpdate?.(point);
    })
    .onEnd(() => {
      // Complete stroke
      if (currentPath.current && currentStroke.current.length > 0) {
        const finalPath = currentPath.current;
        setPaths((prev) => [...prev, finalPath]);

        const stroke: Stroke = {
          points: [...currentStroke.current],
          startTime: strokeStartTime.current,
          endTime: Date.now(),
        };

        // Notify completion
        onStrokeComplete?.(stroke);

        // Reset
        currentPath.current = null;
        currentStroke.current = [];
      }
    });

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setPaths([]);
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

          {/* Draw all paths */}
          {paths.map((path, index) => (
            <Path
              key={index}
              path={path}
              color={strokeColor}
              style="stroke"
              strokeWidth={3}  // Could vary by pressure
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
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
