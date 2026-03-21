'use client';

import { Card, CardHeader, CardBody, Button, Avatar, addToast } from '@heroui/react';
import { FaFilePdf } from 'react-icons/fa';
import { HiOutlineDownload } from 'react-icons/hi';
import Link from 'next/link';
import routePaths from '@/app/config/routePaths';
import {
  IApplication,
  IEducationRecord,
  IProfileSkill,
  IUser,
  IWorkExperience,
} from '@/app/types/types';
import dayjs from 'dayjs';
import { useState } from 'react';
import { InterviewStatus } from '@/app/types/enum';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { useRouter } from 'next/navigation';
import permissionUtils from '@/app/utils/permissionUtils';
import CreateChatDialog from '@/app/components/dialogs/CreateChatDialog';

type Props = {
  profile: IUser;
  skills: IProfileSkill[];
  application: IApplication;
  workExperiences: IWorkExperience[];
  educationRecords: IEducationRecord[];
};

const ApplicantDetails = ({
  application,
  profile,
  educationRecords,
  skills,
  workExperiences,
}: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState({ show: false, type: '' });

  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    data: {
      recipientId: '',
      applicationId: '',
      companyName: '',
    },
  });

  const handleChangeStatus = async () => {
    try {
      setLoading(true);

      await http.put(
        ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE_STATUS((application as any).applicationId),
        {
          status: confirmation.type,
        },
      );

      addToast({
        title: 'Success',
        color: 'success',
        description: 'Application status updated successfully',
      });

      router.push(
        confirmation.type === InterviewStatus.shortlisted
          ? routePaths.employee.allApplications
          : routePaths.employee.jobs.applications(application.jobId),
      );
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDownload = async () => {
    try {
      setLoading(true);
      const response = await http.get(
        ENDPOINTS.EMPLOYER.APPLICATIONS.DOWNLOAD_RESUME((application as any)?.applicationId),
      );
      if (response?.data?.url) {
        window.open(response?.data?.url, '_blank');
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
              src={profile?.profilePhoto}
              name={`${profile?.firstName} ${profile?.lastName}`}
              className="w-24 h-24 text-large"
              radius="lg"
              isBordered
              color="primary"
            />
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-default-900">
                {profile?.firstName} {profile?.lastName}
              </h1>
              <p className="text-default-500 max-w-2xl leading-relaxed text-xs">{profile?.email}</p>
              <p className="text-default-500 max-w-2xl leading-relaxed">{profile?.headline}</p>
            </div>
          </div>

          {permissionUtils.hasPermission('applications:update') && (
            <div className="flex sm:flex-row flex-col items-center gap-3 sm:w-fit w-full">
              <Button
                color="primary"
                radius="lg"
                size="sm"
                className="sm:w-fit w-full"
                onPress={() =>
                  setMessageModal({
                    isOpen: true,
                    data: {
                      applicationId: (application as any)?.applicationId,
                      companyName: `${profile.firstName} ${profile?.lastName}`,
                      recipientId: workExperiences?.[0]?.profileId,
                    },
                  })
                }
              >
                Chat
              </Button>

              {(application?.status === InterviewStatus.viewed ||
                application.status === InterviewStatus.interview_scheduled ||
                application?.status === InterviewStatus.shortlisted) && (
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

              {(application?.status === InterviewStatus.viewed ||
                application.status === InterviewStatus.interview_scheduled ||
                application?.status === InterviewStatus.shortlisted) && (
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
              )}

              {application?.status === InterviewStatus.viewed && (
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

              {permissionUtils.hasPermission('interviews:create') && (
                <Button
                  as={Link}
                  href={routePaths.employee.jobs.scheduleInterview(
                    (application as any)?.applicationId,
                  )}
                  color="primary"
                  radius="lg"
                  size="sm"
                  className="sm:w-fit w-full"
                >
                  Schedule Interview
                </Button>
              )}
            </div>
          )}
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
                    {application?.resumeUrl?.split('/')?.pop()}
                  </span>
                  <span className="text-[11px] text-default-400 font-bold uppercase tracking-wider">
                    {dayjs(application?.appliedAt).format('DD MMM, YYYY')} PDF
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
                onPress={handleResumeDownload}
              >
                <HiOutlineDownload size={22} />
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

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
            confirmation.type === InterviewStatus.rejected
              ? 'Are you sure you want to reject this application?'
              : confirmation.type === InterviewStatus.hired
                ? 'Are you sure you want to select this candidate?'
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
              data: { recipientId: '', applicationId: '', companyName: '' },
            })
          }
        />
      )}
    </div>
  );
};

export default ApplicantDetails;
