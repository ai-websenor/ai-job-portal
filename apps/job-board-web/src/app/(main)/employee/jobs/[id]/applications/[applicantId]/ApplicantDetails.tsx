'use client';

import { Card, CardHeader, CardBody, Button, Avatar, addToast, Tooltip } from '@heroui/react';
import { FaFilePdf } from 'react-icons/fa';
import { HiOutlineDownload } from 'react-icons/hi';
import { MdOutlineMessage } from 'react-icons/md';
import Link from 'next/link';
import routePaths from '@/app/config/routePaths';
import dayjs from 'dayjs';
import { useState } from 'react';
import { InterviewStatus, VideoResumeStatus } from '@/app/types/enum';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import permissionUtils from '@/app/utils/permissionUtils';
import CreateChatDialog from '@/app/components/dialogs/CreateChatDialog';
import VideoPlayer from '@/app/components/lib/VideoPlayer';
import { downloadCandidateResume } from '@/app/api/candidateSearch';
import type { CandidateProfileResponse } from '@/app/types/candidateSearch';
import { useRouter } from 'next/navigation';

type Props = CandidateProfileResponse & {
  refetch?: () => void;
  profileId?: string;
};

const getResumeFileName = (resumeUrl?: string | null) => {
  if (!resumeUrl) return 'Resume';
  const [path] = resumeUrl.split('?');
  return decodeURIComponent(path.split('/').pop() || 'Resume');
};

const openResumeUrl = (url: string, fileName: string) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const ApplicantDetails = ({
  refetch,
  application,
  resume,
  profileId,
  profile,
  educationRecords,
  skills,
  workExperiences,
  videoResume,
  threadId,
}: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState({ show: false, type: '' });

  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    data: {
      status: '',
      recipientId: '',
      application: null as { applicationId: string } | null,
      companyName: '',
    },
  });

  const applicationId = application?.applicationId;
  const applicationStatus = application?.status;
  const hasApplication = Boolean(applicationId);
  const isCandidateProfileFlow = Boolean(profileId);
  const conversationThreadId = threadId ?? application?.threadId ?? null;
  const profileName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Candidate';
  const hasDownloadableResume = isCandidateProfileFlow ? Boolean(resume) : hasApplication;
  const resumeFileName = isCandidateProfileFlow
    ? resume?.fileName || 'Resume'
    : getResumeFileName(application?.resumeUrl);
  const resumeDate = isCandidateProfileFlow ? resume?.updatedAt : application?.appliedAt;
  const resumeMetaText = isCandidateProfileFlow
    ? resume
      ? resume.isDownloaded
        ? 'Already unlocked'
        : '1 resume access credit'
      : 'No default resume'
    : resumeDate
      ? `${dayjs(resumeDate).format('DD MMM, YYYY')} PDF`
      : 'Application resume';
  const canSelectOrReject =
    applicationStatus === InterviewStatus.completed ||
    applicationStatus === 'canceled' ||
    applicationStatus === 'interview_completed';
  const isChatUnavailable = [
    InterviewStatus.rejected,
    InterviewStatus.withdrawn,
    'offer_rejected',
  ].includes(applicationStatus || '');
  const canShowMessageAction =
    isCandidateProfileFlow || (hasApplication && permissionUtils.hasPermission('applications:update'));

  const handleMessagePress = () => {
    if (!profile?.userId || isChatUnavailable) return;

    if (conversationThreadId) {
      router.push(routePaths.chat.chatDetail(conversationThreadId));
      return;
    }

    setMessageModal({
      isOpen: true,
      data: {
        status: applicationStatus || '',
        application: applicationId ? { applicationId } : null,
        companyName: profileName,
        recipientId: profile.userId,
      },
    });
  };

  const handleChangeStatus = async () => {
    if (loading || !applicationId) return;
    try {
      setLoading(true);

      await http.put(ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE_STATUS(applicationId), {
        status: confirmation.type,
      });

      addToast({
        title: 'Success',
        color: 'success',
        description: 'Application status updated successfully',
      });

      refetch?.();

      setConfirmation({ show: false, type: '' });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDownload = async () => {
    if (!hasDownloadableResume) return;

    try {
      setLoading(true);

      const response =
        isCandidateProfileFlow && profileId
          ? await downloadCandidateResume(profileId)
          : await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.DOWNLOAD_RESUME(applicationId!));

      if (response?.data?.url) {
        openResumeUrl(response.data.url, response.data.fileName || resumeFileName);
        refetch?.();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Card className="shadow-md border-none bg-white p-4">
        <CardBody className="flex flex-row flex-wrap items-start justify-between gap-6">
          <div className="flex sm:flex-row flex-col items-center gap-6">
            <Avatar
              src={profile?.profilePhoto || undefined}
              name={profileName}
              className="w-24 h-24 text-large"
              radius="lg"
              isBordered
              color="primary"
            />
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-default-900">{profileName}</h1>
              <p className="text-default-500 max-w-2xl leading-relaxed text-xs">{profile?.email}</p>
              <p className="text-default-500 max-w-2xl leading-relaxed">{profile?.headline}</p>
            </div>
          </div>

          {(hasApplication && permissionUtils.hasPermission('applications:update')) ||
          canShowMessageAction ? (
            <div className="flex sm:flex-row flex-col items-center gap-3 sm:w-fit w-full">
              {hasApplication &&
                permissionUtils.hasPermission('applications:update') &&
                applicationStatus !== InterviewStatus.rejected && (
                <Button
                  isLoading={loading}
                  onPress={() =>
                    setConfirmation({
                      show: true,
                      type: InterviewStatus.rejected,
                    })
                  }
                  color="danger"
                  radius="lg"
                  size="sm"
                  className="sm:w-fit w-full"
                >
                  Reject
                </Button>
              )}

              {canShowMessageAction && (
                <Tooltip
                  content="Chat not available for this candidate"
                  isDisabled={!isChatUnavailable}
                  placement="bottom"
                >
                  <span className="sm:w-fit w-full">
                    <Button
                      color="primary"
                      radius="lg"
                      size="sm"
                      className="sm:w-fit w-full"
                      startContent={<MdOutlineMessage size={16} />}
                      isDisabled={isChatUnavailable || !profile?.userId}
                      onPress={handleMessagePress}
                    >
                      {conversationThreadId ? 'Chat' : 'Message'}
                    </Button>
                  </span>
                </Tooltip>
              )}

              {hasApplication &&
                permissionUtils.hasPermission('applications:update') &&
                canSelectOrReject && (
                <>
                  <Button
                    isLoading={loading}
                    onPress={() =>
                      setConfirmation({
                        show: true,
                        type: InterviewStatus.rejected,
                      })
                    }
                    color="danger"
                    radius="lg"
                    size="sm"
                    className="sm:w-fit w-full"
                  >
                    Reject
                  </Button>

                  <Button
                    isLoading={loading}
                    onPress={() =>
                      setConfirmation({
                        show: true,
                        type: InterviewStatus.hired,
                      })
                    }
                    color="success"
                    radius="lg"
                    size="sm"
                    className="sm:w-fit w-full text-white"
                  >
                    Select
                  </Button>
                </>
              )}

              {hasApplication &&
                permissionUtils.hasPermission('applications:update') &&
                applicationStatus === InterviewStatus.viewed && (
                <Button
                  isLoading={loading}
                  onPress={() =>
                    setConfirmation({
                      show: true,
                      type: InterviewStatus.shortlisted,
                    })
                  }
                  color="default"
                  radius="lg"
                  size="sm"
                  className="sm:w-fit w-full"
                >
                  Shortlist
                </Button>
              )}

              {hasApplication &&
                permissionUtils.hasPermission('interviews:create') &&
                applicationStatus !== InterviewStatus.completed &&
                applicationStatus !== 'interview_completed' &&
                applicationStatus !== InterviewStatus.rejected && (
                  <Button
                    as={Link}
                    href={routePaths.employee.jobs.scheduleInterview(applicationId || '')}
                    color="primary"
                    radius="lg"
                    size="sm"
                    className="sm:w-fit w-full"
                  >
                    Schedule Interview
                  </Button>
                )}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-6 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">Education</h2>
          </CardHeader>
          <CardBody className="px-6 pb-6 flex flex-row flex-wrap gap-x-12 gap-y-6">
            {educationRecords?.map((edu, index: number) => (
              <div key={index} className="flex flex-col min-w-[140px]">
                <h3 className="font-bold text-default-800 text-base">{edu.institution}</h3>
                <p className="text-default-400 text-sm mt-0.5">
                  {edu.startDate} - {edu.endDate}
                </p>
                <p className="text-default-500 text-sm font-semibold mt-0.5">{edu.degree}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-6 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">Work Experience</h2>
          </CardHeader>
          <CardBody className="px-6 pb-6 flex flex-row flex-wrap gap-x-12 gap-y-6">
            {workExperiences.map((exp, index: number) => (
              <div key={index} className="flex flex-col min-w-[180px]">
                <h3 className="font-bold text-default-800 text-base">{exp.companyName}</h3>
                <p className="text-default-400 text-sm mt-0.5">
                  {exp.startDate} - {exp.endDate}
                </p>
                <p className="text-default-500 text-sm font-semibold mt-0.5">{exp.jobTitle}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-8 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">Skills</h2>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-4">
              {skills.map((skill, index: number) => (
                <li key={index} className="flex items-center gap-3 text-default-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-default-400" />
                  {skill?.skillName}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-6 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">Resume</h2>
          </CardHeader>
          <CardBody className="px-6 pb-6 gap-6">
            <div className="flex-1 bg-default-50 rounded-2xl flex items-center justify-center py-10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-danger/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FaFilePdf
                size={70}
                className="text-danger shadow-sm transition-transform group-hover:scale-110"
              />
            </div>
            <div className="flex items-center justify-between p-4 border-2 border-default-100 rounded-2xl bg-white shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-danger-50 text-danger rounded-xl flex items-center justify-center">
                  <FaFilePdf size={24} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-default-800 truncate max-w-[200px]">
                    {resumeFileName}
                  </span>
                  <span className="text-[11px] text-default-400 font-bold uppercase tracking-wider">
                    {resumeMetaText}
                  </span>
                </div>
              </div>
              <Button
                isIconOnly
                variant="flat"
                color="primary"
                size="md"
                radius="full"
                className="bg-primary/10"
                isLoading={loading}
                isDisabled={!hasDownloadableResume}
                onPress={handleResumeDownload}
              >
                <HiOutlineDownload size={22} />
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {videoResume?.url && (
        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-6 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">Video Resume</h2>
          </CardHeader>
          <CardBody
            className={videoResume.status === VideoResumeStatus.rejected ? '' : 'h-[400px]'}
          >
            {videoResume.status === VideoResumeStatus.rejected ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-danger-50 rounded-xl border-1 border-danger-100">
                <p className="text-danger font-bold text-lg">Video Unavailable</p>
                <p className="text-danger-500 text-sm mt-1">
                  This video resume has been rejected due to inappropriate content or violation of
                  our guidelines.
                </p>
              </div>
            ) : (
              <VideoPlayer url={videoResume?.url} />
            )}
          </CardBody>
        </Card>
      )}

      {confirmation.show && (
        <ConfirmationDialog
          title="Confirmation"
          isOpen={confirmation.show}
          onConfirm={handleChangeStatus}
          onClose={() => setConfirmation({ show: false, type: '' })}
          color={
            confirmation.type === InterviewStatus.rejected
              ? 'danger'
              : confirmation.type === InterviewStatus.hired
                ? 'success'
                : 'primary'
          }
          message={
            confirmation.type === InterviewStatus.shortlisted
              ? 'Are you sure you want to shortlist this application?'
              : confirmation.type === InterviewStatus.hired
                ? 'Are you sure you want to select this candidate?'
                : confirmation.type === InterviewStatus.rejected
                  ? 'Are you sure you want to reject this application?'
                  : 'Are you sure you want to shortlist this application?'
          }
        />
      )}

      {messageModal.isOpen && (
        <CreateChatDialog
          data={messageModal.data}
          isOpen={messageModal.isOpen}
          onClose={() =>
            setMessageModal({
              isOpen: false,
              data: { status: '', recipientId: '', application: null, companyName: '' },
            })
          }
        />
      )}
    </div>
  );
};

export default ApplicantDetails;
