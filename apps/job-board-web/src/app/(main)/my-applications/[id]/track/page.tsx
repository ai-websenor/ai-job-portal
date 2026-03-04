'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import { IApplicationTrack } from '@/app/types/types';
import { use, useEffect, useState } from 'react';
import dayjs from 'dayjs';

import TrackTimeline from '@/app/components/application/TrackTimeline';
import { Card, CardBody, CardHeader, Divider } from '@heroui/react';

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<IApplicationTrack | null>(null);

  const getTimeline = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.APPLICATIONS.GET_HISTORY(id!));
      setApplication(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
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
                Track Application
              </h1>
              <p className="text-default-500 font-medium">
                Real-time updates for your application to{' '}
                <span className="text-primary">{application?.jobTitle}</span>
              </p>
            </div>
          </div>

          <Card className="shadow-2xl border-none bg-background/60 backdrop-blur-md">
            <CardHeader className="flex flex-col gap-1 px-8 pt-8 items-start">
              <h2 className="text-xl font-bold">Application Status</h2>
              <p className="text-default-400 text-sm">
                Last updated on{' '}
                {application?.appliedAt
                  ? dayjs(application.appliedAt).format('MMMM D, YYYY')
                  : 'N/A'}
              </p>
            </CardHeader>
            <Divider className="my-2 mx-8 w-[calc(100%-64px)]" />
            <CardBody className="px-4 py-6">
              {application?.timeline && (
                <TrackTimeline
                  timeline={application.timeline}
                  currentStatus={application.currentStatus}
                />
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
};

export default withAuth(page);
