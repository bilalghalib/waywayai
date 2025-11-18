# 🎮 Building Drawing Charades - Step by Step

**Timeline:** 2-3 weeks
**Difficulty:** Intermediate
**Tech:** React + Supabase Realtime + Your Drawing Engine

---

## 🎯 What We're Building

**Drawing Charades** - Real-time multiplayer drawing game where:
- One player draws a secret word
- Others watch strokes appear in real-time
- First to guess wins points
- Pressure visualization shows drawing confidence

---

## 📅 3-Week Sprint Plan

### Week 1: Core Infrastructure (Days 1-7)

**Day 1-2: Project Setup**
- [x] Initialize React + TypeScript project
- [x] Set up Tailwind CSS
- [x] Configure Supabase client
- [x] Port Pen.js → React hook
- [ ] Create basic routing

**Day 3-4: Game Lobby**
- [ ] Room creation/joining UI
- [ ] Player list component
- [ ] Real-time player updates
- [ ] Start game button

**Day 5-7: Drawing Canvas Integration**
- [ ] Port Board.js → React component
- [ ] Integrate pressure-sensitive input
- [ ] Test on different devices

### Week 2: Game Mechanics (Days 8-14)

**Day 8-9: Real-time Broadcasting**
- [ ] Broadcast strokes via Supabase Realtime
- [ ] Receive and render strokes
- [ ] Handle latency/sync issues
- [ ] Add stroke buffering

**Day 10-11: Guessing System**
- [ ] Chat input for guesses
- [ ] Real-time guess validation
- [ ] Word proximity matching
- [ ] Correct answer celebration

**Day 12-14: Scoring & Rounds**
- [ ] Points calculation
- [ ] Round timer
- [ ] Turn rotation logic
- [ ] End game summary

### Week 3: Polish & Launch (Days 15-21)

**Day 15-16: Pressure Heatmap**
- [ ] Pressure data visualization
- [ ] Color gradient overlay
- [ ] Toggle on/off

**Day 17-18: UI/UX Polish**
- [ ] Mobile responsive
- [ ] Animations & transitions
- [ ] Sound effects (optional)
- [ ] Error states

**Day 19-20: Testing & Bug Fixes**
- [ ] Multi-device testing
- [ ] 4+ player stress test
- [ ] Network latency testing
- [ ] Mobile browser testing

**Day 21: Deploy & Share**
- [ ] Deploy to Vercel
- [ ] Share with friends
- [ ] Collect feedback
- [ ] Plan v2 features

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          React Frontend (Vercel)            │
│  ┌─────────────┐  ┌────────────────────┐   │
│  │ Game Lobby  │  │  Drawing Canvas    │   │
│  │  Component  │  │  (Pen.js + Board)  │   │
│  └──────┬──────┘  └─────────┬──────────┘   │
│         │                   │               │
│         ▼                   ▼               │
│  ┌──────────────────────────────────────┐  │
│  │   Supabase Client (Real-time)        │  │
│  └────────────────┬─────────────────────┘  │
└───────────────────┼─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│         Supabase Backend (Cloud)            │
│  ┌─────────────────────────────────────┐   │
│  │  PostgreSQL Database                │   │
│  │  - charades_games                   │   │
│  │  - charades_players                 │   │
│  │  - charades_guesses                 │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  Realtime (WebSocket)               │   │
│  │  - Stroke broadcasts                │   │
│  │  - Player updates                   │   │
│  │  - Guess submissions                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
src/
├── app/
│   ├── page.tsx                 # Home page
│   ├── lobby/[roomCode]/page.tsx # Game lobby
│   └── game/[roomCode]/page.tsx  # Active game
│
├── components/
│   ├── charades/
│   │   ├── GameLobby.tsx        # Room setup
│   │   ├── DrawingCanvas.tsx    # Canvas component
│   │   ├── PlayerList.tsx       # Show all players
│   │   ├── GuessInput.tsx       # Chat/guess input
│   │   ├── ScoreBoard.tsx       # Live scores
│   │   ├── PressureHeatmap.tsx  # Visualization
│   │   └── Timer.tsx            # Round countdown
│   │
│   └── drawing/
│       ├── Canvas.tsx           # Base canvas
│       └── StrokeRenderer.tsx   # Render strokes
│
├── hooks/
│   ├── useCharadesGame.ts       # Game state logic
│   ├── usePenEngine.ts          # Pen.js as hook
│   ├── useRealtimeStrokes.ts    # Supabase realtime
│   └── useTimer.ts              # Round timer
│
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── gameLogic.ts             # Scoring, validation
│   └── wordList.ts              # Words to draw
│
└── types/
    ├── game.ts                  # Game state types
    └── supabase.ts              # Generated DB types
```

---

## 🔑 Key Features to Build

### 1. Real-time Stroke Broadcasting

**The Magic:** Every stroke appears on all screens instantly

```typescript
// useRealtimeStrokes.ts
export function useRealtimeStrokes(roomCode: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`game:${roomCode}`)
      .on('broadcast', { event: 'stroke' }, (payload) => {
        // Render stroke on canvas
        renderStroke(payload.data);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [roomCode]);

  const broadcastStroke = (stroke: Stroke) => {
    channel.send({
      type: 'broadcast',
      event: 'stroke',
      payload: { data: stroke }
    });
  };

  return { broadcastStroke };
}
```

### 2. Pressure Heatmap Visualization

**Show hesitation vs confidence:**

```typescript
function getPressureColor(pressure: number): string {
  // Low pressure (light) = blue
  // High pressure (hard) = red
  const hue = 240 - (pressure * 240); // 240 = blue, 0 = red
  return `hsl(${hue}, 100%, 50%)`;
}
```

### 3. Word Matching Algorithm

**Fuzzy matching for typos:**

```typescript
function isGuessCorrect(guess: string, word: string): boolean {
  // Normalize
  const g = guess.toLowerCase().trim();
  const w = word.toLowerCase().trim();

  // Exact match
  if (g === w) return true;

  // Levenshtein distance for typos
  const distance = levenshtein(g, w);
  return distance <= 2; // Allow 2 typos
}
```

### 4. Points System

```typescript
function calculatePoints(timeToGuess: number, totalTime: number): number {
  // Faster guess = more points
  const timeBonus = Math.floor((1 - timeToGuess / totalTime) * 100);
  return Math.max(10, timeBonus); // Minimum 10 points
}
```

---

## 🎨 UI Components Breakdown

### Game Lobby
```tsx
<GameLobby roomCode="ABC123">
  <RoomInfo />
  <PlayerList players={players} />
  <ShareButton />
  <StartGameButton disabled={players.length < 2} />
</GameLobby>
```

### Active Game
```tsx
<GameScreen>
  <Header>
    <Timer seconds={30} />
    <CurrentWord word={word} isDrawer={isDrawer} />
  </Header>

  <MainArea>
    <DrawingCanvas
      isDrawer={isDrawer}
      onStroke={broadcastStroke}
    />
    {!isDrawer && <PressureHeatmap />}
  </MainArea>

  <Sidebar>
    <ScoreBoard players={players} />
    <GuessInput onGuess={submitGuess} />
  </Sidebar>
</GameScreen>
```

---

## 🚀 Quick Start Commands

```bash
# Create React app structure
npm run dev

# Start local Supabase
npx supabase start

# Run migrations
npx supabase db push

# Start development
npm run dev
```

---

## 🧪 Testing Checklist

### Functionality
- [ ] Create room works
- [ ] Join room with code works
- [ ] Player list updates in real-time
- [ ] Drawing appears on all screens
- [ ] Guesses are validated correctly
- [ ] Points are calculated accurately
- [ ] Timer counts down
- [ ] Next round starts automatically
- [ ] Game ends after all rounds

### Performance
- [ ] <100ms latency for strokes
- [ ] No lag with 8 players
- [ ] Mobile performs smoothly
- [ ] Network reconnection works

### Devices
- [ ] Desktop (mouse)
- [ ] iPad (Apple Pencil)
- [ ] iPhone (finger)
- [ ] Android tablet
- [ ] Wacom tablet

---

## 🎯 MVP vs Full Version

### MVP (Week 1-2)
- ✅ 2-4 players
- ✅ Basic drawing
- ✅ Simple guessing
- ✅ Basic scoring
- ✅ 5 rounds

### Full Version (Week 3+)
- [ ] Up to 8 players
- [ ] Pressure heatmap
- [ ] Custom word lists
- [ ] Replay system
- [ ] Leaderboards
- [ ] Achievements
- [ ] Sound effects
- [ ] Private rooms
- [ ] Spectator mode

---

## 💡 Pro Tips

### Real-time Optimization
```typescript
// Throttle stroke broadcasts to reduce bandwidth
const throttledBroadcast = throttle(broadcastStroke, 16); // ~60fps
```

### Handle Disconnections
```typescript
useEffect(() => {
  const handleDisconnect = () => {
    // Mark player as disconnected
    updatePlayerStatus(playerId, 'disconnected');

    // Auto-kick after 30s
    setTimeout(() => {
      removePlayer(playerId);
    }, 30000);
  };

  window.addEventListener('beforeunload', handleDisconnect);
  return () => window.removeEventListener('beforeunload', handleDisconnect);
}, []);
```

### Mobile UX
```tsx
// Prevent accidental zoom on double-tap
<div
  style={{ touchAction: 'none' }}
  onTouchStart={(e) => e.preventDefault()}
>
  <Canvas />
</div>
```

---

## 🐛 Common Issues & Solutions

### Issue: Strokes appear laggy
**Solution:** Batch strokes and use requestAnimationFrame

### Issue: Players see different things
**Solution:** Add sequence numbers to strokes

### Issue: Mobile canvas too small
**Solution:** Use viewport units and scale properly

### Issue: Words too easy/hard
**Solution:** Categorize by difficulty, let host choose

---

## 📊 Success Metrics

**Week 1 Goals:**
- [ ] Can create/join room
- [ ] Drawing works locally

**Week 2 Goals:**
- [ ] Real-time works with 2 players
- [ ] Full game loop completes

**Week 3 Goals:**
- [ ] Tested with 4+ players
- [ ] Mobile responsive
- [ ] Deployed to production

**Launch Metrics:**
- 10 test users
- 50+ games played
- <1 major bug
- Positive feedback

---

## 🚀 Next Steps After Launch

1. **Marketing**
   - Share on Twitter/Reddit
   - Demo video
   - Invite friends

2. **Iteration**
   - Collect feedback
   - Fix top 3 bugs
   - Add most requested feature

3. **Scale**
   - Add difficulty levels
   - Custom word packs
   - Tournament mode

4. **Monetize**
   - Premium word packs ($2.99)
   - Ad-free version ($4.99/mo)
   - Private branded rooms (B2B)

---

Ready to start building? Let's do this! 🚀

**Next command:** Create the React project structure →
