# WayWay AI - Claude Context File

This file helps Claude (and other AI assistants) understand the WayWay AI codebase quickly.

---

## 🎯 Project Purpose

**WayWay AI** is an interactive drawing capture system designed to collect rich training data for teaching AI to draw in a user's unique style. Think of it as "show, don't tell" for AI art training.

### Core Problem Solved
- Artists want to contribute their style to AI training
- Existing AI art models lack artist consent and personalization
- No easy way to create high-quality drawing datasets

### Our Solution
- Browser-based canvas that captures complete stroke data (pressure, tilt, timing)
- Tracing interface for supervised learning (reference image → artist's interpretation)
- Replay system to visualize and export drawing process
- ML-ready dataset generation

---

## 📂 Codebase Map

### Critical Files (Touch These With Care)

1. **`drawwaywayOnline/js/libs/Pen.js`** (114 lines)
   - **Purpose:** Converts pointer events to pressure-sensitive strokes
   - **Gold algorithm:** `getLineWidth(event)` - maps device input to line width
   - **Don't change:** The pressure mapping logic (lines 58-97)
   - **Side effects:** Populates global `pointerArray` with stroke data

2. **`drawwaywayOnline/js/libs/Board.js`** (114 lines)
   - **Purpose:** Canvas management, memory buffering, localStorage persistence
   - **Gold algorithm:** `fitToWindow()` - responsive canvas sizing with 2x resolution
   - **Don't change:** Double-buffering logic (lines 76-98)
   - **Side effects:** Writes to `localStorage.dataURL`

3. **`drawwaywayOnline/js/libs/Pointer.js`**
   - **Purpose:** Multi-touch input handling
   - **Integration:** Works with Pen.js and Board.js

4. **`makeGif/makeGif.js`** (112 lines)
   - **Purpose:** Replays drawing from JSON data and exports as GIF
   - **Input:** Reads from `drawme.txt` (drawing JSON)
   - **Output:** Generates `output/beginner.gif`
   - **Algorithm:** Draws every point, captures frame every 20 points

5. **`makeGif/cluster.py`**
   - **Purpose:** ML clustering of stroke patterns using FFT
   - **Libraries:** scikit-learn, NumPy
   - **Use case:** Pattern recognition for similar drawing styles

### Supporting Files

- **`drawwaywayOnline/index.html`** - Main app entry point (has inline JS - needs refactoring)
- **`drawwaywayOnline/js/main.js`** - App initialization and event binding
- **`drawwaywayOnline/js/airtable.browser.js`** - Airtable SDK
- **`drawwaywayOnline/js/upload.js`** - Data export logic
- **`drawwaywayOnline/upload*.php`** - Server-side upload handlers

### Documentation

- **`README.md`** - User-facing documentation
- **`STRATEGY.md`** - Product roadmap (Values → Affordances → DB/UX → Code)
- **`FUN_APPLICATIONS.md`** - Creative use cases
- **`claude.md`** - This file

### Data Directories (gitignored)

- **`data/drawings/`** - Saved drawing sessions (JSON)
- **`data/exports/`** - Generated GIFs
- **`data/references/`** - Reference images for tracing

### Archive

- **`_ARCHIVE_OLD_CODE/`** - 291MB of legacy code, multiple versions, old data
  - **Do not modify** unless explicitly needed
  - Contains: Retracing/, drawProj/, files/, work_8_31/, etc.

---

## 🧠 Key Concepts

### 1. Stroke Data Structure

Every pointer event is captured with 20+ attributes:

```javascript
{
  x, y,                    // Absolute position
  clientX, clientY,        // Viewport position
  offsetX, offsetY,        // Canvas-relative position
  pageX, pageY,            // Document position
  pressure,                // 0.0 to 1.0 (critical for AI training)
  tangentialPressure,
  tiltX, tiltY,            // Pen angles in degrees
  twist,                   // Pen rotation
  altitudeAngle,           // Pen altitude in radians
  azimuthAngle,            // Pen azimuth in radians
  width, height,           // Touch contact size
  timeStamp,               // Milliseconds since page load
  movementX, movementY     // Delta from last point
}
```

**Why so much data?**
- AI needs to learn *how* you draw, not just *what* you draw
- Pressure → expressiveness
- Tilt → brush orientation
- Timing → drawing rhythm and confidence

### 2. Global State (Needs Refactoring)

**Current approach:** Global variables
```javascript
var pointerArray = new Array();  // In Pen.js
var ev = {};                      // In Pen.js
```

**Problem:** Hard to test, prone to bugs, not scalable

**Future approach:** React + Zustand state management
```typescript
interface DrawingState {
  strokes: Stroke[];
  currentStroke: StrokePoint[];
  isDrawing: boolean;
  tool: 'pen' | 'eraser';
}
```

### 3. Drawing Lifecycle

```
User Input (pointer event)
  ↓
Pen.setFuncType(event)           // Determine: draw, erase, or menu
  ↓
Pen.setPen(context, event)       // Set line width based on pressure
  ↓
Board.getPointerPos(event)       // Convert to canvas coordinates
  ↓
Draw stroke segment on canvas
  ↓
Capture event data → pointerArray
  ↓
On pointer up → Board.storeMemory()  // Save to localStorage
  ↓
On "Save" button → Compress & upload to Airtable
```

### 4. Pressure-to-Width Mapping (The Magic)

This is the secret sauce of natural-looking strokes:

```javascript
function getLineWidth(event) {
  switch (event.pointerType) {
    case 'touch':
      // Small touches (stylus tips)
      if (event.width < 10 && event.height < 10) {
        return (event.width + event.height) * 2 + 1;
      }
      // Large touches (fingers)
      else {
        return (event.width + event.height - 40) / 5;
      }

    case 'pen':
      // Stylus pressure (Apple Pencil, Wacom)
      return event.pressure * 8;

    default:
      // Mouse fallback
      return event.pressure ? event.pressure * 8 : 4;
  }
}
```

**Why different formulas?**
- Touch devices report contact area (width/height), not pressure
- Styluses report true pressure values
- Mice have no pressure (constant width)

### 5. Canvas Double-Buffering

Why we need two canvases:

```javascript
this.dom = document.getElementById('canvas');      // Visible canvas
this.domMem = document.createElement('canvas');   // Memory canvas (invisible)
```

**Benefits:**
1. Resize without losing drawing (copy from memory before resize)
2. Smooth rendering (draw to memory, then blit to screen)
3. localStorage persistence (save memory canvas as Base64)

---

## 🔧 Common Tasks

### Task: Add a New Drawing Tool

1. **Modify `Pen.js`**
   ```javascript
   funcTypes: {
     draw: 'draw',
     erase: 'draw erase',
     menu: 'menu',
     highlighter: 'draw highlighter'  // NEW
   }
   ```

2. **Add tool-specific settings**
   ```javascript
   case this.funcTypes.highlighter: {
     this.set(context, {
       color: 'rgba(255, 255, 0, 0.5)',  // Semi-transparent yellow
       lineWidth: 20
     });
     break;
   }
   ```

3. **Update UI** (in `index.html` or future React component)
   ```html
   <button id="highlighter-btn">Highlighter</button>
   ```

### Task: Export Drawing as JSON

```javascript
// Compress stroke data
const strokes = pointerArray.map(point => ({ ev: point }));
const compressed = LZString.compressToBase64(JSON.stringify(strokes));

// Create download link
const blob = new Blob([compressed], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `drawing-${Date.now()}.json`;
a.click();
```

### Task: Generate GIF from Drawing

```bash
cd makeGif

# 1. Save drawing JSON to drawme.txt
echo '[{"ev": {...}}, ...]' > drawme.txt

# 2. Run GIF generator
node makeGif.js

# 3. Output appears in output/beginner.gif
```

**Customize GIF:**
```javascript
// In makeGif.js
encoder.setFrameRate(200);        // Frames per second
if (location % 20 === 0) {         // Add frame every N points
  encoder.addFrame(ctx);
}
```

### Task: Change Canvas Resolution

```javascript
// In Board.js
var boardObject = {
  resolution: 2,  // Change to 3 for even higher quality (slower)
  // ...
}
```

**Trade-offs:**
- `resolution: 1` - Fast, looks pixelated on HiDPI screens
- `resolution: 2` - Default, good balance
- `resolution: 3` - Highest quality, may lag on mobile

### Task: Add Authentication

**Current state:** No auth (anyone can save to Airtable)

**Recommended approach:**
1. Use Clerk or Auth0 for OAuth
2. Gate save functionality behind login
3. Associate drawings with user ID

```javascript
// Pseudo-code
if (!user.isAuthenticated) {
  alert('Please log in to save drawings');
  return;
}

airtable.create({
  userId: user.id,      // NEW
  username: user.name,  // NEW
  drawingData: compressed,
  // ...
});
```

---

## ⚠️ Known Issues & Gotchas

### 1. Airtable API Key Exposed
**Location:** `drawwaywayOnline/index.html` (inline script)
**Risk:** Anyone can read/write our database
**Fix:**
- Move to environment variable
- Use backend proxy for Airtable requests
- Rotate the key

### 2. jQuery Dependency (Outdated)
**Version:** 1.12.2 (from 2016)
**Problem:** Security vulnerabilities, heavy bundle size
**Fix:** Replace with vanilla JS or modern framework

### 3. Inline JavaScript in HTML
**Location:** `drawwaywayOnline/index.html` has 600+ lines of JS
**Problem:** Hard to maintain, no minification, no modules
**Fix:** Extract to separate files, use ES6 modules

### 4. Global Variable Pollution
**Variables:** `pointerArray`, `ev`, `airtable`, `base`
**Problem:** Name collisions, hard to debug, not testable
**Fix:** Use modules or immediately-invoked function expressions (IIFE)

### 5. No Error Handling
**Example:** Upload failures just use `alert()`
**Problem:** Users lose data if network fails
**Fix:**
- Retry logic with exponential backoff
- Queue failed uploads
- Show user-friendly error messages

### 6. Safari Stylus Bug
**Issue:** `event.pressure` always returns 0.5 on Safari
**Workaround:** Use Chrome or Edge for stylus support
**Tracking:** WebKit bug #12345 (hypothetical)

### 7. Mobile Performance
**Issue:** Canvas gets slow after ~5000 stroke points
**Cause:** Too many draw calls, no batching
**Fix:**
- Implement stroke simplification (Douglas-Peucker algorithm)
- Use OffscreenCanvas for background processing
- Chunk long drawings into multiple canvases

---

## 🚀 Modernization Roadmap

### Phase 1: Cleanup (Low Risk)
- [ ] Extract inline JS from HTML
- [ ] Create proper directory structure (`src/`, `dist/`)
- [ ] Add `.gitignore` for node_modules, .env
- [ ] Set up package.json with build scripts

### Phase 2: Modularization (Medium Risk)
- [ ] Convert Pen.js to ES6 module
- [ ] Convert Board.js to ES6 module
- [ ] Replace jQuery with vanilla JS
- [ ] Add TypeScript types

### Phase 3: Framework Migration (High Risk)
- [ ] Set up React + Vite
- [ ] Port Pen.js → `usePenEngine.ts` hook
- [ ] Port Board.js → `<DrawingBoard>` component
- [ ] State management with Zustand
- [ ] Test thoroughly (pressure sensitivity must work!)

### Phase 4: Backend (New Development)
- [ ] Node.js + Express API
- [ ] PostgreSQL migration (from Airtable)
- [ ] S3 for image storage
- [ ] Authentication
- [ ] WebSocket for real-time collaboration

---

## 🧪 Testing Strategy

### Manual Tests (Current)
Before any commit, test:
1. ✓ Drawing with mouse produces strokes
2. ✓ Drawing with touch produces variable-width strokes
3. ✓ Drawing with stylus captures pressure (Chrome only)
4. ✓ Clear button works
5. ✓ Save to localStorage works
6. ✓ Page refresh restores drawing
7. ✓ Upload to Airtable succeeds
8. ✓ GIF generation completes without errors

### Automated Tests (Future)
```typescript
// Example test
describe('PenEngine', () => {
  it('should map pen pressure to line width', () => {
    const event = { pointerType: 'pen', pressure: 0.5 };
    expect(getLineWidth(event)).toBe(4);  // 0.5 * 8 = 4
  });

  it('should handle touch input', () => {
    const event = {
      pointerType: 'touch',
      width: 5,
      height: 5
    };
    expect(getLineWidth(event)).toBe(21);  // (5+5)*2+1 = 21
  });
});
```

---

## 📚 Learning Resources

### For Understanding This Codebase
1. **Pointer Events API** - https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
2. **Canvas API Basics** - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial
3. **Pressure-Sensitive Drawing** - https://pressurejs.com/

### For AI Training with This Data
1. **QuickDraw Dataset** - Google's 50M drawings: https://quickdraw.withgoogle.com/data
2. **SketchRNN** - Generating sketches with RNNs: https://magenta.tensorflow.org/sketch-rnn
3. **Handwriting Synthesis** - http://www.cs.toronto.edu/~graves/handwriting.html

### For Feature Ideas
- Excalidraw source code: https://github.com/excalidraw/excalidraw
- tldraw drawing SDK: https://github.com/tldraw/tldraw
- Perfect Freehand algorithm: https://github.com/steveruizok/perfect-freehand

---

## 💬 Common Questions

**Q: Why capture so much stroke data? Isn't x,y enough?**
A: AI needs to learn *how* you draw, not just *what* you draw. Pressure, tilt, and timing are signature elements of artistic style.

**Q: Why use Airtable instead of a real database?**
A: Quick prototyping. Airtable has a GUI, easy API, no server setup. But we're migrating to PostgreSQL for scale.

**Q: Why vanilla JS instead of React?**
A: This started as a quick prototype in 2022. We're planning a React rewrite (see STRATEGY.md).

**Q: Can I use this for handwriting recognition?**
A: Yes! The stroke data is perfect for training handwriting models. See FUN_APPLICATIONS.md for the "Handwriting to Font" idea.

**Q: How do I add a new reference image?**
A: Currently manual (upload to Airtable). Future: we'll build a reference library UI.

**Q: Why is the GIF generation so slow?**
A: Node's `canvas` library does CPU-based rendering. We could optimize with GPU-accelerated encoding or use WebCodecs API.

**Q: How do I clear my localStorage?**
A: Open DevTools → Application → Local Storage → Delete "dataURL" key. Or use the Clear button in the app.

---

## 🎨 Code Style Guide

### Current Style (Legacy)
- ES5 with some ES6
- IIFE modules: `var Pen = (function() { ... })();`
- jQuery for DOM manipulation
- `var` instead of `const`/`let`

### Future Style (Modern)
```typescript
// Use TypeScript
interface StrokePoint { ... }

// Named exports
export function getLineWidth(event: PointerEvent): number { ... }

// React functional components
export function DrawingBoard({ width, height }: Props) { ... }

// Hooks for reusable logic
export function usePenEngine() { ... }
```

### Naming Conventions
- **Components:** PascalCase (`DrawingBoard.tsx`)
- **Functions:** camelCase (`getLineWidth`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_STROKE_POINTS`)
- **Files:** kebab-case (`pen-engine.ts`) or PascalCase (`PenEngine.ts` for classes)

---

## 🛠️ Development Commands

```bash
# Serve frontend locally
cd drawwaywayOnline
python3 -m http.server 8000
# Open http://localhost:8000

# Install GIF generator dependencies
cd makeGif
npm install

# Generate GIF from drawing data
node makeGif.js

# Run Python clustering
cd makeGif
pip install -r requirements.txt  # (if we add this file)
python cluster.py

# Future: React development
npm run dev           # Start Vite dev server
npm run build         # Production build
npm run test          # Run tests
```

---

## 🐛 Debugging Tips

### Canvas Not Rendering?
1. Check `console.log` in Board.init()
2. Verify canvas element exists: `document.getElementById('canvas')`
3. Check CSS: canvas must be visible (not `display: none`)
4. Check context: `Board.ctx` should not be null

### Pressure Not Working?
1. Use Chrome or Edge (Safari has bugs)
2. Check `event.pointerType` in console (should be "pen", not "mouse")
3. Verify hardware: iPad + Apple Pencil, Wacom tablet, etc.
4. Test with: `canvas.addEventListener('pointermove', e => console.log(e.pressure))`

### GIF Generation Fails?
1. Check `drawme.txt` has valid JSON
2. Verify Node.js version: `node --version` (need 16+)
3. Check canvas module: `npm list canvas`
4. Look for errors in console (file permissions, out of memory)

### Data Not Saving to Airtable?
1. Check network tab for 401/403 errors (API key issue)
2. Verify Airtable base ID and table name
3. Check CORS (Airtable should allow browser requests)
4. Rate limiting: Max 5 requests/second

---

## 📞 Getting Help

**For Claude (or other AI assistants):**
- Read this file first (claude.md)
- Check STRATEGY.md for high-level architecture
- Review README.md for user-facing features
- Look at actual code only when necessary
- Ask clarifying questions before making changes

**For Human Developers:**
- Check GitHub Issues
- Read inline code comments
- Review git history: `git log --oneline`
- Contact: bilalghalib.com

---

## 🔮 Vision

**Short-term:** Clean, modern codebase with great DX (developer experience)

**Medium-term:** Collaborative drawing platform with 10k+ artists contributing training data

**Long-term:** Open-source standard for artistic AI training data, enabling personalized AI art models

**Dream:** Every artist can train an AI to draw in their unique style, democratizing AI art creation.

---

**Last Updated:** November 17, 2024
**Codebase Status:** Post-cleanup, ready for modernization
**Active Development Branch:** `main`

---

**Remember:** The core value is in Pen.js and Board.js. Preserve the pressure-sensitive stroke algorithm while modernizing everything around it.
