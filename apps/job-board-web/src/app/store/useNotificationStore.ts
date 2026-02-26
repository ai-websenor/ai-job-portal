import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INotification } from '../types/types';

interface UseNotificationStore {
  notifications: INotification[];
  unreadCount: number;
  setNotifications: (val: INotification[]) => void;
  clearNotifications: () => void;
}

const useNotificationStore = create<UseNotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 10,

      setNotifications: (val: INotification[]) =>
        set({
          notifications: val,
        }),

      setUnreadCount: (val: number) =>
        set({
          unreadCount: val,
        }),

      clearNotifications: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),
    }),
    {
      name: 'notification-store',
    },
  ),
);

export default useNotificationStore;
