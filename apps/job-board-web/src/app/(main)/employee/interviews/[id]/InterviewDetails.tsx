import { InterviewStatus, InterviewTools } from '@/app/types/enum';
import { InterviewDetails as InterviewDetailsType } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Button, Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react';
import dayjs from 'dayjs';
import Image from 'next/image';
import {
  BsCalendar4Event,
  BsClock,
  BsEnvelope,
  BsGeoAlt,
  BsInfoCircle,
  BsLink45Deg,
  BsLock,
  BsMicrosoftTeams,
  BsPhone,
  BsTelephone,
  BsCameraVideo,
} from 'react-icons/bs';
import { FaStar } from 'react-icons/fa';

import { FiHash } from 'react-icons/fi';
import { useState } from 'react';
import RescheduleInterviewDialog from '@/app/components/dialogs/RescheduleInterviewDialog';
import CancelInterviewDialog from '@/app/components/dialogs/CancelInterviewDialog';
import CompleteInterviewDialog from '@/app/components/dialogs/CompleteInterviewDialog';
import InProgressInterviewDialog from '@/app/components/dialogs/InProgressInterviewDialog';
import permissionUtils from '@/app/utils/permissionUtils';
import routePaths from '@/app/config/routePaths';
import Link from 'next/link';

const InterviewDetails = ({
  interview,
  refetch,
}: {
  interview: InterviewDetailsType;
  refetch?: () => void;
}) => {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [inProgressOpen, setInProgressOpen] = useState(false);
  const toolConfigs = {
    [InterviewTools.teams]: {
      icon: <BsMicrosoftTeams size={18} />,
      color: 'primary' as const,
    },
    [InterviewTools.zoom]: {
      icon: <BsCameraVideo size={18} />,
      color: 'primary' as const,
    },

    [InterviewTools.phone]: {
      icon: <BsTelephone size={18} />,
      color: 'success' as const,
    },
    [InterviewTools.other]: {
      icon: <BsLink45Deg size={18} />,
      color: 'default' as const,
    },
  };

  const openMeetingLink = () => {
    const meetingUrl = interview?.hostJoinUrl || (interview as any)?.meetingLink;
    if (typeof window !== 'undefined' && meetingUrl) {
      window.open(meetingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const jobTitle = interview?.jobTitle || interview?.application?.job?.title || 'Interview';
  const candidateName =
    interview?.candidateName ||
    [interview?.application?.jobSeeker?.firstName, interview?.application?.jobSeeker?.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Candidate';
  const candidatePhoto =
    interview?.candidateProfilePhoto || interview?.application?.jobSeeker?.profilePhoto || undefined;
  const snapshot = interview?.application?.resumeSnapshot;
  // Top banner shows the OVERALL interview status (application-level) so the
  // at-a-glance state reflects the whole hiring process, not just this round.
  const overallStatus = interview?.applicationStatus || interview?.application?.status;
  const displayStatus = overallStatus || interview?.status;
  const isInterviewCompleted = [interview?.status, overallStatus].some(
    (status) =>
      status === InterviewStatus.completed || status === InterviewStatus.interview_completed,
  );
  const hasUpdatePermission = permissionUtils.hasPermission('interviews:update');
  const hasCreatePermission = permissionUtils.hasPermission('interviews:create');
  const scheduledMoment = dayjs(interview?.scheduledAt);
  const isFuture = scheduledMoment.isAfter(dayjs());
  const isPastOrNow = !isFuture;
  const canReschedule = hasUpdatePermission && isFuture;
  const canCancel =
    hasUpdatePermission &&
    (interview?.applicationStatus === InterviewStatus.interview_scheduled ||
      interview?.applicationStatus === InterviewStatus.interview_rescheduled) &&
    isFuture;
  const canComplete =
    hasUpdatePermission &&
    (interview?.status === InterviewStatus.in_progress ||
      ((interview?.status === InterviewStatus.scheduled ||
        interview?.status === InterviewStatus.rescheduled) &&
        isPastOrNow));
  // "In Progress" = a conducted round with more rounds expected. Allowed from an
  // active (scheduled/rescheduled) round; unlocks scheduling the next round.
  const canMarkInProgress =
    hasUpdatePermission &&
    (interview?.status === InterviewStatus.scheduled ||
      interview?.status === InterviewStatus.rescheduled);
  // A round is "done, more rounds expected" when the round itself is completed
  // but the application is still in progress -> allow scheduling the next round.
  const canAddRound =
    hasCreatePermission &&
    interview?.status === InterviewStatus.completed &&
    overallStatus === InterviewStatus.interview_in_progress;

  return (
    <div className="space-y-6">
      <div className="relative h-[160px] w-full overflow-hidden rounded-2xl shadow-lg">
        <Image
          alt="cover"
          src="/assets/images/interview-details-cover.png"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 z-10 flex flex-col justify-center bg-black/20 p-8 text-white backdrop-blur-[2px]">
          <div className="flex flex-row items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight truncate drop-shadow-md">
                {jobTitle}
              </h2>
              <p className="text-sm md:text-base font-medium text-blue-50 mt-1 flex items-center gap-2">
                <BsInfoCircle size={16} />
                {[
                  interview?.roundNumber ? `Round ${interview.roundNumber}` : null,
                  CommonUtils.interviewTypeLabel(interview?.interviewType, interview?.customType),
                  interview?.roundName,
                  CommonUtils.keyIntoTitle(interview?.interviewMode),
                  CommonUtils.keyIntoTitle(interview?.interviewTool),
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>
            <div className="shrink-0">
              <Chip
                className="font-bold uppercase tracking-wider px-3"
                variant="shadow"
                color={CommonUtils.getStatusColor(displayStatus)}
              >
                {CommonUtils.getInterviewStatusLabel(displayStatus)}
              </Chip>
            </div>
          </div>
        </div>
      </div>
                
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Candidate Info */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-sm bg-blue-50/30">
            <CardHeader className="flex gap-4 p-6 items-start">
              <Avatar
                src={candidatePhoto}
                name={candidateName}
                className="w-20 h-20 text-large border-4 border-white shadow-md bg-white"
                radius="lg"
              />
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900">
                      {candidateName}
                    </h3>
                    <p className="text-primary font-semibold text-sm">
                      {snapshot?.headline || 'Candidate'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {snapshot?.email && (
                      <Chip
                        variant="flat"
                        size="sm"
                        startContent={<BsEnvelope className="mx-1" />}
                        className="bg-white/50"
                      >
                        {snapshot.email}
                      </Chip>
                    )}
                    {snapshot?.phone && (
                      <Chip
                        variant="flat"
                        size="sm"
                        startContent={<BsPhone className="mx-1" />}
                        className="bg-white/50"
                      >
                        {snapshot.phone}
                      </Chip>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <Divider className="mx-6" />
            <CardBody className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Professional Summary
                </h4>
                <p className="text-zinc-600  text-sm leading-relaxed">
                  {snapshot?.professionalSummary || 'No summary provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-white shadow-sm border border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Experience</p>
                  <p className="text-sm font-bold">{snapshot?.totalExperienceYears || '0'} Years</p>
                </div>
                <div className="p-3 rounded-xl bg-white shadow-sm border border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Location</p>
                  <p className="text-sm font-bold capitalize">
                    {[snapshot?.city, snapshot?.country].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {interview?.interviewerNotes && (
            <Card className="border-none shadow-sm">
              <CardHeader className="px-6 pt-6 pb-2">
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                  Interviewer Notes
                </h4>
              </CardHeader>
              <CardBody className="px-6 pb-6">
                <div className="p-4 rounded-xl bg-zinc-50 border-l-4 border-primary">
                  <p className="text-zinc-700 italic">"{interview.interviewerNotes}"</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right Column: Interview Details */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 p-6 flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 text-primary">
                <BsCalendar4Event className="text-lg" />
                <span className="font-bold uppercase text-xs tracking-widest">
                  Interview Schedule
                </span>
              </div>
              <h3 className="text-xl font-black mt-2 leading-tight">
                {dayjs(interview?.scheduledAt).format('MMMM D, YYYY')}
              </h3>
              <p className="text-primary font-bold text-lg flex items-center gap-2">
                {dayjs(interview?.scheduledAt).format('h:mm A')}
                <span className="text-zinc-400 font-medium text-sm">
                  ({interview?.duration} mins)
                </span>
              </p>
            </CardHeader>
            <Divider />
            <CardBody className="p-6 space-y-5">
              <div className="space-y-4">
                {interview?.roundNumber ? (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary-50 text-secondary-600">
                      <FiHash size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 font-medium">Round</p>
                      <p className="text-sm font-bold uppercase tracking-tight">
                        Round {interview.roundNumber}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <BsInfoCircle size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 font-medium">Type</p>
                      <p className="text-sm font-bold uppercase tracking-tight">
                        {CommonUtils.interviewTypeLabel(
                          interview?.interviewType,
                          interview?.customType,
                        )}
                      </p>
                      {interview?.roundName ? (
                        <p className="text-xs text-zinc-400">{interview.roundName}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                      <BsClock size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 font-medium">Duration</p>
                      <p className="text-sm font-bold uppercase tracking-tight">
                        {interview?.duration}m
                      </p>
                    </div>
                  </div>
                </div>

                <Divider className="opacity-50" />

                {interview?.rating !== null && interview?.rating !== undefined && (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Rating</p>
                      <p className="text-sm font-bold text-amber-900">{interview.rating}/5</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <FaStar
                          key={index}
                          size={12}
                          className={
                            index < (interview.rating || 0) ? 'text-amber-400' : 'text-amber-200'
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {interview?.interviewMode === 'online' ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                          {toolConfigs[interview.interviewTool]?.icon || <BsLink45Deg size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-zinc-400 font-medium">Meeting Tool</p>
                          <p className="text-sm font-bold uppercase tracking-tight">
                            {interview?.interviewTool}
                          </p>
                        </div>
                      </div>

                      {interview.zoomMeetingId && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-50 text-zinc-600">
                            <FiHash size={18} />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 font-medium">Meeting ID</p>
                            <p className="text-sm font-bold font-mono">{interview.zoomMeetingId}</p>
                          </div>
                        </div>
                      )}

                      {interview.meetingPassword && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-50 text-zinc-600">
                            <BsLock size={18} />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 font-medium">Passcode</p>
                            <p className="text-sm font-bold font-mono">
                              {interview.meetingPassword}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-50 text-red-600">
                        <BsGeoAlt size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 font-medium">Location</p>
                        <p className="text-sm font-bold uppercase tracking-tight">
                          {interview?.location || 'Not Specified'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {interview?.interviewMode === 'online' &&
                (interview?.hostJoinUrl || interview?.meetingLink) && (
                  <div className="pt-4">
                    <Button
                      onPress={isInterviewCompleted ? undefined : openMeetingLink}
                      color={
                        isInterviewCompleted
                          ? 'primary'
                          : toolConfigs[interview?.interviewTool]?.color || 'primary'
                      }
                      isDisabled={isInterviewCompleted}
                      className="w-full font-bold h-12 shadow-lg"
                      startContent={
                        isInterviewCompleted ? null : toolConfigs[interview?.interviewTool]?.icon
                      }
                    >
                      {isInterviewCompleted ? 'Interview Completed' : 'Join Meeting'}
                    </Button>
                  </div>
                )}

              <div className="pt-2 grid grid-cols-1 gap-2">
                {canReschedule && (
                  <Button color="primary" variant="flat" onPress={() => setRescheduleOpen(true)}>
                    Reschedule
                  </Button>
                )}
                {canCancel && (
                  <Button color="danger" variant="flat" onPress={() => setCancelOpen(true)}>
                    Cancel
                  </Button>
                )}
                {canMarkInProgress && (
                  <Button color="warning" variant="flat" onPress={() => setInProgressOpen(true)}>
                    In Progress
                  </Button>
                )}
                {canAddRound && (
                  <Button
                    as={Link}
                    href={routePaths.employee.jobs.scheduleInterview(interview.applicationId)}
                    color="primary"
                    variant="flat"
                    className="font-semibold"
                  >
                    + Add Round
                  </Button>
                )}
                {canComplete && (
                  <Button color="success" variant="flat" onPress={() => setCompleteOpen(true)}>
                    Complete
                  </Button>
                )}
                {(interview?.status === InterviewStatus.completed ||
                  overallStatus === 'interview_completed') &&
                  hasCreatePermission &&
                  !canAddRound && (
                    <Button
                      as={Link}
                      href={routePaths.employee.jobs.scheduleInterview(interview.applicationId)}
                      color="primary"
                      className="font-semibold"
                    >
                      Add Interview
                    </Button>
                  )}
              </div>
            </CardBody>
          </Card>

          {interview.dialInInfo && interview.dialInInfo.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader className="px-6 pt-4 pb-0 flex items-center gap-2">
                <BsTelephone className="text-zinc-400" />
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[2px]">
                  Dial-in Numbers
                </h4>
              </CardHeader>
              <CardBody className="p-6 pt-2 space-y-3">
                {interview.dialInInfo.map((info, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-zinc-500">{info.country}</span>
                    <span className="font-bold text-zinc-700">{info.number}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {rescheduleOpen && (
        <RescheduleInterviewDialog
          isOpen={rescheduleOpen}
          onClose={() => setRescheduleOpen(false)}
          interview={interview as any}
          refetch={() => {
            setRescheduleOpen(false);
            refetch?.();
          }}
        />
      )}

      {cancelOpen && (
        <CancelInterviewDialog
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          interview={interview as any}
          refetch={() => {
            setCancelOpen(false);
            refetch?.();
          }}
        />
      )}

      {completeOpen && (
        <CompleteInterviewDialog
          isOpen={completeOpen}
          onClose={() => setCompleteOpen(false)}
          interview={interview as any}
          refetch={() => {
            setCompleteOpen(false);
            refetch?.();
          }}
        />
      )}

      {inProgressOpen && (
        <InProgressInterviewDialog
          isOpen={inProgressOpen}
          onClose={() => setInProgressOpen(false)}
          interview={interview as any}
          refetch={() => {
            setInProgressOpen(false);
            refetch?.();
          }}
        />
      )}
    </div>
  );
};

export default InterviewDetails;
