# 💻 Development Guide - WayWay AI

Complete local development setup and best practices.

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/bilalghalib/waywayai.git
cd waywayai

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start Supabase locally (Docker required)
npx supabase start

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
waywayai/
├── drawwaywayOnline/       # Legacy production app (still works!)
│   ├── index.html          # Main HTML file
│   ├── js/
│   │   ├── libs/          # Core libraries (Pen.js, Board.js)
│   │   └── main.js        # App initialization
│   └── css/
│
├── src/                    # Modern React app (future)
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities
│   ├── types/             # TypeScript types
│   └── app/               # Next.js app router
│
├── makeGif/               # GIF generation service
│   ├── makeGif.js        # Node.js GIF encoder
│   ├── cluster.py        # ML stroke clustering
│   └── package.json
│
├── supabase/              # Database & backend
│   ├── migrations/       # SQL migrations
│   ├── functions/        # Edge functions
│   └── config.toml       # Supabase config
│
├── data/                  # User data (gitignored)
│   ├── drawings/
│   ├── exports/
│   └── references/
│
├── docs/                  # Documentation
├── _ARCHIVE_OLD_CODE/    # Legacy code (archived)
│
├── .env.example          # Environment template
├── .gitignore
├── package.json
├── README.md
├── STRATEGY.md
└── claude.md
```

---

## 🛠️ Development Tools

### Essential Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking

# Database
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run supabase:migrate # Run migrations
npm run supabase:types   # Generate TypeScript types

# Utilities
npm run gif:generate     # Generate GIF from drawing
npm run cluster:analyze  # Analyze stroke patterns

# Legacy
npm run serve           # Serve old HTML app (port 8000)
```

### Recommended VS Code Extensions

Install these for best experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "supabase.supabase-vscode",
    "ms-python.python"
  ]
}
```

---

## 🗄️ Database Development

### Local Supabase

Requires Docker Desktop installed.

```bash
# Start (first time takes ~2 minutes)
npx supabase start

# Output will show:
# API URL: http://localhost:54321
# Studio URL: http://localhost:54323
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
```

Access local Supabase Studio: [http://localhost:54323](http://localhost:54323)

### Creating Migrations

```bash
# Create new migration
npx supabase migration new add_feature_name

# Edit file: supabase/migrations/YYYYMMDDHHMMSS_add_feature_name.sql
```

Example migration:
```sql
-- Add new column to artists table
ALTER TABLE public.artists
ADD COLUMN bio TEXT;

-- Update function
CREATE OR REPLACE FUNCTION get_artist_stats(artist_id UUID)
RETURNS TABLE (
  total_drawings INTEGER,
  total_strokes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.total_drawings, a.total_strokes
  FROM public.artists a
  WHERE a.id = artist_id;
END;
$$ LANGUAGE plpgsql;
```

### Applying Migrations

```bash
# Apply locally
npx supabase db reset

# Apply to production (after testing!)
npx supabase db push
```

### Generate TypeScript Types

```bash
# Generate types from schema
npm run supabase:types

# Now you have type-safe database queries!
```

Example usage:
```typescript
import { Database } from '@/types/supabase';

type Artist = Database['public']['Tables']['artists']['Row'];
type NewDrawing = Database['public']['Tables']['drawing_sessions']['Insert'];
```

---

## 🎨 Frontend Development

### Working with Legacy Code

The current `drawwaywayOnline/` app uses vanilla JS. It still works great!

**Key files:**
- `drawwaywayOnline/js/libs/Pen.js` - Pressure-sensitive drawing
- `drawwaywayOnline/js/libs/Board.js` - Canvas management
- `drawwaywayOnline/index.html` - Main app

**Testing changes:**
```bash
# Serve the legacy app
npm run serve

# Open http://localhost:8000
```

### Migrating to React (Future)

When ready to modernize:

1. **Phase 1:** Extract Pen.js logic to React hook
```typescript
// src/hooks/usePenEngine.ts
export function usePenEngine() {
  const [strokes, setStrokes] = useState([]);
  const getLineWidth = (event) => { /* Pen.js logic */ };
  return { strokes, getLineWidth };
}
```

2. **Phase 2:** Create DrawingBoard component
```typescript
// src/components/DrawingBoard.tsx
export function DrawingBoard() {
  const { strokes, getLineWidth } = usePenEngine();
  // ... component logic
}
```

3. **Phase 3:** Gradually replace HTML app

---

## 🔌 Working with Supabase

### Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Common Patterns

**Fetch data:**
```typescript
const { data, error } = await supabase
  .from('drawing_sessions')
  .select('*')
  .eq('artist_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);
```

**Insert data:**
```typescript
const { data, error } = await supabase
  .from('drawing_sessions')
  .insert({
    artist_id: userId,
    stroke_data: compressedStrokes,
    stroke_count: strokes.length,
    is_public: false
  })
  .select()
  .single();
```

**Upload file:**
```typescript
const { data, error } = await supabase.storage
  .from('drawings')
  .upload(`${userId}/${drawingId}.json`, file, {
    contentType: 'application/json',
    upsert: false
  });
```

**Real-time subscriptions:**
```typescript
const channel = supabase
  .channel('game-updates')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'charades_guesses'
    },
    (payload) => {
      console.log('New guess:', payload.new);
    }
  )
  .subscribe();
```

---

## 🧪 Testing

### Manual Testing Checklist

Before committing:

- [ ] Drawing works with mouse
- [ ] Drawing works with touch (mobile)
- [ ] Drawing works with stylus (iPad/Wacom)
- [ ] Pressure sensitivity captured
- [ ] Save to database works
- [ ] GIF generation works
- [ ] No console errors
- [ ] Mobile responsive

### Setting Up Automated Tests (Future)

```bash
# Install testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Example test:
```typescript
// src/hooks/usePenEngine.test.ts
import { renderHook } from '@testing-library/react';
import { usePenEngine } from './usePenEngine';

test('calculates line width for pen input', () => {
  const { result } = renderHook(() => usePenEngine());

  const event = {
    pointerType: 'pen',
    pressure: 0.5
  } as PointerEvent;

  expect(result.current.getLineWidth(event)).toBe(4); // 0.5 * 8
});
```

---

## 🐛 Debugging

### Browser DevTools

**Drawing issues:**
1. Open DevTools → Console
2. Look for pressure events: `pointerArray`
3. Check if pressure > 0
4. Safari bug: pressure always 0.5 (use Chrome)

**Network issues:**
1. DevTools → Network tab
2. Filter: XHR
3. Check Supabase requests
4. Look for 401 (auth), 403 (permissions), 500 (server)

### Supabase Studio

Debug database issues:

1. Open [http://localhost:54323](http://localhost:54323)
2. **Table Editor** → View/edit data
3. **SQL Editor** → Run queries
4. **Logs** → See real-time database logs

### GIF Generation Issues

```bash
# Check Node.js version
node --version  # Should be 18+

# Test GIF generation
cd makeGif
node makeGif.js

# Check output
ls -lh output/beginner.gif
```

---

## 🚀 Performance Tips

### Canvas Optimization

```javascript
// Use desynchronized for lower latency
const ctx = canvas.getContext('2d', { desynchronized: true });

// Batch draw calls
requestAnimationFrame(() => {
  // Draw all strokes in one frame
  strokes.forEach(drawStroke);
});
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_sessions_artist_created
ON drawing_sessions(artist_id, created_at DESC);
```

### Bundle Size

```bash
# Check bundle size
npm run build

# Analyze (install first)
npm install -D @next/bundle-analyzer
```

---

## 🎯 Git Workflow

### Branch Naming

```
feature/drawing-charades
fix/pressure-safari-bug
refactor/pen-js-to-hook
docs/update-readme
```

### Commit Messages

```bash
# Good
git commit -m "feat: add real-time multiplayer support"
git commit -m "fix: Safari pressure always returning 0.5"
git commit -m "docs: update deployment guide"

# Bad
git commit -m "changes"
git commit -m "fix stuff"
```

### Pull Request Template

```markdown
## Changes
- Added drawing charades game
- Implemented WebSocket for real-time updates

## Testing
- [x] Tested with 4 players
- [x] Works on mobile
- [ ] Need to test with 100+ players

## Screenshots
[Add screenshots]
```

---

## 📚 Learning Resources

### Key Technologies

- **Canvas API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **Pointer Events:** https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- **Supabase:** https://supabase.com/docs
- **Vercel:** https://vercel.com/docs
- **React:** https://react.dev

### Codebase Specific

- Read `STRATEGY.md` for product vision
- Read `claude.md` for technical details
- Read `FUN_APPLICATIONS.md` for feature ideas
- Read `drawwaywayOnline/js/libs/Pen.js` - core algorithm

---

## 🆘 Getting Help

**Stuck? Try this order:**

1. Check `claude.md` (codebase guide)
2. Check existing issues on GitHub
3. Search Supabase/Vercel docs
4. Ask in Discord (when available)
5. Create GitHub issue

---

## ✅ Pre-Commit Checklist

Before pushing code:

- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] Tested drawing functionality
- [ ] Updated documentation if needed
- [ ] No console.log() left in code
- [ ] No commented-out code
- [ ] .env.local not committed

---

Happy coding! 🎨✨
