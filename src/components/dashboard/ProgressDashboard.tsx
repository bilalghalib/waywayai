/**
 * ProgressDashboard - Show user progress, stats, and achievements
 * Mobile-first design with cards and animations
 */

import React from 'react';
import { DrawingStats, Achievement } from '../../hooks/useProgress';

interface ProgressDashboardProps {
  stats: DrawingStats;
  onClose?: () => void;
}

export function ProgressDashboard({ stats, onClose }: ProgressDashboardProps) {
  const unlockedAchievements = stats.achievements.filter((a) => a.unlockedAt);
  const lockedAchievements = stats.achievements.filter((a) => !a.unlockedAt);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Your Progress</h2>
              <p className="text-purple-100 mt-1">Keep drawing and level up!</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-10 h-10 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Drawings */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-4xl font-bold text-blue-600">
                {stats.totalDrawings}
              </div>
              <div className="text-sm text-blue-800 font-medium mt-1">
                Total Drawings
              </div>
            </div>

            {/* Current Streak */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200">
              <div className="text-4xl font-bold text-orange-600 flex items-center gap-2">
                {stats.currentStreak}
                {stats.currentStreak > 0 && <span className="text-2xl">🔥</span>}
              </div>
              <div className="text-sm text-orange-800 font-medium mt-1">
                Day Streak
              </div>
            </div>

            {/* Skill Level */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
              <div className="text-4xl font-bold text-purple-600">
                {stats.skillLevel}
              </div>
              <div className="text-sm text-purple-800 font-medium mt-1">
                Skill Level
              </div>
              <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${stats.skillLevel}%` }}
                />
              </div>
            </div>

            {/* Longest Streak */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
              <div className="text-4xl font-bold text-green-600">
                {stats.longestStreak}
              </div>
              <div className="text-sm text-green-800 font-medium mt-1">
                Longest Streak
              </div>
            </div>
          </div>

          {/* Achievements Section */}
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🏆</span>
              Achievements ({unlockedAchievements.length}/{stats.achievements.length})
            </h3>

            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <div className="space-y-3 mb-4">
                {unlockedAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    unlocked
                  />
                ))}
              </div>
            )}

            {/* Locked Achievements */}
            {lockedAchievements.length > 0 && (
              <>
                <h4 className="text-lg font-semibold text-gray-600 mb-3 mt-6">
                  Keep going to unlock:
                </h4>
                <div className="space-y-3">
                  {lockedAchievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      unlocked={false}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Motivational Message */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">✨</div>
            <p className="text-gray-700 font-medium">
              {stats.totalDrawings === 0
                ? "Start your journey! Create your first drawing."
                : stats.totalDrawings < 10
                ? "Great start! Keep practicing every day."
                : stats.totalDrawings < 50
                ? "You're making amazing progress!"
                : stats.totalDrawings < 100
                ? "You're becoming a skilled artist!"
                : "You're a drawing master! Keep inspiring others."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
}

function AchievementCard({ achievement, unlocked }: AchievementCardProps) {
  return (
    <div
      className={`
        rounded-xl p-4 border-2 transition-all
        ${
          unlocked
            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-md'
            : 'bg-gray-50 border-gray-200 opacity-60'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
          text-3xl flex-shrink-0
          ${unlocked ? 'animate-bounce' : 'grayscale opacity-50'}
        `}
        >
          {achievement.icon}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={`font-bold ${unlocked ? 'text-gray-800' : 'text-gray-500'}`}
            >
              {achievement.name}
            </h4>
            {unlocked && <span className="text-green-600 text-xl">✓</span>}
          </div>
          <p
            className={`text-sm ${unlocked ? 'text-gray-600' : 'text-gray-400'} mt-1`}
          >
            {achievement.description}
          </p>

          {/* Progress Bar for Locked Achievements */}
          {!unlocked && achievement.progress !== undefined && achievement.progress > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(achievement.progress)}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                  style={{ width: `${achievement.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Unlocked Date */}
          {unlocked && achievement.unlockedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
