CREATE TABLE IF NOT EXISTS clans (
  tag TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  badge_url TEXT,
  clan_level INTEGER NOT NULL DEFAULT 1,
  required_trophies INTEGER NOT NULL DEFAULT 0,
  required_builder_base_trophies INTEGER NOT NULL DEFAULT 0,
  required_townhall_level INTEGER NOT NULL DEFAULT 1,
  war_win_streak INTEGER NOT NULL DEFAULT 0,
  war_wins INTEGER NOT NULL DEFAULT 0,
  war_ties INTEGER NOT NULL DEFAULT 0,
  war_losses INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_members (
  tag TEXT PRIMARY KEY,
  tag_clan TEXT REFERENCES clans(tag),
  name TEXT NOT NULL,
  town_hall_level INTEGER NOT NULL DEFAULT 1,
  exp_level INTEGER NOT NULL DEFAULT 1,
  league_tier_url TEXT,
  trophies INTEGER NOT NULL DEFAULT 0,
  builder_base_trophies INTEGER NOT NULL DEFAULT 0,
  donations INTEGER NOT NULL DEFAULT 0,
  raw_donations INTEGER NOT NULL DEFAULT 0,
  donations_received INTEGER NOT NULL DEFAULT 0,
  raw_donations_received INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wars (
  id SERIAL PRIMARY KEY,
  start_time TIMESTAMP NOT NULL,
  preparation_start_time TIMESTAMP NOT NULL,
  attacks_per_member INTEGER NOT NULL,
  end_time TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),

  clan_tag TEXT NOT NULL REFERENCES clans(tag),
  clan_percentage REAL NOT NULL DEFAULT 0,
  clan_stars INTEGER NOT NULL DEFAULT 0,
  clan_badge_url TEXT,

  enemy_clan_tag TEXT NOT NULL,
  enemy_clan_name TEXT NOT NULL,
  enemy_clan_percentage REAL NOT NULL DEFAULT 0,
  enemy_clan_stars INTEGER NOT NULL DEFAULT 0,
  enemy_clan_badge_url TEXT,
  UNIQUE (clan_tag, start_time)
);

CREATE TABLE IF NOT EXISTS war_members (  
  war_id INTEGER REFERENCES wars(id) ON DELETE CASCADE,
  tag_clan TEXT,
  tag TEXT NOT NULL,  
  name TEXT NOT NULL,
  town_hall_level INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL,

  PRIMARY KEY (war_id, tag)
);

CREATE TABLE IF NOT EXISTS war_attacks (
  war_id INTEGER REFERENCES wars(id) ON DELETE CASCADE,
  attacker_tag TEXT NOT NULL,
  defender_tag TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  destruction_percentage REAL NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (war_id, attacker_tag, defender_tag),

  FOREIGN KEY (war_id, attacker_tag)
    REFERENCES war_members(war_id, tag) ON DELETE CASCADE,

  FOREIGN KEY (war_id, defender_tag)
    REFERENCES war_members(war_id, tag) ON DELETE CASCADE
);