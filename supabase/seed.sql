-- WC26 Predictor — Seed Data
-- 48 teams for FIFA World Cup 2026
-- Groups A through L (4 teams each)
-- NO dummy player names — only team reference data

-- Group A
INSERT INTO teams (name, code, group_letter) VALUES
  ('United States', 'USA', 'A'),
  ('Mexico', 'MEX', 'A'),
  ('Colombia', 'COL', 'A'),
  ('Senegal', 'SEN', 'A');

-- Group B
INSERT INTO teams (name, code, group_letter) VALUES
  ('England', 'ENG', 'B'),
  ('Denmark', 'DEN', 'B'),
  ('Paraguay', 'PAR', 'B'),
  ('Ivory Coast', 'CIV', 'B');

-- Group C
INSERT INTO teams (name, code, group_letter) VALUES
  ('Germany', 'GER', 'C'),
  ('Japan', 'JPN', 'C'),
  ('Costa Rica', 'CRC', 'C'),
  ('Serbia', 'SRB', 'C');

-- Group D
INSERT INTO teams (name, code, group_letter) VALUES
  ('France', 'FRA', 'D'),
  ('Australia', 'AUS', 'D'),
  ('Tunisia', 'TUN', 'D'),
  ('Mali', 'MLI', 'D');

-- Group E
INSERT INTO teams (name, code, group_letter) VALUES
  ('Brazil', 'BRA', 'E'),
  ('Cameroon', 'CMR', 'E'),
  ('New Zealand', 'NZL', 'E'),
  ('Ecuador', 'ECU', 'E');

-- Group F
INSERT INTO teams (name, code, group_letter) VALUES
  ('Argentina', 'ARG', 'F'),
  ('Morocco', 'MAR', 'F'),
  ('South Korea', 'KOR', 'F'),
  ('Jamaica', 'JAM', 'F');

-- Group G
INSERT INTO teams (name, code, group_letter) VALUES
  ('Spain', 'ESP', 'G'),
  ('Uruguay', 'URU', 'G'),
  ('Chile', 'CHI', 'G'),
  ('Canada', 'CAN', 'G');

-- Group H
INSERT INTO teams (name, code, group_letter) VALUES
  ('Portugal', 'POR', 'H'),
  ('Switzerland', 'SUI', 'H'),
  ('Ghana', 'GHA', 'H'),
  ('Panama', 'PAN', 'H');

-- Group I
INSERT INTO teams (name, code, group_letter) VALUES
  ('Netherlands', 'NED', 'I'),
  ('Croatia', 'CRO', 'I'),
  ('Saudi Arabia', 'KSA', 'I'),
  ('Peru', 'PER', 'I');

-- Group J
INSERT INTO teams (name, code, group_letter) VALUES
  ('Belgium', 'BEL', 'J'),
  ('Poland', 'POL', 'J'),
  ('Iran', 'IRN', 'J'),
  ('Honduras', 'HON', 'J');

-- Group K
INSERT INTO teams (name, code, group_letter) VALUES
  ('Italy', 'ITA', 'K'),
  ('Egypt', 'EGY', 'K'),
  ('Wales', 'WAL', 'K'),
  ('Trinidad and Tobago', 'TRI', 'K');

-- Group L
INSERT INTO teams (name, code, group_letter) VALUES
  ('Nigeria', 'NGA', 'L'),
  ('Algeria', 'ALG', 'L'),
  ('Qatar', 'QAT', 'L'),
  ('Scotland', 'SCO', 'L');

-- Initialize group standings for all teams
INSERT INTO group_standings (group_letter, team_id, position)
SELECT t.group_letter, t.id,
  ROW_NUMBER() OVER (PARTITION BY t.group_letter ORDER BY t.id)
FROM teams t
WHERE t.group_letter IS NOT NULL;
