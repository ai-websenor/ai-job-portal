'use client';

import useChatStore from '@/app/store/useChatStore';
import { Avatar, Badge, Button } from '@heroui/react';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { FiMenu } from 'react-icons/fi';

interface ChatHeaderProps {
  onOpenDrawer?: () => void;
}

const ChatHeader = ({ onOpenDrawer }: ChatHeaderProps) => {
  const { roomId } = useParams();
  const { onlineUsers, formattedParticipant } = useChatStore();
  const participant = formattedParticipant[roomId as string] ?? {};

  const isOnline = onlineUsers?.[participant?.id];

  const displayName = useMemo(() => {
    if (participant?.companyName) {
      return participant?.companyName;
    }
    return `${participant?.firstName} ${participant?.lastName}`;
  }, [participant?.companyName]);

  const displayLogo = useMemo(() => {
    if (participant?.companyLogo) {
      return participant?.companyLogo;
    }
    return undefined;
  }, [participant?.companyLogo]);

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
          src={displayLogo}
          name={displayName}
          size="md"
          isBordered
          className="flex-shrink-0"
          showFallback
        />
      </Badge>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">{displayName}</p>
      </div>
    </div>
  );
};

export default ChatHeader;
