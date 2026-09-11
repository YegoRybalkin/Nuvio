import { useState } from 'react'
import { analyzeCourseMaterial } from './courseAi'
import { materializeAnalysis } from './courseIngestion'
import { analyzeCourseMaterialHeuristically } from './heuristicCourseAnalysis'
import { chunkText } from './nlp'
import { extractTextFromFile } from './textExtract'
import { useCourseStore } from '../store/useCourseStore'
import type { Course, SourceChunk } from '../types'

const MIN_WORDS = 40
const uid = () => crypto.randomUUID()

export type IngestionStage = 'idle' | 'extracting' | 'analyzing' | 'done' | 'error'

/** Drives the full "upload -> extract -> chunk -> analyze -> store" pipeline
 * for a single piece of course material, used both when creating a course
 * from material and when adding material to an existing course. Runs
 * asynchronously and reports a stage so the UI can show clear processing
 * states rather than blocking. */
export function useMaterialIngestion(course: Course) {
  const addMaterialPlaceholder = useCourseStore((s) => s.addMaterialPlaceholder)
  const markMaterialFailed = useCourseStore((s) => s.markMaterialFailed)
  const ingestMaterial = useCourseStore((s) => s.ingestMaterial)
  const claudeApiKey = useCourseStore((s) => s.claudeApiKey)
  const claudeModel = useCourseStore((s) => s.claudeModel)

  const [stage, setStage] = useState<IngestionStage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [conceptCount, setConceptCount] = useState<number | null>(null)

  const ingestText = async (fileName: string, rawText: string) => {
    setError(null)
    const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0
    if (wordCount < MIN_WORDS) {
      setError(`That material is too short to analyze (${wordCount} words, need at least ${MIN_WORDS}).`)
      setStage('error')
      return
    }

    const material = addMaterialPlaceholder(course.id, fileName, wordCount)
    setStage('analyzing')

    try {
      const chunks: SourceChunk[] = chunkText(rawText).map((text, index) => ({
        id: uid(),
        materialId: material.id,
        index,
        text,
      }))

      const analysis = claudeApiKey
        ? (await analyzeCourseMaterial(rawText, course.subjectType, { apiKey: claudeApiKey, model: claudeModel })).analysis
        : analyzeCourseMaterialHeuristically(rawText)

      const materialized = materializeAnalysis(course.id, analysis, chunks)
      ingestMaterial(material.id, chunks, materialized)
      setConceptCount(materialized.concepts.length)
      setStage('done')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Analysis failed.'
      markMaterialFailed(material.id, message)
      setError(message)
      setStage('error')
    }
  }

  const ingestFile = async (file: File) => {
    setStage('extracting')
    setError(null)
    try {
      const extracted = await extractTextFromFile(file)
      if (!extracted.text.trim()) {
        setError("Couldn't find readable text in that file. Try pasting the text instead.")
        setStage('error')
        return
      }
      await ingestText(file.name, extracted.text)
    } catch {
      setError('Something went wrong reading that file. Try a .txt, .md, .pdf, .docx, or .pptx file.')
      setStage('error')
    }
  }

  return { stage, error, conceptCount, ingestFile, ingestText, usingAi: Boolean(claudeApiKey) }
}
