'use client';

import { Chip } from '@heroui/react';
import dayjs from 'dayjs';
import { clsx } from 'clsx';
import {
  BsCheckCircleFill,
  BsCircle,
  BsClockHistory,
  BsBriefcaseFill,
  BsPeopleFill,
  BsPersonBadgeFill,
  BsAwardFill,
  BsFileEarmarkTextFill,
  BsSearch,
} from 'react-icons/bs';
import { ITimeline } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';

interface TrackTimelineProps {
  timeline: ITimeline[];
  currentStatus: string;
}

const eventStyles: Record<string, { icon: any; color: string; label: string }> = {
  application_submitted: {
    icon: BsFileEarmarkTextFill,
    color: 'primary',
    label: 'Application submitted',
  },
  reviewed: {
    icon: BsSearch,
    color: 'secondary',
    label: 'Reviewed by team',
  },
  screening_interview: {
    icon: BsPersonBadgeFill,
    color: 'warning',
    label: 'Screening interview',
  },
  technical_interview: {
    icon: BsBriefcaseFill,
    color: 'warning',
    label: 'Technical interview',
  },
  final_hr_interview: {
    icon: BsPeopleFill,
    color: 'warning',
    label: 'Final HR interview',
  },
  team_matching: {
    icon: BsCircle,
    color: 'secondary',
    label: 'Team matching',
  },
  offer_letter: {
    icon: BsAwardFill,
    color: 'success',
    label: 'Offer letter',
  },
  hired: {
    icon: BsCheckCircleFill,
    color: 'success',
    label: 'Hired',
  },
  rejected: {
    icon: BsCheckCircleFill,
    color: 'danger',
    label: 'Rejected',
  },
};

const TrackTimeline = ({ timeline }: TrackTimelineProps) => {
  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="flex flex-col gap-8 relative px-4 py-8">
      {/* Vertical Line */}
      <div className="absolute left-[33px] top-10 bottom-10 w-[2px] bg-divider z-0" />

      {sortedTimeline.map((step, index) => {
        const style = eventStyles[step.event] || {
          icon: BsClockHistory,
          color: 'default',
          label: step.event.replace(/_/g, ' '),
        };
        const Icon = style.icon;

        return (
          <div key={index} className="flex gap-6 items-start relative z-10">
            <div
              className={clsx(
                'relative flex items-center justify-center w-10 min-w-10 h-10 rounded-full shadow-lg transition-all duration-300 border-2 bg-background',
                index === 0
                  ? 'border-primary ring-4 ring-primary/20 transform scale-110'
                  : 'border-divider',
              )}
            >
              <Icon
                className={clsx('text-lg', index === 0 ? 'text-primary' : 'text-default-500')}
              />
            </div>

            <div className="flex flex-col gap-1 flex-1 pb-4">
              <div className="flex items-center justify-between gap-2">
                <h3
                  className={clsx(
                    'font-semibold text-lg transition-colors',
                    index === 0 ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {CommonUtils.keyIntoTitle(style.label)}
                </h3>
                {index === 0 && (
                  <Chip size="sm" color="primary" variant="flat" className="animate-pulse">
                    Current
                  </Chip>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-default-500 text-sm flex items-center gap-2">
                  <BsClockHistory className="text-xs" />
                  {dayjs(step.timestamp).format('DD/MM/YY hh:mm A')}
                </p>

                {step.location && (
                  <p className="text-default-400 text-xs italic">Location: {step.location}</p>
                )}

                {step.meetingLink && (
                  <a
                    href={step.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs underline hover:text-primary-600 transition-colors inline-block w-fit"
                  >
                    Join Meeting
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Placeholder for future steps if only applied */}
      {(timeline.length === 0 ||
        (timeline.length === 1 && timeline[0].event === 'application_submitted')) && (
        <div className="flex gap-6 items-start relative z-10 opacity-30">
          <div className="relative flex items-center justify-center w-10 min-w-10 h-10 rounded-full border-2 border-divider border-dashed bg-background">
            <BsClockHistory className="text-lg text-default-400" />
          </div>
          <div className="flex flex-col gap-1 pb-4">
            <h3 className="font-semibold text-lg text-default-400 italic">
              Wait for company review
            </h3>
            <p className="text-default-400 text-sm">Your application is in queue</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackTimeline;
