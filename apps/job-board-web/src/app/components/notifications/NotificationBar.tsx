'use client';

import { addToast } from '@heroui/react';
import { useEffect } from 'react';
import { messaging as getMessagingInstance } from '@/app/utils/firebase';
import { onMessage, MessagePayload } from 'firebase/messaging';

const NotificationBar = () => {
  useEffect(() => {
    const messaging = getMessagingInstance();

    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';

        addToast({
          title: title,
          description: body?.length > 100 ? `${body.slice(0, 100)}...` : body,
          color: 'primary',
          variant: 'flat',
          onClose: () => console.log('Toast closed'),
        });

        console.log('[Foreground Notification]', payload.notification);
      });

      return () => unsubscribe();
    }
  }, []);

  return null;
};

export default NotificationBar;
