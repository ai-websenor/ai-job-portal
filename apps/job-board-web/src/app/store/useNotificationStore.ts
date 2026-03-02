import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INotification } from '../types/types';

interface UseNotificationStore {
  notifications: INotification[];
  unreadCount: number;
  refreshSignal: number;

  setUnreadCount: (val: number) => void;
  setNotifications: (val: INotification[]) => void;
  triggerRefresh: () => void;
  clearNotifications: () => void;
}

const useNotificationStore = create<UseNotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 10,
      refreshSignal: 0,

      setNotifications: (val: INotification[]) =>
        set({
          notifications: val,
        }),

      setUnreadCount: (val: number) =>
        set({
          unreadCount: val,
        }),

      triggerRefresh: () => set((state) => ({ refreshSignal: state.refreshSignal + 1 })),

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
