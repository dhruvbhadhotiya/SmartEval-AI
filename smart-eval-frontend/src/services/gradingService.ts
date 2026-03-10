import apiClient from './api'

export interface AnswerSheet {
  id: string
  exam_id: string
  student_id: string
  status: 'uploaded' | 'processing' | 'ocr_completed' | 'graded' | 'reviewed' | 'challenged' | 'failed'
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

const gradingService = {
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
}

export default gradingService
