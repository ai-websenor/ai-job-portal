import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useChatStore from '@/app/store/useChatStore';
import { IChatRoom, IChatRoomParticipant } from '@/app/types/types';
import { Avatar, Badge } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

type Props = {
  chat: IChatRoom;
  participant: IChatRoomParticipant;
};

const ChatListCard = ({ chat, participant }: Props) => {
  const router = useRouter();
  const { roomId } = useParams();
  const unreadCount = chat?.unreadCount || 0;

  const { chatRooms, setChatRooms } = useChatStore();

  const handleClickOnRoom = async () => {
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

  return (
    <button
      key={chat?.id}
      onClick={handleClickOnRoom}
      className={clsx(
        'w-full flex items-center gap-3 p-4 transition-all duration-200 hover:bg-default-100 text-left border-b border-default-100 last:border-none',
        roomId === chat?.id
          ? 'bg-primary/10 border-l-4 border-l-primary'
          : 'border-l-4 border-l-transparent',
      )}
    >
      <Badge
        color="success"
        content=""
        isInvisible={!participant?.isOnline}
        placement="bottom-right"
        shape="circle"
      >
        <Avatar
          src={participant?.profilePhoto || undefined}
          name={`${participant?.firstName} ${participant?.lastName}`}
          size="md"
          isBordered
          className="flex-shrink-0"
          showFallback
        />
      </Badge>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span
            className={clsx(
              'font-semibold truncate text-sm',
              roomId === chat?.id ? 'text-primary' : 'text-default-900',
            )}
          >
            {participant?.firstName + ' ' + participant?.lastName}
          </span>
          <span className="text-xs capitalize text-default-400 whitespace-nowrap">
            {dayjs(chat?.lastMessage?.createdAt).fromNow()}
          </span>
        </div>

        <div className="flex justify-between items-center gap-2">
          <div className="flex-1 min-w-0">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="m-0 text-xs text-default-500 truncate font-medium">{children}</p>
                ),
              }}
            >
              {chat?.lastMessage?.body}
            </ReactMarkdown>
          </div>

          {chat.id !== roomId && unreadCount > 0 && (
            <div className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default ChatListCard;
