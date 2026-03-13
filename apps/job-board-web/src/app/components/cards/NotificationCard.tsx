'use client';

import { INotification } from '@/app/types/types';
import { Card, CardBody, Chip, Button, addToast } from '@heroui/react';
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
      className={clsx(
        'shadow-sm hover:shadow-md transition-all duration-300 group',
        !isRead ? 'bg-secondary' : 'border bg-content1',
      )}
    >
      <CardBody className="p-4 flex flex-row gap-4 items-start">
        <div
          className={clsx('p-2 rounded-full', !isRead ? 'bg-white' : 'bg-default-100 shadow-inner')}
        >
          {getIcon()}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={clsx(
                'text-sm font-semibold truncate',
                !isRead ? 'text-primary' : 'text-default-700',
              )}
            >
              {title}
            </h4>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-default-400 whitespace-nowrap">
                {createdAt ? dayjs(createdAt).fromNow() : ''}
              </span>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                isLoading={loading}
                onPress={handleDelete}
                className="h-6 w-6 min-w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IoTrashOutline size={14} />
              </Button>
            </div>
          </div>
          <p className="text-xs text-default-500 line-clamp-2 leading-relaxed">{message}</p>
          {!isRead && (
            <div className={clsx('mt-2 text-right', !isRead ? 'text-primary' : 'text-default-700')}>
              <Chip size="sm" variant="flat" color="primary" className="h-5 text-[10px]">
                New
              </Chip>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default NotificationCard;
