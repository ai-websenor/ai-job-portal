'use client';

import { Chip } from '@heroui/react';
import dayjs from 'dayjs';
import { clsx } from 'clsx';
import {
  BsClockHistory,
  BsFileEarmarkTextFill,
  BsSearch,
  BsTrophyFill,
  BsPersonCheckFill,
  BsCalendar2CheckFill,
  BsClipboardCheckFill,
  BsCameraVideoFill,
  BsHourglassSplit,
  BsXCircleFill,
  BsEnvelopePaperFill,
  BsGeoAltFill,
  BsStarFill,
} from 'react-icons/bs';
import { ITimeline } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';

interface TrackTimelineProps {
  timeline: ITimeline[];
}

// Visual style per event type (machine taxonomy from the API).
const eventStyles: Record<string, { icon: any; color: string }> = {
  application_submitted: { icon: BsFileEarmarkTextFill, color: 'text-default-500' },
  application_viewed: { icon: BsSearch, color: 'text-default-500' },
  shortlisted: { icon: BsPersonCheckFill, color: 'text-black' },
  interview_scheduled: { icon: BsCalendar2CheckFill, color: 'text-warning' },
  interview_rescheduled: { icon: BsCalendar2CheckFill, color: 'text-warning' },
  interview_cancelled: { icon: BsXCircleFill, color: 'text-danger' },
  interview_round_completed: { icon: BsClipboardCheckFill, color: 'text-primary' },
  interview_in_progress: { icon: BsHourglassSplit, color: 'text-warning' },
  interview_completed: { icon: BsClipboardCheckFill, color: 'text-primary' },
  offer_made: { icon: BsEnvelopePaperFill, color: 'text-success' },
  offer_accepted: { icon: BsTrophyFill, color: 'text-success' },
  offer_rejected: { icon: BsXCircleFill, color: 'text-danger' },
  hired: { icon: BsTrophyFill, color: 'text-success' },
  rejected: { icon: BsXCircleFill, color: 'text-danger' },
  withdrawn: { icon: BsXCircleFill, color: 'text-default-500' },
};

const TrackTimeline = ({ timeline }: TrackTimelineProps) => {
  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="flex flex-col gap-8 relative px-4 py-8">
      <div className="absolute left-[33px] top-10 bottom-10 w-[2px] bg-divider z-0" />

      {sortedTimeline.map((step, index) => {
        const config = eventStyles[step.type] ||
          eventStyles[step.status] || {
            icon: BsClockHistory,
            color: 'text-default-500',
          };

        const Icon = config.icon;
        const isLatest = index === 0;
        const iv = step.interview;
        const showJoin = iv?.meetingLink && iv?.status !== 'completed' && iv?.status !== 'canceled';

        return (
          <div key={step.id || index} className="flex gap-6 items-start relative z-10">
            <div
              className={clsx(
                'relative flex items-center justify-center w-10 min-w-10 h-10 rounded-full shadow-md transition-all duration-300 border-2 bg-white',
                isLatest
                  ? 'border-primary ring-4 ring-primary/10 transform scale-110'
                  : 'border-divider',
              )}
            >
              <Icon className={clsx('text-lg', isLatest ? 'text-primary' : config.color)} />
            </div>

            <div className="flex flex-col gap-1 flex-1 pb-4">
              <div className="flex items-center justify-between gap-2">
                <h3
                  className={clsx(
                    'font-semibold text-base md:text-lg transition-colors leading-tight break-words',
                    isLatest ? 'text-primary' : 'text-foreground/90',
                  )}
                >
                  {step.title}
                </h3>
                {isLatest && (
                  <Chip size="sm" color="primary" variant="flat" className="animate-pulse">
                    Latest
                  </Chip>
                )}
              </div>

              {step.description && (
                <p className="text-default-500 text-sm break-words">{step.description}</p>
              )}

              <div className="flex flex-col gap-2 mt-1">
                {iv && (iv.roundNumber || iv.interviewType || iv.roundName) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {iv.roundNumber ? (
                      <Chip size="sm" variant="flat" color="secondary">
                        Round {iv.roundNumber}
                      </Chip>
                    ) : null}
                    {iv.interviewType ? (
                      <Chip size="sm" variant="flat">
                        {CommonUtils.interviewTypeLabel(iv.interviewType, iv.customType)}
                      </Chip>
                    ) : null}
                    {iv.roundName ? (
                      <Chip size="sm" variant="flat" color="default">
                        {iv.roundName}
                      </Chip>
                    ) : null}
                    {iv.rating ? (
                      <Chip
                        size="sm"
                        variant="flat"
                        color="warning"
                        startContent={<BsStarFill className="text-xs" />}
                      >
                        {iv.rating}/5
                      </Chip>
                    ) : null}
                  </div>
                )}

                {iv?.scheduledAt && (
                  <p className="text-default-400 text-xs flex items-center gap-2">
                    <BsCalendar2CheckFill className="text-xs" />
                    {dayjs(iv.scheduledAt).format('DD/MM/YY hh:mm A')}
                    {iv.duration ? ` · ${iv.duration} mins` : ''}
                  </p>
                )}

                {iv?.interviewMode === 'offline' && iv?.location && (
                  <p className="text-default-400 text-xs flex items-center gap-2">
                    <BsGeoAltFill className="text-xs" />
                    {iv.location}
                  </p>
                )}

                <p className="text-default-400 text-xs flex items-center gap-2">
                  <BsClockHistory className="text-xs" />
                  {dayjs(step.timestamp).format('DD/MM/YY hh:mm A')}
                </p>

                {showJoin && (
                  <a
                    href={iv!.meetingLink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-medium underline hover:text-primary-600 transition-colors inline-flex items-center gap-1 w-fit"
                  >
                    <BsCameraVideoFill className="text-xs" /> Join Meeting
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {timeline.length === 0 && (
        <div className="flex gap-6 items-start relative z-10 opacity-30">
          <div className="relative flex items-center justify-center w-10 min-w-10 h-10 rounded-full border-2 border-divider border-dashed bg-background">
            <BsClockHistory className="text-lg text-default-400" />
          </div>
          <div className="flex flex-col gap-1 pb-4">
            <h3 className="font-semibold text-lg text-default-400 italic">No activity yet</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackTimeline;
