// Realistic demo content so the whole product can be tried immediately
// without uploading anything: two courses (a theory-heavy one and a
// quantitative one), each with topics, concepts, a question bank, a spread
// of past attempts (so mastery/spaced-review/error-log all have real data),
// and one upcoming exam. Loaded/removed via a button in Settings.
import type {
  Concept,
  Confidence,
  Correctness,
  DifficultyLevel,
  Course,
  Exam,
  ErrorRecord,
  Question,
  QuestionAttempt,
  Topic,
} from '../types'
import { categorizeError } from './errorLog'

const uid = () => crypto.randomUUID()
const DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number): number {
  return Date.now() - n * DAY
}

interface ConceptSeed {
  name: string
  definition: string
  learningObjective: string
  formula?: string
  examples: string[]
  misconceptions: string[]
  importance: Concept['importance']
}

interface QuestionSeed {
  type: Question['type']
  difficulty: DifficultyLevel
  prompt: string
  choices?: string[]
  correctIndex?: number
  correctAnswer: string
  numericAnswer?: number
  rubric: string[]
  explanation: string
}

/** attempt pattern entries: [daysAgo, correctness, confidence, hintsUsed] */
type AttemptPattern = [number, Correctness, Confidence, number]

function buildAttempt(question: Question, [days, correctness, confidence, hints]: AttemptPattern): QuestionAttempt {
  const score = correctness === 'correct' ? 85 + Math.round(Math.random() * 15) : correctness === 'partial' ? 45 + Math.round(Math.random() * 15) : Math.round(Math.random() * 20)
  return {
    id: uid(),
    questionId: question.id,
    conceptId: question.conceptId,
    topicId: question.topicId,
    courseId: question.courseId,
    difficulty: question.difficulty,
    timestamp: daysAgo(days),
    studentAnswer: correctness === 'correct' ? question.correctAnswer : '(demo answer)',
    correctness,
    score,
    feedback: {
      whatWasCorrect: correctness !== 'incorrect' ? 'Matches the key idea.' : '',
      whatWasMissing: correctness === 'partial' ? 'Missing part of the reasoning.' : '',
      whatWasWrong: correctness === 'incorrect' ? 'Does not match the expected answer.' : '',
      improvementTip: correctness === 'incorrect' ? 'Review this concept and retry.' : '',
    },
    confidence,
    hintsUsed: hints,
    responseTimeMs: 8000 + Math.round(Math.random() * 20000),
    gradedBy: question.type === 'mcq' ? 'mcq' : question.numericAnswer !== undefined ? 'deterministic' : 'ai',
    source: 'practice',
  }
}

function buildCourse(
  name: string,
  subjectType: Course['subjectType'],
  topicSeeds: { name: string; importance: Topic['importance']; concepts: (ConceptSeed & { questions: QuestionSeed[]; attemptPattern: AttemptPattern[] })[] }[],
) {
  const courseId = uid()
  const topics: Topic[] = []
  const concepts: Concept[] = []
  const questions: Question[] = []
  const attempts: QuestionAttempt[] = []
  const errors: ErrorRecord[] = []

  for (const topicSeed of topicSeeds) {
    const topicId = uid()
    const conceptIds: string[] = []

    for (const cSeed of topicSeed.concepts) {
      const conceptId = uid()
      conceptIds.push(conceptId)
      concepts.push({
        id: conceptId,
        courseId,
        topicId,
        name: cSeed.name,
        definition: cSeed.definition,
        learningObjective: cSeed.learningObjective,
        formula: cSeed.formula,
        examples: cSeed.examples,
        misconceptions: cSeed.misconceptions,
        sourceRefs: [],
        importance: cSeed.importance,
      })

      const conceptQuestions: Question[] = cSeed.questions.map((q) => ({
        id: uid(),
        courseId,
        topicId,
        conceptId,
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        choices: q.choices,
        correctIndex: q.correctIndex,
        correctAnswer: q.correctAnswer,
        numericAnswer: q.numericAnswer,
        tolerance: q.numericAnswer !== undefined ? 0.02 : undefined,
        rubric: q.rubric,
        explanation: q.explanation,
        sourceRefs: [],
        createdAt: daysAgo(20),
      }))
      questions.push(...conceptQuestions)

      for (let i = 0; i < cSeed.attemptPattern.length; i++) {
        const q = conceptQuestions[i % conceptQuestions.length]
        const attempt = buildAttempt(q, cSeed.attemptPattern[i])
        attempts.push(attempt)
        if (attempt.correctness !== 'correct') {
          errors.push({
            id: uid(),
            attemptId: attempt.id,
            questionId: q.id,
            conceptId,
            topicId,
            courseId,
            category: categorizeError(q, attempt),
            date: attempt.timestamp,
            corrected: attempt.timestamp < daysAgo(10),
            correctedAt: attempt.timestamp < daysAgo(10) ? daysAgo(9) : undefined,
            reviewAttemptIds: [],
          })
        }
      }
    }

    topics.push({ id: topicId, courseId, name: topicSeed.name, importance: topicSeed.importance, conceptIds })
  }

  const course: Course = {
    id: courseId,
    name,
    subjectType,
    createdAt: daysAgo(21),
    materialIds: [],
    topicIds: topics.map((t) => t.id),
    examIds: [],
    isDemo: true,
  }

  return { course, topics, concepts, questions, attempts, errors }
}

export function buildDemoData(): {
  courses: Course[]
  topics: Topic[]
  concepts: Concept[]
  questions: Question[]
  attempts: QuestionAttempt[]
  exams: Exam[]
  errors: ErrorRecord[]
} {
  const sociology = buildCourse('Sociology', 'theory', [
    {
      name: 'Sociological Perspectives',
      importance: 'core',
      concepts: [
        {
          name: 'Sociological Imagination',
          definition: 'The ability to see the connection between personal experiences and larger social forces.',
          learningObjective: 'Distinguish personal troubles from public issues using this lens.',
          examples: ['Unemployment as a personal trouble vs. a structural economic issue'],
          misconceptions: ['Treating it as just "being aware of society" rather than a specific analytic tool'],
          importance: 'core',
          questions: [
            { type: 'definition', difficulty: 1, prompt: 'What is the sociological imagination?', correctAnswer: 'The ability to connect personal experience to broader social/historical forces.', rubric: ['connects personal experience', 'to broader social forces'], explanation: 'Coined by C. Wright Mills.' },
            { type: 'explain_why', difficulty: 2, prompt: 'Explain the difference between a personal trouble and a public issue.', correctAnswer: 'A personal trouble is an individual-level problem; a public issue reflects a pattern across many people caused by social structure.', rubric: ['individual vs structural', 'pattern across people'], explanation: 'Mills’ core distinction.' },
            { type: 'scenario', difficulty: 3, prompt: 'A city loses several major employers and unemployment triples. Is this a personal trouble or a public issue? Why?', correctAnswer: 'A public issue - a structural cause (mass layoffs) is producing widespread individual hardship.', rubric: ['identifies public issue', 'cites structural cause'], explanation: 'Widespread, structurally-caused problems are public issues.' },
            { type: 'compare', difficulty: 4, prompt: 'How would conflict theory and functionalism each interpret the same factory closures?', correctAnswer: 'Conflict theory: closures reflect capital prioritizing profit over workers, deepening inequality. Functionalism: the economy self-corrects and displaced labor reallocates to restore equilibrium.', rubric: ['conflict theory answer', 'functionalist answer'], explanation: 'Different theories, different causal stories for the same event.' },
          ],
          attemptPattern: [
            [18, 'correct', 'medium', 0],
            [12, 'correct', 'high', 0],
            [5, 'correct', 'high', 0],
          ],
        },
        {
          name: 'Structural Functionalism',
          definition: 'A theory viewing society as a system of interdependent parts that work together to maintain stability.',
          learningObjective: 'Apply functionalist reasoning to explain why a social institution persists.',
          examples: ['Schools socializing children into shared norms'],
          misconceptions: ['Assuming functionalism claims everything in society is "good"'],
          importance: 'core',
          questions: [
            { type: 'definition', difficulty: 1, prompt: 'Define structural functionalism.', correctAnswer: 'Society is a system of interdependent parts (institutions) that work together to maintain stability.', rubric: ['interdependent parts', 'maintain stability'], explanation: 'Associated with Durkheim and Parsons.' },
            { type: 'teach_back', difficulty: 2, prompt: 'Explain structural functionalism back in your own words, as if to a classmate.', correctAnswer: 'Society is like a body with organs (institutions) each performing a function to keep the whole system stable.', rubric: ['organism/system analogy', 'institutions serve functions'], explanation: 'The classic organism analogy.' },
            { type: 'scenario', difficulty: 3, prompt: 'How would a functionalist explain the persistence of the family as an institution?', correctAnswer: 'The family performs necessary functions (socialization, reproduction, economic support) that keep society stable, so it persists.', rubric: ['names functions', 'ties to stability'], explanation: 'Functions justify persistence in this framework.' },
          ],
          attemptPattern: [
            [17, 'correct', 'medium', 0],
            [9, 'partial', 'medium', 1],
            [3, 'correct', 'medium', 0],
          ],
        },
        {
          name: 'Conflict Theory',
          definition: 'A theory viewing society as composed of groups in competition for limited resources, driving inequality.',
          learningObjective: 'Use conflict theory to analyze a case of social inequality.',
          examples: ['Labor vs. capital disputes over wages'],
          misconceptions: ['Confusing it with simply "conflict happens in society"'],
          importance: 'core',
          questions: [
            { type: 'definition', difficulty: 1, prompt: 'What is conflict theory?', correctAnswer: 'Society is composed of groups competing for scarce resources, and this competition drives inequality and social change.', rubric: ['competition for resources', 'drives inequality'], explanation: 'Rooted in Marx.' },
            { type: 'compare', difficulty: 3, prompt: 'Compare conflict theory to functionalism in how each views social change.', correctAnswer: 'Conflict theory sees change as driven by struggle between groups; functionalism sees change as the system adjusting to restore equilibrium.', rubric: ['conflict = struggle-driven', 'functionalism = equilibrium-seeking'], explanation: 'Core theoretical contrast.' },
            { type: 'scenario', difficulty: 4, prompt: 'Apply conflict theory to explain rising income inequality in a tech-driven economy.', correctAnswer: 'Owners of capital/technology capture disproportionate gains while labor’s bargaining power weakens, widening inequality.', rubric: ['capital vs labor framing', 'ties to inequality'], explanation: 'A direct application of the theory.' },
          ],
          attemptPattern: [
            [16, 'incorrect', 'high', 0],
            [8, 'partial', 'medium', 1],
          ],
        },
      ],
    },
    {
      name: 'Social Structure & Institutions',
      importance: 'supporting',
      concepts: [
        {
          name: 'Personal Troubles vs Public Issues',
          definition: 'A framework distinguishing individually-experienced problems from widespread, structurally-caused ones.',
          learningObjective: 'Classify a given scenario as a personal trouble or a public issue.',
          examples: ['One person losing a job (trouble) vs. mass layoffs across an industry (issue)'],
          misconceptions: ['Assuming scale alone (not cause) determines the classification'],
          importance: 'core',
          questions: [
            { type: 'identify_concept', difficulty: 2, prompt: 'One person is fired for poor performance. Personal trouble or public issue?', correctAnswer: 'Personal trouble - an individual, non-structural cause.', rubric: ['personal trouble', 'individual cause'], explanation: 'No structural pattern involved.' },
            { type: 'scenario', difficulty: 3, prompt: 'National unemployment triples during a recession. Personal trouble or public issue, and why?', correctAnswer: 'Public issue - the cause is structural (recession), affecting many people simultaneously.', rubric: ['public issue', 'structural cause'], explanation: 'Widespread + structural = public issue.' },
          ],
          attemptPattern: [
            [15, 'correct', 'low', 0],
            [7, 'correct', 'medium', 0],
          ],
        },
      ],
    },
  ])

  const statistics = buildCourse('Statistics', 'quantitative', [
    {
      name: 'Descriptive Statistics',
      importance: 'core',
      concepts: [
        {
          name: 'Mean, Median, and Mode',
          definition: 'The three common measures of central tendency for a dataset.',
          learningObjective: 'Compute and choose the appropriate measure of central tendency for a dataset.',
          formula: 'mean = sum(x) / n',
          examples: ['Mean household income vs. median household income under skew'],
          misconceptions: ['Assuming mean is always the "best" average, even with outliers'],
          importance: 'core',
          questions: [
            { type: 'calculation', difficulty: 1, prompt: 'Find the mean of: 4, 8, 6, 10, 2.', correctAnswer: '6', numericAnswer: 6, rubric: ['sum = 30', 'divide by 5'], explanation: '(4+8+6+10+2)/5 = 6' },
            { type: 'identify_method', difficulty: 2, prompt: 'A dataset of incomes has a few extreme outliers. Which measure of central tendency should you report, and why?', correctAnswer: 'The median, because it is robust to outliers unlike the mean.', rubric: ['median', 'robust to outliers'], explanation: 'Skewed data with outliers favors the median.' },
          ],
          attemptPattern: [
            [19, 'correct', 'high', 0],
            [14, 'correct', 'high', 0],
            [6, 'correct', 'medium', 0],
            [2, 'correct', 'high', 0],
          ],
        },
        {
          name: 'Variance and Standard Deviation',
          definition: 'Measures of how spread out a dataset is around its mean.',
          learningObjective: 'Calculate variance/standard deviation and interpret what a larger value means.',
          formula: 'variance = sum((x - mean)^2) / n',
          examples: ['Comparing consistency of two students’ test scores'],
          misconceptions: ['Forgetting to square the deviations before averaging'],
          importance: 'core',
          questions: [
            { type: 'calculation', difficulty: 2, prompt: 'Find the variance of: 2, 4, 6 (population variance).', correctAnswer: '2.67', numericAnswer: 2.6667, rubric: ['mean = 4', 'sum of squared deviations = 8', 'divide by n'], explanation: 'Deviations: -2,0,2 -> squared 4,0,4 -> sum 8 / 3 = 2.67' },
            { type: 'calculation', difficulty: 3, prompt: 'Given a variance of 25, what is the standard deviation?', correctAnswer: '5', numericAnswer: 5, rubric: ['sqrt of variance'], explanation: 'sqrt(25) = 5' },
            { type: 'explain_why', difficulty: 3, prompt: 'Why do we square the deviations instead of just averaging them?', correctAnswer: 'Raw deviations sum to zero around the mean; squaring makes them all positive so they don’t cancel out.', rubric: ['deviations sum to 0', 'squaring avoids cancellation'], explanation: 'This is why variance uses squared deviations.' },
          ],
          attemptPattern: [
            [18, 'correct', 'medium', 0],
            [13, 'partial', 'medium', 1],
            [7, 'correct', 'medium', 1],
          ],
        },
        {
          name: 'Sampling',
          definition: 'The process of selecting a subset of a population to estimate characteristics of the whole.',
          learningObjective: 'Distinguish population from sample and identify sampling bias.',
          examples: ['Polling 1000 voters to estimate an election outcome'],
          misconceptions: ['Believing a larger sample always fixes a biased sampling method'],
          importance: 'core',
          questions: [
            { type: 'definition', difficulty: 1, prompt: 'What is the difference between a population and a sample?', correctAnswer: 'A population is the entire group of interest; a sample is a subset of it used to make inferences.', rubric: ['population = whole group', 'sample = subset'], explanation: 'Foundational distinction for all inference.' },
            { type: 'scenario', difficulty: 3, prompt: 'A survey only calls landline numbers to estimate national opinion. What is the concern here?', correctAnswer: 'Sampling bias - landline users are not representative of the whole population, skewing results regardless of sample size.', rubric: ['names sampling bias', 'explains non-representativeness'], explanation: 'Bias, not size, is the core issue here.' },
          ],
          attemptPattern: [
            [17, 'correct', 'high', 0],
            [11, 'correct', 'high', 0],
            [4, 'correct', 'medium', 0],
            [1, 'correct', 'high', 0],
          ],
        },
      ],
    },
    {
      name: 'Probability & Inference',
      importance: 'core',
      concepts: [
        {
          name: 'Confidence Intervals',
          definition: 'A range of values, computed from sample data, likely to contain the true population parameter.',
          learningObjective: 'Compute a confidence interval and correctly interpret what it means.',
          formula: 'CI = x̄ ± z * (s / sqrt(n))',
          examples: ['A poll reporting "52% ± 3%" support'],
          misconceptions: ['Interpreting a 95% CI as "95% probability the true value is in this range"'],
          importance: 'core',
          questions: [
            { type: 'identify_method', difficulty: 2, prompt: 'You have a sample mean, sample standard deviation, and sample size, and want a range likely to contain the true mean. What method applies?', correctAnswer: 'Constructing a confidence interval for the mean.', rubric: ['confidence interval'], explanation: 'This is exactly what a CI is for.' },
            { type: 'calculation', difficulty: 4, prompt: 'Sample mean = 100, standard error = 5. What is the 95% confidence interval upper bound (using z=1.96)?', correctAnswer: '109.8', numericAnswer: 109.8, rubric: ['100 + 1.96*5'], explanation: '100 + 1.96*5 = 109.8' },
            { type: 'explain_why', difficulty: 4, prompt: 'Why is it wrong to say "there is a 95% probability the true mean is in this interval"?', correctAnswer: 'The true mean is fixed, not random; the 95% refers to the long-run proportion of such intervals (from repeated sampling) that would contain it.', rubric: ['true mean is fixed', 'refers to long-run interval coverage'], explanation: 'A classic and important misconception to correct.' },
          ],
          attemptPattern: [
            [16, 'incorrect', 'high', 0],
            [10, 'partial', 'medium', 1],
            [5, 'partial', 'medium', 1],
          ],
        },
        {
          name: 'Hypothesis Testing',
          definition: 'A procedure for deciding whether sample data provide enough evidence to reject an assumed default (null) hypothesis.',
          learningObjective: 'Set up a hypothesis test, compute a test statistic, and interpret a p-value.',
          formula: 'z = (x̄ - μ₀) / (σ / sqrt(n))',
          examples: ['Testing whether a new drug’s effect differs from a placebo'],
          misconceptions: ['Treating p < 0.05 as "the effect is large" rather than "unlikely under the null"'],
          importance: 'core',
          questions: [
            { type: 'identify_method', difficulty: 3, prompt: 'You want to test whether a new teaching method changes average test scores compared to the old average of 75. What method applies?', correctAnswer: 'A one-sample hypothesis test (z-test or t-test) for the mean.', rubric: ['hypothesis test for the mean'], explanation: 'Comparing a sample mean to a known/assumed population mean.' },
            { type: 'calculation', difficulty: 5, prompt: 'Sample mean = 78, hypothesized mean = 75, population std dev = 6, n = 36. Compute the z test statistic.', correctAnswer: '3', numericAnswer: 3, rubric: ['(78-75)/(6/sqrt(36))'], explanation: '(78-75)/(6/6) = 3/1 = 3' },
            { type: 'explain_why', difficulty: 4, prompt: 'A p-value of 0.03 is found. Explain what this does and does not tell you.', correctAnswer: 'It means there is a 3% chance of seeing data this extreme if the null hypothesis were true - it does not measure the probability the null is true, nor the size of the effect.', rubric: ['probability of data under null', 'not probability null is true', 'not effect size'], explanation: 'A precise, commonly-misunderstood definition.' },
          ],
          attemptPattern: [
            [15, 'incorrect', 'high', 0],
            [9, 'incorrect', 'medium', 1],
          ],
        },
      ],
    },
  ])

  const exams: Exam[] = [
    {
      id: uid(),
      courseId: sociology.course.id,
      name: 'Sociology Midterm',
      date: Date.now() + 4 * DAY,
      topicIds: sociology.topics.map((t) => t.id),
      format: 'Short answer + essay',
      weighting: '30% of final grade',
      durationMin: 60,
      notes: 'Covers perspectives and social structure units.',
    },
    {
      id: uid(),
      courseId: statistics.course.id,
      name: 'Statistics Exam 1',
      date: Date.now() + 12 * DAY,
      topicIds: statistics.topics.map((t) => t.id),
      format: 'Calculation + short answer',
      weighting: '25% of final grade',
      durationMin: 75,
      notes: 'Descriptive stats through hypothesis testing.',
    },
  ]

  return {
    courses: [sociology.course, statistics.course],
    topics: [...sociology.topics, ...statistics.topics],
    concepts: [...sociology.concepts, ...statistics.concepts],
    questions: [...sociology.questions, ...statistics.questions],
    attempts: [...sociology.attempts, ...statistics.attempts],
    exams,
    errors: [...sociology.errors, ...statistics.errors],
  }
}
