import apiClient from './api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    unread_count: number;
  };
}

const unwrap = <T,>(payload: unknown): T =>
  (Array.isArray(payload) ? (payload[0] as T) : (payload as T));

const notificationService = {
  async list(params?: { unread_only?: boolean; page?: number; limit?: number }): Promise<NotificationsResponse> {
    const response = await apiClient.get('/api/v1/notifications', { params });
    const body = unwrap<{ success: boolean; data: Notification[]; meta: NotificationsResponse['meta'] }>(
      response.data
    );
    return { data: body.data ?? [], meta: body.meta };
  },

  async markRead(id: string): Promise<void> {
    await apiClient.put(`/api/v1/notifications/${id}/read`);
  },

  async markAllRead(): Promise<{ marked_count: number }> {
    const response = await apiClient.put('/api/v1/notifications/read-all');
    const body = unwrap<{ success: boolean; data: { marked_count: number } }>(response.data);
    return body.data;
  },
};

export default notificationService;
