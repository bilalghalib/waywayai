/**
 * DrawingPersistence - Handles offline storage of drawings
 * Features:
 * - Save drawings locally before upload
 * - Retry failed uploads
 * - Queue management
 * - Automatic cleanup after successful upload
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Drawing } from '../types/drawing';

const STORAGE_KEY_PREFIX = 'wayway_drawing_';
const QUEUE_KEY = 'wayway_upload_queue';
const MAX_RETRIES = 3;

export interface PendingDrawing {
  drawing: Drawing;
  retryCount: number;
  lastAttempt: number;
  createdAt: number;
}

export class DrawingPersistence {
  /**
   * Save drawing locally
   */
  static async saveDrawing(drawing: Drawing): Promise<void> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${drawing.id}`;
      const pendingDrawing: PendingDrawing = {
        drawing,
        retryCount: 0,
        lastAttempt: 0,
        createdAt: Date.now(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(pendingDrawing));

      // Add to upload queue
      await this.addToQueue(drawing.id);

      console.log(`Saved drawing ${drawing.id} to local storage`);
    } catch (error) {
      console.error('Failed to save drawing:', error);
      throw new Error('Failed to save drawing locally');
    }
  }

  /**
   * Load drawing from local storage
   */
  static async loadDrawing(drawingId: string): Promise<PendingDrawing | null> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${drawingId}`;
      const data = await AsyncStorage.getItem(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as PendingDrawing;
    } catch (error) {
      console.error(`Failed to load drawing ${drawingId}:`, error);
      return null;
    }
  }

  /**
   * Delete drawing from local storage (after successful upload)
   */
  static async deleteDrawing(drawingId: string): Promise<void> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${drawingId}`;
      await AsyncStorage.removeItem(key);

      // Remove from queue
      await this.removeFromQueue(drawingId);

      console.log(`Deleted drawing ${drawingId} from local storage`);
    } catch (error) {
      console.error(`Failed to delete drawing ${drawingId}:`, error);
    }
  }

  /**
   * Mark drawing as failed (increment retry count)
   */
  static async markFailed(drawingId: string): Promise<void> {
    try {
      const pending = await this.loadDrawing(drawingId);
      if (!pending) return;

      pending.retryCount++;
      pending.lastAttempt = Date.now();

      const key = `${STORAGE_KEY_PREFIX}${drawingId}`;
      await AsyncStorage.setItem(key, JSON.stringify(pending));

      console.log(`Marked drawing ${drawingId} as failed (retry ${pending.retryCount})`);
    } catch (error) {
      console.error(`Failed to mark drawing ${drawingId} as failed:`, error);
    }
  }

  /**
   * Get all pending drawings
   */
  static async getAllPending(): Promise<PendingDrawing[]> {
    try {
      const queue = await this.getQueue();
      const pending: PendingDrawing[] = [];

      for (const drawingId of queue) {
        const drawing = await this.loadDrawing(drawingId);
        if (drawing) {
          pending.push(drawing);
        }
      }

      return pending;
    } catch (error) {
      console.error('Failed to get pending drawings:', error);
      return [];
    }
  }

  /**
   * Get drawings that are ready for retry (not over max retries, past backoff time)
   */
  static async getRetryable(): Promise<PendingDrawing[]> {
    try {
      const allPending = await this.getAllPending();
      const now = Date.now();

      return allPending.filter(pending => {
        // Don't retry if over max retries
        if (pending.retryCount >= MAX_RETRIES) {
          return false;
        }

        // Exponential backoff: 2s, 4s, 8s
        const backoffTime = Math.pow(2, pending.retryCount) * 2000;
        const timeSinceLastAttempt = now - pending.lastAttempt;

        return timeSinceLastAttempt > backoffTime;
      });
    } catch (error) {
      console.error('Failed to get retryable drawings:', error);
      return [];
    }
  }

  /**
   * Add drawing ID to upload queue
   */
  private static async addToQueue(drawingId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      if (!queue.includes(drawingId)) {
        queue.push(drawingId);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  }

  /**
   * Remove drawing ID from upload queue
   */
  private static async removeFromQueue(drawingId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(id => id !== drawingId);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  }

  /**
   * Get upload queue
   */
  private static async getQueue(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Clear all local storage (for testing/debugging)
   */
  static async clearAll(): Promise<void> {
    try {
      const queue = await this.getQueue();

      for (const drawingId of queue) {
        await this.deleteDrawing(drawingId);
      }

      await AsyncStorage.removeItem(QUEUE_KEY);
      console.log('Cleared all pending drawings');
    } catch (error) {
      console.error('Failed to clear all:', error);
    }
  }

  /**
   * Get storage statistics
   */
  static async getStats(): Promise<{
    totalPending: number;
    retryable: number;
    failed: number;
  }> {
    try {
      const allPending = await this.getAllPending();
      const retryable = await this.getRetryable();
      const failed = allPending.filter(p => p.retryCount >= MAX_RETRIES);

      return {
        totalPending: allPending.length,
        retryable: retryable.length,
        failed: failed.length,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { totalPending: 0, retryable: 0, failed: 0 };
    }
  }
}

export default DrawingPersistence;
