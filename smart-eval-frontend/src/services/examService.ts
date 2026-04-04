import apiClient from './api'

export interface Exam {
  id: string
  title: string
  subject: string
  exam_date: string
  max_marks?: number
  duration_minutes?: number
  status: 'draft' | 'configuring' | 'grading' | 'reviewing' | 'published'
  question_paper?: {
    file_url: string
    uploaded_at: string
    file_size: number
  }
  model_answer?: {
    file_url: string
    uploaded_at: string
    file_size: number
    parsed_answers?: {
      question_number: number
      max_marks: number
      answer_text: string
      keywords: string[]
      concepts: string[]
    }[]
  }
  statistics?: {
    total_sheets?: number
    total_submissions: number
    graded: number
    reviewed: number
    average_score?: number
    highest_score?: number
    lowest_score?: number
  }
  grading_config?: {
    strictness: string
    holistic_params: object
    keyword_mode: string
  }
  created_at: string
  updated_at: string
}

export interface CreateExamData {
  title: string
  subject: string
  exam_date: string | null
  max_marks?: number
  duration_minutes?: number
}

export interface ExamsListResponse {
  success: boolean
  data: Exam[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ExamResponse {
  success: boolean
  data: Exam
  message?: string
}

const examService = {
  async getExams(params?: {
    page?: number
    limit?: number
    status?: string
    sort?: string
  }): Promise<ExamsListResponse> {
    const response = await apiClient.get<any>('/api/v1/exams', { params })
    // Flask returns tuple (response_dict, status_code) which becomes array [response, code]
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async createExam(data: CreateExamData): Promise<ExamResponse> {
    const response = await apiClient.post<any>('/api/v1/exams', data)
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async getExamById(id: string): Promise<ExamResponse> {
    const response = await apiClient.get<any>(`/api/v1/exams/${id}`)
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async updateExam(id: string, data: Partial<CreateExamData>): Promise<ExamResponse> {
    const response = await apiClient.put<any>(`/api/v1/exams/${id}`, data)
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async deleteExam(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<any>(`/api/v1/exams/${id}`)
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async updateExamStatus(id: string, status: string): Promise<ExamResponse> {
    const response = await apiClient.put<any>(`/api/v1/exams/${id}/status`, { status })
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async uploadQuestionPaper(examId: string, file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(`/api/v1/exams/${examId}/question-paper`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async uploadModelAnswer(examId: string, file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(`/api/v1/exams/${examId}/model-answer`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async bulkUploadAnswerSheets(examId: string, files: File[]): Promise<any> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await apiClient.post(`/api/v1/exams/${examId}/answer-sheets/bulk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async listStudents(): Promise<{ id: string; email: string; name: string; roll_number: string }[]> {
    const response = await apiClient.get<any>('/api/v1/exams/students')
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    return data.data || []
  },

  async assignSheetToStudent(examId: string, sheetId: string, studentEmail: string): Promise<any> {
    const response = await apiClient.put<any>(`/api/v1/exams/${examId}/sheets/${sheetId}/assign`, {
      student_email: studentEmail,
    })
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  async bulkAssignSheets(examId: string, studentEmail: string): Promise<any> {
    const response = await apiClient.put<any>(`/api/v1/exams/${examId}/sheets/bulk-assign`, {
      student_email: studentEmail,
    })
    return Array.isArray(response.data) ? response.data[0] : response.data
  },
}

export default examService
