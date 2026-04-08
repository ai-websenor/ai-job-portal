'use client';

import useChatStore from '@/app/store/useChatStore';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Badge, Button } from '@heroui/react';
import { useParams } from 'next/navigation';
import { FiMenu } from 'react-icons/fi';

interface ChatHeaderProps {
  onOpenDrawer?: () => void;
}

const ChatHeader = ({ onOpenDrawer }: ChatHeaderProps) => {
  const { roomId } = useParams();
  const { onlineUsers, formattedParticipant } = useChatStore();
  const participant = formattedParticipant[roomId as string] ?? {};

  const isOnline = onlineUsers?.[participant?.id];

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
          src={participant?.profilePhoto}
          name={CommonUtils.getFullName(participant)}
          size="md"
          isBordered
          className="flex-shrink-0"
          showFallback
        />
      </Badge>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">{CommonUtils.getFullName(participant)}</p>
      </div>
    </div>
  );
};

export default ChatHeader;
