'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import routePaths from '@/app/config/routePaths';
import TrackTimeline from '@/app/components/application/TrackTimeline';
import withAuth from '@/app/hoc/withAuth';
import permissionUtils from '@/app/utils/permissionUtils';
import { InterviewStatus } from '@/app/types/enum';
import { IApplicationTrack } from '@/app/types/types';
import dayjs from 'dayjs';
import Link from 'next/link';
import { addToast, Button, Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { use, useEffect, useState } from 'react';
import { BsPlusCircleFill } from 'react-icons/bs';

const page = ({ params }: { params: Promise<{ id: string; applicantId: string }> }) => {
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<IApplicationTrack | null>(null);
  const [selectLoading, setSelectLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<{ show: boolean; type: string }>({
    show: false,
    type: '',
  });
  const canAddRound =
    permissionUtils.hasPermission('interviews:create') &&
    [
      InterviewStatus.interview_scheduled,
      InterviewStatus.interview_rescheduled,
      InterviewStatus.completed,
      InterviewStatus.interview_completed,
    ].includes(application?.currentStatus as InterviewStatus);
  const canSelect =
    permissionUtils.hasPermission('applications:update') &&
    [InterviewStatus.completed, InterviewStatus.interview_completed].includes(
      application?.currentStatus as InterviewStatus,
    );

  const getTimeline = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.GET_HISTORY(id!));
      setApplication(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async () => {
    if (selectLoading) return;

    try {
      setSelectLoading(true);

      await http.put(ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE_STATUS(application?.applicationId || id), {
        status: confirmation.type,
      });

      addToast({
        title: 'Success',
        color: 'success',
        description: 'Application status updated successfully',
      });

      setConfirmation({ show: false, type: '' });
      getTimeline();
    } catch (error) {
      console.log(error);
    } finally {
      setSelectLoading(false);
    }
  };

  useEffect(() => {
    getTimeline();
  }, []);

  return (
    <>
      <title>{application?.jobTitle || 'Track Application'}</title>

      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="container mx-auto p-4">
          <div className="flex flex-col gap-6 mb-8">
            <BackButton showLabel />
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                Application Timeline
              </h1>
              <p className="text-default-500 font-medium">
                Activity for this application to{' '}
                <span className="text-primary">{application?.jobTitle}</span>
              </p>
            </div>
          </div>

          <Card className="shadow-2xl border-none bg-background/60 backdrop-blur-md">
            <CardHeader className="flex items-start justify-between gap-4 px-8 pt-8">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">Application Status</h2>
                <p className="text-default-400 text-sm">
                  Last updated on{' '}
                  {application?.appliedAt
                    ? dayjs(application.appliedAt).format('MMMM D, YYYY')
                  : 'N/A'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {canSelect ? (
                  <Button
                    isLoading={selectLoading}
                    onPress={() =>
                      setConfirmation({
                        show: true,
                        type: InterviewStatus.hired,
                      })
                    }
                    color="success"
                    radius="sm"
                    size="md"
                    className="font-medium text-white"
                  >
                    Select
                  </Button>
                ) : null}

                {canAddRound ? (
                  <Button
                    as={Link}
                    href={routePaths.employee.jobs.scheduleInterview(application?.applicationId || id)}
                    color="primary"
                    radius="sm"
                    size="md"
                    className="shrink-0 font-medium"
                    startContent={<BsPlusCircleFill className="text-sm" />}
                  >
                    Add Round
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <Divider className="my-2 mx-8 w-[calc(100%-64px)]" />
            <CardBody className="px-4 py-6">
              {application?.timeline && <TrackTimeline timeline={application.timeline} />}
            </CardBody>
          </Card>
        </div>
      )}

      {confirmation.show && (
        <ConfirmationDialog
          title="Confirmation"
          isOpen={confirmation.show}
          onConfirm={handleChangeStatus}
          onClose={() => setConfirmation({ show: false, type: '' })}
          color="success"
          message="Are you sure you want to select this candidate?"
        />
      )}
    </>
  );
};

export default withAuth(page);
