'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useNotificationStore from '@/app/store/useNotificationStore';
import { Badge, Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { IoNotificationsOutline } from 'react-icons/io5';
import NotificationDrawer from '../drawers/NotificationDrawer';
import clsx from 'clsx';
import usePagination from '@/app/hooks/usePagination';

const Notifications = () => {
  const [loading, setLoading] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const { setNotifications, unreadCount, setUnreadCount, refreshSignal } = useNotificationStore();

  const getNotifications = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.NOTIFICATIONS.LIST, {
        params: {
          page,
          limit: 20,
        },
      });

      if (response?.data) {
        setNotifications(response.data);
        setTotalPages(response?.pagination?.pageCount);
      }
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUnreadCount = async () => {
    try {
      const response: any = await http.get(ENDPOINTS.NOTIFICATIONS.GET_UNREAD_COUNT);
      if (response?.data) {
        setUnreadCount(response.data?.count ?? 0);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getNotifications();
  }, [page, refreshSignal]);

  useEffect(() => {
    getUnreadCount();
  }, [refreshSignal]);

  const toggleDrawer = () => setOpenDrawer((prev) => !prev);

  return (
    <>
      <div className="flex items-center">
        <Badge
          content={unreadCount > 0 ? unreadCount : null}
          color="danger"
          size="sm"
          variant="solid"
          className={clsx(
            'text-[10px] min-w-5 h-5 flex items-center justify-center border-2 border-white',
            { hidden: unreadCount === 0 },
          )}
        >
          <Button
            size="md"
            className="bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-200 rounded-xl"
            isIconOnly
            variant="flat"
            isLoading={loading}
            onPress={toggleDrawer}
          >
            <IoNotificationsOutline
              size={22}
              className="opacity-90 transition-transform active:scale-90"
            />
          </Button>
        </Badge>
      </div>

      <NotificationDrawer
        isOpen={openDrawer}
        onClose={toggleDrawer}
        refetch={() => {
          getNotifications();
          getUnreadCount();
        }}
        renderPagination={renderPagination}
      />
    </>
  );
};

export default Notifications;
