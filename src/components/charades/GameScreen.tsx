/**
 * GameScreen - Main gameplay view for Drawing Charades
 *
 * Mobile-first vertical layout
 */

import React, { useState } from 'react';
import { DrawingCanvas } from '../drawing/DrawingCanvas';
import { StrokePoint } from '../../hooks/usePenEngine';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameScreenProps {
  currentWord?: string;
  isDrawer: boolean;
  timeLeft: number;
  players: Player[];
  currentDrawer: string;
  onGuess: (guess: string) => void;
  onStroke: (point: StrokePoint) => void;
}

export function GameScreen({
  currentWord,
  isDrawer,
  timeLeft,
  players,
  currentDrawer,
  onGuess,
  onStroke,
}: GameScreenProps) {
  const [guessInput, setGuessInput] = useState('');
  const [guesses, setGuesses] = useState<{ player: string; guess: string; correct: boolean }[]>([]);

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim()) return;

    onGuess(guessInput);
    setGuesses([...guesses, { player: 'You', guess: guessInput, correct: false }]);
    setGuessInput('');
  };

  const drawerPlayer = players.find((p) => p.id === currentDrawer);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Timer */}
          <div className="flex items-center space-x-2">
            <span className="text-3xl">⏰</span>
            <span className={`text-2xl font-bold ${timeLeft <= 10 ? 'animate-pulse text-red-300' : ''}`}>
              0:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>

          {/* Current Word / Drawer */}
          <div className="text-center flex-1">
            {isDrawer ? (
              <div>
                <p className="text-sm opacity-90">Draw this:</p>
                <p className="text-2xl font-bold">{currentWord}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm opacity-90">Drawing:</p>
                <p className="text-lg font-semibold">{drawerPlayer?.name}</p>
              </div>
            )}
          </div>

          {/* Round Info */}
          <div className="text-right text-sm opacity-90">
            <p>Round 2/5</p>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-white">
        <DrawingCanvas
          isDrawer={isDrawer}
          onStroke={onStroke}
          className="w-full h-full"
        />

        {/* Drawing overlay message for viewers */}
        {!isDrawer && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
            👀 Watching {drawerPlayer?.name} draw...
          </div>
        )}
      </div>

      {/* Players Sidebar (Collapsible on mobile) */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="max-w-4xl mx-auto">
          <details className="group">
            <summary className="cursor-pointer font-semibold text-gray-700 flex items-center justify-between">
              <span>👥 Players ({players.length})</span>
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    player.id === currentDrawer
                      ? 'bg-indigo-100 border-2 border-indigo-400'
                      : 'bg-gray-50'
                  }`}
                >
                  <span className="font-medium text-sm">{player.name}</span>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                    {player.score}pts
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Guess Input (Only for non-drawers) */}
      {!isDrawer && (
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            {/* Recent Guesses */}
            <div className="mb-3 max-h-24 overflow-y-auto space-y-1">
              {guesses.slice(-3).map((g, i) => (
                <div
                  key={i}
                  className={`text-sm ${
                    g.correct ? 'text-green-600 font-semibold' : 'text-gray-600'
                  }`}
                >
                  💬 {g.player}: {g.guess}
                  {g.correct && ' ✓'}
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmitGuess} className="flex space-x-2">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Type your guess..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 text-lg"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
              <button
                type="submit"
                className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-600 active:scale-95 transition-all"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Drawer Controls */}
      {isDrawer && (
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex justify-center space-x-4">
            <button className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 active:scale-95 transition-all flex items-center space-x-2">
              <span>↩️</span>
              <span>Undo</span>
            </button>
            <button className="bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 active:scale-95 transition-all flex items-center space-x-2">
              <span>🗑️</span>
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
