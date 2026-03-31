import { useEffect, useState } from 'react'
import { Worker, Viewer } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'
import gradingService, { AnswerSheet, Evaluation, QuestionEvaluation } from '../../services/gradingService'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

interface ReviewInterfaceProps {
  sheetId: string
  onBack: () => void
  onApprove: () => void
  onNext?: () => void
  onPrev?: () => void
  sheetLabel?: string
}

// Score color helpers (reused from EvaluationModal)
const getScoreColor = (pct: number) => {
  if (pct >= 75) return 'text-green-600'
  if (pct >= 50) return 'text-yellow-600'
  if (pct >= 35) return 'text-orange-600'
  return 'text-red-600'
}

const getScoreBg = (pct: number) => {
  if (pct >= 75) return 'bg-green-50 border-green-200'
  if (pct >= 50) return 'bg-yellow-50 border-yellow-200'
  if (pct >= 35) return 'bg-orange-50 border-orange-200'
  return 'bg-red-50 border-red-200'
}

const getConfidenceBadge = (c: number) => {
  if (c >= 0.8) return 'bg-green-100 text-green-700'
  if (c >= 0.5) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export default function ReviewInterface({
  sheetId, onBack, onApprove, onNext, onPrev, sheetLabel
}: ReviewInterfaceProps) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin()

  const [sheet, setSheet] = useState<AnswerSheet | null>(null)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  // Editing state per question
  const [editingQ, setEditingQ] = useState<number | null>(null)
  const [editMarks, setEditMarks] = useState<string>('')
  const [editFeedback, setEditFeedback] = useState<string>('')
  const [editReason, setEditReason] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [sheetId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sheetRes, evalRes] = await Promise.all([
        gradingService.getAnswerSheet(sheetId),
        gradingService.getEvaluation(sheetId),
      ])
      setSheet(sheetRes.data)
      setEvaluation(evalRes.data)
    } catch {
      setMessage('Failed to load review data')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (qe: QuestionEvaluation) => {
    setEditingQ(qe.question_number)
    setEditMarks(String(qe.marks_awarded))
    setEditFeedback(qe.feedback || '')
    setEditReason('')
    setMessage(null)
  }

  const cancelEdit = () => {
    setEditingQ(null)
    setEditMarks('')
    setEditFeedback('')
    setEditReason('')
  }

  const handleSaveOverride = async (qNum: number) => {
    if (!editReason.trim()) {
      setMessage('Override reason is required')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await gradingService.overrideQuestionGrade(sheetId, qNum, {
        marks_awarded: parseFloat(editMarks),
        feedback: editFeedback,
        reason: editReason.trim(),
      })
      setEvaluation(res.data)
      setEditingQ(null)
      setMessage(`Question ${qNum} grade saved`)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to save override'
      setMessage(`Error: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const fileUrl = sheet?.original_file?.url
  const isPdf = fileUrl?.toLowerCase().endsWith('.pdf')
  const fullFileUrl = fileUrl ? (fileUrl.startsWith('http') ? fileUrl : `${API_BASE}${fileUrl}`) : ''
  const fileName = fileUrl?.split('/').pop() || 'answer_sheet'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 flex items-center space-x-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to List</span>
          </button>
          <span className="text-sm text-gray-500">{sheetLabel}</span>
          <span className="text-sm font-mono text-gray-400">{fileName}</span>
        </div>
        <div className="flex items-center space-x-3">
          {onPrev && (
            <button
              onClick={onPrev}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          {sheet?.status === 'graded' && (
            <button
              onClick={onApprove}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              Approve
            </button>
          )}
          {sheet?.status === 'reviewed' && (
            <span className="px-3 py-1.5 text-sm bg-purple-100 text-purple-800 rounded-full font-medium">
              Reviewed
            </span>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-2 p-3 rounded-md text-sm ${
          message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Side-by-side layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Original Answer Sheet */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Original Answer Sheet</h3>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {isPdf && fullFileUrl ? (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <div style={{ height: 'calc(100vh - 140px)' }}>
                  <Viewer fileUrl={fullFileUrl} plugins={[defaultLayoutPluginInstance]} />
                </div>
              </Worker>
            ) : fullFileUrl ? (
              <div className="flex items-center justify-center h-full">
                <img src={fullFileUrl} alt="Answer sheet" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No file available
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: AI Evaluation */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">AI Evaluation</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {evaluation ? (
              <>
                {/* Summary */}
                <div className={`p-4 rounded-lg border ${getScoreBg(evaluation.percentage)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-3xl font-bold ${getScoreColor(evaluation.percentage)}`}>
                        {evaluation.total_marks_awarded}/{evaluation.total_max_marks}
                      </span>
                      <span className={`text-lg ml-2 ${getScoreColor(evaluation.percentage)}`}>
                        ({evaluation.percentage}%)
                      </span>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(evaluation.overall_confidence)}`}>
                      Confidence: {(evaluation.overall_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">{evaluation.overall_feedback}</p>
                </div>

                {/* Per-question cards */}
                {evaluation.question_evaluations.map((qe) => {
                  const qPct = qe.max_marks > 0 ? (qe.marks_awarded / qe.max_marks) * 100 : 0
                  const isEditing = editingQ === qe.question_number
                  const isOverridden = qe.override_applied

                  return (
                    <div
                      key={qe.question_number}
                      className={`border rounded-lg p-4 space-y-2 ${
                        isOverridden ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-800">Q{qe.question_number}</h4>
                          {isOverridden && (
                            <span className="px-2 py-0.5 bg-orange-200 text-orange-800 rounded text-xs font-medium">
                              Overridden
                            </span>
                          )}
                        </div>
                        {!isEditing ? (
                          <div className="flex items-center space-x-3">
                            <span className={`font-bold ${getScoreColor(qPct)}`}>
                              {qe.marks_awarded}/{qe.max_marks}
                            </span>
                            <button
                              onClick={() => startEdit(qe)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Editing...</span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            qPct >= 75 ? 'bg-green-500' : qPct >= 50 ? 'bg-yellow-500' : qPct >= 35 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(qPct, 100)}%` }}
                        />
                      </div>

                      {!isEditing ? (
                        <>
                          <p className="text-sm text-gray-600">{qe.feedback}</p>

                          {isOverridden && qe.original_marks !== null && qe.original_marks !== undefined && (
                            <p className="text-xs text-orange-700">
                              Original: {qe.original_marks}/{qe.max_marks} | Reason: {qe.override_reason}
                            </p>
                          )}

                          {/* Keywords */}
                          {(qe.keywords_found.length > 0 || qe.keywords_missing.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {qe.keywords_found.map((k, i) => (
                                <span key={`f-${i}`} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                  {k}
                                </span>
                              ))}
                              {qe.keywords_missing.map((k, i) => (
                                <span key={`m-${i}`} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs line-through">
                                  {k}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Editing mode */
                        <div className="space-y-3 mt-2 border-t pt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Score (0 - {qe.max_marks})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={qe.max_marks}
                              step={0.5}
                              value={editMarks}
                              onChange={e => setEditMarks(e.target.value)}
                              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Feedback</label>
                            <textarea
                              value={editFeedback}
                              onChange={e => setEditFeedback(e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Override Reason <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={editReason}
                              onChange={e => setEditReason(e.target.value)}
                              placeholder="Reason for changing the grade..."
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSaveOverride(qe.question_number)}
                              disabled={saving}
                              className="px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save Override'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                No evaluation data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
