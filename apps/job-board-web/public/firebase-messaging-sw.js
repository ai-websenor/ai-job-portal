importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAAAXP1v1e77AlTsEqOmoOAgI2AaT6kZog",
  authDomain: "jobboard-62d28.firebaseapp.com",
  projectId: "jobboard-62d28",
  storageBucket: "jobboard-62d28.firebasestorage.app",
  messagingSenderId: "44525478653",
  appId: "1:44525478653:web:a8aeff62606ae7fd1e5494"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/images/logo.svg'
  };

  console.log("[Background Notification]", payload.notification)
  self.registration.showNotification(notificationTitle, notificationOptions);
});