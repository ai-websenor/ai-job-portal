'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useNotificationStore from '@/app/store/useNotificationStore';
import { Badge, Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { IoNotificationsOutline } from 'react-icons/io5';
import NotificationDrawer from '../drawers/NotificationDrawer';
import clsx from 'clsx';

const Notifications = () => {
  const [loading, setLoading] = useState(false);
  const { setNotifications, unreadCount } = useNotificationStore();
  const [openDrawer, setOpenDrawer] = useState(false);

  const getNotifications = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.NOTIFICATIONS.LIST, {
        params: {
          limit: 20,
        },
      });

      if (response?.data) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getNotifications();
  }, []);

  const toggleDrawer = () => setOpenDrawer((prev) => !prev);

  return (
    <>
      <div className="flex items-center">
        <Badge
          content={unreadCount > 0 ? unreadCount : null}
          color="danger"
          size="sm"
          shape="circle"
          className={clsx('text-[9px]', { hidden: unreadCount === 0 })}
        >
          <Button
            size="sm"
            color="primary"
            isIconOnly
            variant="flat"
            isLoading={loading}
            onPress={toggleDrawer}
          >
            <IoNotificationsOutline size={17} />
          </Button>
        </Badge>
      </div>

      <NotificationDrawer isOpen={openDrawer} onClose={toggleDrawer} />
    </>
  );
};

export default Notifications;
