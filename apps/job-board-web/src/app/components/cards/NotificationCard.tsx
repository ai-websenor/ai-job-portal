import { INotification } from '@/app/types/types';
import { Card, CardBody, Chip } from '@heroui/react';
import { IoNotifications, IoBriefcase, IoPerson, IoShieldCheckmark } from 'react-icons/io5';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';

dayjs.extend(relativeTime);

const NotificationCard = ({ title, message, createdAt, isRead, type }: INotification) => {
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

  return (
    <Card
      isPressable
      className={clsx(
        'shadow-sm hover:shadow-md transition-all duration-300',
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
          <div className="flex items-center justify-between gap-2">
            <h4
              className={clsx(
                'text-sm font-semibold truncate',
                !isRead ? 'text-primary' : 'text-default-700',
              )}
            >
              {title}
            </h4>
            <span className="text-[10px] text-default-400 whitespace-nowrap">
              {createdAt ? dayjs(createdAt).fromNow() : ''}
            </span>
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
