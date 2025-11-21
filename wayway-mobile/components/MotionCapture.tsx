/**
 * MotionCapture - Captures device motion during drawing
 * Features:
 * - Accelerometer data (device movement)
 * - Gyroscope data (device rotation)
 * - Timestamp synchronization with strokes
 * - 60Hz capture rate
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { MotionData } from '../types/drawing';

interface MotionCaptureProps {
  onMotionData?: (data: MotionData) => void;
  drawingStartTime: number;
  enabled?: boolean;
  captureRate?: number; // Hz
}

export const MotionCapture: React.FC<MotionCaptureProps> = ({
  onMotionData,
  drawingStartTime,
  enabled = true,
  captureRate = 60,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [motionCount, setMotionCount] = useState(0);

  const accelerometerSubscription = useRef<any>(null);
  const gyroscopeSubscription = useRef<any>(null);
  const lastAccelData = useRef<any>(null);
  const lastGyroData = useRef<any>(null);

  useEffect(() => {
    if (enabled) {
      startCapture();
    }

    return () => {
      stopCapture();
    };
  }, [enabled, captureRate]);

  const startCapture = () => {
    // Set update interval (convert Hz to ms)
    const updateInterval = 1000 / captureRate;
    Accelerometer.setUpdateInterval(updateInterval);
    Gyroscope.setUpdateInterval(updateInterval);

    // Subscribe to accelerometer
    accelerometerSubscription.current = Accelerometer.addListener((data) => {
      lastAccelData.current = data;
      processMotionData();
    });

    // Subscribe to gyroscope
    gyroscopeSubscription.current = Gyroscope.addListener((data) => {
      lastGyroData.current = data;
      processMotionData();
    });

    setIsCapturing(true);
  };

  const stopCapture = () => {
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
    }

    if (gyroscopeSubscription.current) {
      gyroscopeSubscription.current.remove();
      gyroscopeSubscription.current = null;
    }

    setIsCapturing(false);
  };

  const processMotionData = () => {
    // Only send data if we have both accelerometer and gyroscope readings
    if (!lastAccelData.current || !lastGyroData.current) {
      return;
    }

    const motionData: MotionData = {
      timestamp: Date.now() - drawingStartTime,
      accelerationX: lastAccelData.current.x,
      accelerationY: lastAccelData.current.y,
      accelerationZ: lastAccelData.current.z,
      rotationAlpha: lastGyroData.current.x,
      rotationBeta: lastGyroData.current.y,
      rotationGamma: lastGyroData.current.z,
    };

    setMotionCount((prev) => prev + 1);
    onMotionData?.(motionData);
  };

  return (
    <View style={styles.container}>
      {enabled && isCapturing && (
        <View style={styles.indicator}>
          <View style={styles.dot} />
          <Text style={styles.text}>
            Motion: {motionCount} readings @ {captureRate}Hz
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Invisible component - just for data capture
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0066CC',
  },
  text: {
    fontSize: 11,
    color: '#0066CC',
    fontWeight: '500',
  },
});

export default MotionCapture;
