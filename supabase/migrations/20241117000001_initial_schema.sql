-- WayWay AI - Initial Database Schema
-- Migration: 20241117000001

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- Artists table (extends Supabase auth.users)
CREATE TABLE public.artists (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,

  -- Stats
  total_drawings INTEGER DEFAULT 0,
  total_strokes BIGINT DEFAULT 0,
  skill_level TEXT DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),

  -- Preferences
  preferred_device TEXT,
  has_pressure_support BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all artist profiles"
  ON public.artists FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.artists FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- REFERENCE IMAGES
-- =====================================================

CREATE TABLE public.reference_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Image info
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  thumbnail_path TEXT,
  url TEXT NOT NULL,

  -- Metadata
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,

  -- Organization
  category TEXT,
  tags TEXT[],
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),

  -- Uploader
  uploaded_by UUID REFERENCES public.artists(id),

  -- Stats
  total_traces INTEGER DEFAULT 0,
  average_completion_time INTEGER, -- milliseconds

  -- Status
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public reference images"
  ON public.reference_images FOR SELECT
  USING (is_public = true);

CREATE POLICY "Artists can upload reference images"
  ON public.reference_images FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- Index for fast category/tag filtering
CREATE INDEX idx_reference_images_category ON public.reference_images(category);
CREATE INDEX idx_reference_images_tags ON public.reference_images USING gin(tags);
CREATE INDEX idx_reference_images_difficulty ON public.reference_images(difficulty);

-- =====================================================
-- DRAWING SESSIONS
-- =====================================================

CREATE TABLE public.drawing_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Artist
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,

  -- Reference (optional - could be freehand)
  reference_image_id UUID REFERENCES public.reference_images(id) ON DELETE SET NULL,

  -- Stroke data
  stroke_data JSONB NOT NULL, -- Array of stroke points (compressed if needed)
  stroke_count INTEGER NOT NULL,
  point_count INTEGER NOT NULL,

  -- Canvas metadata
  canvas_width INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  resolution INTEGER DEFAULT 2,

  -- Session metadata
  device_type TEXT, -- 'desktop', 'tablet', 'mobile'
  pointer_type TEXT, -- 'mouse', 'pen', 'touch'
  has_pressure_data BOOLEAN DEFAULT false,

  -- Timing
  duration_ms INTEGER, -- Total drawing time
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Storage
  thumbnail_url TEXT,
  gif_url TEXT, -- Generated replay GIF

  -- Status
  is_public BOOLEAN DEFAULT false,
  is_complete BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.drawing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view their own drawings"
  ON public.drawing_sessions FOR SELECT
  USING (auth.uid() = artist_id OR is_public = true);

CREATE POLICY "Artists can create drawings"
  ON public.drawing_sessions FOR INSERT
  WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists can update their own drawings"
  ON public.drawing_sessions FOR UPDATE
  USING (auth.uid() = artist_id);

-- Indexes for queries
CREATE INDEX idx_drawing_sessions_artist ON public.drawing_sessions(artist_id);
CREATE INDEX idx_drawing_sessions_reference ON public.drawing_sessions(reference_image_id);
CREATE INDEX idx_drawing_sessions_created ON public.drawing_sessions(created_at DESC);
CREATE INDEX idx_drawing_sessions_public ON public.drawing_sessions(is_public) WHERE is_public = true;

-- GIN index for JSONB stroke data queries
CREATE INDEX idx_drawing_sessions_stroke_data ON public.drawing_sessions USING gin(stroke_data);

-- =====================================================
-- STROKE ANALYSIS (ML Features)
-- =====================================================

CREATE TABLE public.stroke_patterns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Session reference
  session_id UUID REFERENCES public.drawing_sessions(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,

  -- ML Features (from Python clustering)
  feature_vector FLOAT[], -- FFT-extracted features
  cluster_label INTEGER,

  -- Pattern metrics
  avg_pressure FLOAT,
  pressure_variance FLOAT,
  avg_stroke_speed FLOAT,
  avg_tilt_x FLOAT,
  avg_tilt_y FLOAT,
  stroke_smoothness FLOAT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stroke_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view their own patterns"
  ON public.stroke_patterns FOR SELECT
  USING (auth.uid() = artist_id);

-- Index for similarity searches
CREATE INDEX idx_stroke_patterns_artist ON public.stroke_patterns(artist_id);
CREATE INDEX idx_stroke_patterns_cluster ON public.stroke_patterns(cluster_label);

-- =====================================================
-- GAME: DRAWING CHARADES
-- =====================================================

CREATE TABLE public.charades_games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Game info
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES public.artists(id),

  -- Settings
  max_players INTEGER DEFAULT 8,
  rounds INTEGER DEFAULT 5,
  seconds_per_round INTEGER DEFAULT 30,

  -- State
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  current_round INTEGER DEFAULT 0,
  current_drawer_id UUID REFERENCES public.artists(id),
  current_word TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.charades_players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES public.charades_games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.artists(id),

  -- Stats
  score INTEGER DEFAULT 0,
  correct_guesses INTEGER DEFAULT 0,
  times_drawn INTEGER DEFAULT 0,

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, player_id)
);

CREATE TABLE public.charades_guesses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES public.charades_games(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  player_id UUID REFERENCES public.artists(id),

  guess TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  time_to_guess INTEGER, -- milliseconds

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time for multiplayer
ALTER PUBLICATION supabase_realtime ADD TABLE public.charades_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.charades_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.charades_guesses;

-- =====================================================
-- ACHIEVEMENTS & GAMIFICATION
-- =====================================================

CREATE TABLE public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,

  -- Requirements
  requirement_type TEXT NOT NULL, -- 'total_drawings', 'streak_days', 'perfect_circle', etc.
  requirement_value INTEGER NOT NULL,

  -- Rarity
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.artist_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(artist_id, achievement_id)
);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reference_images_updated_at BEFORE UPDATE ON public.reference_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drawing_sessions_updated_at BEFORE UPDATE ON public.drawing_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment artist drawing count
CREATE OR REPLACE FUNCTION increment_artist_drawing_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.artists
  SET
    total_drawings = total_drawings + 1,
    total_strokes = total_strokes + NEW.stroke_count
  WHERE id = NEW.artist_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_drawing_count AFTER INSERT ON public.drawing_sessions
  FOR EACH ROW EXECUTE FUNCTION increment_artist_drawing_count();

-- Function to increment reference image trace count
CREATE OR REPLACE FUNCTION increment_reference_trace_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_image_id IS NOT NULL THEN
    UPDATE public.reference_images
    SET total_traces = total_traces + 1
    WHERE id = NEW.reference_image_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_trace_count AFTER INSERT ON public.drawing_sessions
  FOR EACH ROW EXECUTE FUNCTION increment_reference_trace_count();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert some starter achievements
INSERT INTO public.achievements (slug, name, description, tier, requirement_type, requirement_value) VALUES
  ('first_drawing', 'First Stroke', 'Complete your first drawing', 'bronze', 'total_drawings', 1),
  ('ten_drawings', 'Getting Started', 'Complete 10 drawings', 'bronze', 'total_drawings', 10),
  ('hundred_drawings', 'Dedicated Artist', 'Complete 100 drawings', 'silver', 'total_drawings', 100),
  ('thousand_drawings', 'Master Artist', 'Complete 1000 drawings', 'gold', 'total_drawings', 1000),
  ('perfect_circle', 'Circle Master', 'Draw a 95%+ perfect circle', 'gold', 'perfect_circle', 95),
  ('week_streak', '7-Day Streak', 'Draw every day for a week', 'silver', 'streak_days', 7),
  ('month_streak', '30-Day Streak', 'Draw every day for a month', 'platinum', 'streak_days', 30),
  ('speed_demon', 'Speed Demon', 'Complete a drawing in under 10 seconds', 'gold', 'drawing_speed', 10000);

-- =====================================================
-- VIEWS (for analytics)
-- =====================================================

-- Artist leaderboard view
CREATE OR REPLACE VIEW public.artist_leaderboard AS
SELECT
  a.id,
  a.username,
  a.display_name,
  a.avatar_url,
  a.total_drawings,
  a.total_strokes,
  a.skill_level,
  COUNT(DISTINCT aa.achievement_id) as achievement_count,
  a.created_at
FROM public.artists a
LEFT JOIN public.artist_achievements aa ON a.id = aa.artist_id
GROUP BY a.id
ORDER BY a.total_drawings DESC;

-- Popular reference images view
CREATE OR REPLACE VIEW public.popular_references AS
SELECT
  ri.*,
  a.username as uploader_username
FROM public.reference_images ri
LEFT JOIN public.artists a ON ri.uploaded_by = a.id
WHERE ri.is_public = true
ORDER BY ri.total_traces DESC, ri.created_at DESC;

-- =====================================================
-- STORAGE BUCKETS (to be created via Supabase dashboard or CLI)
-- =====================================================

-- Instructions for Supabase Storage:
-- 1. Create bucket: 'drawings' (private by default)
-- 2. Create bucket: 'reference-images' (public)
-- 3. Create bucket: 'avatars' (public)
-- 4. Create bucket: 'gifs' (public)
--
-- Policies will be set via Supabase dashboard:
-- - drawings: Only owner can read/write
-- - reference-images: Anyone can read, authenticated users can write
-- - avatars: Anyone can read, users can write their own
-- - gifs: Anyone can read, owner can write

COMMENT ON TABLE public.artists IS 'Artist profiles and statistics';
COMMENT ON TABLE public.reference_images IS 'Reference images for tracing exercises';
COMMENT ON TABLE public.drawing_sessions IS 'Complete drawing session data with stroke information';
COMMENT ON TABLE public.stroke_patterns IS 'ML-extracted features for pattern analysis';
COMMENT ON TABLE public.charades_games IS 'Drawing charades game sessions';
COMMENT ON TABLE public.achievements IS 'Gamification achievements';
