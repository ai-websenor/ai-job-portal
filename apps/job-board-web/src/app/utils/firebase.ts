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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const messaging = (): Messaging | null => {
  return typeof window !== "undefined" ? getMessaging(app) : null;
};
