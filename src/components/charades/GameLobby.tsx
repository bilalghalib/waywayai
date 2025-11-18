/**
 * GameLobby - Waiting room for Drawing Charades
 *
 * Mobile-first design for creating/joining games
 */

import React, { useState } from 'react';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface GameLobbyProps {
  roomCode: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
  onLeave: () => void;
}

export function GameLobby({
  roomCode,
  players,
  isHost,
  onStartGame,
  onLeave,
}: GameLobbyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/join/${roomCode}`;

    if (navigator.share) {
      // Native share on mobile
      try {
        await navigator.share({
          title: 'Join my Drawing Charades game!',
          text: `Room code: ${roomCode}`,
          url: link,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canStart = players.length >= 2 && isHost;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
      {/* Room Code Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎨 Drawing Charades
          </h1>
          <p className="text-gray-600">Waiting for players...</p>
        </div>

        {/* Room Code */}
        <div className="bg-indigo-50 rounded-2xl p-6 mb-6">
          <p className="text-sm text-gray-600 text-center mb-2">Room Code</p>
          <p className="text-5xl font-bold text-indigo-600 text-center tracking-wider font-mono">
            {roomCode}
          </p>
        </div>

        {/* Share Button */}
        <button
          onClick={handleCopyLink}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-4 px-6 rounded-xl mb-6 hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg active:scale-95"
        >
          {copied ? '✓ Copied!' : '📱 Share Invite Link'}
        </button>

        {/* Players List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Players ({players.length}/8)
            </h2>
            <div className="flex items-center space-x-1">
              {players.map((player, i) => (
                <div
                  key={player.id}
                  className="w-2 h-2 rounded-full bg-green-400 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800">
                    {player.name}
                  </span>
                </div>
                {player.isHost && (
                  <span className="text-2xl" title="Host">
                    👑
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`w-full font-bold py-4 px-6 rounded-xl transition-all shadow-lg ${
                canStart
                  ? 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canStart
                ? '🚀 Start Game'
                : `⏳ Need ${2 - players.length} more player${
                    2 - players.length === 1 ? '' : 's'
                  }`}
            </button>
          ) : (
            <div className="text-center py-4 text-gray-600">
              <p className="text-sm">Waiting for host to start...</p>
            </div>
          )}

          <button
            onClick={onLeave}
            className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-300 transition-all active:scale-95"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center text-white max-w-md">
        <p className="text-sm opacity-90">
          💡 <strong>How to play:</strong> One person draws a word while others
          guess. First to guess wins points!
        </p>
      </div>
    </div>
  );
}
