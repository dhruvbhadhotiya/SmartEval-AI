import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { logout } from '../../features/auth/authSlice'
import studentService, { ResultDetail, QuestionResult } from '../../services/studentService'

const ResultDetailPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)

  const [result, setResult] = useState<ResultDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Challenge state
  const [challengeQ, setChallengeQ] = useState<number | null>(null)
  const [justification, setJustification] = useState('')
  const [challengeSubmitting, setChallengeSubmitting] = useState(false)
  const [challengeMsg, setChallengeMsg] = useState<string | null>(null)

  useEffect(() => {
    if (examId) loadResult()
  }, [examId])

  const loadResult = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await studentService.getResultDetail(examId!)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load result')
    } finally {
      setLoading(false)
    }
  }

  const handleChallengeSubmit = async () => {
    if (!challengeQ || !justification.trim()) return
    try {
      setChallengeSubmitting(true)
      setChallengeMsg(null)
      await studentService.submitChallenge(examId!, [
        { question_number: challengeQ, justification: justification.trim() }
      ])
      setChallengeMsg('Challenge submitted successfully!')
      setChallengeQ(null)
      setJustification('')
      loadResult()
    } catch (err: any) {
      setChallengeMsg(
        err?.response?.data?.error?.message || 'Failed to submit challenge'
      )
    } finally {
      setChallengeSubmitting(false)
    }
  }

  const getScoreColor = (marks: number, max: number) => {
    const pct = max > 0 ? (marks / max) * 100 : 0
    if (pct >= 75) return 'text-green-600'
    if (pct >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBarColor = (marks: number, max: number) => {
    const pct = max > 0 ? (marks / max) * 100 : 0
    if (pct >= 75) return 'bg-green-500'
    if (pct >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null
    const colors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800',
      under_review: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading result...</span>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Result not found'}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{result.exam.title}</h1>
              <p className="text-sm text-gray-500">{result.exam.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.profile?.name}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Overall Result</h2>
              <p className="text-sm text-gray-500 mt-1">
                {result.exam.exam_date && `Exam: ${new Date(result.exam.exam_date).toLocaleDateString()}`}
                {result.published_at && ` | Published: ${new Date(result.published_at).toLocaleDateString()}`}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${getScoreColor(result.summary.total_score, result.summary.max_score)}`}>
                {result.summary.percentage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">
                {result.summary.total_score.toFixed(1)} / {result.summary.max_score.toFixed(1)} marks
              </p>
            </div>
          </div>
          {result.summary.overall_feedback && (
            <p className="mt-3 text-sm text-gray-600 italic border-t pt-3">
              {result.summary.overall_feedback}
            </p>
          )}
        </div>

        {/* Challenge message */}
        {challengeMsg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            challengeMsg.includes('success')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {challengeMsg}
          </div>
        )}

        {/* Question-wise Breakdown */}
        <div className="space-y-4">
          {result.questions.map((q: QuestionResult) => (
            <div key={q.question_number} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Question Header */}
              <div className="px-5 py-4 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    Question {q.question_number}
                  </span>
                  {q.challenge_status && getStatusBadge(q.challenge_status)}
                  {q.override_applied && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Teacher Adjusted
                    </span>
                  )}
                </div>
                <span className={`text-lg font-bold ${getScoreColor(q.marks_awarded, q.max_marks)}`}>
                  {q.marks_awarded.toFixed(1)} / {q.max_marks.toFixed(1)}
                </span>
              </div>

              <div className="px-5 py-4">
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full ${getBarColor(q.marks_awarded, q.max_marks)}`}
                    style={{ width: `${Math.min((q.marks_awarded / q.max_marks) * 100, 100)}%` }}
                  />
                </div>

                {/* Feedback */}
                {q.feedback && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Feedback</h4>
                    <p className="text-sm text-gray-600">{q.feedback}</p>
                  </div>
                )}

                {/* Keywords & Concepts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {(q.keywords_found.length > 0 || q.keywords_missing.length > 0) && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {q.keywords_found.map((kw, i) => (
                          <span key={`f-${i}`} className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">
                            {kw}
                          </span>
                        ))}
                        {q.keywords_missing.map((kw, i) => (
                          <span key={`m-${i}`} className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-600 line-through">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(q.concepts_covered.length > 0 || q.concepts_missing.length > 0) && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Concepts</h4>
                      <div className="flex flex-wrap gap-1">
                        {q.concepts_covered.map((c, i) => (
                          <span key={`c-${i}`} className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                            {c}
                          </span>
                        ))}
                        {q.concepts_missing.map((c, i) => (
                          <span key={`cm-${i}`} className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-500 line-through">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Challenge Button / Form */}
                {q.can_challenge && !q.challenge_status && (
                  <div className="border-t pt-3 mt-3">
                    {challengeQ === q.question_number ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Justification (max 500 characters)
                        </label>
                        <textarea
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          maxLength={500}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Explain why you believe this grade should be reconsidered..."
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {justification.length}/500
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setChallengeQ(null); setJustification('') }}
                              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleChallengeSubmit}
                              disabled={!justification.trim() || challengeSubmitting}
                              className="px-3 py-1.5 text-sm text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                            >
                              {challengeSubmitting ? 'Submitting...' : 'Submit Challenge'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setChallengeQ(q.question_number)}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Challenge This Grade
                      </button>
                    )}
                  </div>
                )}

                {q.challenge_status && (
                  <div className="border-t pt-3 mt-3 text-sm text-gray-500">
                    Challenge {q.challenge_status.replace('_', ' ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default ResultDetailPage
