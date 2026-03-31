import { useState } from 'react'
import gradingService from '../../services/gradingService'

interface HolisticParams {
  attendance: {
    enabled: boolean
    weight: number
    threshold: number
    direction: 'higher' | 'lower'
  }
}

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

  // Holistic parameters
  const [attendanceEnabled, setAttendanceEnabled] = useState(false)
  const [attendanceWeight, setAttendanceWeight] = useState(5)
  const [attendanceThreshold, setAttendanceThreshold] = useState(75)
  const [attendanceDirection, setAttendanceDirection] = useState<'higher' | 'lower'>('higher')

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const holisticParams: HolisticParams = {
        attendance: {
          enabled: attendanceEnabled,
          weight: attendanceWeight,
          threshold: attendanceThreshold,
          direction: attendanceDirection,
        },
      }
      await gradingService.updateGradingConfig(examId, {
        strictness,
        keyword_mode: keywordMode,
        holistic_params: holisticParams,
      })
      setMessage('Configuration saved!')
      onUpdated()
    } catch (err: any) {
      setMessage(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Failed to save'
      )
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

      {/* Holistic Parameters */}
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">Holistic Parameters</label>

        {/* Attendance toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Attendance Factor</span>
            <button
              onClick={() => setAttendanceEnabled(!attendanceEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                attendanceEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  attendanceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {attendanceEnabled && (
            <div className="ml-2 space-y-3 border-l-2 border-blue-200 pl-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Weight ({attendanceWeight}%)</label>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={attendanceWeight}
                  onChange={e => setAttendanceWeight(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span>20%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Attendance Threshold (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={attendanceThreshold}
                  onChange={e => setAttendanceThreshold(Number(e.target.value))}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Direction</label>
                <select
                  value={attendanceDirection}
                  onChange={e => setAttendanceDirection(e.target.value as 'higher' | 'lower')}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  <option value="higher">Higher marks for borderline</option>
                  <option value="lower">Lower marks for borderline</option>
                </select>
              </div>
            </div>
          )}
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
