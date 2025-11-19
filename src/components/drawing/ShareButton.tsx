/**
 * ShareButton - One-tap share for drawings
 * Uses Web Share API on mobile, downloads on desktop
 */

import React, { useState } from 'react';
import { DrawingCanvasRef } from './DrawingCanvas';

interface ShareButtonProps {
  canvasRef: React.RefObject<DrawingCanvasRef>;
  title?: string;
  className?: string;
}

export function ShareButton({
  canvasRef,
  title = 'My Drawing',
  className = ''
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleShare = async () => {
    if (!canvasRef.current) {
      alert('Canvas not ready');
      return;
    }

    setIsSharing(true);

    try {
      // Export canvas as image
      const blob = await canvasRef.current.exportAsImage();
      if (!blob) {
        throw new Error('Failed to export image');
      }

      // Create file from blob
      const file = new File([blob], 'drawing.png', { type: 'image/png' });

      // Try Web Share API (works on mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: title,
          text: 'Check out my drawing from WayWay AI!',
          files: [file],
        });

        // Show success message
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success message
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Don't show error if user cancelled
      if ((error as Error).name !== 'AbortError') {
        alert('Failed to share drawing');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`
          px-6 py-3 rounded-lg font-medium
          bg-gradient-to-r from-purple-500 to-pink-500
          text-white shadow-lg
          hover:from-purple-600 hover:to-pink-600
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          flex items-center gap-2
          ${className}
        `}
      >
        {isSharing ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sharing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Drawing
          </>
        )}
      </button>

      {/* Success message */}
      {showSuccess && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap
                        bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg
                        animate-bounce">
          ✓ Shared!
        </div>
      )}
    </div>
  );
}
