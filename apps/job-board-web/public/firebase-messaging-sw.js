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
  const notificationTitle = payload.data?.title || "New Notification";

  const notificationOptions = {
    body: payload.data?.body || "You have a new message",
    icon: payload.data?.icon || '/assets/images/logo.png',
    badge: '/assets/images/logo.png',
    data: {
      ...payload.data,
      url: payload.data?.url || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = data.url || '/';

  if (data.type === 'JOB_ALERT' && data.jobId) {
    targetUrl = `/jobs/${data.jobId}`;
  }

  if (data.type === 'JOB_ALERT_DIGEST') {
    targetUrl = '/job-alerts';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});
