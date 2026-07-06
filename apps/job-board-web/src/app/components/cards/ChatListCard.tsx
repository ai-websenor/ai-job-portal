import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useChatStore from '@/app/store/useChatStore';
import { IChatRoom, IChatRoomParticipant } from '@/app/types/types';
import { formatJobLabel } from '@/app/utils/chatUtils';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Badge, Checkbox, Chip } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';

type Props = {
  chat: IChatRoom;
  participant?: IChatRoomParticipant;
  selectionMode?: boolean;
  isSelected?: boolean;
  isSelectionDisabled?: boolean;
  onSelectionChange?: (chat: IChatRoom) => void;
};

const ChatListCard = ({
  chat,
  participant,
  selectionMode = false,
  isSelected = false,
  isSelectionDisabled = false,
  onSelectionChange,
}: Props) => {
  const router = useRouter();
  const { roomId } = useParams();
  const unreadCount = chat?.unreadCount || 0;
  const { chatRooms, setChatRooms, onlineUsers } = useChatStore();

  const isOnline = participant?.id ? onlineUsers?.[participant.id] : false;

  const attachment =
    chat?.lastMessage?.attachments && typeof chat?.lastMessage?.attachments === 'string'
      ? JSON.parse(chat?.lastMessage?.attachments)?.[0]
      : null;

  const handleClickOnRoom = async () => {
    if (selectionMode) {
      if (!isSelectionDisabled) {
        onSelectionChange?.(chat);
      }
      return;
    }

    router.push(routePaths.chat?.chatDetail(chat?.id));

    if (!unreadCount) return;

    const updated = chatRooms?.map((item) => {
      if (item?.id === chat.id) {
        return {
          ...item,
          unreadCount: 0,
        };
      }
      return item;
    });
    setChatRooms(updated);

    try {
      await http.post(ENDPOINTS.MESSAGES.THREADS.MARK_READ(chat?.id), {});
    } catch (error) {
      console.log(error);
    }
  };

  const fullName = participant ? CommonUtils.getFullName(participant) : '';
  const participantName =
    (participant?.role === 'employer' && participant?.companyName
      ? participant.companyName
      : fullName) || 'Unknown user';
  const participantAvatar =
    participant?.role === 'employer' ? participant?.companyLogo || participant?.profilePhoto : participant?.profilePhoto;
  const lastMessageAt = chat?.lastMessage?.createdAt || chat?.lastMessageAt;
  const hasJobContext = Boolean(chat?.jobTitle || chat?.jobId);
  const isSourcingThread = !chat?.applicationId;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleClickOnRoom();
  };

  return (
    <div
      key={chat?.id}
      role="button"
      tabIndex={0}
      onClick={handleClickOnRoom}
      onKeyDown={handleKeyDown}
      className={clsx(
        'w-full flex items-start gap-3 p-4 transition-all duration-200 hover:bg-default-50 text-left border-b border-default-100 last:border-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        selectionMode && isSelected
          ? 'bg-[var(--secondary-color)] border-l-[3px] border-l-primary'
          : roomId === chat?.id
          ? 'bg-[var(--secondary-color)] border-l-[3px] border-l-primary'
          : 'border-l-[3px] border-l-transparent',
        selectionMode && isSelectionDisabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {selectionMode && (
        <Checkbox
          aria-label={`Select ${participantName}`}
          className="mt-1 pointer-events-none"
          isDisabled={isSelectionDisabled}
          isSelected={isSelected}
        />
      )}

      <Badge
        color="success"
        content=""
        isInvisible={!isOnline}
        placement="bottom-right"
        shape="circle"
      >
        <Avatar
          src={participantAvatar}
          name={participantName}
          size="md"
          isBordered
          color="primary"
          classNames={{
            base: '!bg-[var(--secondary-color)] text-primary !ring-1 !ring-primary/20 !ring-offset-1',
          }}
          className="flex-shrink-0"
          showFallback
        />
      </Badge>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <span
            className={clsx(
              'font-semibold truncate text-sm',
              roomId === chat?.id ? 'text-primary' : 'text-default-900',
            )}
          >
            {participantName}
          </span>
          {lastMessageAt && (
            <span className="text-xs capitalize text-default-400 whitespace-nowrap">
              {CommonUtils.formatChatListDate(lastMessageAt)}
            </span>
          )}
        </div>
        {(hasJobContext || isSourcingThread || chat?.isOwnJob) && (
          <div className="-mt-0.5 flex flex-wrap items-center gap-1.5">
            {hasJobContext && (
              <>
                <p className="text-xs text-default-500 truncate">
                  {formatJobLabel(chat?.jobTitle, chat?.jobId)}
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {chat?.jobStatus && (
            <Chip
              size="sm"
              variant="flat"
              className="text-[10px] h-5"
              color={CommonUtils.getStatusColor(chat.jobStatus)}
            >
              {CommonUtils.keyIntoTitle(chat.jobStatus)}
            </Chip>
          )}
          {isSourcingThread && (
            <Chip size="sm" color="secondary" variant="flat" className="text-[10px] h-5">
              Direct
            </Chip>
          )}
          {chat?.isOwnJob && (
            <Chip size="sm" variant="bordered" className="text-[10px] h-5 border-primary text-primary">
              Your Job
            </Chip>
          )}
        </div>

        <div className="flex justify-between items-center gap-2">
          <div className="flex-1 min-w-0">
            {attachment && (
              <span className="text-[10px] text-gray-400 italic flex-shrink-0 -mt-1">
                [{attachment?.type?.includes('image') ? 'Photo' : 'File'}]
              </span>
            )}

            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="m-0 text-xs text-default-500 truncate font-medium">{children}</p>
                ),
              }}
            >
              {chat?.lastMessage?.body || ''}
            </ReactMarkdown>
          </div>

          {chat.id !== roomId && unreadCount > 0 && (
            <div className="min-w-5 h-5 px-1.5 flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListCard;
