import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import gradingService, { AnswerSheet } from '../../services/gradingService'
import examService, { Exam } from '../../services/examService'
import ReviewInterface from '../../components/teacher/ReviewInterface'

type SortOption = 'date_desc' | 'date_asc' | 'score_asc' | 'score_desc'
type StatusFilter = 'all' | 'graded' | 'reviewed'

const GradingReviewPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const [exam, setExam] = useState<Exam | null>(null)
  const [sheets, setSheets] = useState<AnswerSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('date_desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Review interface state
  const [reviewSheetId, setReviewSheetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!examId) return
    try {
      const [examRes, sheetsRes] = await Promise.all([
        examService.getExamById(examId),
        gradingService.getAnswerSheets(examId),
      ])
      setExam(examRes.data)
      setSheets(sheetsRes.data || [])
    } catch {
      setMessage('Failed to load exam data')
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter + sort sheets
  const filteredSheets = sheets
    .filter(s => {
      if (statusFilter === 'all') return s.status === 'graded' || s.status === 'reviewed'
      return s.status === statusFilter
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'score_asc': return (a.score ?? 0) - (b.score ?? 0)
        case 'score_desc': return (b.score ?? 0) - (a.score ?? 0)
        case 'date_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'date_desc':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const gradedSheets = filteredSheets.filter(s => s.status === 'graded')
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === gradedSheets.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(gradedSheets.map(s => s.id)))
    }
  }

  const handleApproveOne = async (sheetId: string) => {
    try {
      await gradingService.approveSheet(sheetId)
      setMessage('Sheet approved')
      await loadData()
      setSelectedIds(prev => { const n = new Set(prev); n.delete(sheetId); return n })
    } catch {
      setMessage('Failed to approve sheet')
    }
  }

  const handleBulkApprove = async (ids?: string[]) => {
    if (!examId) return
    const targetIds = ids || Array.from(selectedIds)
    if (targetIds.length === 0 && ids !== undefined) return

    if (!window.confirm(
      targetIds.length > 0
        ? `Approve ${targetIds.length} selected sheet(s)?`
        : 'Approve ALL graded sheets?'
    )) return

    setIsBulkApproving(true)
    setMessage(null)
    try {
      const res = await gradingService.bulkApprove(examId, targetIds.length > 0 ? targetIds : undefined)
      const data = res.data
      setMessage(`Approved ${data.approved_count} sheet(s). ${data.already_reviewed} already reviewed.`)
      setSelectedIds(new Set())
      await loadData()
    } catch {
      setMessage('Bulk approve failed')
    } finally {
      setIsBulkApproving(false)
    }
  }

  // Navigate between sheets in ReviewInterface
  const reviewableSheetIds = filteredSheets.map(s => s.id)
  const currentReviewIdx = reviewSheetId ? reviewableSheetIds.indexOf(reviewSheetId) : -1

  if (reviewSheetId) {
    return (
      <ReviewInterface
        sheetId={reviewSheetId}
        onBack={() => { setReviewSheetId(null); loadData() }}
        onApprove={async () => {
          await handleApproveOne(reviewSheetId)
          // Move to next if available
          if (currentReviewIdx < reviewableSheetIds.length - 1) {
            setReviewSheetId(reviewableSheetIds[currentReviewIdx + 1])
          } else {
            setReviewSheetId(null)
          }
          await loadData()
        }}
        onNext={currentReviewIdx < reviewableSheetIds.length - 1
          ? () => setReviewSheetId(reviewableSheetIds[currentReviewIdx + 1])
          : undefined}
        onPrev={currentReviewIdx > 0
          ? () => setReviewSheetId(reviewableSheetIds[currentReviewIdx - 1])
          : undefined}
        sheetLabel={`Sheet ${currentReviewIdx + 1} of ${reviewableSheetIds.length}`}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const stats = exam?.statistics

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/dashboard/exams/${examId}`)}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Review Grades</h1>
                <p className="text-sm text-gray-600">{exam?.title} &middot; {exam?.subject}</p>
              </div>
            </div>
            {/* Stats badges */}
            <div className="flex items-center space-x-4 text-sm">
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                Total: {stats?.total_sheets || 0}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                Graded: {stats?.graded || 0}
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                Reviewed: {stats?.reviewed || 0}
              </span>
              {stats?.average_score !== undefined && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  Avg: {stats?.average_score?.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All (Graded + Reviewed)</option>
              <option value="graded">Graded Only</option>
              <option value="reviewed">Reviewed Only</option>
            </select>

            {/* Sort */}
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as SortOption)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="score_desc">Score High to Low</option>
              <option value="score_asc">Score Low to High</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleBulkApprove(Array.from(selectedIds))}
              disabled={selectedIds.size === 0 || isBulkApproving}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isBulkApproving ? 'Approving...' : `Approve Selected (${selectedIds.size})`}
            </button>
            <button
              onClick={() => handleBulkApprove([])}
              disabled={gradedSheets.length === 0 || isBulkApproving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Approve All Graded
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-3 p-3 rounded-md text-sm ${
            message.includes('Failed') || message.includes('failed')
              ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Sheets Table */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredSheets.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={gradedSheets.length > 0 && selectedIds.size === gradedSheets.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSheets.map((sheet, idx) => (
                  <tr key={sheet.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {sheet.status === 'graded' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(sheet.id)}
                          onChange={() => toggleSelect(sheet.id)}
                          className="rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono text-xs truncate max-w-[200px]">
                      {sheet.original_file?.url?.split('/').pop() || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sheet.status === 'reviewed'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {sheet.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {sheet.score !== undefined ? (
                        <span className="font-semibold">{sheet.score}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button
                        onClick={() => setReviewSheetId(sheet.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Review
                      </button>
                      {sheet.status === 'graded' && (
                        <button
                          onClick={() => handleApproveOne(sheet.id)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No graded sheets to review</p>
              <p className="text-sm mt-1">Grade some answer sheets first, then come back to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GradingReviewPage
