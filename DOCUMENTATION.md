# wayway.ai - AI Drawing Training Platform
## Technical Documentation

### **Purpose**
Internal tool to collect high-fidelity drawing data and train an LLM to replicate your personal drawing style.

---

## Current Architecture

### Data Collection
**Location**: `/drawwaywayOnline/index.html` + `/drawwaywayOnline/js/`

#### Captured Data Per Stroke Point:
```javascript
{
  x, y: coordinates
  clientX, clientY: screen coordinates
  pressure: pen pressure (0-1)
  tangentialPressure: stylus barrel rotation
  tiltX, tiltY: stylus tilt angles
  twist: stylus twist
  movementX, movementY: delta from last point
  timestamp: capture time
  pointerType: "pen" | "touch" | "mouse"
  width, height: contact geometry
}
```

#### Storage:
- **Raw stroke data** → Compressed with LZ-String → Airtable + `/alldrawingsjson/*.txt`
- **Rendered PNG** → `/alldrawingspng/*.png`
- **Reference photos** → `/allorigphotos/*.jpg`
- **Metadata** → Airtable (Artist, Image_Link, Drawing_URL)

---

### Current AI/ML Components

#### 1. **Stroke Clustering** (`makeGif/cluster.py` & `clusters.py`)
**Status**: Early prototype

**Features**:
- FFT (Fast Fourier Transform) analysis of stroke frequency patterns
- KMeans clustering by stroke similarity (length, direction)
- Visualization of clustered strokes

**Purpose**: Identify drawing "patterns" or "styles" in stroke data

**Gap**: Not connected to real-time feedback or training pipeline

#### 2. **GIF Generation** (`makeGif/makegif2.html`)
**Status**: Working

**Purpose**: Replay drawing process as animated GIF
**Gap**: No AI involved - just visualization

---

## Current Gaps for AI Training

| Component | Status | Gap |
|-----------|--------|-----|
| **Training Pipeline** | ❌ Missing | No model training infrastructure |
| **Model Architecture** | ❌ Missing | No drawing generation model |
| **Real-time Feedback** | ❌ Missing | No visualization of how AI learns |
| **Voice Annotation** | ❌ Missing | No audio capture during drawing |
| **Drawing Language Analysis** | ❌ Missing | No burst/rhythm detection |
| **Two-Panel Interface** | ❌ Missing | Reference photo not side-by-side |
| **iPad Optimization** | ⚠️ Partial | Works but not optimized |
| **Async Training Notification** | ❌ Missing | No email/notification system |

---

## Data Flow (Current)

```
User draws on iPad
  ↓
Pointer events captured with pressure/tilt/time
  ↓
Stored in allPoints array
  ↓
Compressed with LZ-String
  ↓
Uploaded to Airtable + file storage via PHP
  ↓
Reference photo stored alongside
  ↓
[NO TRAINING HAPPENS]
```

---

## Ideal Data Flow (Proposed)

```
User draws on iPad with voice annotation
  ↓
Capture: strokes + audio + reference photo
  ↓
Upload to training pipeline
  ↓
Trigger AI training job (async)
  ↓
Generate "before/after" comparison
  ↓
Email notification with:
  - What the AI learned
  - Sample drawing from AI
  - Training metrics
  ↓
View real-time visualization of AI improvement
```

---

## Technical Stack

### Current
- **Frontend**: Vanilla JS, HTML5 Canvas, jQuery
- **Pointer Input**: Pointer Events API + pep.js polyfill
- **Compression**: LZ-String
- **Storage**: Airtable API, PHP file uploads
- **GIF Generation**: Node.js/Express + Canvas + gif-encoder-2
- **Analysis**: Python (scikit-learn, numpy, matplotlib)

### Needed for AI
- **Model Framework**: TensorFlow.js / PyTorch / JAX
- **Training Infrastructure**: Python backend (FastAPI/Flask)
- **Voice Capture**: Web Audio API + MediaRecorder
- **Job Queue**: Redis + Celery or similar
- **Notification**: Email service (SendGrid/Mailgun)
- **Visualization**: D3.js / Plotly for training metrics

---

## File Structure

```
/drawwaywayOnline/
  index.html          # Main drawing interface
  /js/
    main.js           # Drawing logic & event handlers
    /libs/
      Pen.js          # Stroke data capture
      Board.js        # Canvas management
  upload4.php         # File upload handler

/makeGif/
  makegif2.html       # GIF replay
  cluster.py          # FFT stroke clustering
  clusters.py         # Stroke similarity clustering

/alldrawingsjson/     # Compressed stroke data
/alldrawingspng/      # Rendered drawings
/allorigphotos/       # Reference images
```

---

## Key Insights for AI Training

### "Drawing as Language"
Drawing strokes can be analyzed like natural language:

1. **Tokens** = Individual strokes or stroke segments
2. **Syntax** = Stroke order and relationships
3. **Rhythm** = Timing patterns (fast bursts vs slow deliberate)
4. **Vocabulary** = Recurring stroke patterns (curves, lines, hatching)
5. **Context** = Voice annotations ("drawing hair, spike spike spike")

### Multimodal Training
Combining:
- **Visual**: Reference photo input
- **Sequential**: Stroke data as time series
- **Physical**: Pressure/tilt as "style signature"
- **Linguistic**: Voice annotations as semantic context

This enables the AI to learn:
- **What** to draw (reference photo)
- **How** you draw it (stroke patterns)
- **Why** you make certain choices (voice context)

---

## Current Limitations

1. **No model exists** - Data is collected but never used for training
2. **No feedback loop** - Can't see what AI has learned
3. **Single-panel interface** - Reference photo overlays canvas (not side-by-side)
4. **No voice capture** - Missing contextual information
5. **No pattern analysis** - Can't identify "burst" vs "deliberate" drawing modes
6. **Offline clustering only** - Python scripts run manually, not integrated
7. **No streaming data processing** - Everything is batch

---

## Next Steps
See `ROADMAP.md` for phased implementation plan.
