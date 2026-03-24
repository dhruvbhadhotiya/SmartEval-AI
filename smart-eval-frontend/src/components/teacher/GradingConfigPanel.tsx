import { useState } from 'react'
import gradingService from '../../services/gradingService'

interface GradingConfigPanelProps {
  examId: string
  currentStrictness?: string
  currentKeywordMode?: string
  onUpdated: () => void
}

export default function GradingConfigPanel({
  examId,
  currentStrictness = 'moderate',
  currentKeywordMode = 'synonyms',
  onUpdated,
}: GradingConfigPanelProps) {
  const [strictness, setStrictness] = useState(currentStrictness)
  const [keywordMode, setKeywordMode] = useState(currentKeywordMode)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      await gradingService.updateGradingConfig(examId, { strictness, keyword_mode: keywordMode })
      setMessage('Configuration saved!')
      onUpdated()
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const strictnessOptions = [
    { value: 'lenient', label: 'Lenient', desc: 'Generous partial credit' },
    { value: 'moderate', label: 'Moderate', desc: 'Balanced scoring' },
    { value: 'strict', label: 'Strict', desc: 'Rigorous grading' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Grading Configuration</h3>

      {/* Strictness */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Strictness Level</label>
        <div className="flex gap-3">
          {strictnessOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStrictness(opt.value)}
              className={`flex-1 p-3 rounded-lg border-2 text-center transition ${
                strictness === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs mt-1 opacity-75">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Keyword Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Keyword Matching</label>
        <div className="flex gap-3">
          <button
            onClick={() => setKeywordMode('synonyms')}
            className={`flex-1 p-3 rounded-lg border-2 text-center transition ${
              keywordMode === 'synonyms'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm">Synonyms</div>
            <div className="text-xs mt-1 opacity-75">Accept equivalent terms</div>
          </button>
          <button
            onClick={() => setKeywordMode('exact')}
            className={`flex-1 p-3 rounded-lg border-2 text-center transition ${
              keywordMode === 'exact'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm">Exact</div>
            <div className="text-xs mt-1 opacity-75">Only exact keywords</div>
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
      >
        {isSaving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  )
}
