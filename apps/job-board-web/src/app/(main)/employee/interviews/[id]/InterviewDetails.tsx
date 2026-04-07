import { InterviewTools } from '@/app/types/enum';
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

import { FiHash } from 'react-icons/fi';

const InterviewDetails = ({ interview }: { interview: InterviewDetailsType }) => {
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
    if (typeof window !== 'undefined' && interview?.hostJoinUrl) {
      window.open(interview?.hostJoinUrl, '_blank');
    }
  };

  const candidate = interview?.application?.jobSeeker;
  const snapshot = interview?.application?.resumeSnapshot;

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
                {interview?.application?.job?.title}
              </h2>
              <p className="text-sm md:text-base font-medium text-blue-50 mt-1 flex items-center gap-2">
                <BsInfoCircle size={16} />
                {[
                  CommonUtils.keyIntoTitle(interview?.interviewType),
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
                color={CommonUtils.getStatusColor(interview?.application?.status)}
              >
                {CommonUtils.keyIntoTitle(interview?.application?.status)}
              </Chip>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Candidate Info */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-sm bg-blue-50/30 dark:bg-zinc-900/30">
            <CardHeader className="flex gap-4 p-6 items-start">
              <Avatar
                src={candidate?.profilePhoto || undefined}
                name={`${candidate?.firstName} ${candidate?.lastName}`}
                className="w-20 h-20 text-large border-4 border-white shadow-md bg-white"
                radius="lg"
              />
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {candidate?.firstName} {candidate?.lastName}
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
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  {snapshot?.professionalSummary || 'No summary provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Experience</p>
                  <p className="text-sm font-bold">{snapshot?.totalExperienceYears || '0'} Years</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
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
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-l-4 border-primary">
                  <p className="text-zinc-700 dark:text-zinc-300 italic">
                    "{interview.interviewerNotes}"
                  </p>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <BsInfoCircle size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 font-medium">Type</p>
                      <p className="text-sm font-bold uppercase tracking-tight">
                        {interview?.interviewType}
                      </p>
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

              {interview?.interviewMode === 'online' && interview?.hostJoinUrl && (
                <div className="pt-4">
                  <Button
                    onPress={openMeetingLink}
                    color={toolConfigs[interview?.interviewTool]?.color || 'primary'}
                    className="w-full font-bold h-12 shadow-lg"
                    startContent={toolConfigs[interview?.interviewTool]?.icon}
                  >
                    Join Meeting
                  </Button>
                </div>
              )}
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
    </div>
  );
};

export default InterviewDetails;
