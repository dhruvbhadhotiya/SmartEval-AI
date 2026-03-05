import apiClient from './api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  role: 'teacher' | 'student'
  profile: {
    name: string
  }
}

export interface User {
  id: string
  email: string
  role: string
  profile: {
    name: string
  }
  created_at: string
}

export interface AuthResponse {
  success: boolean
  data: {
    access_token: string
    refresh_token: string
    user: User
  }
}

const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/api/v1/auth/login', credentials)
    
    console.log('Login response:', response.data)
    
    // Flask returns tuple (response_dict, status_code) which becomes array [response, code]
    const actualResponse = Array.isArray(response.data) ? response.data[0] : response.data
    
    if (actualResponse.success) {
      const { access_token, refresh_token } = actualResponse.data
      console.log('Saving tokens to localStorage')
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
    }
    
    return actualResponse
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/api/v1/auth/register', data)
    
    // Flask returns tuple (response_dict, status_code) which becomes array [response, code]
    const actualResponse = Array.isArray(response.data) ? response.data[0] : response.data
    
    if (actualResponse.success) {
      const { access_token, refresh_token } = actualResponse.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
    }
    
    return actualResponse
  },

  async getCurrentUser(): Promise<{ success: boolean; data: User }> {
    const response = await apiClient.get<any>('/api/v1/auth/me')
    console.log('Get current user response:', response.data)
    // Flask returns tuple (response_dict, status_code) which becomes array [response, code]
    return Array.isArray(response.data) ? response.data[0] : response.data
  },

  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },

  getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },
}

export default authService
