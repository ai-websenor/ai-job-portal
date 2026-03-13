'use client';

import { getToken } from 'firebase/messaging';
import { messaging as getMessagingInstance } from '../utils/firebase';
import APP_CONFIG from '../config/config';
import useLocalStorage from './useLocalStorage';
import http from '../api/http';
import ENDPOINTS from '../api/endpoints';

const useFirebase = () => {
  const { getLocalStorage, setLocalStorage } = useLocalStorage();

  const initFirebase = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      const messaging = getMessagingInstance();
      if (!messaging) return;

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') return;

      const fcmToken = await getToken(messaging, {
        vapidKey: APP_CONFIG.FIREBASE.VAPIDKEY,
      });

      if (!fcmToken) return;

      setLocalStorage('fcmToken', fcmToken);
      await registerDeviceToken(fcmToken);
    } catch (error) {
      console.log('An error occurred during Firebase initialization:', error);
    }
  };

  const registerDeviceToken = async (token: string) => {
    try {
      await http.post(ENDPOINTS.NOTIFICATIONS.REGISTER, {
        token,
        platform: 'web',
      });
    } catch (error) {
      console.log('An error occurred during device token registration:', error);
    }
  };

  const unRegisterDeviceToken = async () => {
    const token = getLocalStorage('fcmToken');
    if (!token) return;
    try {
      await http.delete(ENDPOINTS.NOTIFICATIONS.UNREGISTER, {
        data: {
          token,
        },
      });
    } catch (error) {
      console.log('An error occurred during device token unregistration:', error);
    }
  };

  return {
    initFirebase,
    unRegisterDeviceToken,
  };
};

export default useFirebase;
