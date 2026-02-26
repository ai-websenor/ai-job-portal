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

const NotificationDrawer = ({ isOpen, onClose }: DialogProps) => {
  const { notifications } = useNotificationStore();

  return (
    <Drawer isOpen={isOpen} onOpenChange={onClose} placement="right" size="sm">
      <DrawerContent>
        <DrawerHeader className="flex flex-col gap-1 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Notifications</h2>
            {notifications?.length > 0 && (
              <Button size="sm" variant="light" color="primary">
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
