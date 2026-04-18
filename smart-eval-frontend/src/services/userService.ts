import apiClient from './api';
import type { User } from './authService';

export interface UpdateProfileData {
  profile?: {
    name?: string;
    department?: string;
  };
  settings?: {
    notifications?: { email?: boolean; in_app?: boolean };
    default_strictness?: string;
  };
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

const unwrap = <T,>(payload: unknown): T =>
  (Array.isArray(payload) ? (payload[0] as T) : (payload as T));

const userService = {
  async getProfile(): Promise<User> {
    const response = await apiClient.get('/api/v1/users/me');
    const body = unwrap<{ success: boolean; data: User }>(response.data);
    return body.data;
  },

  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await apiClient.put('/api/v1/users/me', data);
    const body = unwrap<{ success: boolean; data: User }>(response.data);
    return body.data;
  },

  async changePassword(data: ChangePasswordData): Promise<void> {
    await apiClient.put('/api/v1/users/me/password', data);
  },
};

export default userService;
