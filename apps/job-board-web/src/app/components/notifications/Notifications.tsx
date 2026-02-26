'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useNotificationStore from '@/app/store/useNotificationStore';
import { Badge, Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { IoMdNotificationsOutline } from 'react-icons/io';

const Notifications = () => {
  const [loading, setLoading] = useState(false);
  const { notifications, setNotifications } = useNotificationStore();

  const getNotifications = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.NOTIFICATIONS.LIST, {
        params: {
          limit: 10,
        },
      });

      if (response?.data) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getNotifications();
  }, []);

  return (
    <Badge content="5" color="danger" size="sm">
      <Button size="sm" isIconOnly color="primary" variant="flat">
        <IoMdNotificationsOutline size={18} />
      </Button>
    </Badge>
  );
};

export default Notifications;
