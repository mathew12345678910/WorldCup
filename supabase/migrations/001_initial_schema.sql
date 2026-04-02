-- WC26 Predictor — Initial Schema
-- All tables, RLS policies, indexes, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GAMES
-- ============================================================
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin TEXT UNIQUE NOT NULL CHECK (length(pin) = 6),
  name TEXT NOT NULL DEFAULT 'WC26 Predictor',
  entry_fee NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  max_players INT NOT NULL DEFAULT 20,
  admin_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token UUID NOT NULL DEFAULT uuid_generate_v4(),
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  has_paid BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, lower(name))
);

CREATE INDEX idx_players_game ON players(game_id);
CREATE INDEX idx_players_token ON players(token);

-- ============================================================
-- TEAMS (seeded from football-data.org)
-- ============================================================
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  flag_url TEXT,
  group_letter CHAR(1),
  fifa_id INT UNIQUE
);

-- ============================================================
-- MATCHES (synced from football-data.org)
-- ============================================================
CREATE TYPE match_stage AS ENUM (
  'GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL'
);

CREATE TYPE match_status AS ENUM (
  'SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'FINISHED',
  'POSTPONED', 'CANCELLED', 'SUSPENDED', 'AWARDED'
);

CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  external_id INT UNIQUE,
  stage match_stage NOT NULL,
  group_letter CHAR(1),
  matchday INT,
  home_team_id INT REFERENCES teams(id),
  away_team_id INT REFERENCES teams(id),
  home_score INT,
  away_score INT,
  status match_status NOT NULL DEFAULT 'SCHEDULED',
  kickoff_utc TIMESTAMPTZ NOT NULL,
  venue TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_stage ON matches(stage);
CREATE INDEX idx_matches_kickoff ON matches(kickoff_utc);
CREATE INDEX idx_matches_status ON matches(status);

-- ============================================================
-- MATCH RESULTS (odds + outcome tracking)
-- ============================================================
CREATE TABLE match_results (
  id SERIAL PRIMARY KEY,
  match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  home_odds NUMERIC(8,4),
  away_odds NUMERIC(8,4),
  draw_odds NUMERIC(8,4),
  odds_source TEXT,
  odds_updated_at TIMESTAMPTZ,
  winner_team_id INT REFERENCES teams(id),
  settled_at TIMESTAMPTZ
);

-- ============================================================
-- GROUP STANDINGS (synced or computed)
-- ============================================================
CREATE TABLE group_standings (
  id SERIAL PRIMARY KEY,
  group_letter CHAR(1) NOT NULL,
  team_id INT NOT NULL REFERENCES teams(id),
  played INT NOT NULL DEFAULT 0,
  won INT NOT NULL DEFAULT 0,
  drawn INT NOT NULL DEFAULT 0,
  lost INT NOT NULL DEFAULT 0,
  gf INT NOT NULL DEFAULT 0,
  ga INT NOT NULL DEFAULT 0,
  gd INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_letter, team_id)
);

-- ============================================================
-- OUTRIGHT ODDS (tournament-level futures)
-- ============================================================
CREATE TABLE outright_odds (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES teams(id),
  market TEXT NOT NULL DEFAULT 'winner',
  decimal_odds NUMERIC(8,4) NOT NULL,
  source TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, market)
);

-- ============================================================
-- GROUP PICKS (player picks group winners/runners-up)
-- ============================================================
CREATE TABLE group_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  group_letter CHAR(1) NOT NULL,
  team_id INT NOT NULL REFERENCES teams(id),
  position INT NOT NULL CHECK (position IN (1, 2)),
  is_joker BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, group_letter, position)
);

CREATE INDEX idx_group_picks_player ON group_picks(player_id);

-- ============================================================
-- KNOCKOUT PICKS
-- ============================================================
CREATE TABLE knockout_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id INT NOT NULL REFERENCES matches(id),
  team_id INT NOT NULL REFERENCES teams(id),
  is_joker BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, match_id)
);

CREATE INDEX idx_knockout_picks_player ON knockout_picks(player_id);

-- ============================================================
-- SPECIAL PICKS (outright winner, golden boot, etc.)
-- ============================================================
CREATE TYPE special_pick_type AS ENUM (
  'tournament_winner', 'runner_up', 'golden_boot',
  'young_player', 'golden_glove', 'group_stage_exit'
);

CREATE TABLE special_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pick_type special_pick_type NOT NULL,
  team_id INT REFERENCES teams(id),
  player_name TEXT,
  is_joker BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, pick_type)
);

CREATE INDEX idx_special_picks_player ON special_picks(player_id);

-- ============================================================
-- NOVELTY PICKS
-- ============================================================
CREATE TYPE novelty_pick_type AS ENUM (
  'host_performance', 'final_penalty', 'most_cards',
  'biggest_upset', 'first_goal', 'hat_trick', 'own_goal'
);

CREATE TABLE novelty_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pick_type novelty_pick_type NOT NULL,
  value TEXT NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, pick_type)
);

CREATE INDEX idx_novelty_picks_player ON novelty_picks(player_id);

-- ============================================================
-- SCORES (computed, cached per player)
-- ============================================================
CREATE TABLE player_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  group_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  knockout_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  special_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  novelty_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  rank INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, game_id)
);

CREATE INDEX idx_player_scores_game ON player_scores(game_id);
CREATE INDEX idx_player_scores_total ON player_scores(total_points DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE novelty_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;

-- Games: readable by anyone with the pin
CREATE POLICY "games_read" ON games FOR SELECT USING (true);

-- Players: readable within their game
CREATE POLICY "players_read" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update" ON players FOR UPDATE USING (true);

-- Picks: players can manage their own picks
CREATE POLICY "group_picks_all" ON group_picks FOR ALL USING (true);
CREATE POLICY "knockout_picks_all" ON knockout_picks FOR ALL USING (true);
CREATE POLICY "special_picks_all" ON special_picks FOR ALL USING (true);
CREATE POLICY "novelty_picks_all" ON novelty_picks FOR ALL USING (true);

-- Scores: readable by anyone
CREATE POLICY "scores_read" ON player_scores FOR SELECT USING (true);
CREATE POLICY "scores_manage" ON player_scores FOR ALL USING (true);

-- Public tables (no RLS needed for read-only reference)
-- teams, matches, match_results, group_standings, outright_odds are public

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Lock picks for a match when kickoff passes
CREATE OR REPLACE FUNCTION lock_picks_at_kickoff()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'IN_PLAY' AND OLD.status != 'IN_PLAY' THEN
    UPDATE group_picks SET locked = true, locked_at = now()
    WHERE group_letter = NEW.group_letter AND locked = false;

    UPDATE knockout_picks SET locked = true, locked_at = now()
    WHERE match_id = NEW.id AND locked = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_picks_at_kickoff
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION lock_picks_at_kickoff();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_group_picks_updated_at BEFORE UPDATE ON group_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_knockout_picks_updated_at BEFORE UPDATE ON knockout_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_special_picks_updated_at BEFORE UPDATE ON special_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_novelty_picks_updated_at BEFORE UPDATE ON novelty_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REALTIME PUBLICATIONS
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE player_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_results;
ALTER PUBLICATION supabase_realtime ADD TABLE group_standings;
