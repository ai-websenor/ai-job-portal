import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INotification } from '../types/types';

interface UseNotificationStore {
  notifications: INotification[];
  setNotifications: (val: INotification[]) => void;
  clearNotifications: () => void;
}

const useNotificationStore = create<UseNotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      setNotifications: (val: INotification[]) =>
        set({
          notifications: val,
        }),
      clearNotifications: () =>
        set({
          notifications: [],
        }),
    }),
    {
      name: 'notification-store',
    },
  ),
);

export default useNotificationStore;
