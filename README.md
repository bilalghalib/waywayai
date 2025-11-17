# WayWay AI 🎨

**Interactive Drawing Collection for AI Training**

Teach AI to draw like you through natural demonstration and tracing. WayWay AI captures your unique drawing style—every stroke, pressure point, and flourish—to create training data for personalized AI art models.

---

## ✨ What is WayWay AI?

WayWay AI is an interactive canvas that captures rich drawing data from stylus, touch, and mouse input. Unlike simple drawing apps, we record:

- **Pressure sensitivity** (how hard you press)
- **Tilt angles** (pen orientation)
- **Stroke timing** (drawing speed and rhythm)
- **Multi-touch events** (simultaneous touches)
- **Complete stroke sequences** (order matters!)

This data creates a digital fingerprint of your artistic style, perfect for training AI models to replicate your unique way of drawing.

---

## 🚀 Quick Start

### Try It Now (No Installation)

1. Open `drawwaywayOnline/index.html` in a modern browser
2. Start drawing on the canvas
3. Your strokes are automatically captured
4. Click "Save" to export your drawing data

### For Development

```bash
# Clone the repository
git clone https://github.com/bilalghalib/waywayai.git
cd waywayai

# Serve the frontend
cd drawwaywayOnline
python3 -m http.server 8000
# Open http://localhost:8000

# Run GIF generation service
cd ../makeGif
npm install
node makeGif.js
```

---

## 📁 Project Structure

```
waywayai/
├── drawwaywayOnline/        # Main drawing application
│   ├── index.html            # Entry point
│   ├── js/
│   │   ├── main.js           # App initialization
│   │   ├── libs/
│   │   │   ├── Board.js      # Canvas management
│   │   │   ├── Pen.js        # Pressure-sensitive drawing
│   │   │   ├── Pointer.js    # Multi-touch input
│   │   │   └── FloatingButton.js # UI controls
│   │   ├── airtable.browser.js  # Database client
│   │   └── upload.js         # Data export
│   └── upload*.php           # Server-side handlers
│
├── makeGif/                  # Drawing replay & GIF generation
│   ├── makeGif.js            # Node.js GIF encoder
│   ├── cluster.py            # ML stroke clustering
│   ├── utilitiezz.js         # Helper functions
│   └── package.json
│
├── data/                     # User data (gitignored)
│   ├── drawings/             # Saved drawing sessions
│   ├── exports/              # Generated GIFs
│   └── references/           # Reference images for tracing
│
├── docs/                     # Documentation
├── _ARCHIVE_OLD_CODE/        # Legacy code (291MB archived)
│
├── STRATEGY.md               # Product roadmap & architecture
├── FUN_APPLICATIONS.md       # Creative use cases
└── README.md                 # You are here
```

---

## 🎯 Core Features

### 1. Pressure-Sensitive Drawing
Automatically adapts line width based on input device:
- **Stylus:** Uses pen pressure (0.0 - 1.0)
- **Touch:** Maps contact area to line width
- **Mouse:** Defaults to 4px width

### 2. Complete Stroke Data Capture
Every pointer event is recorded with 20+ attributes:
```javascript
{
  x, y,                  // Position
  pressure,              // 0.0 to 1.0
  tiltX, tiltY,          // Pen angles
  altitudeAngle,         // Pen altitude
  azimuthAngle,          // Pen azimuth
  timeStamp,             // Milliseconds
  width, height,         // Touch contact size
  // ... and more
}
```

### 3. Replay System
- Stroke-by-stroke playback at adjustable speeds
- Export as animated GIF
- Visualize drawing process
- Compare multiple attempts

### 4. ML-Ready Dataset
- Compressed JSON export (LZ-String)
- Airtable cloud sync
- Python clustering for pattern analysis
- FFT-based feature extraction

---

## 🔧 Technology Stack

### Frontend
- **HTML5 Canvas API** - Drawing surface
- **Pointer Events API** - Unified input handling
- **JavaScript (Vanilla)** - No framework dependencies
- **LZ-String** - Compression library
- **Airtable SDK** - Cloud database

### Backend
- **Node.js + Express** - GIF generation service
- **Canvas (node-canvas)** - Server-side rendering
- **gif-encoder-2** - Animated GIF creation
- **Python 3** - ML clustering & analysis
  - scikit-learn - K-means clustering
  - NumPy - FFT feature extraction

### Infrastructure
- **Airtable** - Current database (migration planned)
- **Local storage** - Browser-side persistence
- **PHP** - Legacy upload handlers

---

## 💎 Gold Features (Preserved Code)

The heart of WayWay AI is three elegant libraries:

### `Pen.js` - Pressure-Sensitive Input
Converts raw pointer events into beautiful, natural-looking strokes.

**Key Algorithm:**
```javascript
function getLineWidth(event) {
  switch (event.pointerType) {
    case 'touch':
      return (event.width + event.height < 20)
        ? (event.width + event.height) * 2 + 1
        : (event.width + event.height - 40) / 5;
    case 'pen':
      return event.pressure * 8;
    default:
      return event.pressure ? event.pressure * 8 : 4;
  }
}
```

### `Board.js` - Canvas Management
Handles responsive sizing, memory buffers, and localStorage persistence.

**Features:**
- 2x resolution rendering for HiDPI displays
- Automatic window resize handling
- Double-buffering for smooth performance
- Local save/restore functionality

### `makeGif.js` - Replay Engine
Reconstructs drawings from stroke data and exports as animated GIFs.

**Process:**
1. Parse compressed JSON stroke data
2. Replay strokes on server-side canvas
3. Capture frames at intervals (every 20 points)
4. Encode as GIF with 200fps frame rate

---

## 📊 Data Format

### Stroke Point Structure
```typescript
interface StrokePoint {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  pageX: number;
  pageY: number;
  pressure: number;        // 0.0 - 1.0
  tangentialPressure: number;
  tiltX: number;           // degrees
  tiltY: number;           // degrees
  twist: number;           // degrees
  altitudeAngle: number;   // radians
  azimuthAngle: number;    // radians
  width: number;           // touch contact width
  height: number;          // touch contact height
  timeStamp: number;       // milliseconds
  movementX: number;
  movementY: number;
}
```

### Drawing Session
```json
{
  "drawingId": "uuid-here",
  "artist": "username",
  "referenceImage": "https://...",
  "strokes": [
    "down",
    { "ev": { /* StrokePoint data */ } },
    { "ev": { /* StrokePoint data */ } },
    "up"
  ],
  "metadata": {
    "device": "iPad Pro",
    "resolution": [2860, 1444],
    "duration": 125000,
    "totalPoints": 2847,
    "createdAt": "2024-11-17T..."
  }
}
```

---

## 🎮 Usage Examples

### Basic Drawing
```javascript
// Initialize canvas
Board.init('canvas-id');
Pen.init(Board.ctx);

// Handle pointer events
canvas.addEventListener('pointerdown', (e) => {
  Pen.setFuncType(e);
  Pen.setPen(Board.ctx, e);
  // Start drawing...
});

canvas.addEventListener('pointermove', (e) => {
  const pos = Board.getPointerPos(e);
  // Draw stroke segment...
});

canvas.addEventListener('pointerup', () => {
  Board.storeMemory(); // Save to localStorage
});
```

### Export Drawing Data
```javascript
// Get stroke data from global array
const strokes = pointerArray.map(point => ({
  ev: point
}));

// Compress for storage
const compressed = LZString.compressToBase64(JSON.stringify(strokes));

// Save to Airtable
airtable.create({
  drawingData: compressed,
  artist: username,
  timestamp: new Date().toISOString()
});
```

### Generate Replay GIF
```bash
cd makeGif
# Place drawing JSON in drawme.txt
node makeGif.js
# Output: output/beginner.gif
```

---

## 🔮 Future Plans

See [STRATEGY.md](STRATEGY.md) for detailed roadmap.

### Phase 1: Modernization (Weeks 1-2)
- [ ] Migrate to React + TypeScript
- [ ] Replace jQuery with modern state management
- [ ] Responsive mobile-first UI redesign

### Phase 2: Backend (Weeks 3-4)
- [ ] PostgreSQL migration (from Airtable)
- [ ] REST API with authentication
- [ ] S3 storage for images/GIFs

### Phase 3: Features (Weeks 5-8)
- [ ] Reference image library
- [ ] Real-time collaborative drawing
- [ ] Social sharing & galleries
- [ ] Achievement system

### Phase 4: ML Integration (Weeks 9-12)
- [ ] Pattern clustering dashboard
- [ ] Style similarity recommendations
- [ ] Export TensorFlow datasets
- [ ] Custom AI model training

---

## 🎨 Fun Applications

WayWay AI's technology enables many creative use cases beyond AI training:

1. **Handwriting to Font Generator** - Turn your handwriting into a TTF font
2. **Meditation Doodle Journal** - Track mental state through drawing patterns
3. **Kid Art Evolution Timeline** - Watch children's drawing skills develop
4. **Signature Verification Game** - Can you forge your own signature?
5. **Multiplayer Drawing Telephone** - Pictionary meets broken telephone

See [FUN_APPLICATIONS.md](FUN_APPLICATIONS.md) for detailed descriptions.

---

## 🛠️ Development

### Prerequisites
- Modern browser with Pointer Events API support
- Node.js 16+ (for GIF generation)
- Python 3.8+ (for ML clustering)

### Running Tests
```bash
# Currently no automated tests
# Manual testing checklist:
# ✓ Drawing with mouse works
# ✓ Drawing with touch works
# ✓ Drawing with stylus captures pressure
# ✓ Save/load from localStorage
# ✓ Export to Airtable
# ✓ GIF generation completes
```

### Code Style
- Use ES6+ features
- Prefer `const` over `let`
- Comment complex algorithms
- Keep functions under 50 lines

### Contributing
We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 API Documentation

### Airtable Schema (Current)

**Base:** `appXg4bgEEjffU0C4`
**Table:** `Images` / `Drawings`

**Fields:**
- `drawingId` (UUID)
- `artist` (String)
- `drawingData` (Long Text - compressed JSON)
- `imageURL` (URL)
- `createdAt` (Date)

**API Calls:**
```javascript
// Save drawing
airtable.create({
  drawingId: uuid(),
  artist: username,
  drawingData: compressedJSON,
  imageURL: referenceImageURL,
  createdAt: new Date()
});

// Retrieve drawings
airtable.select({
  filterByFormula: `{artist} = "${username}"`,
  sort: [{field: "createdAt", direction: "desc"}]
});
```

---

## 🔒 Security & Privacy

### Current Issues (Being Fixed)
- ⚠️ API key exposed in index.html (rotating soon)
- ⚠️ No user authentication
- ⚠️ No rate limiting

### Planned Improvements
- [ ] Environment variable for secrets
- [ ] OAuth authentication (Google, GitHub)
- [ ] Rate limiting (5 requests/second)
- [ ] CORS restrictions
- [ ] Encrypted data storage
- [ ] User consent for data usage

### Data Policy
- All drawing data is owned by the artist
- We never sell or share your data
- You can export or delete your data anytime
- Training models requires explicit opt-in

---

## 📈 Performance

### Benchmarks
- **Input Latency:** ~8-12ms (60fps target)
- **Stroke Data Size:** ~50KB per 1000 points (compressed)
- **GIF Generation:** ~5 seconds for 3000-point drawing
- **Browser Support:** Chrome 55+, Safari 13+, Firefox 59+

### Optimization Tips
- Use `desynchronized: true` in canvas context
- Debounce pointermove events to ~60fps
- Batch Airtable uploads (avoid rate limits)
- Use Web Workers for compression

---

## 🐛 Known Issues

1. **Safari pen pressure bug**
   Workaround: Use Chrome or Edge for best stylus support

2. **Large drawings crash on mobile**
   Limit: ~5000 points before performance degrades
   Solution: Implement chunking and progressive upload

3. **localStorage quota exceeded**
   Limit: ~5MB per origin
   Solution: Auto-clear old drawings, use IndexedDB

4. **GIF colors look washed out**
   Issue: 256-color palette limitation
   Solution: Use MP4 export instead

---

## 📚 Resources

### Documentation
- [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Airtable API](https://airtable.com/developers/web/api/introduction)

### Related Projects
- [Excalidraw](https://github.com/excalidraw/excalidraw) - Virtual whiteboard
- [tldraw](https://github.com/tldraw/tldraw) - Drawing SDK
- [Perfect Freehand](https://github.com/steveruizok/perfect-freehand) - Pressure-sensitive strokes

### Research Papers
- [QuickDraw Dataset](https://github.com/googlecreativelab/quickdraw-dataset)
- [SketchRNN](https://magenta.tensorflow.org/sketch-rnn)
- [Handwriting Recognition with RNNs](https://arxiv.org/abs/1308.0850)

---

## 📄 License

MIT License - see LICENSE file for details

Copyright (c) 2024 Bilal Ghalib

---

## 🙏 Acknowledgments

- Original concept by Cedric (2022)
- Pen.js & Board.js by [amoshydra](https://amoshydra.com)
- GIF generation using [gif-encoder-2](https://github.com/benjaminadk/gif-encoder-2)
- Inspired by Google's QuickDraw dataset

---

## 📞 Contact

- **Author:** Bilal Ghalib
- **Website:** [bilalghalib.com](https://bilalghalib.com)
- **Issues:** [GitHub Issues](https://github.com/bilalghalib/waywayai/issues)

---

**Built with ❤️ for artists who want to teach AI their unique style.**

*Last Updated: November 17, 2024*
