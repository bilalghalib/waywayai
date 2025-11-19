/**
 * AchievementNotification - Celebrate unlocked achievements
 * Animated toast notification
 */

import React, { useEffect, useState } from 'react';
import { Achievement } from '../../hooks/useProgress';

interface AchievementNotificationProps {
  achievement: Achievement;
  onDismiss: () => void;
}

export function AchievementNotification({
  achievement,
  onDismiss,
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 100);

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade out
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        transform transition-all duration-300
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-xl shadow-2xl p-4 max-w-sm border-2 border-yellow-300">
        <div className="flex items-start gap-3">
          {/* Animated Icon */}
          <div className="text-4xl animate-bounce">{achievement.icon}</div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎉</span>
              <h3 className="font-bold text-lg">Achievement Unlocked!</h3>
            </div>
            <h4 className="font-bold text-xl mb-1">{achievement.name}</h4>
            <p className="text-yellow-50 text-sm">{achievement.description}</p>
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-6 h-6 flex items-center justify-center text-sm transition-all"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
