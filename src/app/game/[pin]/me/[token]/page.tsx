'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { usePlayer } from '@/hooks/usePlayer'
import { useTeams } from '@/hooks/useTeams'
import { usePicks } from '@/hooks/usePicks'
import { useMatches } from '@/hooks/useMatches'
import { ProgressBar, PickStep } from '@/components/ui/ProgressBar'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { GroupPickCard } from '@/components/picks/GroupPickCard'
import { SpecialPickCard } from '@/components/picks/SpecialPickCard'
import { NoveltyPickCard } from '@/components/picks/NoveltyPickCard'
import { KnockoutPickCard } from '@/components/picks/KnockoutPickCard'
import { staggerContainer, fadeIn } from '@/lib/animations'
import type { SpecialPickType, NoveltyPickType } from '@/types/database'

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function PlayerPickSheetPage() {
  const params = useParams<{ pin: string; token: string }>()
  const { pin: gamePin, token } = params
  const router = useRouter()

  const { player, loading: playerLoading, error: playerError } = usePlayer(gamePin, token)
  const { teamsByGroup, teams, loading: teamsLoading } = useTeams()
  const { groupPicks, knockoutPicks, specialPicks, noveltyPicks, loading: picksLoading, refetch } = usePicks(
    player?.id ?? ''
  )
  const { matches: knockoutMatches, loading: matchesLoading } = useMatches({ stage: 'R32' })

  const [activeStep, setActiveStep] = useState<PickStep>('groups')
  const [paidToggling, setPaidToggling] = useState(false)
  const [paidError, setPaidError] = useState('')

  // Determine completed steps based on pick counts
  const completedSteps: PickStep[] = []
  const groupGroups = Object.keys(teamsByGroup).length
  const groupPickGroups = new Set(groupPicks.map((p) => p.group_letter)).size
  if (groupPickGroups >= Math.min(groupGroups, 10)) completedSteps.push('groups')
  if (specialPicks.length >= 6) completedSteps.push('specials')
  if (noveltyPicks.length >= 7) completedSteps.push('novelty')
  if (knockoutMatches.length > 0 && knockoutPicks.length >= knockoutMatches.length)
    completedSteps.push('knockout')
  if (completedSteps.length >= 3) completedSteps.push('done')

  // ── Group picks save ──────────────────────────────────────────────────────
  const handleGroupSave = useCallback(
    async (
      groupLetter: string,
      firstTeamId: number | null,
      secondTeamId: number | null,
      isJoker: boolean
    ) => {
      const saves: Promise<Response>[] = []
      if (firstTeamId) {
        saves.push(
          fetch('/api/picks/group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              player_id: player!.id,
              group_letter: groupLetter,
              team_id: firstTeamId,
              position: 1,
              is_joker: isJoker,
            }),
          })
        )
      }
      if (secondTeamId) {
        saves.push(
          fetch('/api/picks/group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              player_id: player!.id,
              group_letter: groupLetter,
              team_id: secondTeamId,
              position: 2,
              is_joker: false,
            }),
          })
        )
      }
      const results = await Promise.all(saves)
      const failed = results.find((r) => !r.ok)
      if (failed) {
        const json = await failed.json()
        throw new Error(json.error ?? 'Failed to save')
      }
      refetch()
    },
    [player, refetch]
  )

  // ── Special picks save ────────────────────────────────────────────────────
  const handleSpecialSave = useCallback(
    async (
      pickType: SpecialPickType,
      teamId: number | null,
      playerName: string | null,
      isJoker: boolean
    ) => {
      const res = await fetch('/api/picks/special', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player!.id,
          pick_type: pickType,
          team_id: teamId ?? undefined,
          player_name: playerName ?? undefined,
          is_joker: isJoker,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to save')
      }
      refetch()
    },
    [player, refetch]
  )

  // ── Novelty picks save ────────────────────────────────────────────────────
  const handleNoveltySave = useCallback(
    async (pickType: NoveltyPickType, value: string) => {
      const res = await fetch('/api/picks/novelty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player!.id,
          pick_type: pickType,
          value,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to save')
      }
      refetch()
    },
    [player, refetch]
  )

  // ── Knockout picks save ───────────────────────────────────────────────────
  const handleKnockoutSave = useCallback(
    async (matchId: number, teamId: number, isJoker: boolean) => {
      const res = await fetch('/api/picks/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player!.id,
          match_id: matchId,
          team_id: teamId,
          is_joker: isJoker,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to save')
      }
      refetch()
    },
    [player, refetch]
  )

  // ── Payment toggle ────────────────────────────────────────────────────────
  async function handlePaymentToggle() {
    if (!player) return
    setPaidToggling(true)
    setPaidError('')
    try {
      const res = await fetch(`/api/players/${player.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ has_paid: !player.has_paid }),
      })
      if (!res.ok) {
        const json = await res.json()
        setPaidError(json.error ?? 'Failed to update payment')
      } else {
        refetch()
      }
    } catch {
      setPaidError('Network error')
    } finally {
      setPaidToggling(false)
    }
  }

  const isLoading = playerLoading || teamsLoading || picksLoading

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your picks…</p>
        </div>
      </div>
    )
  }

  // ── Player not found / bad token ──────────────────────────────────────────
  if (playerError || !player) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-2xl">🔐</p>
          <h1 className="text-xl font-bold text-white">Access denied</h1>
          <p className="text-gray-400 text-sm max-w-xs">
            {playerError ?? 'Player not found. Your link may be invalid.'}
          </p>
          <Button variant="secondary" onClick={() => router.push('/')}>
            Go home
          </Button>
        </div>
      </div>
    )
  }

  // Joker tracking for groups
  const groupJokerUsed = groupPicks.some((p) => p.is_joker)

  // Joker tracking for knockout by stage
  const knockoutJokerByStage: Record<string, boolean> = {}
  for (const kp of knockoutPicks) {
    if (kp.is_joker) {
      const match = knockoutMatches.find((m) => m.id === kp.match_id)
      if (match) knockoutJokerByStage[match.stage] = true
    }
  }

  // Build team lookup map
  const teamMap = new Map(teams.map((t) => [t.id, t]))

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/60">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={player.name} color={player.avatar_color} size="sm" />
            <div>
              <p className="text-sm font-semibold text-white leading-none">{player.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Game {gamePin}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push(`/game/${gamePin}/leaderboard`)}
            className="text-xs px-3 py-1.5"
          >
            Leaderboard →
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Progress bar */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible">
          <ProgressBar currentStep={activeStep} completedSteps={completedSteps} />
        </motion.div>

        {/* Step tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(['groups', 'specials', 'novelty', 'knockout'] as PickStep[]).map((step) => (
            <button
              key={step}
              onClick={() => setActiveStep(step)}
              className={[
                'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize',
                activeStep === step
                  ? 'bg-amber-500 text-gray-950'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700',
              ].join(' ')}
            >
              {step === 'knockout' ? 'Knockout' : step.charAt(0).toUpperCase() + step.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Groups section ── */}
        {activeStep === 'groups' && (
          <motion.div
            key="groups"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.div variants={fadeIn}>
              <p className="text-sm text-gray-400 mb-1">
                Pick the top 2 teams for up to <span className="text-white font-medium">10 groups</span>. Use your 1 joker to double your points for one group.
              </p>
            </motion.div>
            {GROUP_LETTERS.map((letter) => {
              const groupTeams = teamsByGroup[letter] ?? []
              const picks = groupPicks.filter((p) => p.group_letter === letter)
              return (
                <motion.div key={letter} variants={fadeIn}>
                  <GroupPickCard
                    groupLetter={letter}
                    teams={groupTeams}
                    playerId={player.id}
                    existingPicks={picks}
                    locked={false}
                    onSave={handleGroupSave}
                    jokerUsed={groupJokerUsed}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* ── Specials section ── */}
        {activeStep === 'specials' && (
          <motion.div key="specials" variants={fadeIn} initial="hidden" animate="visible">
            <p className="text-sm text-gray-400 mb-4">
              Predict individual award winners and tournament outcomes. One joker available.
            </p>
            <SpecialPickCard
              playerId={player.id}
              teams={teams}
              existingPicks={specialPicks}
              locked={false}
              onSave={handleSpecialSave}
            />
          </motion.div>
        )}

        {/* ── Novelty section ── */}
        {activeStep === 'novelty' && (
          <motion.div key="novelty" variants={fadeIn} initial="hidden" animate="visible">
            <p className="text-sm text-gray-400 mb-4">
              Answer 7 fun questions about the tournament for bonus points.
            </p>
            <NoveltyPickCard
              playerId={player.id}
              existingPicks={noveltyPicks}
              locked={false}
              onSave={handleNoveltySave}
            />
          </motion.div>
        )}

        {/* ── Knockout section ── */}
        {activeStep === 'knockout' && (
          <motion.div
            key="knockout"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {matchesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : knockoutMatches.length === 0 ? (
              <motion.div variants={fadeIn}>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-3xl">🔒</p>
                  <h3 className="text-white font-semibold">Knockout fixtures not yet confirmed</h3>
                  <p className="text-gray-400 text-sm">
                    Knockout picks will open once the group stage is complete and matches are confirmed.
                  </p>
                </div>
              </motion.div>
            ) : (
              knockoutMatches.map((match) => {
                const homeTeam = match.home_team_id ? teamMap.get(match.home_team_id) : undefined
                const awayTeam = match.away_team_id ? teamMap.get(match.away_team_id) : undefined
                const existingPick = knockoutPicks.find((kp) => kp.match_id === match.id)
                const jokerUsedInRound = !!knockoutJokerByStage[match.stage]

                return (
                  <motion.div key={match.id} variants={fadeIn}>
                    <KnockoutPickCard
                      match={match}
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      existingPick={existingPick}
                      locked={false}
                      onSave={handleKnockoutSave}
                      jokerUsedInRound={jokerUsedInRound}
                    />
                  </motion.div>
                )
              })
            )}
          </motion.div>
        )}
      </main>

      {/* Bottom bar: payment toggle + leaderboard link */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-md border-t border-gray-800/60 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={handlePaymentToggle}
            disabled={paidToggling}
            className={[
              'flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-colors',
              player.has_paid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600',
              paidToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {paidToggling ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{player.has_paid ? '✓' : '○'}</span>
            )}
            <span>I&apos;ve paid</span>
          </button>
          {paidError && <p className="text-red-400 text-xs">{paidError}</p>}
          <Button
            variant="secondary"
            onClick={() => router.push(`/game/${gamePin}/leaderboard`)}
            className="text-xs px-3 py-1.5"
          >
            View Leaderboard
          </Button>
        </div>
      </div>
    </div>
  )
}
