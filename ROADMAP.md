# wayway.ai AI Training Roadmap
## From Data Collection to Intelligent Drawing Partner

---

## Core Vision
**Transform wayway.ai from a passive data collector into an active AI training platform that:**
1. Learns your unique drawing style in real-time
2. Provides immediate feedback on what it's learning
3. Generates drawings in your style from imagination or reference
4. Understands drawing as a "language" with rhythm, vocabulary, and context

---

## Phase 1: Enhanced Data Collection (1-2 weeks)
### **Goal**: Optimize iPad workflow & add voice annotations

### 1.1 Two-Panel Drawing Interface
**Why**: Currently reference photo overlays canvas (opacity 0.25). Hard to see both clearly.

**Implementation**:
```html
<!-- New layout -->
<div class="container">
  <div class="reference-panel">
    <img id="photoToDraw" />
  </div>
  <div class="drawing-panel">
    <canvas id="board" />
  </div>
</div>

<!-- OR: Toggle mode -->
<button onclick="toggleOverlay()">
  Switch: Side-by-Side ↔ Overlay
</button>
```

**Features**:
- Split screen: Reference (left) | Canvas (right)
- Responsive sizing for iPad
- Optional: Transparent overlay mode (current behavior)
- Adjustable split ratio (30/70, 50/50, etc.)

**Files to modify**:
- `drawwaywayOnline/index.html` (lines 85-104)
- New CSS in `<style>` section
- `drawwaywayOnline/js/main.js` (Board sizing logic)

---

### 1.2 Voice Annotation Capture
**Why**: Add semantic context - "drawing hair, spiky, spike spike" helps AI understand intent

**Implementation**:
```javascript
// Start recording when drawing starts
let mediaRecorder;
let audioChunks = [];

async function startVoiceCapture() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
    // Real-time transcription (optional)
    transcribeChunk(event.data);
  };

  mediaRecorder.start(1000); // Capture every 1s
}

// Stop when upload
function stopVoiceCapture() {
  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      resolve(audioBlob);
    };
    mediaRecorder.stop();
  });
}
```

**Storage**:
- Upload audio file alongside drawing
- Optional: Real-time transcription using Web Speech API or Whisper API
- Store: `{ timestamp, text, audioURL }` synced with strokes

**UI**:
- Microphone button: "🎤 Start Narrating"
- Visual indicator when recording
- Playback during replay

**Files to add**:
- `drawwaywayOnline/js/libs/VoiceCapture.js`
- Update `upload4.php` to handle audio upload
- Add audio column to Airtable

---

### 1.3 Drawing "Language" Analysis
**Why**: Detect bursts vs. deliberate strokes, identify drawing vocabulary

**Real-time Features to Track**:
```javascript
// Analyze stroke tempo
function analyzeStrokeTempo(strokePoints) {
  const timings = strokePoints.map((p, i) => {
    if (i === 0) return 0;
    return p.timestamp - strokePoints[i-1].timestamp;
  });

  const avgSpeed = timings.reduce((a,b) => a+b) / timings.length;

  return {
    mode: avgSpeed < 50 ? 'burst' : 'deliberate',
    avgSpeed,
    acceleration: calculateAcceleration(timings),
    rhythm: detectRhythm(timings)
  };
}

// Detect stroke types
function classifyStroke(points) {
  const length = calculateLength(points);
  const curvature = calculateCurvature(points);
  const pressureVar = varianceOf(points.map(p => p.pressure));

  return {
    type: categorizeStroke(length, curvature), // 'line', 'curve', 'circle', 'hatch'
    confidence: pressureVar, // low variance = confident
    energy: length / duration(points) // fast = high energy
  };
}
```

**Vocabulary Building**:
- Group similar strokes using existing cluster.py FFT logic
- Build a "stroke dictionary" per user
- Tag common patterns: "your signature curve", "your hatching style"

**Integration**:
- Run analysis client-side before upload
- Include analysis in `allPoints` data structure
- Visualize in replay: color-code by tempo/type

**Files to add**:
- `drawwaywayOnline/js/libs/StrokeAnalyzer.js`
- `drawwaywayOnline/js/libs/VocabularyBuilder.js`

---

## Phase 2: AI Training Pipeline (2-3 weeks)
### **Goal**: Actually train a model on your drawing data

### 2.1 Model Architecture Selection
**Options**:

#### Option A: Transformer-based (Recommended)
**Why**: Treats drawing as sequence, learns relationships between strokes

```python
# Pseudocode
class DrawingTransformer:
    def __init__(self):
        self.stroke_encoder = TransformerEncoder(
            input_dim=12,  # x, y, pressure, tilt, etc.
            hidden_dim=256,
            num_layers=6
        )
        self.image_encoder = VisionTransformer()  # Encode reference photo
        self.decoder = TransformerDecoder()  # Generate stroke sequence

    def forward(self, reference_image, context_text=None):
        img_features = self.image_encoder(reference_image)
        if context_text:
            text_features = self.text_encoder(context_text)  # Voice annotation
            img_features = fuse(img_features, text_features)

        # Generate strokes autoregressively
        strokes = self.decoder(img_features)
        return strokes
```

**Training**:
- Input: Reference photo + voice transcript
- Output: Predicted stroke sequence
- Loss: MSE on stroke parameters + perceptual loss on rendered image

#### Option B: Diffusion Model
**Why**: Generate images directly, then vectorize

- Use ControlNet-style conditioning
- Fine-tune Stable Diffusion on your drawings
- Convert output back to strokes (vectorization)

#### Option C: SketchRNN-style VAE
**Why**: Google's Quick, Draw! approach - proven for sketch generation

```python
class SketchVAE:
    # Encode strokes to latent space
    # Decode latent + reference photo -> new strokes
    # Learn "style vector" that represents your drawing habits
```

**Recommendation**: Start with **Option A (Transformer)** - most flexible for multimodal input

---

### 2.2 Training Infrastructure
**Backend** (`/ai_backend/`):

```python
# FastAPI server
from fastapi import FastAPI, BackgroundTasks
from training import train_model, generate_sample
from database import get_all_drawings

app = FastAPI()

@app.post("/train")
async def trigger_training(background_tasks: BackgroundTasks):
    """Trigger async training job"""
    job_id = generate_job_id()
    background_tasks.add_task(run_training_job, job_id)
    return {"job_id": job_id, "status": "queued"}

async def run_training_job(job_id):
    # Load all drawing data
    data = load_training_data()

    # Train model
    model, metrics = train_model(data)

    # Generate comparison
    before_sample = generate_sample(old_model, test_image)
    after_sample = generate_sample(model, test_image)

    # Save results
    save_model(model)
    send_notification_email(job_id, metrics, before_sample, after_sample)

@app.get("/model/generate")
async def generate_drawing(image_url: str, prompt: str = None):
    """Generate a drawing in your style"""
    model = load_latest_model()
    reference = load_image(image_url)
    strokes = model.generate(reference, context=prompt)
    return {"strokes": strokes, "preview_url": render_preview(strokes)}
```

**Data Loader**:
```python
def load_training_data():
    """Load all drawings from Airtable + files"""
    drawings = []
    for record in airtable.all():
        stroke_data = decompress_drawing(record['drawing_text_url'])
        reference_img = load_image(record['image_url'])
        voice_transcript = record.get('voice_transcript', '')

        drawings.append({
            'strokes': parse_strokes(stroke_data),
            'reference': reference_img,
            'context': voice_transcript,
            'metadata': extract_stroke_analysis(stroke_data)
        })
    return drawings
```

**Training Loop**:
```python
def train_model(data, epochs=100):
    model = DrawingTransformer()
    optimizer = Adam(model.parameters())

    metrics = []
    for epoch in range(epochs):
        for batch in dataloader(data):
            # Forward pass
            predicted_strokes = model(
                batch['reference'],
                batch['context']
            )

            # Loss: stroke accuracy + rendered image similarity
            loss = (
                mse_loss(predicted_strokes, batch['strokes']) +
                perceptual_loss(
                    render(predicted_strokes),
                    render(batch['strokes'])
                )
            )

            # Backward
            loss.backward()
            optimizer.step()

        # Track metrics
        metrics.append({
            'epoch': epoch,
            'loss': loss.item(),
            'stroke_accuracy': evaluate_strokes(model),
            'image_similarity': evaluate_images(model)
        })

    return model, metrics
```

---

### 2.3 Email Notification System
**When**: Training completes (could take hours for large models)

```python
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_notification_email(job_id, metrics, before_img, after_img):
    message = Mail(
        from_email='wayway@ai.training',
        to_emails='your@email.com',
        subject=f'✨ AI Training Complete - Job {job_id}',
        html_content=f'''
        <h2>Your AI Drawing Model Just Got Smarter!</h2>

        <h3>Training Summary</h3>
        <ul>
            <li>Drawings processed: {metrics['total_drawings']}</li>
            <li>Final loss: {metrics['final_loss']:.4f}</li>
            <li>Improvement: {metrics['improvement_pct']:.1f}%</li>
        </ul>

        <h3>What Changed:</h3>
        <img src="{before_img}" alt="Before" width="300"/>
        <img src="{after_img}" alt="After" width="300"/>

        <p><a href="https://draw.wayway.ai/model/view?job={job_id}">
            View Full Training Report →
        </a></p>

        <h3>Try It Out:</h3>
        <p><a href="https://draw.wayway.ai/generate">
            Generate a new drawing in your style
        </a></p>
        '''
    )

    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    sg.send(message)
```

---

## Phase 3: Real-Time Feedback (1-2 weeks)
### **Goal**: See what AI learned immediately after drawing

### 3.1 Instant Training Visualization
**After each drawing upload**:

```javascript
// In saveDynamicDataToFile() after successful upload
$.ajax({
    type: "POST",
    url: "https://ai-backend.wayway.ai/quick-train",
    data: {
        drawing_id: record.getId(),
        strokes: allPoints,
        reference: photoURL
    },
    success: function(response) {
        showTrainingFeedback(response);
    }
});

function showTrainingFeedback(response) {
    // Show modal with:
    // 1. What patterns the AI noticed
    // 2. Updated "style signature"
    // 3. Quick comparison: "AI's attempt" vs "your drawing"

    const modal = `
        <div class="training-feedback">
            <h3>AI Noticed:</h3>
            <ul>
                ${response.patterns.map(p =>
                    `<li>${p.description} (confidence: ${p.confidence}%)</li>`
                ).join('')}
            </ul>

            <h3>Your Style Signature Updated:</h3>
            <canvas id="style-viz"></canvas>

            <h3>AI's Attempt at This Drawing:</h3>
            <img src="${response.ai_generation_url}" />

            <p>Model trained on ${response.total_drawings} drawings</p>
        </div>
    `;

    showModal(modal);
}
```

**Quick Training**:
- Don't retrain entire model (too slow)
- Use **online learning** or **fine-tuning** on last N drawings
- Or: Update "style embedding" using the new drawing

---

### 3.2 Training Dashboard
**New page**: `/training-dashboard.html`

**Features**:
```javascript
// Real-time metrics
<div class="dashboard">
    <!-- Training progress -->
    <div class="metric-card">
        <h3>Model Performance</h3>
        <LineChart data={trainingLossOverTime} />
        <p>Current loss: {currentLoss}</p>
    </div>

    <!-- Style evolution -->
    <div class="metric-card">
        <h3>Your Style Evolution</h3>
        <Timeline>
            {drawings.map(d => (
                <TimelinePoint
                    date={d.date}
                    preview={d.thumbnail}
                    patterns={d.detected_patterns}
                />
            ))}
        </Timeline>
    </div>

    <!-- Stroke vocabulary -->
    <div class="metric-card">
        <h3>Your Drawing Vocabulary</h3>
        <StrokeGallery>
            {clusters.map(cluster => (
                <ClusterCard
                    type={cluster.name}  // "confident curves", "sketchy lines"
                    examples={cluster.examples}
                    frequency={cluster.frequency}
                />
            ))}
        </StrokeGallery>
    </div>

    <!-- AI generations -->
    <div class="metric-card">
        <h3>What AI Thinks You'd Draw</h3>
        <Gallery>
            {generations.map(gen => (
                <ComparisonCard
                    reference={gen.reference_photo}
                    ai_version={gen.ai_drawing}
                    your_version={gen.your_drawing}
                    similarity={gen.similarity_score}
                />
            ))}
        </Gallery>
    </div>
</div>
```

**Data Source**:
- `/api/training-status` - Live training metrics
- `/api/style-analysis` - Stroke patterns and clusters
- `/api/generations` - AI-generated drawings

---

### 3.3 Live Pattern Detection
**During drawing** (not just after):

```javascript
// Add to pointerMove handler
function pointerMove(e) {
    // ... existing drawing code ...

    // Real-time pattern detection
    if (currentStroke.length > 10) {
        const pattern = detectPattern(currentStroke);
        if (pattern.confidence > 0.8) {
            showPatternHint(pattern);
        }
    }
}

function showPatternHint(pattern) {
    // Subtle UI indicator
    // "AI recognizes: confident curve"
    // "Similar to your drawing from yesterday"
}
```

---

## Phase 4: AI Drawing Generation (2-3 weeks)
### **Goal**: AI can draw like you from imagination or reference

### 4.1 Generation Interface
**New page**: `/generate.html`

```html
<div class="generate-interface">
    <h2>Generate Drawing in Your Style</h2>

    <!-- Option 1: From reference photo -->
    <div class="mode">
        <h3>From Reference Photo</h3>
        <input type="url" placeholder="Photo URL" id="ref-photo">
        <textarea placeholder="Optional: What are you trying to draw?"></textarea>
        <button onclick="generateFromPhoto()">Generate →</button>
    </div>

    <!-- Option 2: From imagination -->
    <div class="mode">
        <h3>From Imagination</h3>
        <textarea placeholder="Describe what to draw...">
            A portrait of a person with spiky hair
        </textarea>
        <button onclick="generateFromPrompt()">Generate →</button>
    </div>

    <!-- Output -->
    <div class="output">
        <canvas id="ai-drawing"></canvas>
        <button onclick="downloadStrokes()">Download Strokes</button>
        <button onclick="replayAnimation()">Watch Process</button>
        <button onclick="continueFinetuning()">Use as Training Data</button>
    </div>
</div>
```

**Generation API**:
```javascript
async function generateFromPhoto() {
    const photoURL = document.getElementById('ref-photo').value;
    const context = document.getElementById('context').value;

    showLoadingSpinner("AI is drawing...");

    const response = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
            reference_photo: photoURL,
            context: context,
            temperature: 0.7  // creativity slider
        })
    });

    const { strokes, metadata } = await response.json();

    // Render stroke-by-stroke (animated)
    animateStrokes(strokes, {
        speed: metadata.estimated_drawing_speed,
        pressure_variation: metadata.pressure_profile
    });
}

function animateStrokes(strokes, style) {
    // Replay like the GIF tool, but with AI-generated strokes
    // Apply your pressure/speed patterns
    let t = 0;
    strokes.forEach((stroke, i) => {
        setTimeout(() => {
            drawStroke(stroke, style);
        }, t);
        t += stroke.duration * style.speed;
    });
}
```

---

### 4.2 Imagination Mode
**Most exciting**: AI draws from text descriptions

**Requires**:
- Text-to-image model (CLIP or similar) to generate reference
- Your drawing model conditioned on that reference
- Voice-trained context understanding

**Flow**:
```
User: "Draw a portrait with spiky hair"
  ↓
Generate reference image (DALL-E/SD)
  ↓
Your model draws it in your style
  ↓
Animated stroke-by-stroke output
```

**Advanced**: Remember voice patterns
- If you said "spike spike spike" while drawing hair before
- AI learns to associate that rhythm with spiky textures

---

### 4.3 Interactive Refinement
**User corrects AI drawing**:

```html
<button onclick="enableCorrection()">Refine This Drawing</button>

<!-- User redraws parts they don't like -->
<!-- AI learns from the correction -->
```

**Reinforcement learning**:
- User corrections are reward signal
- Fine-tune model to prefer user-corrected versions
- Active learning: AI asks for feedback on uncertain areas

---

## Phase 5: Advanced Features (3-4 weeks)
### **Goal**: Full creative AI partnership

### 5.1 Style Transfer
**Apply your drawing style to any image**:

```javascript
// Upload photo -> Get it drawn in your style
fetch('/api/stylize', {
    method: 'POST',
    body: { image_url: photo, style: 'your_trained_model' }
})
```

### 5.2 Collaborative Drawing
**AI suggests next strokes**:

```javascript
// While you're drawing
const suggestions = await fetch('/api/suggest-next-stroke', {
    method: 'POST',
    body: { current_strokes: allPoints }
});

// Show ghost strokes as suggestions
drawGhostStrokes(suggestions.predicted_next_strokes);
```

### 5.3 Multi-Style Models
**Train different models for different purposes**:
- "Quick sketches" model (burst strokes, low pressure variance)
- "Detailed portraits" model (slow, deliberate, high precision)
- "Abstract" model (experimentation, high energy)

**Auto-detect mode**:
- Analyze first few strokes
- Switch to appropriate model automatically

### 5.4 Community (Optional)
**Share trained models**:
- "Draw like Picasso" (trained on Picasso drawings)
- "Draw like User123" (if they share their model)

---

## Technical Architecture (Full System)

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (iPad)                         │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Drawing Canvas  │  │ Voice Input  │  │ Pattern Viz   │ │
│  │ (Two-panel)     │  │ (Real-time)  │  │ (Live hints)  │ │
│  └─────────────────┘  └──────────────┘  └───────────────┘ │
│           ↓                   ↓                   ↓         │
└───────────┼───────────────────┼───────────────────┼─────────┘
            │                   │                   │
            ↓                   ↓                   ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATA COLLECTION API                       │
│  POST /upload - Strokes + Audio + Reference                │
│  GET  /analyze - Real-time stroke analysis                 │
└───────────────────────────────────────┬─────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA STORAGE                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Airtable   │  │  File Store │  │  Vector DB       │   │
│  │  (Metadata) │  │  (Strokes)  │  │  (Embeddings)    │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└───────────────────────────────────────┬─────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  AI TRAINING PIPELINE                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Loader → Preprocessor → Model → Trainer       │  │
│  │     ↓              ↓             ↓         ↓         │  │
│  │  Parse all     Normalize    Transformer   Adam      │  │
│  │  drawings      strokes       Encoder      Loss      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Evaluation → Comparison Gen → Email Notification   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────┬─────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   GENERATION API                            │
│  POST /generate - Create drawing from reference/prompt     │
│  GET  /status   - Training progress                        │
│  GET  /models   - List available models                    │
└───────────────────────────────────────┬─────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  VISUALIZATION FRONTEND                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Dashboard  │  │  Generation  │  │  Style Analysis  │  │
│  │  (Metrics)  │  │  Interface   │  │  (Vocabulary)    │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Immediate (Phase 1) - Start Now:
1. ✅ **Two-panel interface** - Easy UX win
2. ✅ **Voice capture** - Critical for multimodal training
3. ✅ **Stroke analysis** - Foundation for "drawing language"

### Short-term (Phase 2) - Next 2 weeks:
4. **Training pipeline** - The core value prop
5. **Email notifications** - Async feedback loop
6. **Basic generation** - Proof of concept

### Medium-term (Phase 3-4) - Next month:
7. **Real-time visualization** - Engaging feedback
8. **Generation interface** - Use the trained model
9. **Imagination mode** - Most magical feature

### Long-term (Phase 5) - Future:
10. **Style transfer** - Advanced applications
11. **Collaborative drawing** - AI as partner
12. **Community features** - Optional sharing

---

## Success Metrics

### Data Quality:
- ✅ Pressure/tilt captured accurately
- ✅ Voice synced with strokes (±100ms)
- ✅ Reference photos stored with drawings

### Model Performance:
- 🎯 Stroke prediction accuracy > 85%
- 🎯 Generated drawings recognizable as "your style" (subjective)
- 🎯 Training time < 2 hours on M1/M2 Mac

### User Experience:
- 🎯 Upload → Feedback < 30 seconds (quick train)
- 🎯 Full training → Email < 4 hours
- 🎯 Drawing generation < 10 seconds

### Creative Value:
- 🎯 AI generates drawings you'd be proud to share
- 🎯 Learns new patterns within 5-10 examples
- 🎯 Imagination mode produces coherent drawings

---

## Next Steps - Let's Build!

**What do you want to start with?**

Option A: **Phase 1 Implementation** (Two-panel + Voice)
- Fast, tangible improvements
- Better data for future training
- I can implement today

Option B: **Phase 2 Setup** (Training pipeline architecture)
- Design model architecture
- Set up Python backend
- More complex, higher payoff

Option C: **Hybrid Approach** (P1 + P2 Foundation)
- Implement two-panel interface NOW
- Design training pipeline in parallel
- Start collecting voice data while building AI

**My recommendation**: Option C
1. I'll implement two-panel + voice (2-3 hours)
2. We set up basic training infrastructure (1 week)
3. You start collecting richer data immediately
4. AI training begins as soon as pipeline is ready

What do you think?
