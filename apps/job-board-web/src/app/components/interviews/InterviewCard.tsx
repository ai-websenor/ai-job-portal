'use client';

import routePaths from '@/app/config/routePaths';
import { IInterview } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Button, Card, CardBody, Chip, Tooltip } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { FaStar } from 'react-icons/fa';
import { FiCalendar, FiClock, FiMapPin, FiPhoneCall, FiVideo } from 'react-icons/fi';
import { MdOutlineWorkOutline } from 'react-icons/md';

type Props = {
  interview: IInterview;
};

const InterviewCard = ({ interview }: Props) => {
  const router = useRouter();
  const scheduledAt = dayjs(interview.scheduledAt);
  const isUpcoming = scheduledAt.isAfter(dayjs());
  const joinWindowOpen = dayjs().isAfter(scheduledAt.subtract(15, 'minute'));
  const canJoin =
    isUpcoming &&
    interview.interviewMode === 'online' &&
    Boolean(interview.meetingLink) &&
    joinWindowOpen;

  const handleCardPress = () => {
    router.push(routePaths.interviews.rounds(interview.applicationId));
  };

  const handleJoin = () => {
    if (!interview.meetingLink) return;
    window.open(interview.meetingLink, '_blank', 'noopener,noreferrer');
  };

  const rating = interview.rating ?? 0;
  const modeLabel =
    interview.interviewMode === 'on_site'
      ? interview.location || 'Location not provided'
      : interview.interviewMode === 'phone'
        ? 'Phone interview'
        : 'Online interview';
  const ModeIcon =
    interview.interviewMode === 'phone'
      ? FiPhoneCall
      : interview.interviewMode === 'on_site'
        ? FiMapPin
        : FiVideo;

  return (
    <Card
      isPressable
      shadow="none"
      onPress={handleCardPress}
      className="border border-gray-100 bg-white transition-all hover:border-primary/20 hover:shadow-md"
    >
      <CardBody className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar
            src={interview.companyLogo || undefined}
            name={interview.companyName || interview.jobTitle || 'Interview'}
            className="h-14 w-14 shrink-0 rounded-xl"
            radius="sm"
            fallback={<MdOutlineWorkOutline className="text-xl text-gray-400" />}
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-gray-950">
                  {interview.jobTitle || 'Interview'}
                </h3>
                <p className="truncate text-sm font-medium text-gray-500">
                  {interview.companyName || 'Company not available'}
                </p>
              </div>

              <Chip
                size="sm"
                variant="flat"
                color={CommonUtils.getStatusColor(interview.status)}
                className="w-fit shrink-0 font-semibold capitalize"
              >
                {CommonUtils.getInterviewStatusLabel(interview.status)}
              </Chip>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="flat" color="primary" className="font-medium">
                {CommonUtils.getInterviewTypeLabel(interview.interviewType)}
              </Chip>
              <Chip size="sm" variant="flat" className="font-medium">
                {CommonUtils.keyIntoTitle(interview.interviewMode || 'unknown')}
              </Chip>
              {interview.interviewTool && (
                <Chip size="sm" variant="flat" className="font-medium">
                  {CommonUtils.keyIntoTitle(interview.interviewTool)}
                </Chip>
              )}
            </div>

            <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
              <span className="flex items-center gap-2">
                <FiCalendar className="text-primary" />
                {scheduledAt.isValid()
                  ? scheduledAt.format('ddd, DD MMM YYYY · h:mm A')
                  : 'Date not available'}
              </span>
              <span className="flex items-center gap-2">
                <FiClock className="text-primary" />
                {interview.duration ? `${interview.duration} mins` : 'Duration not available'}
              </span>
              <span className="flex items-center gap-2">
                <ModeIcon className="text-primary" />
                {modeLabel}
              </span>
              <span className="flex items-center gap-1">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <FaStar
                      key={index}
                      size={12}
                      className={clsx(
                        index < rating ? 'text-amber-400' : 'text-gray-200',
                      )}
                    />
                  ))}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {interview.rating ? `${interview.rating}/5` : 'No rating'}
                </span>
              </span>
            </div>

            {interview.rescheduledAt && (
              <p className="text-xs font-medium text-amber-600">
                Rescheduled {dayjs(interview.rescheduledAt).format('DD MMM YYYY, h:mm A')}
              </p>
            )}

            {(interview.interviewerNotes || interview.candidateFeedback) && (
              <div className="grid gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 md:grid-cols-2">
                {interview.interviewerNotes && (
                  <p className="line-clamp-2">
                    <span className="font-semibold text-gray-800">Notes: </span>
                    {interview.interviewerNotes}
                  </p>
                )}
                {interview.candidateFeedback && (
                  <p className="line-clamp-2">
                    <span className="font-semibold text-gray-800">Feedback: </span>
                    {interview.candidateFeedback}
                  </p>
                )}
              </div>
            )}

            {canJoin && (
              <div onClick={(event) => event.stopPropagation()} className="pt-1">
                <Tooltip content="Join meeting" color="primary" showArrow>
                  <Button
                    color="primary"
                    size="sm"
                    startContent={<FiVideo size={14} />}
                    onPress={handleJoin}
                    className="font-semibold"
                  >
                    Join
                  </Button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default InterviewCard;
