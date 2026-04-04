import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { logout } from '../../features/auth/authSlice'
import studentService, { StudentResult } from '../../services/studentService'

const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)

  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await studentService.getResults()
      setResults(data)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null) return 'text-gray-500'
    if (percentage >= 75) return 'text-green-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (percentage: number | null) => {
    if (percentage === null) return 'bg-gray-100'
    if (percentage >= 75) return 'bg-green-50 border-green-200'
    if (percentage >= 50) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SmartEval</h1>
            <p className="text-sm text-gray-500">Student Portal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.profile?.name || user?.email}
              </p>
              <p className="text-xs text-gray-500">
                {(user?.profile as any)?.roll_number || 'Student'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My Results</h2>
          <p className="text-sm text-gray-500 mt-1">
            View your published exam results and submit challenges
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading results...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-3 text-lg font-medium text-gray-900">No results yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your exam results will appear here once they are published.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {results.map((result) => (
              <div
                key={result.exam_id}
                onClick={() => navigate(`/student/results/${result.exam_id}`)}
                className={`bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:shadow-md transition-shadow ${getScoreBg(result.percentage)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {result.exam_title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">{result.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {result.exam_date && (
                        <span>Exam: {new Date(result.exam_date).toLocaleDateString()}</span>
                      )}
                      {result.published_at && (
                        <span>Published: {new Date(result.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    {result.percentage !== null ? (
                      <>
                        <p className={`text-2xl font-bold ${getScoreColor(result.percentage)}`}>
                          {result.percentage.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-500">
                          {result.total_score?.toFixed(1)} / {result.total_max?.toFixed(1)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">Pending</p>
                    )}
                  </div>
                </div>
                {result.has_challenge && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      Challenge Pending
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default StudentDashboardPage
