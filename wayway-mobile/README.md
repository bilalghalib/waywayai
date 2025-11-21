# wayway.ai Mobile App

React Native mobile app for wayway.ai AI drawing training platform. Captures rich drawing data including strokes, voice annotations, and device motion for training personalized AI drawing models.

## Features

### 🎨 **Pressure-Sensitive Drawing Canvas**
- Hardware-accelerated rendering with React Native Skia
- Full stylus support (pressure, tilt, twist)
- Smooth quadratic curve interpolation
- 60fps+ performance on iPad

### 🎤 **Voice Annotations**
- Real-time speech-to-text transcription (iOS)
- High-quality audio recording for backup
- Timestamp synchronization with strokes
- Capture thoughts while drawing ("spike spike spike")

### 📱 **Motion Capture**
- 60Hz accelerometer data
- Gyroscope rotation tracking
- Correlates device movement with drawing dynamics
- Detects burst vs deliberate modes

### 🔄 **Real-Time Streaming**
- WebSocket connection to backend
- Live stroke streaming as you draw
- Batched motion data for efficiency
- AI suggestions (ghost strokes, feedback)

### 🖼️ **Two-Panel Interface**
- Reference image | Drawing canvas
- Optimized for iPad landscape mode
- Also works on phones and web

## Tech Stack

- **React Native + Expo** - Cross-platform framework
- **@shopify/react-native-skia** - Hardware-accelerated canvas
- **expo-av** - Audio recording
- **@react-native-voice/voice** - iOS Speech Recognition
- **expo-sensors** - Accelerometer + gyroscope
- **socket.io-client** - WebSocket streaming
- **TypeScript** - Type safety

## Project Structure

```
wayway-mobile/
├── components/
│   ├── DrawingCanvas.tsx       # Pressure-sensitive canvas
│   ├── VoiceRecorder.tsx        # Voice annotation capture
│   └── MotionCapture.tsx        # Accelerometer + gyroscope
├── screens/
│   └── DrawingScreen.tsx        # Main drawing interface
├── services/
│   └── DrawingStreamService.ts  # WebSocket client
├── types/
│   └── drawing.ts               # TypeScript types
├── App.tsx                      # Entry point
├── app.json                     # Expo configuration
└── package.json                 # Dependencies

```

## Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- For iOS development:
  - macOS with Xcode 14+
  - iOS device or simulator
- For Android development:
  - Android Studio
  - Android device or emulator

### Setup Steps

1. **Install dependencies:**
   ```bash
   cd wayway-mobile
   npm install
   ```

2. **Start development server:**
   ```bash
   npx expo start
   ```

3. **Run on device:**
   - **iOS:** Press `i` or scan QR code with Expo Go app
   - **Android:** Press `a` or scan QR code with Expo Go app
   - **Web:** Press `w` to open in browser

## Testing on iPad

### Using Expo Go (Easiest)

1. Install Expo Go from App Store
2. Run `npx expo start`
3. Scan QR code with iPad camera
4. Grant microphone and motion permissions when prompted

### Using Development Build (Best Performance)

1. Install EAS CLI: `npm install -g eas-cli`
2. Build development client:
   ```bash
   eas build --profile development --platform ios
   ```
3. Install on iPad and run

### Permissions Required

- **Microphone** - Voice annotations
- **Speech Recognition** - Real-time transcription (iOS only)
- **Motion & Fitness** - Accelerometer/gyroscope data

## Configuration

### Backend Server

Edit `App.tsx` to set your backend URL:

```typescript
const serverUrl = __DEV__
  ? 'http://YOUR_IP:8000'  // Local development
  : 'https://api.wayway.ai';  // Production
```

**Important:** For local testing, use your computer's IP address, NOT `localhost`

### Reference Image

To enable two-panel mode, provide a reference image URL:

```typescript
const referenceImageUrl = 'https://example.com/reference.jpg';
```

## Data Captured

### Stroke Data
```typescript
{
  x: 0.5,                    // Normalized 0-1
  y: 0.5,                    // Normalized 0-1
  pressure: 0.8,             // 0-1 (stylus only)
  tiltX: 0.1,                // -1 to 1 (stylus only)
  tiltY: -0.2,               // -1 to 1 (stylus only)
  twist: 45,                 // 0-359 degrees (stylus only)
  timestamp: 1234,           // ms since drawing start
  pointerType: 'pen'         // 'pen' | 'touch' | 'mouse'
}
```

### Voice Annotations
```typescript
{
  timestamp: 5432,           // ms since drawing start
  text: "spike spike spike", // Transcribed text
  confidence: 0.95,          // 0-1 (iOS only)
  audioChunk: "base64..."    // Optional backup audio
}
```

### Motion Data
```typescript
{
  timestamp: 3210,           // ms since drawing start
  accelerationX: 0.05,       // g-force
  accelerationY: -9.81,      // g-force
  accelerationZ: 0.02,       // g-force
  rotationAlpha: 0.1,        // rad/s
  rotationBeta: 0.0,         // rad/s
  rotationGamma: -0.05       // rad/s
}
```

## WebSocket API

### Client → Server Events

- **`drawing_start`** - Start new drawing session
- **`stroke`** - Individual stroke completed
- **`voice_annotation`** - Voice annotation captured
- **`motion_batch`** - Batch of motion data (10 readings)
- **`drawing_complete`** - Upload complete drawing

### Server → Client Events

- **`ai_suggestion`** - Real-time AI feedback
  - Ghost strokes to guide user
  - Style corrections
  - Composition suggestions

## Development

### Hot Reload

Expo supports hot reload by default. Edit any file and see changes instantly.

### Debugging

- **React DevTools:** `npx react-devtools`
- **Console logs:** Visible in Expo terminal
- **Network inspect:** Use Flipper or React Native Debugger

### Type Checking

```bash
npm run tsc
```

### Linting

```bash
npm run lint
```

## Building for Production

### iOS

1. Configure bundle identifier in `app.json`
2. Build:
   ```bash
   eas build --platform ios
   ```
3. Submit to App Store:
   ```bash
   eas submit --platform ios
   ```

### Android

1. Configure package name in `app.json`
2. Build:
   ```bash
   eas build --platform android
   ```
3. Submit to Play Store:
   ```bash
   eas submit --platform android
   ```

### Web

```bash
npx expo export:web
```

Host the output in `web-build/` directory.

## Performance Considerations

- **Canvas rendering:** 60fps on iPad Pro, 30-60fps on older devices
- **Voice transcription:** iOS only (Android requires Google Cloud Speech)
- **Motion capture:** 60Hz on modern devices, may throttle on low-end devices
- **WebSocket:** Batches motion data (10 readings per send) to reduce overhead

## Known Limitations

- Speech recognition only works on iOS (Android support requires backend integration)
- Pressure sensitivity requires Apple Pencil or compatible stylus
- WebSocket requires stable internet connection
- Recording permissions must be granted before use

## Troubleshooting

### "Cannot connect to server"

- Check that backend is running on port 8000
- Use computer's IP address, not `localhost`
- Ensure devices are on same network
- Check firewall settings

### "Speech recognition not available"

- Only works on iOS devices
- Ensure microphone permission is granted
- App will continue with audio recording only

### "No pressure sensitivity"

- Requires Apple Pencil or compatible stylus
- Check that device supports pressure
- Will fall back to default 0.5 pressure if not available

## Next Steps

- [ ] Add user authentication
- [ ] Allow selecting reference images from gallery
- [ ] Display AI suggestions as ghost strokes
- [ ] Add challenges/prompts system
- [ ] Build attribution visualization
- [ ] Implement credit/payment system

## Contributing

This is a private project for wayway.ai. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved
