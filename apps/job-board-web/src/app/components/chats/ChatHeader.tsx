'use client';

import useChatStore from '@/app/store/useChatStore';
import { formatJobLabel } from '@/app/utils/chatUtils';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Badge, Button, Chip } from '@heroui/react';
import { useParams } from 'next/navigation';
import { FiMenu } from 'react-icons/fi';

interface ChatHeaderProps {
  onOpenDrawer?: () => void;
}

const ChatHeader = ({ onOpenDrawer }: ChatHeaderProps) => {
  const { roomId } = useParams();
  const { onlineUsers, formattedParticipant, activeChatRoom, chatRooms } = useChatStore();
  const participant = formattedParticipant[roomId as string] ?? {};
  const room =
    activeChatRoom?.id === roomId ? activeChatRoom : chatRooms.find((chat) => chat.id === roomId);

  const isOnline = onlineUsers?.[participant?.id];
  const participantName =
    participant?.role === 'employer' && participant?.companyName
      ? participant.companyName
      : CommonUtils.getFullName(participant);
  const participantAvatar =
    participant?.role === 'employer'
      ? participant?.companyLogo || participant?.profilePhoto
      : participant?.profilePhoto;

  return (
    <div className="min-h-20 border-b w-full flex items-center px-4 lg:px-5 gap-3">
      <Button
        isIconOnly
        variant="light"
        className="lg:hidden text-default-500"
        onPress={onOpenDrawer}
      >
        <FiMenu size={24} />
      </Button>
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
          className="flex-shrink-0"
          showFallback
        />
      </Badge>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-semibold truncate">{participantName}</p>
        {(room?.jobTitle || room?.jobId) && (
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-xs text-default-500 truncate">
              {formatJobLabel(room?.jobTitle, room?.jobId)}
            </p>
            <Chip
              size="sm"
              variant="flat"
              className="text-[10px] flex-shrink-0"
              color={CommonUtils.getStatusColor(room?.jobStatus ?? '')}
            >
              {CommonUtils.keyIntoTitle(room?.jobStatus ?? '')}
            </Chip>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
