'use client';

import { IInterviewRoundsResponse } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { FaStar } from 'react-icons/fa';
import { FiClock, FiMapPin, FiPhoneCall, FiVideo } from 'react-icons/fi';
import { MdOutlineWorkOutline } from 'react-icons/md';

type Props = {
  data: IInterviewRoundsResponse;
  currentInterviewId?: string;
};

const formatFeedback = (feedback: unknown) => {
  if (!feedback) return '';
  if (typeof feedback === 'string') return feedback;

  try {
    const serialized = JSON.stringify(feedback);
    return serialized === '{}' ? '' : serialized;
  } catch {
    return '';
  }
};

const InterviewRoundsTimeline = ({ data, currentInterviewId }: Props) => {
  const application = data.application;
  const rounds = data.rounds || [];
  // Show the latest round first. Backend returns rounds oldest-first with a
  // stable roundNumber; sort descending so the most recent is on top while the
  // round labels stay correct.
  const orderedRounds = [...rounds].sort((a, b) => (b.roundNumber ?? 0) - (a.roundNumber ?? 0));
  const latestRound = data.latestInterviewRound || orderedRounds[0] || null;

  return (
    <div className="space-y-6">
      <Card className="border border-gray-100 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar
              src={application.companyLogo || undefined}
              name={application.companyName || application.jobTitle || 'Interview'}
              className="h-16 w-16 shrink-0 rounded-xl"
              radius="sm"
              fallback={<MdOutlineWorkOutline className="text-xl text-gray-400" />}
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-gray-950">
                {application.jobTitle || 'Interview rounds'}
              </h2>
              <p className="truncate text-sm font-medium text-gray-500">
                {application.companyName || 'Company not available'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip
              variant="flat"
              size="sm"
              color={CommonUtils.getStatusColor(application.currentStatus)}
              className="font-semibold capitalize"
            >
              {CommonUtils.getInterviewStatusLabel(application.currentStatus)}
            </Chip>
            <Chip variant="flat" size="sm" className="font-semibold">
              {data.totalRounds} round{data.totalRounds === 1 ? '' : 's'}
            </Chip>
            {latestRound ? (
              <Chip variant="flat" size="sm" color="secondary" className="font-semibold">
                {latestRound.roundNumber ? `Latest: Round ${latestRound.roundNumber}` : 'Latest round'}
              </Chip>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {rounds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center text-gray-500 shadow-sm">
          No interviews scheduled yet for this application.
        </div>
      ) : (
        <div className="relative pl-1">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-200" />
          <div className="space-y-5">
            {orderedRounds.map((round, index) => {
              const roundLabel = round.roundNumber ?? rounds.length - index;
              const scheduledAt = dayjs(round.scheduledAt);
              const isUpcoming = scheduledAt.isAfter(dayjs());
              const joinWindowOpen = dayjs().isAfter(scheduledAt.subtract(15, 'minute'));
              const canJoin =
                isUpcoming &&
                round.interviewMode === 'online' &&
                Boolean(round.meetingLink) &&
                joinWindowOpen;
              const modeLabel =
                round.interviewMode === 'on_site'
                  ? round.location || 'Location not provided'
                  : round.interviewMode === 'phone'
                    ? 'Phone interview'
                    : 'Online interview';
              const ModeIcon =
                round.interviewMode === 'phone'
                  ? FiPhoneCall
                  : round.interviewMode === 'on_site'
                    ? FiMapPin
                    : FiVideo;
              const feedbackText = formatFeedback(round.feedback);
              const rating = round.rating ?? 0;
              const isLatestRound = latestRound?.id === round.id;

              return (
                <div key={round.id} className="relative flex gap-4">
                  <div
                    className={clsx(
                      'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-sm',
                      currentInterviewId === round.id
                        ? 'border-primary text-primary ring-4 ring-primary/10'
                        : index === 0
                          ? 'border-primary text-primary'
                          : 'border-gray-200 text-gray-500',
                    )}
                  >
                    {roundLabel}
                  </div>

                  <Card
                    className={clsx(
                      'flex-1 border bg-white shadow-sm',
                      currentInterviewId === round.id ? 'border-primary/30' : 'border-gray-100',
                    )}
                  >
                    <CardBody className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-gray-950">Round {roundLabel}</h3>
                          <p className="text-sm font-medium text-gray-500">
                            {CommonUtils.getInterviewTypeLabel(round.interviewType)}
                            {round.interviewTool
                              ? ` · ${CommonUtils.keyIntoTitle(round.interviewTool)}`
                              : ''}
                          </p>
                        </div>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={CommonUtils.getStatusColor(round.status)}
                          className="w-fit font-semibold capitalize"
                        >
                          {CommonUtils.getInterviewStatusLabel(round.status)}
                        </Chip>
                        {isLatestRound ? (
                          <Chip size="sm" variant="flat" color="secondary" className="font-semibold">
                            Latest
                          </Chip>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                        <span className="flex items-center gap-2">
                          <FiClock className="text-primary" />
                          {scheduledAt.isValid()
                            ? scheduledAt.format('ddd, DD MMM YYYY · h:mm A')
                            : 'Date not available'}
                        </span>
                        <span className="flex items-center gap-2">
                          <ModeIcon className="text-primary" />
                          {modeLabel}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, starIndex) => (
                              <FaStar
                                key={starIndex}
                                size={12}
                                className={clsx(
                                  starIndex < rating ? 'text-amber-400' : 'text-gray-200',
                                )}
                              />
                            ))}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">
                            {round.rating ? `${round.rating}/5` : 'No rating'}
                          </span>
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          {round.duration ? `${round.duration} mins` : 'Duration not available'}
                        </span>
                      </div>

                      {round.rescheduledAt && (
                        <p className="mt-3 text-xs font-medium text-amber-600">
                          Rescheduled {dayjs(round.rescheduledAt).format('DD MMM YYYY, h:mm A')}
                        </p>
                      )}

                      {(round.interviewerNotes || round.candidateFeedback || feedbackText) && (
                        <div className="mt-4 grid gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 md:grid-cols-2">
                          {round.interviewerNotes && (
                            <p className="line-clamp-3">
                              <span className="font-semibold text-gray-800">Notes: </span>
                              {round.interviewerNotes}
                            </p>
                          )}
                          {/* {round.candidateFeedback && (
                            <p className="line-clamp-3">
                              <span className="font-semibold text-gray-800">Feedback: </span>
                              {round.candidateFeedback}
                            </p>
                          )} */}
                          {/* {!round.candidateFeedback && feedbackText && (
                            <p className="line-clamp-3 md:col-span-2">
                              <span className="font-semibold text-gray-800">Feedback: </span>
                              {feedbackText}
                            </p>
                          )} */}
                        </div>
                      )}

                      {canJoin && (
                        <div className="mt-4">
                          <Button
                            color="primary"
                            size="sm"
                            startContent={<FiVideo size={14} />}
                            onPress={() =>
                              window.open(round.meetingLink!, '_blank', 'noopener,noreferrer')
                            }
                            className="font-semibold"
                          >
                            Join
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoundsTimeline;
