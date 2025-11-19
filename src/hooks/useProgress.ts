/**
 * useProgress - Track user drawing progress and achievements
 * Uses localStorage for now (will migrate to Supabase with auth)
 */

import { useState, useEffect, useCallback } from 'react';

export interface DrawingStats {
  totalDrawings: number;
  drawingsThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  lastDrawingDate: string | null;
  skillLevel: number; // 0-100
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress?: number; // 0-100 for progress towards unlocking
  target?: number; // e.g., "draw 10 times"
}

const INITIAL_STATS: DrawingStats = {
  totalDrawings: 0,
  drawingsThisWeek: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastDrawingDate: null,
  skillLevel: 0,
  achievements: [],
};

const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  {
    id: 'first_drawing',
    name: 'First Steps',
    description: 'Complete your first drawing',
    icon: '🎨',
    target: 1,
  },
  {
    id: 'ten_drawings',
    name: '10 Drawings Club',
    description: 'Complete 10 drawings',
    icon: '🖌️',
    target: 10,
  },
  {
    id: 'fifty_drawings',
    name: 'Artist in Training',
    description: 'Complete 50 drawings',
    icon: '🎭',
    target: 50,
  },
  {
    id: 'hundred_drawings',
    name: 'Century Club',
    description: 'Complete 100 drawings',
    icon: '💯',
    target: 100,
  },
  {
    id: 'week_streak',
    name: '7 Day Streak',
    description: 'Draw every day for a week',
    icon: '🔥',
    target: 7,
  },
  {
    id: 'skill_beginner',
    name: 'Beginner',
    description: 'Reach skill level 25',
    icon: '⭐',
    target: 25,
  },
  {
    id: 'skill_intermediate',
    name: 'Intermediate',
    description: 'Reach skill level 50',
    icon: '⭐⭐',
    target: 50,
  },
  {
    id: 'skill_advanced',
    name: 'Advanced',
    description: 'Reach skill level 75',
    icon: '⭐⭐⭐',
    target: 75,
  },
  {
    id: 'speed_demon',
    name: 'Speed Artist',
    description: 'Complete a drawing in under 30 seconds',
    icon: '⚡',
    target: 1,
  },
];

export function useProgress() {
  const [stats, setStats] = useState<DrawingStats>(INITIAL_STATS);

  // Load stats from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('waywayai_progress');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setStats(parsed);
      } catch (e) {
        console.error('Failed to parse progress data:', e);
      }
    } else {
      // Initialize with all achievements
      const initialAchievements: Achievement[] = ALL_ACHIEVEMENTS.map((a) => ({
        ...a,
        unlockedAt: null,
        progress: 0,
      }));
      setStats({ ...INITIAL_STATS, achievements: initialAchievements });
    }
  }, []);

  // Save stats to localStorage
  const saveStats = useCallback((newStats: DrawingStats) => {
    localStorage.setItem('waywayai_progress', JSON.stringify(newStats));
    setStats(newStats);
  }, []);

  // Record a new drawing
  const recordDrawing = useCallback(
    (drawingTimeSeconds?: number) => {
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];

      // Calculate streak
      let newStreak = stats.currentStreak;
      if (stats.lastDrawingDate) {
        const lastDate = new Date(stats.lastDrawingDate);
        const daysDiff = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 0) {
          // Same day, keep streak
          newStreak = stats.currentStreak;
        } else if (daysDiff === 1) {
          // Next day, increment streak
          newStreak = stats.currentStreak + 1;
        } else {
          // Streak broken
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      // Calculate skill level (simple progression based on drawings)
      const totalDrawings = stats.totalDrawings + 1;
      const newSkillLevel = Math.min(
        100,
        Math.floor(Math.log(totalDrawings + 1) * 15)
      );

      // Update achievements
      const updatedAchievements = stats.achievements.map((achievement) => {
        let shouldUnlock = false;
        let progress = achievement.progress || 0;

        switch (achievement.id) {
          case 'first_drawing':
            shouldUnlock = totalDrawings >= 1;
            progress = Math.min(100, (totalDrawings / 1) * 100);
            break;
          case 'ten_drawings':
            shouldUnlock = totalDrawings >= 10;
            progress = Math.min(100, (totalDrawings / 10) * 100);
            break;
          case 'fifty_drawings':
            shouldUnlock = totalDrawings >= 50;
            progress = Math.min(100, (totalDrawings / 50) * 100);
            break;
          case 'hundred_drawings':
            shouldUnlock = totalDrawings >= 100;
            progress = Math.min(100, (totalDrawings / 100) * 100);
            break;
          case 'week_streak':
            shouldUnlock = newStreak >= 7;
            progress = Math.min(100, (newStreak / 7) * 100);
            break;
          case 'skill_beginner':
            shouldUnlock = newSkillLevel >= 25;
            progress = Math.min(100, (newSkillLevel / 25) * 100);
            break;
          case 'skill_intermediate':
            shouldUnlock = newSkillLevel >= 50;
            progress = Math.min(100, (newSkillLevel / 50) * 100);
            break;
          case 'skill_advanced':
            shouldUnlock = newSkillLevel >= 75;
            progress = Math.min(100, (newSkillLevel / 75) * 100);
            break;
          case 'speed_demon':
            if (drawingTimeSeconds && drawingTimeSeconds <= 30) {
              shouldUnlock = true;
              progress = 100;
            }
            break;
        }

        return {
          ...achievement,
          progress,
          unlockedAt:
            shouldUnlock && !achievement.unlockedAt
              ? now.toISOString()
              : achievement.unlockedAt,
        };
      });

      const newStats: DrawingStats = {
        totalDrawings,
        drawingsThisWeek: stats.drawingsThisWeek + 1, // TODO: Actually track week
        currentStreak: newStreak,
        longestStreak: Math.max(stats.longestStreak, newStreak),
        lastDrawingDate: todayString,
        skillLevel: newSkillLevel,
        achievements: updatedAchievements,
      };

      saveStats(newStats);

      // Return newly unlocked achievements
      return updatedAchievements.filter(
        (a) =>
          a.unlockedAt &&
          !stats.achievements.find((old) => old.id === a.id)?.unlockedAt
      );
    },
    [stats, saveStats]
  );

  // Reset progress (for testing)
  const resetProgress = useCallback(() => {
    const initialAchievements: Achievement[] = ALL_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlockedAt: null,
      progress: 0,
    }));
    saveStats({ ...INITIAL_STATS, achievements: initialAchievements });
  }, [saveStats]);

  return {
    stats,
    recordDrawing,
    resetProgress,
  };
}
