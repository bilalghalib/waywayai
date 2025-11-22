/**
 * DrawingScreen - Main drawing interface
 * Integrates canvas, voice, motion capture, and WebSocket streaming
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { DrawingCanvas, DrawingCanvasRef } from '../components/DrawingCanvas';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { MotionCapture } from '../components/MotionCapture';
import { DrawingStreamService } from '../services/DrawingStreamService';
import { Drawing, Stroke, VoiceAnnotation, MotionData } from '../types/drawing';

interface DrawingScreenProps {
  referenceImageUrl?: string;
  userId: string;
  serverUrl: string;
}

export const DrawingScreen: React.FC<DrawingScreenProps> = ({
  referenceImageUrl,
  userId,
  serverUrl = 'http://localhost:8000',
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);

  // Track counts only (not full data) to prevent memory leaks
  const [strokeCount, setStrokeCount] = useState(0);
  const [voiceCount, setVoiceCount] = useState(0);
  const [motionCount, setMotionCount] = useState(0);

  // Store in refs for final upload (not state to avoid re-renders)
  const strokesRef = useRef<Stroke[]>([]);
  const voiceAnnotationsRef = useRef<VoiceAnnotation[]>([]);
  const motionDataRef = useRef<MotionData[]>([]);

  const drawingStartTime = useRef<number>(0);
  const streamService = useRef<DrawingStreamService | null>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    initializeConnection();

    return () => {
      if (streamService.current) {
        streamService.current.disconnect();
      }
    };
  }, []);

  const initializeConnection = async () => {
    try {
      streamService.current = new DrawingStreamService(
        {
          serverUrl,
          userId,
          sessionId: Date.now().toString(),
        },
        {
          onConnected: () => {
            console.log('Connected to server');
            setIsConnected(true);
          },
          onDisconnected: () => {
            console.log('Disconnected from server');
            setIsConnected(false);
          },
          onError: (error) => {
            console.error('Stream error:', error);
            Alert.alert('Connection Error', error.message);
          },
          onAISuggestion: (suggestion) => {
            console.log('AI Suggestion:', suggestion);
            // TODO: Display ghost strokes or feedback
          },
        }
      );

      await streamService.current.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      Alert.alert('Connection Failed', 'Could not connect to server');
    }
  };

  const startDrawing = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for connection to server');
      return;
    }

    const drawingId = `drawing_${Date.now()}`;
    drawingStartTime.current = Date.now();

    setIsDrawing(true);
    setStrokeCount(0);
    setVoiceCount(0);
    setMotionCount(0);
    strokesRef.current = [];
    voiceAnnotationsRef.current = [];
    motionDataRef.current = [];

    // Notify server
    streamService.current?.startDrawing(drawingId, referenceImageUrl);

    setCurrentDrawing({
      id: drawingId,
      userId,
      strokes: [],
      voiceAnnotations: [],
      motionData: [],
      referenceImageUrl,
      startTime: drawingStartTime.current,
      endTime: 0,
      duration: 0,
    });
  };

  const handleStrokeComplete = (stroke: Stroke) => {
    // Store in ref (not state) to prevent re-renders and memory growth
    strokesRef.current.push(stroke);
    setStrokeCount((prev) => prev + 1);

    // Stream to server in real-time
    streamService.current?.streamStroke(stroke);

    console.log(`Stroke completed: ${stroke.points.length} points`);
  };

  const handleStrokeUpdate = (stroke: Stroke) => {
    // Optional: stream partial strokes for real-time feedback
    // For now, we only send complete strokes
  };

  const handleVoiceAnnotation = (annotation: VoiceAnnotation) => {
    // Store in ref (not state) to prevent re-renders
    voiceAnnotationsRef.current.push(annotation);
    setVoiceCount((prev) => prev + 1);

    // Stream to server
    streamService.current?.streamVoiceAnnotation(annotation);

    console.log(`Voice: "${annotation.text}" at ${annotation.timestamp}ms`);
  };

  const handleMotionData = (data: MotionData) => {
    // Store in ref (not state) - already streamed to backend
    motionDataRef.current.push(data);
    setMotionCount((prev) => prev + 1);

    // Stream to server (batched internally)
    streamService.current?.streamMotionData(data);
  };

  const finishDrawing = async () => {
    if (!currentDrawing) return;

    const endTime = Date.now();
    const completedDrawing: Drawing = {
      ...currentDrawing,
      strokes: strokesRef.current,
      voiceAnnotations: voiceAnnotationsRef.current,
      motionData: motionDataRef.current,
      endTime,
      duration: endTime - drawingStartTime.current,
    };

    try {
      // Upload complete drawing (saves locally first, then uploads)
      await streamService.current?.endDrawing(completedDrawing);

      Alert.alert(
        'Drawing Saved!',
        `Captured ${strokeCount} strokes, ${voiceCount} voice annotations, and ${motionCount} motion readings.\n\nUploaded to server successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsDrawing(false);
              setCurrentDrawing(null);
              // Clear refs to free memory
              strokesRef.current = [];
              voiceAnnotationsRef.current = [];
              motionDataRef.current = [];
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to upload drawing:', error);

      // Drawing is saved locally, will retry when connection restored
      Alert.alert(
        'Saved Locally',
        `Your drawing is saved on this device with ${strokeCount} strokes.\n\nWe'll automatically upload it when connection is restored.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsDrawing(false);
              setCurrentDrawing(null);
              // Clear refs to free memory
              strokesRef.current = [];
              voiceAnnotationsRef.current = [];
              motionDataRef.current = [];
            },
          },
        ]
      );
    }
  };

  const handleUndo = () => {
    const success = canvasRef.current?.undo();
    if (success) {
      // Decrement count (stroke was removed from canvas but still in ref)
      setStrokeCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleRedo = () => {
    const success = canvasRef.current?.redo();
    if (success) {
      // Increment count (stroke was re-added to canvas)
      setStrokeCount((prev) => prev + 1);
    }
  };

  const clearDrawing = () => {
    Alert.alert('Clear Drawing?', 'This will discard all strokes', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          canvasRef.current?.clear();
          setStrokeCount(0);
          setVoiceCount(0);
          setMotionCount(0);
          strokesRef.current = [];
          voiceAnnotationsRef.current = [];
          motionDataRef.current = [];
        },
      },
    ]);
  };

  const { width } = Dimensions.get('window');
  const panelWidth = referenceImageUrl ? width / 2 : width;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>wayway.ai</Text>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
          <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Connecting...'}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Two-panel mode: Reference Image | Drawing Canvas */}
        {referenceImageUrl && (
          <View style={[styles.panel, { width: panelWidth }]}>
            <Text style={styles.panelLabel}>Reference</Text>
            <Image source={{ uri: referenceImageUrl }} style={styles.referenceImage} resizeMode="contain" />
          </View>
        )}

        <View style={[styles.panel, { width: panelWidth }]}>
          <Text style={styles.panelLabel}>Drawing</Text>
          <DrawingCanvas
            ref={canvasRef}
            canvasWidth={panelWidth - 32}
            canvasHeight={panelWidth - 32}
            onStrokeComplete={handleStrokeComplete}
            onStrokeUpdate={handleStrokeUpdate}
          />

          {/* Stats Overlay */}
          {isDrawing && (
            <View style={styles.statsOverlay}>
              <Text style={styles.statsText}>Strokes: {strokeCount}</Text>
              <Text style={styles.statsText}>Voice: {voiceCount}</Text>
              <Text style={styles.statsText}>Motion: {motionCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Voice Recorder */}
        {isDrawing && (
          <VoiceRecorder
            onAnnotation={handleVoiceAnnotation}
            drawingStartTime={drawingStartTime.current}
            enabled={isDrawing}
          />
        )}

        {/* Undo/Redo Buttons */}
        {isDrawing && (
          <View style={styles.undoRedoRow}>
            <TouchableOpacity
              style={[styles.iconButton, !canvasRef.current?.canUndo() && styles.iconButtonDisabled]}
              onPress={handleUndo}
              disabled={!canvasRef.current?.canUndo()}
            >
              <Text style={styles.iconButtonText}>↶ Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, !canvasRef.current?.canRedo() && styles.iconButtonDisabled]}
              onPress={handleRedo}
              disabled={!canvasRef.current?.canRedo()}
            >
              <Text style={styles.iconButtonText}>↷ Redo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {!isDrawing ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, !isConnected && styles.buttonDisabled]}
              onPress={startDrawing}
              disabled={!isConnected}
            >
              <Text style={styles.buttonText}>Start Drawing</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={clearDrawing}>
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={finishDrawing}>
                <Text style={styles.buttonText}>Finish</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Motion Capture (invisible) */}
      {isDrawing && (
        <MotionCapture
          onMotionData={handleMotionData}
          drawingStartTime={drawingStartTime.current}
          enabled={isDrawing}
          captureRate={60}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666666',
  },
  statusDotConnected: {
    backgroundColor: '#00CC66',
  },
  statusText: {
    fontSize: 12,
    color: '#999999',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  panelLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  referenceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  statsOverlay: {
    position: 'absolute',
    top: 60,
    right: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  statsText: {
    fontSize: 11,
    color: '#CCCCCC',
    fontFamily: 'monospace',
  },
  controls: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
  },
  undoRedoRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  iconButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(204, 0, 102, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CC0066',
  },
  iconButtonDisabled: {
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
    borderColor: '#666666',
    opacity: 0.5,
  },
  iconButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CC0066',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#CC0066',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666666',
  },
  buttonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    color: '#CCCCCC',
  },
});

export default DrawingScreen;
