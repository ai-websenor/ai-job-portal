'use client';

import { IInterview } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { isEmployerRole } from '@/app/utils/roleUtils';
import useUserStore from '@/app/store/useUserStore';
import { Button, Card, CardBody, Chip, Tooltip } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { KeyboardEvent, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { FiClock, FiMapPin, FiMonitor, FiPhoneCall, FiVideo } from 'react-icons/fi';
import { SiZoom } from 'react-icons/si';

type Props = {
  round: IInterview;
  isSelected?: boolean;
  showJoinMeeting?: boolean;
  onJoinMeeting?: (round: IInterview) => void;
  className?: string;
};

const InterviewRoundCard = ({
  round,
  isSelected = false,
  showJoinMeeting = true,
  onJoinMeeting,
  className,
}: Props) => {
  const role = useUserStore((state) => state.user?.role);
  const employerView = isEmployerRole(role);
  const scheduledAt = dayjs(round.scheduledAt);
  const statusKey = round.status.toLowerCase();
  const isCompleted = statusKey === 'completed' || statusKey === 'interview_completed';
  const isCanceled = statusKey === 'canceled' || statusKey === 'cancelled';
  const isRescheduled = statusKey === 'rescheduled';
  const isUpcoming = scheduledAt.isAfter(dayjs());
  const canShowJoinButton =
    showJoinMeeting &&
    round.interviewMode === 'online' &&
    Boolean(round.meetingLink || round.hostJoinUrl) &&
    round.status !== 'completed' &&
    round.status !== 'interview_completed' &&
    round.status !== 'canceled' &&
    round.status !== 'cancelled';
  const isJoinDisabled = !isUpcoming;
  const joinTooltipMessage = isJoinDisabled
    ? 'The interview time has passed, so the meeting can no longer be joined.'
    : 'Join meeting';

  const modeLabel =
    round.interviewMode === 'on_site'
      ? round.location || 'Location not provided'
      : round.interviewMode === 'phone'
        ? 'Phone interview'
        : 'Online interview';
  const interviewToolLabel = round.interviewTool ? CommonUtils.keyIntoTitle(round.interviewTool) : null;

  const ModeIcon =
    round.interviewMode === 'phone'
      ? FiPhoneCall
      : round.interviewMode === 'on_site'
        ? FiMapPin
        : FiVideo;
  const ToolIcon =
    round.interviewTool === 'zoom'
        ? SiZoom
      : round.interviewTool === 'teams'
        ? FiMonitor
        : FiVideo;

  const rating = round.rating ?? 0;
  const showRating = employerView && isCompleted;
  const completionNote = employerView && isCompleted ? round.interviewerNotes : null;
  const candidateFeedback = employerView ? round.candidateFeedback : null;
  const cancellationReason =
    employerView && isCanceled ? round.cancelReason || round.reason || null : null;
  const rescheduleReason =
    employerView && isRescheduled ? round.rescheduleReason || round.reason || null : null;
  const [joinTooltipOpen, setJoinTooltipOpen] = useState(false);

  const handleJoin = () => {
    const url = employerView ? round.hostJoinUrl || round.meetingLink : round.meetingLink;

    if (!url) return;

    if (onJoinMeeting) {
      onJoinMeeting(round);
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleJoinTooltip = () => {
    if (!isJoinDisabled) return;
    setJoinTooltipOpen((open) => !open);
  };

  const handleJoinTriggerKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!isJoinDisabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setJoinTooltipOpen((open) => !open);
    }
  };

  return (
    <Card
      className={clsx(
        'flex-1 border bg-white shadow-sm',
        isSelected ? 'border-primary/30' : 'border-gray-100',
        className,
      )}
    >
      <CardBody className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-950">
              Round {round.roundNumber ?? ''}
            </h3>
            <p className="text-sm font-medium text-gray-500">
              {CommonUtils.getInterviewTypeLabel(round.interviewType)}
              {interviewToolLabel ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <ToolIcon size={12} />
                  {interviewToolLabel}
                </span>
              ) : null}
              {round.roundName ? ` - ${round.roundName}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip
              size="sm"
              variant="flat"
              color={CommonUtils.getStatusColor(round.status)}
              className="w-fit font-semibold capitalize"
            >
              {CommonUtils.getInterviewStatusLabel(round.status)}
            </Chip>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
          <span className="flex items-center gap-2">
            <FiClock className="text-primary" />
            {scheduledAt.isValid()
              ? scheduledAt.format('ddd, DD MMM YYYY - h:mm A')
              : 'Date not available'}
          </span>
          <span className="flex items-center gap-2">
            <ModeIcon className="text-primary" />
            {modeLabel}
          </span>
          {employerView ? (
            <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <FiClock className="text-primary" />
              {round.duration ? `${round.duration} mins` : 'Duration not available'}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <ToolIcon className="text-primary" size={14} />
              {interviewToolLabel || 'Interview tool not available'}
            </span>
          )}
          {employerView ? (
            showRating ? (
              <span className="flex items-center gap-1">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <FaStar
                      key={starIndex}
                      size={12}
                      className={clsx(starIndex < rating ? 'text-amber-400' : 'text-gray-200')}
                    />
                  ))}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {round.rating !== null && round.rating !== undefined
                    ? `${round.rating}/5`
                    : 'No rating'}
                </span>
              </span>
            ) : null
          ) : (
            <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <FiClock className="text-primary" />
              {round.duration ? `${round.duration} mins` : 'Duration not available'}
            </span>
          )}
        </div>

        {cancellationReason || rescheduleReason ? (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-sm text-amber-950">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
              {cancellationReason ? 'Cancellation Reason' : 'Reschedule Reason'}
            </p>
            <p className="mt-1 leading-6">{cancellationReason || rescheduleReason}</p>
          </div>
        ) : null}

        {canShowJoinButton ? (
          <div className="mt-4">
            {isJoinDisabled ? (
              <Tooltip
                isOpen={joinTooltipOpen}
                onOpenChange={setJoinTooltipOpen}
                content={joinTooltipMessage}
                color="primary"
                showArrow
                classNames={{
                  content: 'max-w-[220px] whitespace-normal text-center text-xs leading-5',
                }}
              >
                <span
                  tabIndex={0}
                  role="button"
                  aria-label="Join meeting"
                  className="inline-block focus:outline-none"
                  onClick={toggleJoinTooltip}
                  onKeyDown={handleJoinTriggerKeyDown}
                  onBlur={() => setJoinTooltipOpen(false)}
                >
                  <Button
                    color="primary"
                    size="sm"
                    startContent={<FiVideo size={14} />}
                    isDisabled
                    className="font-semibold pointer-events-none"
                  >
                    Join Meeting
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                color="primary"
                size="sm"
                startContent={<FiVideo size={14} />}
                onPress={handleJoin}
                className="font-semibold"
              >
                Join Meeting
              </Button>
            )}
          </div>
        ) : null}

        {completionNote || candidateFeedback ? (
          <div className="mt-4 grid gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 md:grid-cols-2">
            {completionNote ? (
              <p className="line-clamp-3">
                <span className="font-semibold text-gray-800">Completion Note: </span>
                {completionNote}
              </p>
            ) : null}
            {candidateFeedback ? (
              <p className="line-clamp-3">
                <span className="font-semibold text-gray-800">Candidate Feedback: </span>
                {candidateFeedback}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
};

export default InterviewRoundCard;
