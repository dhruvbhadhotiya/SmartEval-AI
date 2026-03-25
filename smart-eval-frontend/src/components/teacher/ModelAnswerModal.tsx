import { useState } from 'react'
import gradingService, { ParsedAnswer } from '../../services/gradingService'

interface ModelAnswerModalProps {
  examId: string
  existingAnswers?: ParsedAnswer[]
  maxMarks: number
  onClose: () => void
  onSaved: () => void
}

export default function ModelAnswerModal({
  examId,
  existingAnswers,
  maxMarks,
  onClose,
  onSaved,
}: ModelAnswerModalProps) {
  const [answers, setAnswers] = useState<ParsedAnswer[]>(
    existingAnswers && existingAnswers.length > 0
      ? existingAnswers
      : [{ question_number: 1, max_marks: 0, answer_text: '', keywords: [], concepts: [] }]
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store keywords/concepts as raw strings so users can type commas freely
  const [keywordsRaw, setKeywordsRaw] = useState<Record<number, string>>(
    () => {
      const map: Record<number, string> = {}
      const initial = existingAnswers && existingAnswers.length > 0 ? existingAnswers : []
      initial.forEach((a, i) => {
        map[i] = (a.keywords || []).join(', ')
      })
      return map
    }
  )
  const [conceptsRaw, setConceptsRaw] = useState<Record<number, string>>(
    () => {
      const map: Record<number, string> = {}
      const initial = existingAnswers && existingAnswers.length > 0 ? existingAnswers : []
      initial.forEach((a, i) => {
        map[i] = (a.concepts || []).join(', ')
      })
      return map
    }
  )

  const addQuestion = () => {
    setAnswers([
      ...answers,
      {
        question_number: answers.length + 1,
        max_marks: 0,
        answer_text: '',
        keywords: [],
        concepts: [],
      },
    ])
  }

  const removeQuestion = (idx: number) => {
    if (answers.length <= 1) return
    const updated = answers.filter((_, i) => i !== idx).map((a, i) => ({
      ...a,
      question_number: i + 1,
    }))
    setAnswers(updated)
  }

  const updateAnswer = (idx: number, field: keyof ParsedAnswer, value: any) => {
    const updated = [...answers]
    updated[idx] = { ...updated[idx], [field]: value }
    setAnswers(updated)
  }

  const totalConfiguredMarks = answers.reduce((sum, a) => sum + (a.max_marks || 0), 0)

  const handleSave = async () => {
    setError(null)

    // Parse raw keyword/concept strings into arrays before saving
    const finalAnswers = answers.map((a, idx) => ({
      ...a,
      keywords: (keywordsRaw[idx] || '').split(',').map(s => s.trim()).filter(Boolean),
      concepts: (conceptsRaw[idx] || '').split(',').map(s => s.trim()).filter(Boolean),
    }))

    // Basic validation
    for (const a of finalAnswers) {
      if (!a.answer_text.trim()) {
        setError(`Question ${a.question_number}: Answer text is required`)
        return
      }
      if (a.max_marks <= 0) {
        setError(`Question ${a.question_number}: Max marks must be > 0`)
        return
      }
    }

    setIsSaving(true)
    try {
      await gradingService.saveParsedModelAnswers(examId, finalAnswers)
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExtractFromPDF = async () => {
    setError(null)
    setIsExtracting(true)
    try {
      const response = await gradingService.extractModelAnswerText(examId)
      const pages = response.data?.pages || []
      if (pages.length === 0) {
        setError('No text could be extracted from the model answer PDF')
        return
      }
      // Combine all page text and pre-fill as a single question answer
      const fullText = pages.map((p: any) => p.text).join('\n\n')
      setAnswers([{
        question_number: 1,
        max_marks: maxMarks,
        answer_text: fullText,
        keywords: [],
        concepts: [],
      }])
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Failed to extract text from PDF')
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Model Answers</h2>
            <p className="text-sm text-gray-500 mt-1">
              Define the expected answers for each question. Total configured: {totalConfiguredMarks}/{maxMarks} marks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExtractFromPDF}
              disabled={isExtracting}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isExtracting ? 'Extracting...' : 'Extract from PDF'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
          )}

          {answers.map((ans, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">Question {ans.question_number}</h3>
                {answers.length > 1 && (
                  <button
                    onClick={() => removeQuestion(idx)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={ans.max_marks || ''}
                    onChange={(e) => updateAnswer(idx, 'max_marks', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Answer Text *</label>
                <textarea
                  rows={3}
                  value={ans.answer_text}
                  onChange={(e) => updateAnswer(idx, 'answer_text', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter the expected answer..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keywords <span className="text-gray-400">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={keywordsRaw[idx] ?? ''}
                    onChange={(e) => setKeywordsRaw(prev => ({ ...prev, [idx]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. BST, binary, O(log n)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concepts <span className="text-gray-400">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={conceptsRaw[idx] ?? ''}
                    onChange={(e) => setConceptsRaw(prev => ({ ...prev, [idx]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. definition, properties, complexity"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addQuestion}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-500 hover:text-blue-600 hover:border-blue-400 transition"
          >
            + Add Question
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            {answers.length} question{answers.length !== 1 ? 's' : ''} &middot; {totalConfiguredMarks} total marks
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Model Answers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
