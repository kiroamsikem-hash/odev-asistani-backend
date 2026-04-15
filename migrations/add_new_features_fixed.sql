-- Video Notes Table
CREATE TABLE IF NOT EXISTS video_notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url VARCHAR(500) NOT NULL,
  title VARCHAR(255),
  summary TEXT,
  timestamps JSONB,
  questions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_notes_user ON video_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_created ON video_notes(created_at DESC);

-- Flashcards Table (Spaced Repetition)
CREATE TABLE IF NOT EXISTS flashcards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  subject VARCHAR(100),
  difficulty VARCHAR(20) DEFAULT 'orta',
  deck_name VARCHAR(100) DEFAULT 'Genel',
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_reviewed TIMESTAMP,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_name);

-- Study Sessions Table (Focus Engine)
CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  target_date DATE NOT NULL,
  daily_goal INTEGER NOT NULL,
  completed_today INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  notes TEXT,
  last_study TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_target ON study_sessions(target_date);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_video_notes_updated_at ON video_notes;
DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
DROP TRIGGER IF EXISTS update_study_sessions_updated_at ON study_sessions;

-- Add triggers for updated_at
CREATE TRIGGER update_video_notes_updated_at BEFORE UPDATE ON video_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
