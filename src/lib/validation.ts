import { z } from 'zod'

export const joinGameSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(30, 'Name must be 30 characters or fewer'),
  gamePin: z.string().length(6, 'Game PIN must be exactly 6 characters'),
})

export const groupPickSchema = z.object({
  player_id: z.string().uuid('Invalid player ID'),
  group_letter: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'], {
    errorMap: () => ({ message: 'group_letter must be A–L' }),
  }),
  team_id: z.number().int().positive('team_id must be a positive integer'),
  position: z.union([z.literal(1), z.literal(2)], {
    errorMap: () => ({ message: 'position must be 1 or 2' }),
  }),
  is_joker: z.boolean(),
})

export const knockoutPickSchema = z.object({
  player_id: z.string().uuid('Invalid player ID'),
  match_id: z.number().int().positive('match_id must be a positive integer'),
  team_id: z.number().int().positive('team_id must be a positive integer'),
  is_joker: z.boolean(),
})

export const specialPickSchema = z.object({
  player_id: z.string().uuid('Invalid player ID'),
  pick_type: z.enum(
    ['tournament_winner', 'runner_up', 'golden_boot', 'young_player', 'golden_glove', 'group_stage_exit'],
    { errorMap: () => ({ message: 'Invalid pick_type' }) }
  ),
  team_id: z.number().int().positive().optional(),
  player_name: z.string().max(100).optional(),
  is_joker: z.boolean(),
})

export const noveltyPickSchema = z.object({
  player_id: z.string().uuid('Invalid player ID'),
  pick_type: z.enum(
    ['host_performance', 'final_penalty', 'most_cards', 'biggest_upset', 'first_goal', 'hat_trick', 'own_goal'],
    { errorMap: () => ({ message: 'Invalid pick_type' }) }
  ),
  value: z.string().min(1, 'value is required').max(255),
})

export const paymentToggleSchema = z.object({
  player_id: z.string().uuid('Invalid player ID'),
  has_paid: z.boolean(),
})

export const createGameSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  entry_fee: z.number().nonnegative().optional(),
})

export type JoinGameInput = z.infer<typeof joinGameSchema>
export type GroupPickInput = z.infer<typeof groupPickSchema>
export type KnockoutPickInput = z.infer<typeof knockoutPickSchema>
export type SpecialPickInput = z.infer<typeof specialPickSchema>
export type NoveltyPickInput = z.infer<typeof noveltyPickSchema>
export type PaymentToggleInput = z.infer<typeof paymentToggleSchema>
export type CreateGameInput = z.infer<typeof createGameSchema>
