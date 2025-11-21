/**
 * VoiceRecorder - Captures voice annotations synced with drawing
 * Features:
 * - Real-time transcription (iOS Speech Recognition)
 * - Audio recording (for backup/playback)
 * - Timestamp synchronization with strokes
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { VoiceAnnotation } from '../types/drawing';

interface VoiceRecorderProps {
  onAnnotation?: (annotation: VoiceAnnotation) => void;
  drawingStartTime: number;
  enabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAnnotation,
  drawingStartTime,
  enabled = true,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [annotations, setAnnotations] = useState<VoiceAnnotation[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const lastTranscriptRef = useRef<string>('');

  useEffect(() => {
    // Set up Voice recognition
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      stopRecording();
    };
  }, []);

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value[0]) {
      const text = e.value[0];
      setCurrentTranscript(text);

      // Only create annotation if text changed (avoid duplicates)
      if (text !== lastTranscriptRef.current) {
        const annotation: VoiceAnnotation = {
          timestamp: Date.now() - drawingStartTime,
          text: text,
          confidence: 1.0,  // iOS doesn't provide confidence
        };

        setAnnotations(prev => [...prev, annotation]);
        onAnnotation?.(annotation);
        lastTranscriptRef.current = text;
      }
    }
  };

  const onSpeechPartialResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value[0]) {
      setCurrentTranscript(e.value[0]);
    }
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.error('Speech recognition error:', e.error);
  };

  const startRecording = async () => {
    if (!enabled) return;

    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable microphone access');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start audio recording (for backup/playback)
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      // Start speech recognition (iOS)
      if (Platform.OS === 'ios') {
        try {
          await Voice.start('en-US');
        } catch (error) {
          console.error('Voice recognition not available:', error);
          // Continue with audio recording only
        }
      }

      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start voice recording');
    }
  };

  const stopRecording = async () => {
    try {
      // Stop audio recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        console.log('Recording saved to:', uri);
        recordingRef.current = null;
      }

      // Stop speech recognition
      if (Platform.OS === 'ios') {
        try {
          await Voice.stop();
        } catch (error) {
          console.error('Error stopping voice:', error);
        }
      }

      setIsRecording(false);
      setCurrentTranscript('');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
          !enabled && styles.buttonDisabled
        ]}
        onPress={toggleRecording}
        disabled={!enabled}
      >
        <View style={[styles.indicator, isRecording && styles.indicatorActive]} />
        <Text style={styles.buttonText}>
          {isRecording ? 'Recording...' : 'Voice'}
        </Text>
      </TouchableOpacity>

      {isRecording && currentTranscript && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>Live:</Text>
          <Text style={styles.transcriptText}>{currentTranscript}</Text>
        </View>
      )}

      {annotations.length > 0 && !isRecording && (
        <View style={styles.annotationsContainer}>
          <Text style={styles.annotationsLabel}>
            {annotations.length} annotation{annotations.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CC0066',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  buttonRecording: {
    backgroundColor: '#FF0066',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
    // Could add animation here
  },
  transcriptContainer: {
    backgroundColor: 'rgba(204, 0, 102, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#CC0066',
  },
  transcriptLabel: {
    fontSize: 11,
    color: '#CC0066',
    fontWeight: '600',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: '#333333',
  },
  annotationsContainer: {
    alignItems: 'center',
  },
  annotationsLabel: {
    fontSize: 12,
    color: '#666666',
  },
});

export default VoiceRecorder;
