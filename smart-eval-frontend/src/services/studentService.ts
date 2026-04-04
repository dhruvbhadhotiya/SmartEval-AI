import apiClient from './api'

export interface StudentResult {
  exam_id: string
  exam_title: string
  subject: string
  exam_date: string | null
  max_marks: number
  published_at: string | null
  total_score: number | null
  total_max: number | null
  percentage: number | null
  overall_feedback: string | null
  status: string
  has_challenge: boolean
}

export interface QuestionResult {
  question_number: number
  max_marks: number
  marks_awarded: number
  feedback: string
  confidence: number
  keywords_found: string[]
  keywords_missing: string[]
  concepts_covered: string[]
  concepts_missing: string[]
  can_challenge: boolean
  challenge_status: string | null
  override_applied?: boolean
  original_marks?: number
}

export interface ResultDetail {
  exam: {
    id: string
    title: string
    subject: string
    exam_date: string | null
    max_marks: number
  }
  student: {
    name: string
    roll_number: string
  }
  summary: {
    total_score: number
    max_score: number
    percentage: number
    overall_feedback: string
    overall_confidence: number
  }
  questions: QuestionResult[]
  answer_sheet: {
    id: string
    original_file_url: string | null
  }
  published_at: string | null
}

export interface ChallengeQuestion {
  question_number: number
  justification: string
}

export interface ChallengeData {
  id: string
  evaluation_id: string
  student_id: string
  exam_id: string
  status: 'pending' | 'under_review' | 'accepted' | 'rejected'
  challenged_questions: {
    question_number: number
    original_score: number
    max_marks: number
    student_justification: string
  }[]
  resolution: {
    resolved_by: string | null
    resolved_at: string | null
    decision: string
    comments: string
    score_changes: {
      question_number: number
      old_score: number
      new_score: number
    }[]
  } | null
  exam_title?: string
  exam_subject?: string
  student_name?: string
  student_roll?: string
  created_at: string
  updated_at: string
}

const studentService = {
  async getResults(): Promise<StudentResult[]> {
    const response = await apiClient.get<any>('/api/v1/results')
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    return data.data || []
  },

  async getResultDetail(examId: string): Promise<ResultDetail> {
    const response = await apiClient.get<any>(`/api/v1/results/${examId}`)
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    return data.data
  },

  async submitChallenge(
    examId: string,
    challengedQuestions: ChallengeQuestion[]
  ): Promise<ChallengeData> {
    const response = await apiClient.post<any>('/api/v1/challenges', {
      exam_id: examId,
      challenged_questions: challengedQuestions,
    })
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    return data.data
  },

  async getChallenges(params?: {
    exam_id?: string
    status?: string
  }): Promise<ChallengeData[]> {
    const response = await apiClient.get<any>('/api/v1/challenges', { params })
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    return data.data || []
  },

  async getChallengeDetail(challengeId: string): Promise<ChallengeData> {
    const response = await apiClient.get<any>(`/api/v1/challenges/${challengeId}`)
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    return data.data
  },

  async resolveChallenge(
    challengeId: string,
    resolution: {
      decision: 'accepted' | 'rejected'
      comments: string
      score_changes?: { question_number: number; new_score: number }[]
    }
  ): Promise<ChallengeData> {
    const response = await apiClient.put<any>(
      `/api/v1/challenges/${challengeId}/resolve`,
      resolution
    )
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    return data.data
  },
}

export default studentService
