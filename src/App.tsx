/**
 * Main App Component
 *
 * Simple demo showing both lobby and game screen
 */

import React, { useState } from 'react';
import { GameLobby } from './components/charades/GameLobby';
import { GameScreen } from './components/charades/GameScreen';
import { ProgressDashboard } from './components/dashboard/ProgressDashboard';
import { AchievementNotification } from './components/dashboard/AchievementNotification';
import { StrokePoint } from './hooks/usePenEngine';
import { useProgress, Achievement } from './hooks/useProgress';
import { useMockRealtimeGame } from './hooks/useRealtimeGame';

type GameState = 'lobby' | 'playing';

function App() {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [timeLeft, setTimeLeft] = useState(30);
  const [showDashboard, setShowDashboard] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);

  const { stats, recordDrawing } = useProgress();

  // Real-time multiplayer (using mock for now until Supabase is configured)
  const realtimeGame = useMockRealtimeGame('ABC123', '1');

  // Demo data
  const roomCode = 'ABC123';
  const players = [
    { id: '1', name: 'You', score: 0, isHost: true },
    { id: '2', name: 'Sarah', score: 50, isHost: false },
    { id: '3', name: 'Mike', score: 30, isHost: false },
  ];

  const handleStartGame = () => {
    setGameState('playing');
    setRoundStartTime(Date.now());

    // Start timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          // Round ended - record the drawing
          const drawingTime = roundStartTime ? (Date.now() - roundStartTime) / 1000 : undefined;
          const unlockedAchievements = recordDrawing(drawingTime);

          // Show achievement notifications
          if (unlockedAchievements.length > 0) {
            setNewAchievements(unlockedAchievements);
          }

          // Reset for next round
          setRoundStartTime(Date.now());
          return 30;
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
    realtimeGame.broadcastGuess(guess);
  };

  const handleStroke = (point: StrokePoint) => {
    // Broadcast stroke to other players in real-time
    realtimeGame.broadcastStroke(point);
  };

  return (
    <div className="app">
      {/* Progress Dashboard Button (Floating) */}
      <button
        onClick={() => setShowDashboard(true)}
        className="fixed top-4 left-4 z-40 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
        title="View Progress"
      >
        <div className="text-center">
          <div className="text-2xl">📊</div>
          <div className="text-xs font-bold">{stats.totalDrawings}</div>
        </div>
      </button>

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
          remoteStrokes={realtimeGame.remoteStrokes}
          isConnected={realtimeGame.isConnected}
        />
      )}

      {/* Progress Dashboard Modal */}
      {showDashboard && (
        <ProgressDashboard stats={stats} onClose={() => setShowDashboard(false)} />
      )}

      {/* Achievement Notifications */}
      {newAchievements.map((achievement, index) => (
        <div key={achievement.id} style={{ top: `${4 + index * 6}rem` }}>
          <AchievementNotification
            achievement={achievement}
            onDismiss={() => {
              setNewAchievements((prev) => prev.filter((a) => a.id !== achievement.id));
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default App;
