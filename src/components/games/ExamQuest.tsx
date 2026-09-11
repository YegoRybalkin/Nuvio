import { CheckCircle2, Lock, Target, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionQueueRunner from '../QuestionQueueRunner'
import { useCourseStore } from '../../store/useCourseStore'
import type { Concept, Course, MasteryState, Question, Topic } from '../../types'

const UNLOCK_THRESHOLD = 60
const COMPLETE_THRESHOLD = 80

function topicAvg(topic: Topic, masteryStates: MasteryState[]): number {
  const scores = topic.conceptIds.map((cid) => masteryStates.find((m) => m.conceptId === cid)?.score ?? 0)
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
}

/** Topic progression gated by demonstrated mastery, not time spent - each
 * topic unlocks once the previous one clears the unlock threshold, and the
 * final mission (a mock exam) unlocks once every topic does. */
export default function ExamQuest({
  course,
  topics,
  concepts,
  questions,
  masteryStates,
}: {
  course: Course
  topics: Topic[]
  concepts: Concept[]
  questions: Question[]
  masteryStates: MasteryState[]
}) {
  const allExams = useCourseStore((s) => s.exams)
  const exams = useMemo(() => allExams.filter((e) => e.courseId === course.id), [allExams, course.id])
  const navigate = useNavigate()
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null)

  if (activeTopic) {
    const topicQuestions = questions.filter((q) => q.topicId === activeTopic.id).sort(() => Math.random() - 0.5).slice(0, 10)
    return (
      <div>
        <button type="button" onClick={() => setActiveTopic(null)} className="mb-4 text-xs text-muted hover:text-ink">
          ← Back to quest map
        </button>
        <QuestionQueueRunner
          questions={topicQuestions}
          concepts={concepts}
          source="game"
          askConfidence
          completionLabel={`${activeTopic.name} mission complete`}
          onExit={() => setActiveTopic(null)}
        />
      </div>
    )
  }

  const nextExam = [...exams].sort((a, b) => a.date - b.date)[0]
  const allUnlocked = topics.every((t) => topicAvg(t, masteryStates) >= UNLOCK_THRESHOLD)

  return (
    <div className="mx-auto max-w-lg">
      <h3 className="mb-4 flex items-center gap-1.5 font-display text-lg font-semibold text-ink">
        <Target size={18} className="text-brand-400" />
        {course.name} Exam Quest
      </h3>
      <div className="space-y-2">
        {topics.map((topic, i) => {
          const avg = topicAvg(topic, masteryStates)
          const prevAvg = i === 0 ? 100 : topicAvg(topics[i - 1], masteryStates)
          const unlocked = i === 0 || prevAvg >= UNLOCK_THRESHOLD
          const complete = avg >= COMPLETE_THRESHOLD
          return (
            <button
              key={topic.id}
              type="button"
              disabled={!unlocked}
              onClick={() => setActiveTopic(topic)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                !unlocked
                  ? 'cursor-not-allowed border-white/5 bg-bg/20 text-muted opacity-60'
                  : complete
                    ? 'border-accent-500/40 bg-accent-500/10 text-accent-400 hover:border-accent-500/60'
                    : 'border-white/10 bg-surface text-ink hover:border-brand-500/40'
              }`}
            >
              <span>{topic.name}</span>
              <span className="flex items-center gap-2 text-xs">
                {avg}%
                {!unlocked ? <Lock size={14} /> : complete ? <CheckCircle2 size={14} /> : null}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          disabled={!allUnlocked || !nextExam}
          onClick={() => nextExam && navigate(`/exams/${nextExam.id}/mock`)}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
            allUnlocked && nextExam
              ? 'border-brand-500/50 bg-brand-500/10 text-brand-400 hover:border-brand-500/70'
              : 'cursor-not-allowed border-white/5 bg-bg/20 text-muted opacity-60'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Trophy size={15} />
            Final Mission - Mock Exam
          </span>
          {!allUnlocked && <Lock size={14} />}
        </button>
        {allUnlocked && !nextExam && (
          <p className="text-center text-xs text-muted">Add an exam in this course's Exams tab to unlock the final mission.</p>
        )}
      </div>
    </div>
  )
}
