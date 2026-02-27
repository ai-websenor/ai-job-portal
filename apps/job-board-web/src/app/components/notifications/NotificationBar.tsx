'use client';

import { addToast } from '@heroui/react';
import { useEffect } from 'react';
import { messaging as getMessagingInstance } from '@/app/utils/firebase';
import { onMessage, MessagePayload } from 'firebase/messaging';
import { IoNotifications } from 'react-icons/io5';

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
          variant: 'flat',
          color: 'primary',
          classNames: {
            base: 'bg-white/80 backdrop-blur-md border border-primary/20 shadow-xl rounded-2xl p-4',
            title: 'text-primary font-bold text-sm',
            description: 'text-default-600 text-xs mt-1',
          },
          icon: (
            <div className="bg-primary/10 p-2 rounded-xl">
              <IoNotifications className="text-primary" size={20} />
            </div>
          ),
          onClose: () => console.log('Toast closed'),
        });

        console.log('[Foreground Notification]', payload.notification);

        console.log(payload);
      });

      return () => unsubscribe();
    }
  }, []);

  return null;
};

export default NotificationBar;
