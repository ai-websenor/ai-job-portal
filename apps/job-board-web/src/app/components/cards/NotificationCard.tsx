'use client';

import { INotification } from '@/app/types/types';
import { Card, CardBody, Button, addToast } from '@heroui/react';
import {
  IoNotifications,
  IoBriefcase,
  IoPerson,
  IoShieldCheckmark,
  IoTrashOutline,
} from 'react-icons/io5';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';
import { useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

dayjs.extend(relativeTime);

interface Props extends INotification {
  refetch: () => void;
}

const NotificationCard = ({ id, title, message, createdAt, isRead, type, refetch }: Props) => {
  const [loading, setLoading] = useState(false);

  const getIcon = () => {
    switch (type?.toLowerCase()) {
      case 'job':
        return <IoBriefcase className="text-blue-500" size={20} />;
      case 'profile':
        return <IoPerson className="text-purple-500" size={20} />;
      case 'system':
        return <IoShieldCheckmark className="text-green-500" size={20} />;
      default:
        return <IoNotifications className="text-primary" size={20} />;
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.NOTIFICATIONS.DELETE_BY_ID(id!));
      refetch();
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Notification deleted successfully',
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      isPressable
      shadow="none"
      className={clsx(
        'border group transition-all duration-300 ',
        !isRead ? 'bg-primary/[0.03] border-l-4 border-l-primary' : 'bg-white',
      )}
    >
      <CardBody className="p-4 flex flex-row gap-4 items-start">
        <div
          className={clsx(
            'p-2.5 rounded-2xl shrink-0 transition-colors duration-300',
            !isRead ? 'bg-white shadow-sm' : 'bg-default-50',
          )}
        >
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <h4
              className={clsx(
                'text-[14px] leading-tight font-bold transition-colors duration-300',
                !isRead ? 'text-primary' : 'text-default-800',
              )}
            >
              {title}
            </h4>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-[10px] font-medium text-default-400 whitespace-nowrap bg-default-50 px-2 py-0.5 rounded-full">
                {createdAt ? dayjs(createdAt).fromNow() : ''}
              </span>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                isLoading={loading}
                onPress={handleDelete}
                className="h-7 w-7 min-w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-danger/5 hover:bg-danger/10"
              >
                <IoTrashOutline size={15} />
              </Button>
            </div>
          </div>
          <p className="text-[12.5px] leading-snug text-default-500 line-clamp-2 pr-2">{message}</p>
          {!isRead && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                New
              </span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default NotificationCard;
