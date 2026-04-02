'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
import { GoalCelebration } from '@/components/ui/GoalCelebration'
import { staggerContainer, fadeIn } from '@/lib/animations'
import { NOVELTY_PTS, groupPts, applyJoker } from '@/lib/scoring'
import type {
  SpecialPickType,
  NoveltyPickType,
  GroupPick,
  SpecialPick,
  NoveltyPick,
  KnockoutPick,
} from '@/types/database'
import type { SpecialPicksState } from '@/components/picks/SpecialPickCard'
import type { NoveltyPicksState } from '@/components/picks/NoveltyPickCard'

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

// ── Local state shapes ───────────────────────────────────────────────────────

interface GroupPickLocal {
  firstPlace: string
  secondPlace: string
  isJoker: boolean
}

type GroupPicksLocal = Record<string, GroupPickLocal>

interface KnockoutPickLocal {
  selectedTeamId: string
  isJoker: boolean
}

type KnockoutPicksLocal = Record<number, KnockoutPickLocal>

// ── Helpers to seed local state from server data ─────────────────────────────

function seedGroupPicks(serverPicks: GroupPick[]): GroupPicksLocal {
  const result: GroupPicksLocal = {}
  for (const letter of GROUP_LETTERS) {
    const p1 = serverPicks.find((p) => p.group_letter === letter && p.position === 1)
    const p2 = serverPicks.find((p) => p.group_letter === letter && p.position === 2)
    result[letter] = {
      firstPlace: p1 ? String(p1.team_id) : '',
      secondPlace: p2 ? String(p2.team_id) : '',
      isJoker: p1?.is_joker ?? false,
    }
  }
  return result
}

const SPECIAL_PICK_TYPES: SpecialPickType[] = [
  'tournament_winner',
  'runner_up',
  'golden_boot',
  'young_player',
  'golden_glove',
  'group_stage_exit',
]

function seedSpecialPicks(serverPicks: SpecialPick[]): SpecialPicksState {
  const result = {} as SpecialPicksState
  for (const pt of SPECIAL_PICK_TYPES) {
    const sp = serverPicks.find((p) => p.pick_type === pt)
    result[pt] = {
      teamId: sp?.team_id ? String(sp.team_id) : '',
      playerName: sp?.player_name ?? '',
      isJoker: sp?.is_joker ?? false,
    }
  }
  return result
}

const NOVELTY_PICK_TYPES: NoveltyPickType[] = [
  'host_performance',
  'final_penalty',
  'most_cards',
  'biggest_upset',
  'first_goal',
  'hat_trick',
  'own_goal',
]

function seedNoveltyPicks(serverPicks: NoveltyPick[]): NoveltyPicksState {
  const result = {} as NoveltyPicksState
  for (const pt of NOVELTY_PICK_TYPES) {
    const np = serverPicks.find((p) => p.pick_type === pt)
    result[pt] = np?.value ?? ''
  }
  return result
}

function seedKnockoutPicks(serverPicks: KnockoutPick[]): KnockoutPicksLocal {
  const result: KnockoutPicksLocal = {}
  for (const kp of serverPicks) {
    result[kp.match_id] = {
      selectedTeamId: String(kp.team_id),
      isJoker: kp.is_joker,
    }
  }
  return result
}

// ── Explainer card ────────────────────────────────────────────────────────────

function ExplainerCard({ text }: { text: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-l-4 border-indigo-500/60 bg-indigo-950/30 rounded-r-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">How it works</span>
        <span className="text-indigo-400 text-xs">{open ? '▲ hide' : '▼ show'}</span>
      </button>
      {open && (
        <p className="px-4 pb-4 text-sm text-indigo-200/80 leading-relaxed">{text}</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerPickSheetPage() {
  const params = useParams<{ pin: string; token: string }>()
  const { pin: gamePin, token } = params
  const router = useRouter()

  const { player, loading: playerLoading, error: playerError } = usePlayer(gamePin, token)
  const { teamsByGroup, teams, loading: teamsLoading } = useTeams()
  const {
    groupPicks: serverGroupPicks,
    knockoutPicks: serverKnockoutPicks,
    specialPicks: serverSpecialPicks,
    noveltyPicks: serverNoveltyPicks,
    loading: picksLoading,
    refetch,
  } = usePicks(player?.id ?? '')
  const { matches: knockoutMatches, loading: matchesLoading } = useMatches({ stage: 'R32' })

  const [activeStep, setActiveStep] = useState<PickStep>('groups')
  const [paidToggling, setPaidToggling] = useState(false)
  const [paidError, setPaidError] = useState('')

  // ── Local pick state ──────────────────────────────────────────────────────
  const [groupPicksLocal, setGroupPicksLocal] = useState<GroupPicksLocal>({})
  const [specialPicksLocal, setSpecialPicksLocal] = useState<SpecialPicksState>(() => {
    const result = {} as SpecialPicksState
    for (const pt of SPECIAL_PICK_TYPES) {
      result[pt] = { teamId: '', playerName: '', isJoker: false }
    }
    return result
  })
  const [noveltyPicksLocal, setNoveltyPicksLocal] = useState<NoveltyPicksState>(() => {
    const result = {} as NoveltyPicksState
    for (const pt of NOVELTY_PICK_TYPES) {
      result[pt] = ''
    }
    return result
  })
  const [knockoutPicksLocal, setKnockoutPicksLocal] = useState<KnockoutPicksLocal>({})

  // ── Dirty state per section ───────────────────────────────────────────────
  const [groupsDirty, setGroupsDirty] = useState(false)
  const [specialsDirty, setSpecialsDirty] = useState(false)
  const [noveltyDirty, setNoveltyDirty] = useState(false)
  const [knockoutDirty, setKnockoutDirty] = useState(false)

  // ── Save state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)

  // ── Seed local state once server data arrives ─────────────────────────────
  // Track whether we've already seeded so we don't overwrite user edits on refetch
  const seededRef = useRef(false)

  useEffect(() => {
    if (picksLoading) return
    if (seededRef.current) return
    seededRef.current = true
    setGroupPicksLocal(seedGroupPicks(serverGroupPicks))
    setSpecialPicksLocal(seedSpecialPicks(serverSpecialPicks))
    setNoveltyPicksLocal(seedNoveltyPicks(serverNoveltyPicks))
    setKnockoutPicksLocal(seedKnockoutPicks(serverKnockoutPicks))
  }, [picksLoading, serverGroupPicks, serverSpecialPicks, serverNoveltyPicks, serverKnockoutPicks])

  // ── Determine completed steps ─────────────────────────────────────────────
  const completedSteps: PickStep[] = []
  const groupGroups = Object.keys(teamsByGroup).length
  const groupPickGroups = new Set(serverGroupPicks.map((p) => p.group_letter)).size
  if (groupPickGroups >= Math.min(groupGroups, 10)) completedSteps.push('groups')
  if (serverSpecialPicks.length >= 6) completedSteps.push('specials')
  if (serverNoveltyPicks.length >= 7) completedSteps.push('novelty')
  if (knockoutMatches.length > 0 && serverKnockoutPicks.length >= knockoutMatches.length)
    completedSteps.push('knockout')
  if (completedSteps.length >= 3) completedSteps.push('done')

  // ── Group picks computed ──────────────────────────────────────────────────
  const groupJokerUsed = Object.values(groupPicksLocal).some((p) => p.isJoker)

  // ── Knockout joker per stage (from local state + matches) ─────────────────
  const knockoutJokerByStage: Record<string, boolean> = {}
  for (const match of knockoutMatches) {
    const lp = knockoutPicksLocal[match.id]
    if (lp?.isJoker) {
      knockoutJokerByStage[match.stage] = true
    }
  }

  // ── Potential points for groups (no odds data, so show placeholder only when both picked) ──
  // We can compute a rough estimate using groupPts(median-ish odds ~3.0) but show "pts vary"
  // since real odds are not in local scope. The card displays its own ptsDisplay logic.
  // potentialPoints passed as undefined means the card shows "pts vary by odds" fallback.

  // ── Novelty total potential points ───────────────────────────────────────
  const noveltyPotentialTotal = NOVELTY_PICK_TYPES.reduce((sum, pt) => {
    const val = noveltyPicksLocal[pt]
    return sum + (val && val.trim() ? (NOVELTY_PTS[pt] ?? 0) : 0)
  }, 0)

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGroupChange = useCallback(
    (letter: string, first: string, second: string, joker: boolean) => {
      setGroupPicksLocal((prev) => ({ ...prev, [letter]: { firstPlace: first, secondPlace: second, isJoker: joker } }))
      setGroupsDirty(true)
    },
    []
  )

  const handleSpecialChange = useCallback(
    (pickType: SpecialPickType, field: 'teamId' | 'playerName' | 'isJoker', value: string | boolean) => {
      setSpecialPicksLocal((prev) => ({
        ...prev,
        [pickType]: { ...prev[pickType], [field]: value },
      }))
      setSpecialsDirty(true)
    },
    []
  )

  const handleNoveltyChange = useCallback((pickType: NoveltyPickType, value: string) => {
    setNoveltyPicksLocal((prev) => ({ ...prev, [pickType]: value }))
    setNoveltyDirty(true)
  }, [])

  const handleKnockoutChange = useCallback(
    (matchId: number, teamId: string, joker: boolean) => {
      setKnockoutPicksLocal((prev) => ({ ...prev, [matchId]: { selectedTeamId: teamId, isJoker: joker } }))
      setKnockoutDirty(true)
    },
    []
  )

  // ── Batch save ────────────────────────────────────────────────────────────
  const handleSaveAll = useCallback(async () => {
    if (!player) return
    setSaving(true)
    setSaveError('')

    try {
      const saves: Promise<Response>[] = []

      if (activeStep === 'groups') {
        for (const letter of GROUP_LETTERS) {
          const lp = groupPicksLocal[letter]
          if (!lp) continue
          if (lp.firstPlace) {
            saves.push(
              fetch('/api/picks/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  player_id: player.id,
                  group_letter: letter,
                  team_id: Number(lp.firstPlace),
                  position: 1,
                  is_joker: lp.isJoker,
                }),
              })
            )
          }
          if (lp.secondPlace) {
            saves.push(
              fetch('/api/picks/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  player_id: player.id,
                  group_letter: letter,
                  team_id: Number(lp.secondPlace),
                  position: 2,
                  is_joker: false,
                }),
              })
            )
          }
        }
      }

      if (activeStep === 'specials') {
        for (const pt of SPECIAL_PICK_TYPES) {
          const sp = specialPicksLocal[pt]
          const hasValue = sp.teamId || sp.playerName.trim()
          if (!hasValue) continue
          saves.push(
            fetch('/api/picks/special', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                player_id: player.id,
                pick_type: pt,
                team_id: sp.teamId ? Number(sp.teamId) : undefined,
                player_name: sp.playerName.trim() || undefined,
                is_joker: sp.isJoker,
              }),
            })
          )
        }
      }

      if (activeStep === 'novelty') {
        for (const pt of NOVELTY_PICK_TYPES) {
          const val = noveltyPicksLocal[pt]
          if (!val.trim()) continue
          saves.push(
            fetch('/api/picks/novelty', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                player_id: player.id,
                pick_type: pt,
                value: val.trim(),
              }),
            })
          )
        }
      }

      if (activeStep === 'knockout') {
        for (const match of knockoutMatches) {
          const lp = knockoutPicksLocal[match.id]
          if (!lp?.selectedTeamId) continue
          saves.push(
            fetch('/api/picks/knockout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                player_id: player.id,
                match_id: match.id,
                team_id: Number(lp.selectedTeamId),
                is_joker: lp.isJoker,
              }),
            })
          )
        }
      }

      if (saves.length === 0) {
        // Nothing to save, just clear dirty
      } else {
        const results = await Promise.all(saves)
        const failed = results.find((r) => !r.ok)
        if (failed) {
          const json = await failed.json().catch(() => ({}))
          throw new Error((json as { error?: string }).error ?? 'Failed to save picks')
        }
      }

      // Clear dirty flag for current section
      if (activeStep === 'groups') setGroupsDirty(false)
      if (activeStep === 'specials') setSpecialsDirty(false)
      if (activeStep === 'novelty') setNoveltyDirty(false)
      if (activeStep === 'knockout') setKnockoutDirty(false)

      refetch()
      setShowCelebration(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [
    player,
    activeStep,
    groupPicksLocal,
    specialPicksLocal,
    noveltyPicksLocal,
    knockoutPicksLocal,
    knockoutMatches,
    refetch,
  ])

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

  // ── Team lookup ───────────────────────────────────────────────────────────
  const teamMap = new Map(teams.map((t) => [t.id, t]))

  // ── Dirty flag for active step ────────────────────────────────────────────
  const isDirty =
    (activeStep === 'groups' && groupsDirty) ||
    (activeStep === 'specials' && specialsDirty) ||
    (activeStep === 'novelty' && noveltyDirty) ||
    (activeStep === 'knockout' && knockoutDirty)

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950">
      <GoalCelebration
        show={showCelebration}
        onClose={() => setShowCelebration(false)}
        message="Picks saved!"
      />

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

      <main className="max-w-3xl mx-auto px-4 py-6 pb-36 space-y-6">
        {/* Progress bar */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible">
          <ProgressBar currentStep={activeStep} completedSteps={completedSteps} />
        </motion.div>

        {/* Step tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(['groups', 'specials', 'novelty', 'knockout'] as PickStep[]).map((step) => {
            const stepDirty =
              (step === 'groups' && groupsDirty) ||
              (step === 'specials' && specialsDirty) ||
              (step === 'novelty' && noveltyDirty) ||
              (step === 'knockout' && knockoutDirty)
            return (
              <button
                key={step}
                onClick={() => setActiveStep(step)}
                className={[
                  'flex-shrink-0 relative px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize',
                  activeStep === step
                    ? 'bg-amber-500 text-gray-950'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700',
                ].join(' ')}
              >
                {step === 'knockout' ? 'Knockout' : step.charAt(0).toUpperCase() + step.slice(1)}
                {stepDirty && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-gray-950" />
                )}
              </button>
            )
          })}
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
              <ExplainerCard text="Pick 1st and 2nd place in up to 10 groups (minimum 8). Maximum 6 favourite picks allowed. Your best 7 scores count — worst 3 are dropped. Use your ONE joker to multiply points by 1.5×." />
            </motion.div>
            {GROUP_LETTERS.map((letter) => {
              const groupTeams = teamsByGroup[letter] ?? []
              const lp = groupPicksLocal[letter] ?? { firstPlace: '', secondPlace: '', isJoker: false }
              const bothPicked = !!lp.firstPlace && !!lp.secondPlace
              const jokerActive = lp.isJoker
              // Potential points: no real odds available, leave as undefined to show "pts vary" fallback
              // But if we had odds we'd compute groupPts(odds); for now pass undefined
              const pts: number | undefined = bothPicked
                ? applyJoker(groupPts(3.0), jokerActive) // rough estimate with odds≈3
                : undefined

              return (
                <motion.div key={letter} variants={fadeIn}>
                  <GroupPickCard
                    groupLetter={letter}
                    teams={groupTeams}
                    firstPlace={lp.firstPlace}
                    secondPlace={lp.secondPlace}
                    isJoker={lp.isJoker}
                    locked={false}
                    onChange={(first, second, joker) => handleGroupChange(letter, first, second, joker)}
                    jokerUsed={groupJokerUsed}
                    potentialPoints={pts}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* ── Specials section ── */}
        {activeStep === 'specials' && (
          <motion.div key="specials" variants={fadeIn} initial="hidden" animate="visible" className="space-y-4">
            <ExplainerCard text="Predict tournament outcomes and individual awards. Points are based on betting odds — bigger underdogs earn more points. Use your ONE joker wisely." />
            <SpecialPickCard
              teams={teams}
              values={specialPicksLocal}
              locked={false}
              jokerUsedType={
                (Object.entries(specialPicksLocal).find(([, v]) => v.isJoker)?.[0] as SpecialPickType) ?? null
              }
              onChange={handleSpecialChange}
            />
          </motion.div>
        )}

        {/* ── Novelty section ── */}
        {activeStep === 'novelty' && (
          <motion.div key="novelty" variants={fadeIn} initial="hidden" animate="visible" className="space-y-4">
            <ExplainerCard text="Answer 7 fun World Cup questions for bonus points. Fixed points per correct answer — no odds involved." />
            {noveltyPotentialTotal > 0 && (
              <p className="text-sm text-gray-400">
                Potential points if all correct:{' '}
                <span className="text-amber-400 font-semibold">{noveltyPotentialTotal} pts</span>
              </p>
            )}
            <NoveltyPickCard
              values={noveltyPicksLocal}
              locked={false}
              onChange={handleNoveltyChange}
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
            <motion.div variants={fadeIn}>
              <ExplainerCard text="Pick the winner of each knockout match. Points increase in later rounds. ONE joker per round." />
            </motion.div>
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
                const lp = knockoutPicksLocal[match.id] ?? { selectedTeamId: '', isJoker: false }
                const jokerUsedInRound = !!knockoutJokerByStage[match.stage]

                return (
                  <motion.div key={match.id} variants={fadeIn}>
                    <KnockoutPickCard
                      match={match}
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      selectedTeamId={lp.selectedTeamId}
                      isJoker={lp.isJoker}
                      locked={false}
                      onChange={handleKnockoutChange}
                      jokerUsedInRound={jokerUsedInRound}
                    />
                  </motion.div>
                )
              })
            )}
          </motion.div>
        )}
      </main>

      {/* ── Fixed bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-md border-t border-gray-800/60 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Payment toggle */}
          <button
            onClick={handlePaymentToggle}
            disabled={paidToggling}
            className={[
              'flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-colors flex-shrink-0',
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

          {paidError && <p className="text-red-400 text-xs flex-1">{paidError}</p>}

          <div className="flex-1" />

          {/* Save error */}
          {saveError && (
            <p className="text-red-400 text-xs max-w-[160px] text-right leading-tight">{saveError}</p>
          )}

          {/* Save All button */}
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className={[
              'relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
              'bg-amber-500 hover:bg-amber-400 text-gray-950 shadow-lg shadow-amber-500/30',
              saving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer active:scale-95',
            ].join(' ')}
          >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-base">⚽</span>
            )}
            <span>{saving ? 'Saving…' : 'Save Picks'}</span>
            {isDirty && !saving && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 border-2 border-gray-950 text-white text-[9px] font-bold">
                !
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
