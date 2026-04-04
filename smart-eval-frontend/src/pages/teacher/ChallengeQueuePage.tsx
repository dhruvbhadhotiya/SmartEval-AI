import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import studentService, { ChallengeData } from '../../services/studentService'

type StatusFilter = 'all' | 'pending' | 'under_review' | 'accepted' | 'rejected'
type SortOption = 'date_desc' | 'date_asc'

const ChallengeQueuePage: React.FC = () => {
  const navigate = useNavigate()

  const [challenges, setChallenges] = useState<ChallengeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('date_desc')

  // Resolve modal state
  const [resolving, setResolving] = useState<ChallengeData | null>(null)
  const [decision, setDecision] = useState<'accepted' | 'rejected'>('accepted')
  const [comments, setComments] = useState('')
  const [scoreChanges, setScoreChanges] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: { status?: string } = {}
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await studentService.getChallenges(params)
      setChallenges(data)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load challenges')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadChallenges()
  }, [loadChallenges])

  const filteredChallenges = [...challenges].sort((a, b) => {
    if (sortOption === 'date_asc') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Stats
  const stats = {
    total: challenges.length,
    pending: challenges.filter(c => c.status === 'pending').length,
    under_review: challenges.filter(c => c.status === 'under_review').length,
    accepted: challenges.filter(c => c.status === 'accepted').length,
    rejected: challenges.filter(c => c.status === 'rejected').length,
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800',
      under_review: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  const openResolve = async (challenge: ChallengeData) => {
    try {
      const detail = await studentService.getChallengeDetail(challenge.id)
      setResolving(detail)
      setDecision('accepted')
      setComments('')
      const initScores: Record<number, string> = {}
      for (const cq of detail.challenged_questions) {
        initScores[cq.question_number] = String(cq.original_score)
      }
      setScoreChanges(initScores)
    } catch {
      setMessage('Failed to load challenge details')
    }
  }

  const handleResolve = async () => {
    if (!resolving) return
    try {
      setSubmitting(true)
      setMessage(null)

      const changes = decision === 'accepted'
        ? Object.entries(scoreChanges).map(([qNum, score]) => ({
            question_number: Number(qNum),
            new_score: parseFloat(score) || 0,
          }))
        : undefined

      await studentService.resolveChallenge(resolving.id, {
        decision,
        comments,
        score_changes: changes,
      })

      setMessage(`Challenge ${decision} successfully`)
      setResolving(null)
      loadChallenges()
    } catch (err: any) {
      setMessage(err?.response?.data?.error?.message || 'Failed to resolve challenge')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Challenge Queue</h1>
                <p className="text-sm text-gray-600">Review and resolve student grade challenges</p>
              </div>
            </div>
            {/* Quick Stats */}
            <div className="flex items-center space-x-3 text-sm">
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                Total: {stats.total}
              </span>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                Pending: {stats.pending}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                In Review: {stats.under_review}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                Accepted: {stats.accepted}
              </span>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
                Rejected: {stats.rejected}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as SortOption)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
            </select>
          </div>

          <button
            onClick={() => loadChallenges()}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-3 p-3 rounded-md text-sm ${
            message.includes('Failed') || message.includes('failed')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading challenges...</span>
          </div>
        ) : error ? (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="mt-4 text-center py-16 bg-white rounded-lg shadow-sm border">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-3 text-lg font-medium text-gray-900">No challenges found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter === 'all'
                ? 'No student challenges have been submitted yet.'
                : `No challenges with status "${statusFilter.replace('_', ' ')}".`}
            </p>
          </div>
        ) : (
          <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredChallenges.map((ch) => (
                  <tr key={ch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {ch.student_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ch.student_roll || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{ch.exam_title || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{ch.exam_subject || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {ch.challenged_questions.map(cq => `Q${cq.question_number}`).join(', ')}
                      <div className="text-xs text-gray-500">
                        {ch.challenged_questions.length} question{ch.challenged_questions.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(ch.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(ch.created_at).toLocaleDateString()}
                      <div className="text-xs">
                        {new Date(ch.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(ch.status === 'pending' || ch.status === 'under_review') ? (
                        <button
                          onClick={() => openResolve(ch)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => openResolve(ch)}
                          className="text-gray-500 hover:text-gray-700 font-medium"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolving && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {resolving.status === 'accepted' || resolving.status === 'rejected'
                    ? 'Challenge Details'
                    : 'Resolve Challenge'}
                </h3>
                <p className="text-sm text-gray-500">
                  {resolving.student_name} — {resolving.exam_title}
                </p>
              </div>
              <button
                onClick={() => setResolving(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Challenged Questions */}
              {resolving.challenged_questions.map((cq) => (
                <div key={cq.question_number} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">
                      Question {cq.question_number}
                    </span>
                    <span className="text-sm text-gray-500">
                      Score: {cq.original_score} / {cq.max_marks}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded p-3 mb-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Student Justification</p>
                    <p className="text-sm text-gray-700">{cq.student_justification}</p>
                  </div>
                  {(cq as any).current_feedback && (
                    <div className="bg-blue-50 rounded p-3 mb-2">
                      <p className="text-xs font-medium text-blue-600 mb-1">Current AI Feedback</p>
                      <p className="text-sm text-blue-800">{(cq as any).current_feedback}</p>
                    </div>
                  )}
                  {/* Score change input (only for unresolved + accepted decision) */}
                  {resolving.status !== 'accepted' && resolving.status !== 'rejected' && decision === 'accepted' && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        New Score (0 - {cq.max_marks})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={cq.max_marks}
                        step={0.5}
                        value={scoreChanges[cq.question_number] || ''}
                        onChange={e => setScoreChanges(prev => ({
                          ...prev,
                          [cq.question_number]: e.target.value
                        }))}
                        className="w-32 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Resolution info for already-resolved */}
              {resolving.resolution && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Resolution</h4>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Decision:</span> {resolving.resolution.decision}
                  </p>
                  {resolving.resolution.comments && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Comments:</span> {resolving.resolution.comments}
                    </p>
                  )}
                  {resolving.resolution.resolved_at && (
                    <p className="text-sm text-gray-500 mt-1">
                      Resolved: {new Date(resolving.resolution.resolved_at).toLocaleString()}
                    </p>
                  )}
                  {resolving.resolution.score_changes && resolving.resolution.score_changes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500 mb-1">Score Changes:</p>
                      {resolving.resolution.score_changes.map(sc => (
                        <p key={sc.question_number} className="text-sm text-gray-600">
                          Q{sc.question_number}: {sc.old_score} → {sc.new_score}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Resolve form (only for pending/under_review) */}
              {resolving.status !== 'accepted' && resolving.status !== 'rejected' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="decision"
                          value="accepted"
                          checked={decision === 'accepted'}
                          onChange={() => setDecision('accepted')}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Accept (update scores)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="decision"
                          value="rejected"
                          checked={decision === 'rejected'}
                          onChange={() => setDecision('rejected')}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">Reject</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comments
                    </label>
                    <textarea
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Provide reasoning for your decision..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setResolving(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {resolving.status === 'accepted' || resolving.status === 'rejected' ? 'Close' : 'Cancel'}
              </button>
              {resolving.status !== 'accepted' && resolving.status !== 'rejected' && (
                <button
                  onClick={handleResolve}
                  disabled={submitting}
                  className={`px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 ${
                    decision === 'accepted'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : decision === 'accepted' ? 'Accept Challenge' : 'Reject Challenge'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChallengeQueuePage
