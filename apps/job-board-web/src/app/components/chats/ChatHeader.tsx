'use client';

import useChatStore from '@/app/store/useChatStore';
import { formatJobLabel } from '@/app/utils/chatUtils';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Badge, Button, Chip } from '@heroui/react';
import { useParams, useRouter } from 'next/navigation';
import { FiMenu, FiUser } from 'react-icons/fi';
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
    <div className="min-h-[72px] border-b border-default-200 w-full flex items-center px-4 lg:px-5 gap-3 bg-white">
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
            color="primary"
            classNames={{
              base: '!bg-[var(--secondary-color)] text-primary !ring-1 !ring-primary/20 !ring-offset-1',
            }}
            className="flex-shrink-0"
            showFallback
          />
        </Badge>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-bold text-base text-default-900 truncate">{participantName}</p>
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {hasJobContext && (
              <>
                <p className="text-xs text-default-500 truncate">
                  {formatJobLabel(room?.jobTitle, room?.jobId)}
                </p>
                {room?.jobId && (
                  <>
                    <span className="text-xs text-default-300">•</span>
                    <span className="text-xs text-default-400 font-mono">
                      #{room.jobId.slice(0, 12).toUpperCase()}
                    </span>
                  </>
                )}
              </>
            )}
            {room?.jobStatus && (
              <Chip
                size="sm"
                variant="flat"
                className="text-[10px] h-5 flex-shrink-0"
                color={CommonUtils.getStatusColor(room.jobStatus)}
              >
                {CommonUtils.keyIntoTitle(room.jobStatus)}
              </Chip>
            )}
            {isSourcingThread && (
              <Chip size="sm" color="secondary" variant="flat" className="text-[10px] h-5">
                Direct
              </Chip>
            )}
          </div>
        </div>
      </button>

      {/* Right-side actions */}
      <div className="ml-auto flex items-center gap-2">
        {canViewCandidateProfile && (
          <Button
            variant="bordered"
            size="sm"
            radius="sm"
            className="border-primary text-primary h-9 px-4"
            startContent={<FiUser size={16} />}
            onPress={handleViewCandidateProfile}
          >
            View Profile
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
