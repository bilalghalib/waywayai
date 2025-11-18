/**
 * Main App Component
 *
 * Simple demo showing both lobby and game screen
 */

import React, { useState } from 'react';
import { GameLobby } from './components/charades/GameLobby';
import { GameScreen } from './components/charades/GameScreen';
import { StrokePoint } from './hooks/usePenEngine';

type GameState = 'lobby' | 'playing';

function App() {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [timeLeft, setTimeLeft] = useState(30);

  // Demo data
  const roomCode = 'ABC123';
  const players = [
    { id: '1', name: 'You', score: 0, isHost: true },
    { id: '2', name: 'Sarah', score: 50, isHost: false },
    { id: '3', name: 'Mike', score: 30, isHost: false },
  ];

  const handleStartGame = () => {
    setGameState('playing');

    // Start timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 30; // Reset for next round
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLeave = () => {
    // Go back to home (or show confirmation)
    alert('Leave game?');
  };

  const handleGuess = (guess: string) => {
    console.log('Guess submitted:', guess);
    // TODO: Send to Supabase, check if correct
  };

  const handleStroke = (point: StrokePoint) => {
    // TODO: Broadcast to other players via Supabase
    console.log('Stroke:', point);
  };

  return (
    <div className="app">
      {gameState === 'lobby' && (
        <GameLobby
          roomCode={roomCode}
          players={players}
          isHost={true}
          onStartGame={handleStartGame}
          onLeave={handleLeave}
        />
      )}

      {gameState === 'playing' && (
        <GameScreen
          currentWord="ELEPHANT"
          isDrawer={true} // Change to false to test guesser view
          timeLeft={timeLeft}
          players={players}
          currentDrawer="1"
          onGuess={handleGuess}
          onStroke={handleStroke}
        />
      )}
    </div>
  );
}

export default App;
