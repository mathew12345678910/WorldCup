export type MatchStage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL'

export type MatchStatus =
  | 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED'
  | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED' | 'AWARDED'

export type SpecialPickType =
  | 'tournament_winner' | 'runner_up' | 'golden_boot'
  | 'young_player' | 'golden_glove' | 'group_stage_exit'

export type NoveltyPickType =
  | 'host_performance' | 'final_penalty' | 'most_cards'
  | 'biggest_upset' | 'first_goal' | 'hat_trick' | 'own_goal'

export interface Game {
  id: string
  pin: string
  name: string
  entry_fee: number
  max_players: number
  admin_token: string
  created_at: string
}

export interface Player {
  id: string
  game_id: string
  name: string
  token: string
  avatar_color: string
  has_paid: boolean
  joined_at: string
}

export interface Team {
  id: number
  name: string
  code: string
  flag_url: string | null
  group_letter: string | null
  fifa_id: number | null
}

export interface Match {
  id: number
  external_id: number | null
  stage: MatchStage
  group_letter: string | null
  matchday: number | null
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  kickoff_utc: string
  venue: string | null
  updated_at: string
}

export interface MatchResult {
  id: number
  match_id: number
  home_odds: number | null
  away_odds: number | null
  draw_odds: number | null
  odds_source: string | null
  odds_updated_at: string | null
  winner_team_id: number | null
  settled_at: string | null
}

export interface GroupStanding {
  id: number
  group_letter: string
  team_id: number
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  position: number
  updated_at: string
}

export interface OutrightOdds {
  id: number
  team_id: number
  market: string
  decimal_odds: number
  source: string
  updated_at: string
}

export interface GroupPick {
  id: string
  player_id: string
  group_letter: string
  team_id: number
  position: number
  is_joker: boolean
  locked: boolean
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface KnockoutPick {
  id: string
  player_id: string
  match_id: number
  team_id: number
  is_joker: boolean
  locked: boolean
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface SpecialPick {
  id: string
  player_id: string
  pick_type: SpecialPickType
  team_id: number | null
  player_name: string | null
  is_joker: boolean
  locked: boolean
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface NoveltyPick {
  id: string
  player_id: string
  pick_type: NoveltyPickType
  value: string
  locked: boolean
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface PlayerScore {
  id: string
  player_id: string
  game_id: string
  group_points: number
  knockout_points: number
  special_points: number
  novelty_points: number
  total_points: number
  rank: number | null
  updated_at: string
}

// Supabase Database type for typed client
// Row types intersect with Record<string, unknown> so that strict-mode TS
// satisfies the GenericTable constraint from @supabase/postgrest-js.
export interface Database {
  public: {
    Tables: {
      games: {
        Row: Game & Record<string, unknown>
        Insert: Partial<Game> & Pick<Game, 'pin'>
        Update: Partial<Game>
        Relationships: []
      }
      players: {
        Row: Player & Record<string, unknown>
        Insert: Partial<Player> & Pick<Player, 'game_id' | 'name'>
        Update: Partial<Player>
        Relationships: []
      }
      teams: {
        Row: Team & Record<string, unknown>
        Insert: Partial<Team> & Pick<Team, 'name' | 'code'>
        Update: Partial<Team>
        Relationships: []
      }
      matches: {
        Row: Match & Record<string, unknown>
        Insert: Partial<Match> & Pick<Match, 'stage' | 'kickoff_utc'>
        Update: Partial<Match>
        Relationships: []
      }
      match_results: {
        Row: MatchResult & Record<string, unknown>
        Insert: Partial<MatchResult> & Pick<MatchResult, 'match_id'>
        Update: Partial<MatchResult>
        Relationships: []
      }
      group_standings: {
        Row: GroupStanding & Record<string, unknown>
        Insert: Partial<GroupStanding> & Pick<GroupStanding, 'group_letter' | 'team_id'>
        Update: Partial<GroupStanding>
        Relationships: []
      }
      outright_odds: {
        Row: OutrightOdds & Record<string, unknown>
        Insert: Partial<OutrightOdds> & Pick<OutrightOdds, 'team_id' | 'decimal_odds' | 'source'>
        Update: Partial<OutrightOdds>
        Relationships: []
      }
      group_picks: {
        Row: GroupPick & Record<string, unknown>
        Insert: Partial<GroupPick> & Pick<GroupPick, 'player_id' | 'group_letter' | 'team_id' | 'position'>
        Update: Partial<GroupPick>
        Relationships: []
      }
      knockout_picks: {
        Row: KnockoutPick & Record<string, unknown>
        Insert: Partial<KnockoutPick> & Pick<KnockoutPick, 'player_id' | 'match_id' | 'team_id'>
        Update: Partial<KnockoutPick>
        Relationships: []
      }
      special_picks: {
        Row: SpecialPick & Record<string, unknown>
        Insert: Partial<SpecialPick> & Pick<SpecialPick, 'player_id' | 'pick_type'>
        Update: Partial<SpecialPick>
        Relationships: []
      }
      novelty_picks: {
        Row: NoveltyPick & Record<string, unknown>
        Insert: Partial<NoveltyPick> & Pick<NoveltyPick, 'player_id' | 'pick_type' | 'value'>
        Update: Partial<NoveltyPick>
        Relationships: []
      }
      player_scores: {
        Row: PlayerScore & Record<string, unknown>
        Insert: Partial<PlayerScore> & Pick<PlayerScore, 'player_id' | 'game_id'>
        Update: Partial<PlayerScore>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      match_stage: MatchStage
      match_status: MatchStatus
      special_pick_type: SpecialPickType
      novelty_pick_type: NoveltyPickType
    }
  }
}
