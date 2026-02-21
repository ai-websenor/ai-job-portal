const APP_CONFIG = {
  APP_NAME: "Job Board",
  CURRENCY: "₹",
  ENVIRONMENT: process.env.NEXT_PUBLIC_NODE_ENV,

  API_BASE_URL:
    process.env.NEXT_PUBLIC_NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_API_BASE_URL_DEV
      : process.env.NEXT_PUBLIC_API_BASE_URL_LIVE,

  WEB_CLIENT_ID: process.env.NEXT_PUBLIC_WEB_CLIENT_ID,

  RESUME_VIDEO_CONFIGS: {
    MIN_DURATION: 30,
    MAX_DURATION: 120,
    MAX_SIZE: 225,
    ALERT:
      "Please ensure your video is between 30 seconds and 2 minutes long, and under 225MB.",
  },

  FIREBASE: {
    APIKEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    AUTHDOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    PROJECTID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    STORAGEBUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    MESSAGINGSENDERID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    APPID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    VAPIDKEY: process.env.NEXT_PUBLIC_FIREBASE_VAPIDKEY,
  },
};

export default APP_CONFIG;
