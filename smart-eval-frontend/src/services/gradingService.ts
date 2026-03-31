import apiClient from './api'

export interface AnswerSheet {
  id: string
  exam_id: string
  student_id: string
  status: 'uploaded' | 'processing' | 'ocr_completed' | 'graded' | 'reviewed' | 'challenged' | 'failed'
  score?: number
  marks_awarded?: number
  max_marks?: number
  original_file?: {
    url: string
    pages: number
    uploaded_at: string
  }
  ocr_results?: {
    page_number: number
    text: string
    confidence: number
    processed_at: string
  }[]
  processing_log?: {
    stage: string
    status: string
    timestamp: string
    details: Record<string, any>
  }[]
  created_at: string
  updated_at: string
}

export interface QuestionEvaluation {
  question_number: number
  max_marks: number
  marks_awarded: number
  feedback: string
  confidence: number
  keywords_found: string[]
  keywords_missing: string[]
  concepts_covered: string[]
  concepts_missing: string[]
  override_applied?: boolean
  original_marks?: number | null
  override_reason?: string | null
  overridden_by?: string | null
  overridden_at?: string | null
}

export interface Evaluation {
  id: string
  answer_sheet_id: string
  exam_id: string
  total_marks_awarded: number
  total_max_marks: number
  percentage: number
  overall_feedback: string
  overall_confidence: number
  strictness: string
  status: string
  graded_at: string | null
  created_at: string
  updated_at: string
  question_evaluations: QuestionEvaluation[]
}

export interface GradingResult {
  exam_id: string
  total: number
  graded: number
  failed: number
  results: {
    answer_sheet_id: string
    status: string
    total_marks_awarded?: number
    total_max_marks?: number
    percentage?: number
    evaluation_id?: string
    error?: string
  }[]
}

export interface ProcessingResult {
  exam_id: string
  total: number
  processed: number
  failed: number
  results: {
    answer_sheet_id: string
    status: string
    text_length?: number
    confidence?: number
    error?: string
  }[]
}

export interface TaskStatus {
  task_id: string
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE'
  result?: any
}

export interface ParsedAnswer {
  question_number: number
  max_marks: number
  answer_text: string
  keywords: string[]
  concepts: string[]
}

const gradingService = {
  // --- OCR ---
  async startOCRProcessing(examId: string, useAsync = false): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/grading/exams/${examId}/process?async=${useAsync}`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async processSheet(sheetId: string, useAsync = false): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/grading/sheets/${sheetId}/process?async=${useAsync}`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async getAnswerSheets(examId: string, params?: {
    status?: string
    include_ocr?: boolean
  }): Promise<any> {
    const response = await apiClient.get<any>(
      `/api/v1/grading/exams/${examId}/sheets`,
      { params }
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async getAnswerSheet(sheetId: string): Promise<any> {
    const response = await apiClient.get<any>(
      `/api/v1/grading/sheets/${sheetId}`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async getTaskStatus(taskId: string): Promise<any> {
    const response = await apiClient.get<any>(
      `/api/v1/grading/tasks/${taskId}`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  // --- LLM Grading (Sprint 5) ---
  async startGrading(examId: string): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/grading/exams/${examId}/grade`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async gradeSheet(sheetId: string): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/grading/sheets/${sheetId}/grade`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async getEvaluation(sheetId: string): Promise<any> {
    const response = await apiClient.get<any>(
      `/api/v1/grading/sheets/${sheetId}/evaluation`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async getExamEvaluations(examId: string): Promise<any> {
    const response = await apiClient.get<any>(
      `/api/v1/grading/exams/${examId}/evaluations`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  // --- Model Answer & Config ---
  async saveParsedModelAnswers(examId: string, answers: ParsedAnswer[]): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/exams/${examId}/model-answer/parsed`,
      { answers }
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async extractModelAnswerText(examId: string): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/exams/${examId}/model-answer/extract`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async extractQuestionPaperText(examId: string): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/exams/${examId}/question-paper/extract`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async updateGradingConfig(examId: string, config: {
    strictness?: string
    keyword_mode?: string
    holistic_params?: Record<string, any>
  }): Promise<any> {
    const response = await apiClient.put<any>(
      `/api/v1/exams/${examId}/grading-config`,
      config
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  // --- Teacher Review (Sprint 6) ---
  async overrideQuestionGrade(sheetId: string, questionNumber: number, data: {
    marks_awarded: number
    feedback?: string
    reason: string
  }): Promise<any> {
    const response = await apiClient.put<any>(
      `/api/v1/grading/sheets/${sheetId}/questions/${questionNumber}`,
      data
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async approveSheet(sheetId: string): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/grading/sheets/${sheetId}/approve`
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async bulkApprove(examId: string, sheetIds?: string[]): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/grading/exams/${examId}/approve-all`,
      sheetIds && sheetIds.length > 0 ? { sheet_ids: sheetIds } : {}
    )
    return Array.isArray(response.data) ? response.data[0] : response.data
  },
}

export default gradingService
