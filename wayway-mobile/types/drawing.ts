/**
 * Core types for wayway.ai drawing data
 * Compatible with existing backend + new multimodal features
 */

export interface StrokePoint {
  // Position
  x: number;              // Normalized 0-1
  y: number;              // Normalized 0-1

  // Pressure & stylus data
  pressure: number;       // 0-1 (0.5 default for mouse)
  tiltX: number;          // Stylus tilt X (-90 to 90)
  tiltY: number;          // Stylus tilt Y (-90 to 90)
  twist: number;          // Stylus barrel rotation (0-360)
  azimuth?: number;       // Stylus direction (0-360)
  altitude?: number;      // Stylus angle from surface (0-90)

  // Timing
  timestamp: number;      // Milliseconds since drawing start

  // Contact geometry
  width?: number;         // Contact width (for touch)
  height?: number;        // Contact height (for touch)

  // Pointer type
  pointerType: 'pen' | 'touch' | 'mouse';
}

export interface Stroke {
  points: StrokePoint[];
  startTime: number;
  endTime: number;

  // Analysis (calculated)
  analysis?: StrokeAnalysis;
}

export interface StrokeAnalysis {
  // Tempo
  tempo: 'burst' | 'deliberate' | 'normal';
  avgSpeed: number;       // pixels per second
  avgPressure: number;    // 0-1

  // Pattern
  type: 'line' | 'curve' | 'circle' | 'hatch' | 'unknown';
  curvature: number;      // 0 = straight, higher = curvier
  distance: number;       // Total path length in pixels
  duration: number;       // Milliseconds

  // Confidence
  pressureVariance: number;
  confidence: number;     // 0-1 (low variance = high confidence)
}

export interface VoiceAnnotation {
  timestamp: number;      // Milliseconds since drawing start
  text: string;           // Transcribed speech
  confidence: number;     // Transcription confidence 0-1
  audioChunk?: string;    // Base64 encoded audio (optional)
  emotion?: string;       // Detected emotion (optional future feature)
}

export interface MotionData {
  timestamp: number;      // Milliseconds since drawing start

  // Accelerometer (device tilt)
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;

  // Gyroscope (device rotation)
  rotationAlpha?: number;  // Z-axis rotation
  rotationBeta?: number;   // X-axis rotation
  rotationGamma?: number;  // Y-axis rotation
}

export interface Drawing {
  // Identity
  id: string;
  artistId: string;
  challengeId?: string;

  // Content
  strokes: Stroke[];
  voiceAnnotations: VoiceAnnotation[];
  motionData: MotionData[];

  // Context
  referenceImageUrl?: string;
  referenceImageBase64?: string;
  prompt?: string;

  // Metadata
  deviceInfo: DeviceInfo;
  createdAt: number;      // Unix timestamp
  duration: number;       // Total drawing time in ms

  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  deviceModel?: string;   // "iPad Pro 2021"
  stylusType?: string;    // "Apple Pencil 2"
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

export interface SessionStats {
  totalStrokes: number;
  burstStrokes: number;
  deliberateStrokes: number;
  avgSpeed: number;
  avgPressure: number;
  totalDistance: number;
  startTime: number;
}

export interface DrawingSession {
  sessionId: string;
  drawing: Drawing;
  stats: SessionStats;
  isRecordingVoice: boolean;
  isCapturingMotion: boolean;
}

// API types
export interface Challenge {
  id: string;
  title: string;
  prompt: string;
  referenceImageUrl?: string;
  startDate: number;
  endDate: number;
  submissions: number;
}

export interface Submission {
  id: string;
  challengeId: string;
  artistId: string;
  drawingId: string;
  thumbnailUrl: string;
  votes: number;
  createdAt: number;
}

export interface Attribution {
  artistId: string;
  artistName: string;
  influence: number;      // 0-1 (percentage of influence)
  contributionCount: number;
  styleFingerprint?: StyleFingerprint;
}

export interface StyleFingerprint {
  avgPressure: number;
  pressureVariance: number;
  avgSpeed: number;
  burstRatio: number;
  preferredCurves: number[];
  signaturePatterns: string[];
}

export interface GeneratedDrawing {
  id: string;
  prompt: string;
  referenceImageUrl?: string;
  strokes: Stroke[];
  attributions: Attribution[];
  createdAt: number;
}
