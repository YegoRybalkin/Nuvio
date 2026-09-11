import { useMemo } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import BeatYourself from '../components/games/BeatYourself'
import BossBattle from '../components/games/BossBattle'
import CalculationArena from '../components/games/CalculationArena'
import CaseDetective from '../components/games/CaseDetective'
import ErrorRevenge from '../components/games/ErrorRevenge'
import ExamQuest from '../components/games/ExamQuest'
import KnowledgeDuel from '../components/games/KnowledgeDuel'
import Mystery from '../components/games/Mystery'
import Survival from '../components/games/Survival'
import SpeedRound from '../components/games/SpeedRound'
import { useCourseStore } from '../store/useCourseStore'
import type { GameMode } from '../types'

export default function GamePlay() {
  const { mode } = useParams<{ mode: string }>()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const navigate = useNavigate()

  const course = useCourseStore((s) => s.courses.find((c) => c.id === courseId))
  const allTopics = useCourseStore((s) => s.topics)
  const allConcepts = useCourseStore((s) => s.concepts)
  const allQuestions = useCourseStore((s) => s.questions)
  const allMasteryStates = useCourseStore((s) => s.masteryStates)
  const allErrors = useCourseStore((s) => s.errors)
  const topics = useMemo(() => allTopics.filter((t) => t.courseId === courseId), [allTopics, courseId])
  const concepts = useMemo(() => allConcepts.filter((c) => c.courseId === courseId), [allConcepts, courseId])
  const questions = useMemo(() => allQuestions.filter((q) => q.courseId === courseId), [allQuestions, courseId])
  const masteryStates = useMemo(() => allMasteryStates.filter((m) => m.courseId === courseId), [allMasteryStates, courseId])
  const errors = useMemo(() => allErrors.filter((e) => e.courseId === courseId && !e.corrected), [allErrors, courseId])

  const weakestTopic = useMemo(() => {
    if (topics.length === 0) return undefined
    return [...topics].sort((a, b) => {
      const avg = (t: (typeof topics)[number]) => {
        const scores = t.conceptIds.map((cid) => masteryStates.find((m) => m.conceptId === cid)?.score ?? 0)
        return scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0
      }
      return avg(a) - avg(b)
    })[0]
  }, [topics, masteryStates])

  const onExit = () => navigate(`/games?courseId=${courseId}`)

  if (!course || !mode) return <Navigate to="/games" replace />

  const gameMode = mode as GameMode

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button type="button" onClick={onExit} className="mb-4 text-xs text-muted hover:text-ink">
        ← Back to Games
      </button>

      {gameMode === 'survival' && <Survival pool={questions} concepts={concepts} courseId={course.id} onExit={onExit} />}
      {gameMode === 'boss_battle' && (
        <BossBattle
          pool={weakestTopic ? questions.filter((q) => q.topicId === weakestTopic.id) : questions}
          concepts={concepts}
          courseId={course.id}
          bossName={weakestTopic?.name ?? course.name}
          onExit={onExit}
        />
      )}
      {gameMode === 'speed_round' && <SpeedRound pool={questions} concepts={concepts} courseId={course.id} onExit={onExit} />}
      {gameMode === 'mystery' && <Mystery pool={questions} concepts={concepts} courseId={course.id} onExit={onExit} />}
      {gameMode === 'case_detective' && (
        <CaseDetective pool={weakestTopic ? questions.filter((q) => q.topicId === weakestTopic.id) : questions} concepts={concepts} topic={weakestTopic} onExit={onExit} />
      )}
      {gameMode === 'calculation_arena' && <CalculationArena pool={questions} concepts={concepts} courseId={course.id} onExit={onExit} />}
      {gameMode === 'error_revenge' && <ErrorRevenge errors={errors} questions={questions} concepts={concepts} courseId={course.id} onExit={onExit} />}
      {gameMode === 'knowledge_duel' && <KnowledgeDuel pool={questions} concepts={concepts} courseId={course.id} onExit={onExit} />}
      {gameMode === 'exam_quest' && (
        <ExamQuest course={course} topics={topics} concepts={concepts} questions={questions} masteryStates={masteryStates} />
      )}

      {['survival', 'boss_battle', 'speed_round', 'calculation_arena', 'knowledge_duel'].includes(gameMode) && (
        <div className="mt-6">
          <BeatYourself mode={gameMode} courseId={course.id} />
        </div>
      )}
    </div>
  )
}
