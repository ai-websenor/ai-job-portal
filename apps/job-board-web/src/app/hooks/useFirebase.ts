"use client";

import { getToken } from "firebase/messaging";
import { messaging as getMessagingInstance } from "../utils/firebase";
import APP_CONFIG from "../config/config";
import useLocalStorage from "./useLocalStorage";

const useFirebase = () => {
  const { setLocalStorage } = useLocalStorage();

  const initFirebase = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    try {
      const messaging = getMessagingInstance();
      if (!messaging) return;

      const permission = await Notification.requestPermission();

      if (permission !== "granted") return;

      const fcmToken = await getToken(messaging, {
        vapidKey: APP_CONFIG.FIREBASE.VAPIDKEY,
      });

      if (!fcmToken) return;

      setLocalStorage("fcmToken", fcmToken);
    } catch (error) {
      console.log("An error occurred during Firebase initialization:", error);
    }
  };

  return {
    initFirebase,
  };
};

export default useFirebase;
