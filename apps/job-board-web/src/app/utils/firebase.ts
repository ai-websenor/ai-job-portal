import APP_CONFIG from "@/app/config/config";
import { initializeApp, getApps, getApp } from "firebase/app";
import { Messaging, getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: APP_CONFIG.FIREBASE.APIKEY,
  authDomain: APP_CONFIG.FIREBASE.AUTHDOMAIN,
  projectId: APP_CONFIG.FIREBASE.PROJECTID,
  storageBucket: APP_CONFIG.FIREBASE.STORAGEBUCKET,
  messagingSenderId: APP_CONFIG.FIREBASE.MESSAGINGSENDERID,
  appId: APP_CONFIG.FIREBASE.APPID,
};

const isConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

const app = isConfigured
  ? getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  : null;

export const messaging = (): Messaging | null => {
  if (typeof window === "undefined" || !app) return null;
  return getMessaging(app);
};
