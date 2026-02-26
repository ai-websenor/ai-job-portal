import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INotification } from '../types/types';

interface UseNotificationStore {
  notifications: INotification[];
  unreadCounts: number;
  setNotifications: (val: INotification[]) => void;
  clearNotifications: () => void;
}

const useNotificationStore = create<UseNotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCounts: 0,

      setNotifications: (val: INotification[]) =>
        set({
          notifications: val,
        }),

      setUnreadCounts: (val: number) =>
        set({
          unreadCounts: val,
        }),

      clearNotifications: () =>
        set({
          notifications: [],
          unreadCounts: 0,
        }),
    }),
    {
      name: 'notification-store',
    },
  ),
);

export default useNotificationStore;
