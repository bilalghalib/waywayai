/**
 * wayway.ai Mobile App
 * AI-powered drawing training platform
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DrawingScreen } from './screens/DrawingScreen';

export default function App() {
  // TODO: Replace with actual user authentication
  const userId = 'user_' + Date.now();

  // TODO: Replace with actual server URL (development vs production)
  const serverUrl = __DEV__
    ? 'http://localhost:8000'  // Local development
    : 'https://api.wayway.ai';  // Production

  // TODO: Allow user to select reference image
  // For now, testing without reference image
  const referenceImageUrl = undefined;
  // const referenceImageUrl = 'https://example.com/reference.jpg';

  return (
    <>
      <StatusBar style="light" />
      <DrawingScreen
        userId={userId}
        serverUrl={serverUrl}
        referenceImageUrl={referenceImageUrl}
      />
    </>
  );
}
