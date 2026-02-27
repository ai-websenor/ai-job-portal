'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Button,
  ScrollShadow,
} from '@heroui/react';
import { IoNotificationsOutline } from 'react-icons/io5';
import NotificationCard from '../cards/NotificationCard';
import useNotificationStore from '@/app/store/useNotificationStore';
import { DialogProps } from '@/app/types/types';
import { useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

interface Props extends DialogProps {
  refetch: () => void;
  renderPagination: () => React.ReactNode;
}

const NotificationDrawer = ({ isOpen, onClose, refetch, renderPagination }: Props) => {
  const [loading, setLoading] = useState(false);
  const { notifications, unreadCount, setUnreadCount } = useNotificationStore();

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ, {});
      refetch();
      setUnreadCount(0);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={onClose} placement="right" size="sm">
      <DrawerContent className="bg-white/95 backdrop-blur-md">
        <DrawerHeader className="flex flex-col gap-1 border-b border-default-100 py-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold tracking-tight text-default-900">Notifications</h2>
              <p className="text-xs text-default-400 mt-1 font-medium">
                Manage your recent activities
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onPress={markAllAsRead}
                size="sm"
                variant="light"
                color="primary"
                className="font-semibold"
                isLoading={loading}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </DrawerHeader>

        <DrawerBody className="p-0">
          <ScrollShadow className="h-full p-6">
            {notifications?.length > 0 ? (
              <div className="flex flex-col gap-4">
                {notifications?.map((notification) => (
                  <NotificationCard key={notification.id} refetch={refetch} {...notification} />
                ))}
                {renderPagination()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="bg-primary/5 p-6 rounded-full mb-6">
                  <IoNotificationsOutline className="text-primary/40" size={50} />
                </div>
                <h3 className="text-lg font-semibold text-default-700">All caught up!</h3>
                <p className="text-center text-sm text-default-400 mt-2 max-w-[200px] leading-relaxed">
                  You don't have any new notifications at the moment.
                </p>
              </div>
            )}
          </ScrollShadow>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default NotificationDrawer;
