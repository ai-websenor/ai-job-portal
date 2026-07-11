'use client';

import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Avatar,
  addToast,
  Tooltip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Chip,
} from '@heroui/react';
import { FaFilePdf } from 'react-icons/fa';
import { HiOutlineDownload } from 'react-icons/hi';
import { MdOutlineMessage, MdOutlineEmail, MdOutlinePhone, MdLocationOn, MdSchool, MdWorkOutline, MdOutlineStar, MdCardMembership, MdOutlineInsertDriveFile, MdOutlineTune, MdOutlineTextSnippet, MdOutlineBusiness, MdOutlineSchedule, MdOutlineCommute, MdOutlinePayments, MdOutlinePersonSearch } from 'react-icons/md';
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
import { MdHistory } from 'react-icons/md';

type Props = CandidateProfileResponse & {
  refetch?: () => void;
  profileId?: string;
};

// const maskEmail = (value?: string | null) => {
//   if (!value) return 'Email hidden';
//   const [localPart = '', domain = ''] = value.split('@');
//   const maskedLocal = localPart.length <= 2 ? `${localPart[0] || ''}••` : `${localPart[0]}•••`;
//   const [domainName = '', domainExt = ''] = domain.split('.');
//   const maskedDomain = domainName ? `${domainName[0] || ''}•••` : '•••';
//   return `${maskedLocal}@${maskedDomain}${domainExt ? `.${domainExt}` : ''}`;
// };

// const maskPhone = (value?: string | null) => {
//   if (!value) return 'Phone hidden';
//   const visible = value.slice(-4);
//   return `${value.slice(0, Math.max(0, value.length - 4)).replace(/[0-9+]/g, '•')}${visible}`;
// };

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

const EmptyStateCard = ({ title, description, icon: Icon, compact }: { title: string, description: string, icon?: any, compact?: boolean }) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-4' : 'py-10'} px-4`}>
    {Icon && (
      <div className={`${compact ? 'w-20 h-20' : 'w-24 h-24'} mb-4 flex items-center justify-center bg-default-100 rounded-full`}>
        <Icon className={`${compact ? 'text-4xl' : 'text-5xl'} text-default-400`} />
      </div>
    )}
    <h3 className="font-bold text-default-900 text-base">{title}</h3>
    <p className="text-default-500 text-xs mt-1 max-w-[250px]">{description}</p>
  </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string, status?: 'Available' | 'Partial' | 'Not Added' | 'Not Available', icon?: any }) => {


  return (
    <CardHeader className="px-6 pt-5 pb-3 flex flex-row items-center justify-between w-full border-b border-default-100">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="text-2xl text-primary" />}
        <h2 className="text-xl font-bold text-default-900">{title}</h2>
      </div>
    </CardHeader>
  );
};

const ApplicantDetails = ({
  refetch,
  application,
  resume,
  profileId,
  profile,
  educationRecords = [],
  skills = [],
  workExperiences = [],
  certifications = [],
  jobPreferences,
  videoResume,
  threadId,
  access,
}: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState({ show: false, type: '' });
  // const [contactRevealed, setContactRevealed] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

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
        : '1 profile access credit'
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
  // In the search (candidate-profile) flow, the contact + message actions are gated by the
  // plan capability flags returned in `access`. In the application flow they follow the
  // existing permission rules (applicants are always reachable).
  const showMessageAction = isCandidateProfileFlow
    ? Boolean(access?.canMessage)
    : hasApplication && permissionUtils.hasPermission('applications:update');

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


  const hasJobPrefs = jobPreferences && Object.keys(jobPreferences).length > 0;
  const hasWorkExp = workExperiences && workExperiences.length > 0;
  const hasSkills = skills && skills.length > 0;
  const hasEdu = educationRecords && educationRecords.length > 0;
  const hasCert = certifications && certifications.length > 0;
  const hasSummary = Boolean(profile?.professionalSummary?.trim());

  return (
    <div className="flex flex-col gap-4">
      {/* Header Card */}
      <Card className="shadow-sm border border-default-100 bg-white p-2">
        <CardBody className="flex flex-col gap-6 p-4">
          <div className="flex flex-col xl:flex-row items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar
                src={profile?.profilePhoto || undefined}
                name={profileName}
                className="w-24 h-24 text-large shrink-0"
                radius="lg"
                isBordered
                color="primary"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-default-900">{profileName}</h1>
                </div>
                <p className="text-default-600 font-medium text-base mt-1">{profile?.headline}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-default-500">
                  <div className="flex items-center gap-1">
                    <MdLocationOn className="text-lg" />
                    <span>{[profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || 'Location not specified'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MdOutlineEmail className="text-lg" />
                    <span>{profile?.email || 'Email not available'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MdOutlinePhone className="text-lg" />
                    <span>{profile?.phone || 'Phone not available'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {profile?.totalExperienceYears !== undefined &&
                    profile?.totalExperienceYears !== null ? (
                    <Chip
                      variant="flat"
                      color="primary"
                      size="sm"
                      className="font-semibold text-xs border-1.5"
                      radius="full"
                    >
                      {profile.totalExperienceYears === "0.00"
                        ? "Fresher"
                        : `${profile.totalExperienceYears} Years Exp`}
                    </Chip>
                  ) : null}
                  {/* {jobPreferences?.workShift ? (
                     <Chip variant="flat" color="success" size="sm" className="font-semibold text-xs border-1.5" radius="full">
                       {jobPreferences?.workShift}
                     </Chip>
                  ) : null} */}
                  {jobPreferences?.jobSearchStatus ? (
                    <Chip variant="flat" color="secondary" size="sm" className="font-semibold text-xs border-1.5" radius="full">
                      {jobPreferences?.jobSearchStatus?.replace('_', ' ')}
                    </Chip>
                  ) : null}
                  {jobPreferences?.noticePeriodDays ? (
                    <Chip variant="flat" color="warning" size="sm" className="font-semibold text-xs border-1.5" radius="full">
                      {jobPreferences?.noticePeriodDays} Days Notice
                    </Chip>
                  ) : null}
                  {/* {profile?.visibility === 'public' ? (
                    <Chip variant="flat" color="default" size="sm" className="font-semibold text-xs border-1.5" radius="full">
                      Public Profile
                    </Chip>
                  ) : null} */}
                </div>
              </div>
            </div>

            {showMessageAction || hasApplication ? (
              <div className="flex flex-wrap items-start gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                {showMessageAction && (
                  <Tooltip content="Chat not available for this candidate" isDisabled={!isChatUnavailable} placement="bottom">
                    <span className="w-full sm:w-auto">
                      <Button
                        color="primary" radius="sm" size="sm"
                        className="w-full sm:w-auto font-semibold"
                        startContent={<MdOutlineMessage size={16} />}
                        isDisabled={isChatUnavailable || !profile?.userId} onPress={handleMessagePress}
                      >
                        {conversationThreadId ? 'Chat' : 'Message'}
                      </Button>
                    </span>
                  </Tooltip>
                )}

                {/* Other standard buttons */}
                {hasApplication && permissionUtils.hasPermission('applications:update') && canSelectOrReject && (
                  <>
                    <Button isLoading={loading} onPress={() => setConfirmation({ show: true, type: InterviewStatus.rejected })} color="danger" radius="sm" size="sm" className="w-full sm:w-auto font-semibold">
                      Reject
                    </Button>
                    <Button isLoading={loading} onPress={() => setConfirmation({ show: true, type: InterviewStatus.hired })} color="success" radius="sm" size="sm" className="w-full sm:w-auto text-white font-semibold">
                      Select
                    </Button>
                  </>
                )}

                {hasApplication && permissionUtils.hasPermission('applications:update') && applicationStatus === InterviewStatus.viewed && (
                  <Button isLoading={loading} onPress={() => setConfirmation({ show: true, type: InterviewStatus.shortlisted })} color="default" radius="sm" size="sm" className="w-full sm:w-auto font-semibold">
                    Shortlist
                  </Button>
                )}

                {hasApplication && permissionUtils.hasPermission('interviews:create') && ![
                  InterviewStatus.completed,
                  InterviewStatus.hired,
                  InterviewStatus.rejected,
                  InterviewStatus.withdrawn,
                  InterviewStatus.canceled,
                  InterviewStatus.interview_completed,
                  InterviewStatus.interview_cancelled,
                  'interview_completed'
                ].includes(applicationStatus as any) && (
                    <Button as={Link} href={routePaths.employee.jobs.scheduleInterview(applicationId || '')} color="primary" radius="sm" size="sm" className="w-full sm:w-auto font-semibold">
                      Schedule Interview
                    </Button>
                  )}

                {hasApplication && (
                  <Button as={Link} href={routePaths.employee.jobs.applicantTrack(applicationId || '', application?.candidateId || '')} color="success" radius="sm" size="sm" className="w-full sm:w-auto text-white font-semibold" startContent={<MdHistory size={16} />}>
                    Track
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          {hasSummary && (
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <MdOutlineTextSnippet className="text-lg" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Professional Summary</h3>
              </div>
              <p className="text-sm text-default-700 leading-relaxed whitespace-pre-wrap">
                {profile?.professionalSummary}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* About & Preferences */}
        <Card className="shadow-sm border border-default-100 bg-white p-2">
          <SectionHeader title="About & Preferences" status={hasJobPrefs ? 'Available' : 'Partial'} icon={MdOutlineTune} />
          <CardBody className="px-6 pb-6 pt-2">
            {!hasJobPrefs ? (
              <EmptyStateCard title="No preferences added" description="This candidate hasn't specified their job preferences yet." icon={MdOutlineTune} compact />
            ) : (
              <div className="flex flex-col text-sm max-h-[320px] overflow-y-auto pr-2 thin-scrollbar">
                {jobPreferences?.jobTypes && (
                  <div className="flex items-start justify-between py-3 border-b border-default-100 last:border-b-0">
                    <div className="flex items-center gap-2 w-1/2">
                      <MdWorkOutline className="text-default-400 text-lg shrink-0" />
                      <span className="text-default-500 font-semibold">Job Type</span>
                    </div>
                    <span className="text-default-900 font-medium w-1/2 capitalize">{jobPreferences?.jobTypes.replace(/_/g, ' ').replace(/,/g, ', ')}</span>
                  </div>
                )}
                {jobPreferences?.preferredLocations && (
                  <div className="flex items-start justify-between py-3 border-b border-default-100 last:border-b-0">
                    <div className="flex items-center gap-2 w-1/2">
                      <MdLocationOn className="text-default-400 text-lg shrink-0" />
                      <span className="text-default-500 font-semibold">Preferred Locations</span>
                    </div>
                    <span className="text-default-900 font-medium w-1/2 capitalize">{jobPreferences?.preferredLocations.replace(/,/g, ', ')}</span>
                  </div>
                )}
                {jobPreferences?.preferredIndustries && (
                  <div className="flex items-start justify-between py-3 border-b border-default-100 last:border-b-0">
                    <div className="flex items-center gap-2 w-1/2">
                      <MdOutlineBusiness className="text-default-400 text-lg shrink-0" />
                      <span className="text-default-500 font-semibold">Preferred Industries</span>
                    </div>
                    <span className="text-default-900 font-medium w-1/2 capitalize">{jobPreferences?.preferredIndustries.replace(/,/g, ', ')}</span>
                  </div>
                )}
                {jobPreferences?.workShift && (
                  <div className="flex items-start justify-between py-3 border-b border-default-100 last:border-b-0">
                    <div className="flex items-center gap-2 w-1/2">
                      <MdOutlineSchedule className="text-default-400 text-lg shrink-0" />
                      <span className="text-default-500 font-semibold">Work Shift</span>
                    </div>
                    <span className="text-default-900 font-medium w-1/2 capitalize">{jobPreferences?.workShift}</span>
                  </div>
                )}
                {jobPreferences?.willingToRelocate !== undefined && (
                  <div className="flex items-start justify-between py-3 border-b border-default-100 last:border-b-0">
                    <div className="flex items-center gap-2 w-1/2">
                      <MdOutlineCommute className="text-default-400 text-lg shrink-0" />
                      <span className="text-default-500 font-semibold">Willing to Relocate</span>
                    </div>
                    <span className="text-default-900 font-medium w-1/2">{jobPreferences?.willingToRelocate ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {jobPreferences?.expectedSalary && (
                  <div className="flex items-start justify-between py-3 border-b border-default-100 last:border-b-0">
                    <div className="flex items-center gap-2 w-1/2">
                      <MdOutlinePayments className="text-default-400 text-lg shrink-0" />
                      <span className="text-default-500 font-semibold">Expected Salary</span>
                    </div>
                    <span className="text-default-900 font-medium w-1/2">
                      {jobPreferences?.salaryCurrency} {jobPreferences?.expectedSalary} / {jobPreferences?.payRate}
                    </span>
                  </div>
                )}
                {jobPreferences?.jobSearchStatus && (
                  <div className="flex items-start justify-between py-3 border-b border-default-100 last:border-b-0">
                    <div className="flex items-center gap-2 w-1/2">
                      <MdOutlinePersonSearch className="text-default-400 text-lg shrink-0" />
                      <span className="text-default-500 font-semibold">Job Search Status</span>
                    </div>
                    <span className="text-default-900 font-medium w-1/2 capitalize">{jobPreferences?.jobSearchStatus?.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Work Experience */}
        <Card className="shadow-sm border border-default-100 bg-white p-2">
          <SectionHeader title="Work Experience" status={hasWorkExp ? 'Available' : 'Partial'} icon={MdWorkOutline} />
          <CardBody className="px-6 pb-6 pt-2">
            {!hasWorkExp ? (
              <EmptyStateCard title="No work experience" description="This candidate hasn't added any work experience details." icon={MdWorkOutline} compact />
            ) : (
              <div className="flex flex-col gap-6 max-h-[320px] overflow-y-auto pr-2 thin-scrollbar">
                {workExperiences.map((exp, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      {index !== workExperiences.length - 1 && <div className="w-[1.5px] h-full bg-default-200 mt-2" />}
                    </div>
                    <div className="flex flex-col w-full pb-2">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-primary">{exp.startDate ? dayjs(exp.startDate).format('MMM YYYY') : 'Past'} - {exp.endDate ? dayjs(exp.endDate).format('MMM YYYY') : (exp.isCurrent ? 'Present' : 'Past')}</span>
                        {exp.isCurrent && <Chip size="sm" color="success" variant="flat" className="font-semibold text-[10px]">Current</Chip>}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-10 h-10 rounded-lg bg-default-100 flex items-center justify-center shrink-0">
                          <span className="font-bold text-default-500 text-lg">{exp.companyName?.charAt(0) || 'C'}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-default-900 text-sm">{exp.companyName}</h3>
                          <p className="text-default-500 text-xs font-medium">{exp.jobTitle}</p>
                        </div>
                      </div>
                      {exp.description && (
                        <p className="text-default-500 text-xs mt-3 leading-relaxed">{exp.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Skills */}
        <Card className="shadow-sm border border-default-100 bg-white p-2">
          <SectionHeader title="Skills" status={hasSkills ? 'Available' : 'Partial'} icon={MdOutlineStar} />
          <CardBody className="px-6 pb-6 pt-2">
            {!hasSkills ? (
              <EmptyStateCard title="No skills added" description="This candidate hasn't added any skills to their profile yet." icon={MdOutlineStar} compact />
            ) : (
              <div className="flex flex-col gap-4 max-h-[320px] overflow-y-auto pr-2 thin-scrollbar">
                {skills.map((skill, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-sm text-default-900">{skill?.skillName}</span>
                      <span className="text-xs font-medium text-default-500 capitalize">{skill?.proficiencyLevel || 'Beginner'}</span>
                    </div>
                    <div className="w-full h-1.5 bg-default-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: skill?.proficiencyLevel === 'expert' ? '100%' : skill?.proficiencyLevel === 'intermediate' ? '50%' : '25%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Education */}
        <Card className="shadow-sm border border-default-100 bg-white p-2">
          <SectionHeader title="Education" status={hasEdu ? 'Available' : 'Not Added'} icon={MdSchool} />
          <CardBody className="px-6 pb-6 pt-2">
            {!hasEdu ? (
              <EmptyStateCard title="Education details not added" description="This candidate hasn't added any education details yet." icon={MdSchool} compact />
            ) : (
              <div className="flex flex-col gap-6 max-h-[320px] overflow-y-auto pr-2 thin-scrollbar">
                {educationRecords.map((edu, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      {index !== educationRecords.length - 1 && <div className="w-[1.5px] h-full bg-default-200 mt-2" />}
                    </div>
                    <div className="flex flex-col w-full pb-2">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-primary">{edu.startDate ? dayjs(edu.startDate).format('YYYY') : ''} - {edu.endDate ? dayjs(edu.endDate).format('YYYY') : (edu.currentlyStudying ? 'Present' : '')}</span>
                      </div>
                      <div className="flex items-start justify-between w-full mt-1">
                        <h3 className="font-bold text-default-900 text-sm pr-2 leading-tight">{edu.degree}</h3>
                        {edu.grade && (
                          <span className="text-default-500 font-semibold text-[11px] whitespace-nowrap bg-default-100 px-2 py-0.5 rounded-md">
                            Grade: {edu.grade}
                          </span>
                        )}
                      </div>
                      <p className="text-default-500 text-xs font-medium mt-1">{edu.institution}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Certifications */}
        <Card className="shadow-sm border border-default-100 bg-white p-2">
          <SectionHeader title="Certifications" status={hasCert ? 'Available' : 'Not Added'} icon={MdCardMembership} />
          <CardBody className="px-6 pb-6 pt-2">
            {!hasCert ? (
              <EmptyStateCard title="No certifications added" description="This candidate hasn't added any certifications yet." icon={MdCardMembership} compact />
            ) : (
              <div className="flex flex-col gap-4 max-h-[320px] overflow-y-auto pr-2 thin-scrollbar pt-2">
                {certifications.map((cert, index) => (
                  <div key={index} className="flex gap-4 items-start pb-4 border-b border-default-100 last:border-b-0 last:pb-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <MdCardMembership size={20} />
                    </div>
                    <div className="flex flex-col w-full">
                      <div className="flex items-start justify-between w-full">
                        <h3 className="font-bold text-default-900 text-sm pr-4 leading-tight">{cert.name}</h3>
                        {(cert.issueDate || cert.expiryDate) && (
                          <span className="text-default-500 font-semibold text-[11px] whitespace-nowrap bg-default-100 px-2 py-0.5 rounded-md">
                            {cert.issueDate ? dayjs(cert.issueDate).format('MMM YYYY') : 'Unknown'}
                            {cert.expiryDate ? ` - ${dayjs(cert.expiryDate).format('MMM YYYY')}` : ' - Present'}
                          </span>
                        )}
                      </div>
                      <p className="text-default-500 text-xs font-medium mt-1.5">{cert.issuingOrganization}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Resume */}
        <Card className="shadow-sm border border-default-100 bg-white p-2">
          <SectionHeader title="Resume" status={hasDownloadableResume ? 'Available' : 'Not Added'} icon={MdOutlineInsertDriveFile} />
          <CardBody className="px-6 pb-6 pt-2">
            {!hasDownloadableResume ? (
              <EmptyStateCard title="Resume not uploaded" description="This candidate hasn't uploaded their resume yet." icon={MdOutlineInsertDriveFile} compact />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="w-full bg-default-50 rounded-2xl flex items-center justify-center py-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-danger/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <FaFilePdf size={48} className="text-danger shadow-sm transition-transform group-hover:scale-110" />
                </div>
                <div className="flex items-center justify-between p-3 border border-default-200 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-danger-50 text-danger rounded-lg flex items-center justify-center">
                      <FaFilePdf size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-default-800 truncate max-w-[120px] sm:max-w-[150px]">
                        {resumeFileName}
                      </span>
                      <span className="text-[9px] text-default-400 font-bold uppercase tracking-wider mt-0.5">
                        {resumeMetaText}
                      </span>
                    </div>
                  </div>
                  <Button isIconOnly variant="flat" color="primary" size="sm" radius="lg" isLoading={loading} onPress={handleResumeDownload}>
                    <HiOutlineDownload size={18} />
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {videoResume?.url && (
        <Card className="shadow-sm border border-default-100 bg-white p-2">
          <SectionHeader title="Video Resume" />
          <CardBody className={videoResume?.status === VideoResumeStatus.rejected ? 'px-6 pb-6' : 'px-6 pb-6 h-[400px]'}>
            {videoResume?.status === VideoResumeStatus.rejected ? (
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

      {contactModalOpen && (
        <Modal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} size="lg">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">Contact Details</ModalHeader>
                <ModalBody className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar src={profile?.profilePhoto || undefined} name={profileName} radius="lg" className="h-16 w-16" />
                    <div>
                      <h3 className="text-lg font-bold text-default-900">{profileName}</h3>
                      <p className="text-sm text-default-500">{profile?.headline}</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-default-400">Email</p>
                      <p className="mt-1 text-sm font-semibold text-default-900">{profile?.email || 'Email not available'}</p>
                    </div>
                    <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-default-400">Phone</p>
                      <p className="mt-1 text-sm font-semibold text-default-900">{profile?.phone || 'Phone not available'}</p>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter className="flex flex-wrap gap-3">
                  <Button variant="light" onPress={onClose}>Close</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {confirmation.show && (
        <ConfirmationDialog
          title="Confirmation"
          isOpen={confirmation.show}
          onConfirm={handleChangeStatus}
          onClose={() => setConfirmation({ show: false, type: '' })}
          color={confirmation.type === InterviewStatus.rejected ? 'danger' : confirmation.type === InterviewStatus.hired ? 'success' : 'primary'}
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
