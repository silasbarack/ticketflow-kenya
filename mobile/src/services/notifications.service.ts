import { USE_MOCK_DATA } from '@/constants/config';
import { Notification } from '@/types/notification';
import { api } from './api';
import { delay, mockState } from './mock-state';

interface NotificationsService {
  list(): Promise<Notification[]>;
  markRead(notificationId: string): Promise<void>;
}

const realNotificationsService: NotificationsService = {
  async list() {
    const { data } = await api.get<Notification[]>('/notifications');
    return data;
  },
  async markRead(notificationId) {
    await api.patch(`/notifications/${notificationId}/read`);
  },
};

const mockNotificationsService: NotificationsService = {
  async list() {
    await delay(300);
    return mockState.notifications;
  },
  async markRead(notificationId) {
    await delay(150);
    const notification = mockState.notifications.find((n) => n.id === notificationId);
    if (notification) notification.read = true;
  },
};

export const notificationsService: NotificationsService = USE_MOCK_DATA
  ? mockNotificationsService
  : realNotificationsService;
