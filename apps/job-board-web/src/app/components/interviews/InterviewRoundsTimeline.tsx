'use client';

import CancelInterviewDialog from '@/app/components/dialogs/CancelInterviewDialog';
import CompleteInterviewDialog from '@/app/components/dialogs/CompleteInterviewDialog';
import RescheduleInterviewDialog from '@/app/components/dialogs/RescheduleInterviewDialog';
import InterviewRoundCard from '@/app/components/interviews/InterviewRoundCard';
import { InterviewDetails as InterviewDetailsType, IInterviewRoundsResponse } from '@/app/types/types';
import { getInterviewActionAvailability } from '@/app/utils/interviewActionUtils';
import { isEmployerRole } from '@/app/utils/roleUtils';
import routePaths from '@/app/config/routePaths';
import useUserStore from '@/app/store/useUserStore';
import { Avatar, Button, Card, CardBody, CardHeader } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BsCalendar4Event } from 'react-icons/bs';
import { FaBuilding, FaUserTie } from 'react-icons/fa';
import { FiClock } from 'react-icons/fi';
import { MdOutlineWorkOutline } from 'react-icons/md';

type Props = {
  data: IInterviewRoundsResponse;
  currentInterviewId?: string;
  currentInterview?: InterviewDetailsType | null;
  refetch?: () => void;
};

const InterviewRoundsTimeline = ({
  data,
  currentInterviewId,
  currentInterview,
  refetch,
}: Props) => {
  const router = useRouter();
  const application = data.application;
  const rounds = data.rounds || [];
  // Show the latest round first. Backend returns rounds oldest-first with a
  // stable roundNumber; sort descending so the most recent is on top while the
  // round labels stay correct.
  const orderedRounds = [...rounds].sort((a, b) => (b.roundNumber ?? 0) - (a.roundNumber ?? 0));
  const latestRound = data.latestInterviewRound || orderedRounds[0] || null;
  const currentRound = currentInterview || latestRound;
  const role = useUserStore((state) => state.user?.role);
  const employerView = isEmployerRole(role);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const canUpdate = employerView;
  const canCreate = employerView;
  const actionRound = latestRound || currentRound;
  const actionState = getInterviewActionAvailability(actionRound, { canUpdate, canCreate });
  const blockedActionTooltip = 'Time has passed, you cannot reschedule or cancel the interview';

  const jobTitle = currentRound?.jobTitle || application.jobTitle || 'Interview rounds';
  const candidateName = currentRound?.candidateName || application.candidateName || 'Candidate';
  const candidatePhoto = currentRound?.candidateProfilePhoto || undefined;
  const companyName = application.companyName || 'Company not available';
  const companyLogo = application.companyLogo || undefined;
  const currentScheduledAt = currentRound?.scheduledAt || null;
  const currentDuration = currentRound?.duration ?? null;
  const currentStatusKey = currentRound?.status?.toLowerCase() || '';
  const currentIsCompleted =
    currentStatusKey === 'completed' || currentStatusKey === 'interview_completed';
  const currentIsCanceled = currentStatusKey === 'canceled' || currentStatusKey === 'cancelled';
  const currentIsRescheduled = currentStatusKey === 'rescheduled';
  const currentCompletionNote = employerView && currentIsCompleted ? currentRound?.interviewerNotes : null;
  const currentCancellationReason =
    employerView && currentIsCanceled ? currentRound?.cancelReason || currentRound?.reason || null : null;
  const currentRescheduleReason =
    employerView && currentIsRescheduled
      ? currentRound?.rescheduleReason || currentRound?.reason || null
      : null;

  const handleAvatarClick = () => {
    if (employerView) {
      if (!application.id || !application.candidateId) return;
      router.push(routePaths.employee.jobs.applicantProfile(application.id, application.candidateId));
      return;
    }

    if (!application.jobId) return;
    router.push(routePaths.jobs.detail(application.jobId));
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-100 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="shrink-0 rounded-xl text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <Avatar
                src={employerView ? candidatePhoto : companyLogo}
                name={employerView ? candidateName : companyName}
                className="h-16 w-16 rounded-xl border border-gray-100"
                radius="sm"
                fallback={<MdOutlineWorkOutline className="text-xl text-gray-400" />}
              />
            </button>

            <div className="min-w-0 space-y-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-gray-900">{jobTitle}</h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  {employerView ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5">
                      <FaUserTie className="text-blue-600" size={12} />
                      <span className="truncate text-xs font-medium text-gray-700">
                        {candidateName}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
                      <FaBuilding className="text-emerald-600" size={12} />
                      <span className="truncate text-xs font-medium text-gray-700">
                        {companyName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            {employerView ? (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {actionState.canReschedule ? (
                  <Button
                    color="primary"
                    size="sm"
                    className="font-semibold text-white"
                    onPress={() => setRescheduleOpen(true)}
                  >
                    Reschedule
                  </Button>
                ) : null}
                {actionState.canCancel ? (
                  <Button
                    color="danger"
                    size="sm"
                    className="font-semibold text-white"
                    onPress={() => setCancelOpen(true)}
                  >
                    Cancel
                  </Button>
                ) : null}
                {actionState.canComplete ? (
                  <Button
                    color="success"
                    size="sm"
                    className="font-semibold text-white"
                    onPress={() => setCompleteOpen(true)}
                  >
                    Complete
                  </Button>
                ) : null}
                {actionState.canAddRound ? (
                  <Button
                    as={Link}
                    href={routePaths.employee.jobs.scheduleInterview(data.application.id)}
                    color="primary"
                    size="sm"
                    className="font-semibold text-white sm:ml-auto"
                  >
                    + Add Round
                  </Button>
                ) : null}
              </div>
            ) : null}

            {currentScheduledAt ? (
              <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-medium text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <BsCalendar4Event className="text-gray-400" />
                  {dayjs(currentScheduledAt).format('ddd, DD MMM YYYY')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FiClock className="text-gray-400" />
                  {dayjs(currentScheduledAt).format('h:mm A')}
                </span>
                {currentDuration ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FiClock className="text-gray-400" />
                    {currentDuration} mins
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardHeader>

        {employerView && (currentCancellationReason || currentRescheduleReason || currentCompletionNote) ? (
          <>
            <CardBody className="px-5 py-4">
              {currentCancellationReason || currentRescheduleReason ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                    {currentCancellationReason ? 'Cancellation Reason' : 'Reschedule Reason'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-950">
                    {currentCancellationReason || currentRescheduleReason}
                  </p>
                </div>
              ) : null}

              {currentCompletionNote ? (
                <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Completion Note
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-700">{currentCompletionNote}</p>
                </div>
              ) : null}
            </CardBody>
          </>
        ) : null}
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

                  <InterviewRoundCard round={round} isSelected={currentInterviewId === round.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rescheduleOpen && currentRound ? (
        <RescheduleInterviewDialog
          isOpen={rescheduleOpen}
          onClose={() => {
            setRescheduleOpen(false);
          }}
          interview={currentRound as any}
          refetch={() => {
            setRescheduleOpen(false);
            refetch?.();
          }}
        />
      ) : null}

      {cancelOpen && currentRound ? (
        <CancelInterviewDialog
          isOpen={cancelOpen}
          onClose={() => {
            setCancelOpen(false);
          }}
          interview={currentRound as any}
          refetch={() => {
            setCancelOpen(false);
            refetch?.();
          }}
        />
      ) : null}

      {completeOpen && currentRound ? (
        <CompleteInterviewDialog
          isOpen={completeOpen}
          onClose={() => {
            setCompleteOpen(false);
          }}
          interview={currentRound as any}
          refetch={() => {
            setCompleteOpen(false);
            refetch?.();
          }}
        />
      ) : null}
    </div>
  );
};

export default InterviewRoundsTimeline;
