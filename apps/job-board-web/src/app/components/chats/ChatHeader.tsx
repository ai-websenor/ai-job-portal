'use client';

import useChatStore from '@/app/store/useChatStore';
import { formatJobLabel } from '@/app/utils/chatUtils';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Badge, Button, Chip } from '@heroui/react';
import { useParams, useRouter } from 'next/navigation';
import { FiMenu } from 'react-icons/fi';
import routePaths from '@/app/config/routePaths';
import clsx from 'clsx';

interface ChatHeaderProps {
  onOpenDrawer?: () => void;
}

const ChatHeader = ({ onOpenDrawer }: ChatHeaderProps) => {
  const router = useRouter();
  const { roomId } = useParams();
  const { onlineUsers, formattedParticipant, activeChatRoom, chatRooms } = useChatStore();
  const participant = formattedParticipant[roomId as string] ?? {};
  const room =
    activeChatRoom?.id === roomId ? activeChatRoom : chatRooms.find((chat) => chat.id === roomId);

  const isOnline = participant?.id ? onlineUsers?.[participant.id] : false;
  const fullName = participant?.id ? CommonUtils.getFullName(participant as any) : '';
  const participantName =
    participant?.role === 'employer' && participant?.companyName
      ? participant.companyName
      : fullName || 'Unknown user';
  const participantAvatar =
    participant?.role === 'employer'
      ? participant?.companyLogo || participant?.profilePhoto
      : participant?.profilePhoto;
  const hasJobContext = Boolean(room?.jobTitle || room?.jobId);
  const isSourcingThread = Boolean(room && room.applicationId === null);
  const canViewCandidateProfile = Boolean(
    participant?.role === 'candidate' && room?.applicationId && participant?.id,
  );

  const handleViewCandidateProfile = () => {
    const applicationId = room?.applicationId;
    const candidateId = participant?.id;

    if (participant?.role !== 'candidate' || !applicationId || !candidateId) return;

    router.push(routePaths.employee.jobs.applicantProfile(applicationId, candidateId));
  };

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
      <button
        type="button"
        disabled={!canViewCandidateProfile}
        onClick={handleViewCandidateProfile}
        className={clsx(
          'flex min-w-0 items-center gap-3 rounded-md text-left outline-none',
          canViewCandidateProfile &&
            'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          !canViewCandidateProfile && 'cursor-default',
        )}
      >
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
          {(hasJobContext || isSourcingThread) && (
            <div className="flex items-center gap-1.5 min-w-0">
              {hasJobContext && (
                <>
                  <p className="text-xs text-default-500 truncate">
                    {formatJobLabel(room?.jobTitle, room?.jobId)}
                  </p>
                  {room?.jobStatus && (
                    <Chip
                      size="sm"
                      variant="flat"
                      className="text-[10px] flex-shrink-0"
                      color={CommonUtils.getStatusColor(room.jobStatus)}
                    >
                      {CommonUtils.keyIntoTitle(room.jobStatus)}
                    </Chip>
                  )}
                </>
              )}
              {isSourcingThread && (
                <Chip size="sm" color="secondary" variant="flat" className="text-[10px]">
                  Direct
                </Chip>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

export default ChatHeader;
