'use client';

import { useEffect, useRef, useState } from 'react';
import { messaging as getMessagingInstance } from '@/app/utils/firebase';
import { onMessage, MessagePayload } from 'firebase/messaging';
import { IoNotifications, IoClose } from 'react-icons/io5';
import useNotificationStore from '@/app/store/useNotificationStore';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardBody, Button } from '@heroui/react';
import clsx from 'clsx';
import routePaths from '@/app/config/routePaths';

interface ActiveNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
}

const NotificationBar = () => {
  const router = useRouter();
  const { roomId } = useParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triggerRefresh = useNotificationStore((state) => state.triggerRefresh);
  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);

  useEffect(() => {
    audioRef.current = new Audio('/assets/audios/notification.mp3');
    audioRef.current.load();
    const primeAudio = () => {
      audioRef.current
        ?.play()
        .then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
          window.removeEventListener('click', primeAudio);
        })
        .catch(() => {});
    };

    window.addEventListener('click', primeAudio);
    return () => window.removeEventListener('click', primeAudio);
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => console.log('Notification audio blocked:', err));
    }
  };

  useEffect(() => {
    const messaging = getMessagingInstance();

    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';

        triggerRefresh();

        if (payload?.data?.threadId === roomId) {
          return;
        }

        playSound();

        const newAlert = {
          id: Math.random().toString(36).substring(7),
          title,
          body,
          data: payload.data,
        };

        setNotifications((prev) => [...prev, newAlert]);

        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== newAlert.id));
        }, 6000);
      });

      return () => unsubscribe();
    }
  }, [roomId, triggerRefresh]);

  const handleClose = (id: string, e: any) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClick = (notification: ActiveNotification) => {
    if (notification?.data?.type === 'NEW_MESSAGE') {
      router.push(routePaths.chat.chatDetail(notification?.data?.threadId));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    return;
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 sm:w-[420px] w-[calc(100vw-2rem)] pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="pointer-events-auto"
          >
            <Card
              shadow="lg"
              as={'div'}
              isPressable
              className={clsx(
                'w-full bg-white/95 backdrop-blur-md border-1 border-primary/20',
                'overflow-visible cursor-pointer hover:border-primary/40 transition-colors',
                'active:scale-[0.98]',
              )}
              onClick={() => handleClick(notification)}
            >
              <CardBody className="p-4 flex flex-row gap-4 items-start relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />

                <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                  <IoNotifications className="text-primary" size={22} />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="text-[14px] leading-tight font-bold text-default-900 mb-1 line-clamp-1">
                    {notification.title}
                  </h4>
                  <p className="text-[13px] leading-snug text-default-600 line-clamp-2">
                    {notification.body}
                  </p>
                </div>

                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onClick={(e) => handleClose(notification.id, e)}
                  className="absolute top-2 right-2 h-7 w-7 min-w-7 text-default-400 hover:text-default-700 bg-transparent hover:bg-default-100 z-10 rounded-full"
                >
                  <IoClose size={18} />
                </Button>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBar;
