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
} from 'react-icons/bs';
import { ITimeline } from '@/app/types/types';

interface TrackTimelineProps {
  timeline: ITimeline[];
}

const eventStyles: Record<string, { icon: any; color: string }> = {
  hired: {
    icon: BsTrophyFill,
    color: 'text-success',
  },
  interview_completed: {
    icon: BsClipboardCheckFill,
    color: 'text-primary',
  },
  interview_scheduled: {
    icon: BsCalendar2CheckFill,
    color: 'text-warning',
  },
  shortlisted: {
    icon: BsPersonCheckFill,
    color: 'text-black',
  },
  viewed: {
    icon: BsSearch,
    color: 'text-default-500',
  },
  application_submitted: {
    icon: BsFileEarmarkTextFill,
    color: 'text-default-500',
  },
  interview: {
    icon: BsCameraVideoFill,
    color: 'text-primary',
  },
};

const TrackTimeline = ({ timeline }: TrackTimelineProps) => {
  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="flex flex-col gap-8 relative px-4 py-8">
      <div className="absolute left-[33px] top-10 bottom-10 w-[2px] bg-divider z-0" />

      {sortedTimeline.map((step, index) => {
        const config = eventStyles[step.status || ''] ||
          eventStyles[step.event] || {
            icon: BsClockHistory,
            color: 'text-default-500',
          };

        const Icon = config.icon;
        const isLatest = index === 0;

        return (
          <div key={index} className="flex gap-6 items-start relative z-10">
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
                    'font-semibold text-base md:text-lg transition-colors leading-tight',
                    isLatest ? 'text-primary' : 'text-foreground/90',
                  )}
                >
                  {step?.description}
                </h3>
                {isLatest && (
                  <Chip size="sm" color="primary" variant="flat" className="animate-pulse">
                    Latest
                  </Chip>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <p className="text-default-400 text-xs flex items-center gap-2">
                  <BsClockHistory className="text-xs" />
                  {dayjs(step.timestamp).format('DD/MM/YY hh:mm A')}
                </p>

                {step.meetingLink && step.interviewStatus !== 'completed' && (
                  <a
                    href={step.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-medium underline hover:text-primary-600 transition-colors inline-block w-fit"
                  >
                    Join Meeting
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
