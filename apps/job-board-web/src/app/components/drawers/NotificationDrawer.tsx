'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Button,
  ScrollShadow,
} from '@heroui/react';
import NotificationCard from '../cards/NotificationCard';
import useNotificationStore from '@/app/store/useNotificationStore';
import { DialogProps } from '@/app/types/types';
import { useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

interface Props extends DialogProps {
  refetch: () => void;
}

const NotificationDrawer = ({ isOpen, onClose, refetch }: Props) => {
  const [loading, setLoading] = useState(false);
  const { notifications } = useNotificationStore();

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ, {});
      refetch();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={onClose} placement="right" size="sm">
      <DrawerContent>
        <DrawerHeader className="flex flex-col gap-1 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Notifications</h2>
            {notifications?.length > 0 && (
              <Button
                onPress={markAllAsRead}
                size="sm"
                variant="light"
                color="primary"
                isLoading={loading}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </DrawerHeader>

        <DrawerBody className="p-0">
          <ScrollShadow className="h-full p-4">
            {notifications?.length > 0 ? (
              <div className="flex flex-col gap-3">
                {notifications?.map((notification) => (
                  <NotificationCard key={notification.id} {...notification} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 opacity-60">
                <p className="text-center text-sm py-5 text-default-400">No notifications yet</p>
              </div>
            )}
          </ScrollShadow>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default NotificationDrawer;
