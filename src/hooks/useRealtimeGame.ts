/**
 * useRealtimeGame - Manage real-time multiplayer game state
 * Uses Supabase Realtime for stroke broadcasting and game state sync
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { StrokePoint } from './usePenEngine';

export interface GameState {
  roomCode: string;
  currentWord: string;
  currentDrawerId: string;
  timeLeft: number;
  round: number;
  maxRounds: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost?: boolean;
}

export interface RealtimeGameHook {
  players: Player[];
  gameState: GameState | null;
  remoteStrokes: StrokePoint[];
  isConnected: boolean;
  broadcastStroke: (stroke: StrokePoint) => void;
  broadcastGuess: (guess: string) => void;
  clearCanvas: () => void;
}

export function useRealtimeGame(roomCode: string, localPlayerId: string): RealtimeGameHook {
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [remoteStrokes, setRemoteStrokes] = useState<StrokePoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);

  // Initialize real-time channel
  useEffect(() => {
    // Create channel for this room
    const channel = supabase.channel(`game:${roomCode}`, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
      },
    });

    // Subscribe to stroke broadcasts
    channel.on('broadcast', { event: 'stroke' }, (payload: any) => {
      const stroke = payload.payload as StrokePoint;
      setRemoteStrokes((prev) => [...prev, stroke]);
    });

    // Subscribe to guess broadcasts
    channel.on('broadcast', { event: 'guess' }, (payload: any) => {
      console.log('Guess received:', payload.payload);
      // TODO: Handle guess (check if correct, update scores, etc.)
    });

    // Subscribe to clear canvas events
    channel.on('broadcast', { event: 'clear' }, () => {
      setRemoteStrokes([]);
    });

    // Subscribe to game state updates
    channel.on('broadcast', { event: 'game_state' }, (payload: any) => {
      setGameState(payload.payload as GameState);
    });

    // Subscribe to player list updates
    channel.on('broadcast', { event: 'players' }, (payload: any) => {
      setPlayers(payload.payload as Player[]);
    });

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        console.log(`Connected to room: ${roomCode}`);

        // Announce presence
        channel.send({
          type: 'broadcast',
          event: 'player_joined',
          payload: { playerId: localPlayerId },
        });
      } else if (status === 'CLOSED') {
        setIsConnected(false);
        console.log(`Disconnected from room: ${roomCode}`);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [roomCode, localPlayerId]);

  // Broadcast stroke to other players
  const broadcastStroke = useCallback(
    (stroke: StrokePoint) => {
      if (!channelRef.current || !isConnected) {
        console.warn('Not connected, cannot broadcast stroke');
        return;
      }

      channelRef.current.send({
        type: 'broadcast',
        event: 'stroke',
        payload: stroke,
      });
    },
    [isConnected]
  );

  // Broadcast guess to other players
  const broadcastGuess = useCallback(
    (guess: string) => {
      if (!channelRef.current || !isConnected) {
        console.warn('Not connected, cannot broadcast guess');
        return;
      }

      channelRef.current.send({
        type: 'broadcast',
        event: 'guess',
        payload: {
          playerId: localPlayerId,
          guess,
          timestamp: Date.now(),
        },
      });
    },
    [isConnected, localPlayerId]
  );

  // Clear canvas (broadcast to all)
  const clearCanvas = useCallback(() => {
    setRemoteStrokes([]);

    if (!channelRef.current || !isConnected) {
      return;
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'clear',
      payload: {},
    });
  }, [isConnected]);

  return {
    players,
    gameState,
    remoteStrokes,
    isConnected,
    broadcastStroke,
    broadcastGuess,
    clearCanvas,
  };
}

/**
 * Mock version for local testing without Supabase
 * Simulates multiplayer using localStorage + polling
 */
export function useMockRealtimeGame(roomCode: string, localPlayerId: string): RealtimeGameHook {
  const [players] = useState<Player[]>([
    { id: '1', name: 'You', score: 0, isHost: true },
    { id: '2', name: 'Bot Sarah', score: 0, isHost: false },
  ]);
  const [remoteStrokes, setRemoteStrokes] = useState<StrokePoint[]>([]);
  const [gameState] = useState<GameState>({
    roomCode,
    currentWord: 'ELEPHANT',
    currentDrawerId: '1',
    timeLeft: 30,
    round: 1,
    maxRounds: 5,
  });

  const broadcastStroke = useCallback((stroke: StrokePoint) => {
    // In mock mode, just log it
    console.log('Mock broadcast stroke:', stroke);
  }, []);

  const broadcastGuess = useCallback((guess: string) => {
    console.log('Mock broadcast guess:', guess);
  }, []);

  const clearCanvas = useCallback(() => {
    setRemoteStrokes([]);
  }, []);

  return {
    players,
    gameState,
    remoteStrokes,
    isConnected: true,
    broadcastStroke,
    broadcastGuess,
    clearCanvas,
  };
}
