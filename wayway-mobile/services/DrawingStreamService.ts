/**
 * DrawingStreamService - WebSocket client for real-time drawing data streaming
 * Streams strokes, voice annotations, and motion data to backend as they happen
 */

import { io, Socket } from 'socket.io-client';
import { Stroke, VoiceAnnotation, MotionData, Drawing } from '../types/drawing';

interface StreamConfig {
  serverUrl: string;
  userId: string;
  sessionId?: string;
}

interface StreamCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  onAISuggestion?: (suggestion: any) => void;
}

export class DrawingStreamService {
  private socket: Socket | null = null;
  private config: StreamConfig;
  private callbacks: StreamCallbacks;
  private isConnected: boolean = false;
  private currentDrawingId: string | null = null;
  private motionBuffer: MotionData[] = [];
  private motionBufferSize: number = 10; // Send motion data in batches

  constructor(config: StreamConfig, callbacks: StreamCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.config.serverUrl, {
          transports: ['websocket'],
          auth: {
            userId: this.config.userId,
            sessionId: this.config.sessionId,
          },
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.callbacks.onConnected?.();
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.callbacks.onDisconnected?.();
        });

        this.socket.on('error', (error: any) => {
          console.error('WebSocket error:', error);
          this.callbacks.onError?.(new Error(error.message || 'WebSocket error'));
          reject(error);
        });

        // Listen for AI suggestions (real-time feedback)
        this.socket.on('ai_suggestion', (data: any) => {
          console.log('Received AI suggestion:', data);
          this.callbacks.onAISuggestion?.(data);
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentDrawingId = null;
  }

  /**
   * Start a new drawing session
   */
  startDrawing(drawingId: string, referenceImageUrl?: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.currentDrawingId = drawingId;
    this.motionBuffer = [];

    this.socket.emit('drawing_start', {
      drawingId,
      referenceImageUrl,
      timestamp: Date.now(),
      userId: this.config.userId,
    });

    console.log(`Started drawing session: ${drawingId}`);
  }

  /**
   * Stream a stroke in real-time
   */
  streamStroke(stroke: Stroke): void {
    if (!this.isConnected || !this.socket || !this.currentDrawingId) {
      console.warn('Cannot stream stroke: not connected or no active drawing');
      return;
    }

    this.socket.emit('stroke', {
      drawingId: this.currentDrawingId,
      stroke: {
        id: stroke.id,
        points: stroke.points,
        color: stroke.color,
        startTime: stroke.startTime,
        endTime: stroke.endTime,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Stream voice annotation
   */
  streamVoiceAnnotation(annotation: VoiceAnnotation): void {
    if (!this.isConnected || !this.socket || !this.currentDrawingId) {
      console.warn('Cannot stream voice: not connected or no active drawing');
      return;
    }

    this.socket.emit('voice_annotation', {
      drawingId: this.currentDrawingId,
      annotation,
      timestamp: Date.now(),
    });
  }

  /**
   * Buffer and batch-send motion data (60Hz is too high for individual sends)
   */
  streamMotionData(data: MotionData): void {
    if (!this.isConnected || !this.socket || !this.currentDrawingId) {
      return;
    }

    this.motionBuffer.push(data);

    // Send in batches to reduce network overhead
    if (this.motionBuffer.length >= this.motionBufferSize) {
      this.flushMotionBuffer();
    }
  }

  /**
   * Flush motion buffer immediately
   */
  private flushMotionBuffer(): void {
    if (this.motionBuffer.length === 0 || !this.socket || !this.currentDrawingId) {
      return;
    }

    this.socket.emit('motion_batch', {
      drawingId: this.currentDrawingId,
      motionData: this.motionBuffer,
      timestamp: Date.now(),
    });

    this.motionBuffer = [];
  }

  /**
   * End drawing session and upload complete drawing
   */
  endDrawing(drawing: Drawing): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      // Flush any remaining motion data
      this.flushMotionBuffer();

      // Send complete drawing
      this.socket.emit('drawing_complete', {
        drawing: {
          id: drawing.id,
          userId: drawing.userId,
          strokes: drawing.strokes,
          voiceAnnotations: drawing.voiceAnnotations,
          motionData: drawing.motionData,
          referenceImageUrl: drawing.referenceImageUrl,
          startTime: drawing.startTime,
          endTime: drawing.endTime,
          duration: drawing.duration,
        },
        timestamp: Date.now(),
      });

      console.log(`Completed drawing: ${drawing.id}`);

      // Wait for server acknowledgment
      this.socket.once('drawing_saved', (response: any) => {
        if (response.success) {
          console.log('Drawing saved successfully:', response);
          this.currentDrawingId = null;
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to save drawing'));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Drawing save timeout'));
      }, 30000);
    });
  }

  /**
   * Check if connected
   */
  isSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current drawing ID
   */
  getCurrentDrawingId(): string | null {
    return this.currentDrawingId;
  }
}

export default DrawingStreamService;
