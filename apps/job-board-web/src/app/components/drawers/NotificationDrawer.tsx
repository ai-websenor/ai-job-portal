'use client';

import { DialogProps } from '@/app/types/types';
import NotificationCard from '../cards/NotificationCard';
import useNotificationStore from '@/app/store/useNotificationStore';

const NotificationDrawer = ({ isOpen, onClose }: DialogProps) => {
  const { notifications } = useNotificationStore();

  return (
    <div>
      {notifications?.length > 0 ? (
        notifications?.map((notification) => (
          <NotificationCard key={notification.id} {...notification} />
        ))
      ) : (
        <p className="text-center text-sm py-5 text-default-400">No notifications</p>
      )}
    </div>
  );
};

export default NotificationDrawer;
