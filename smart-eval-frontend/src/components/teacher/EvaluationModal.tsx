import { Evaluation } from '../../services/gradingService'

interface EvaluationModalProps {
  evaluation: Evaluation
  ocrText?: string
  onClose: () => void
}

export default function EvaluationModal({ evaluation, ocrText, onClose }: EvaluationModalProps) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Evaluation Results</h2>
            <p className="text-sm text-gray-500 mt-1">
              Graded at: {evaluation.graded_at ? new Date(evaluation.graded_at).toLocaleString() : 'N/A'}
              {' '}&middot;{' '}Strictness: <span className="capitalize font-medium">{evaluation.strictness}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Summary Bar */}
        <div className={`mx-6 mt-4 p-4 rounded-lg border ${getScoreBg(evaluation.percentage)}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-3xl font-bold ${getScoreColor(evaluation.percentage)}`}>
                {evaluation.total_marks_awarded}/{evaluation.total_max_marks}
              </span>
              <span className={`text-lg ml-2 ${getScoreColor(evaluation.percentage)}`}>
                ({evaluation.percentage}%)
              </span>
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(evaluation.overall_confidence)}`}>
                Confidence: {(evaluation.overall_confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-700 mt-2">{evaluation.overall_feedback}</p>
        </div>

        {/* Body — two columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Per-question evaluations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Question-wise Evaluation</h3>
            {evaluation.question_evaluations.map((qe) => {
              const qPct = qe.max_marks > 0 ? (qe.marks_awarded / qe.max_marks) * 100 : 0
              return (
                <div key={qe.question_number} className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">Question {qe.question_number}</h4>
                    <span className={`font-bold ${getScoreColor(qPct)}`}>
                      {qe.marks_awarded}/{qe.max_marks}
                    </span>
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

                  <p className="text-sm text-gray-600">{qe.feedback}</p>

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

                  {/* Concepts */}
                  {(qe.concepts_covered.length > 0 || qe.concepts_missing.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {qe.concepts_covered.map((c, i) => (
                        <span key={`cc-${i}`} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {c}
                        </span>
                      ))}
                      {qe.concepts_missing.map((c, i) => (
                        <span key={`cm-${i}`} className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded text-xs line-through">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right: OCR text */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Student Answer (OCR)</h3>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {ocrText || 'No OCR text available'}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
