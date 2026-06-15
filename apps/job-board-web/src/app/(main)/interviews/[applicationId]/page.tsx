'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import InterviewRoundsTimeline from '@/app/components/interviews/InterviewRoundsTimeline';
import withCandidateAuth from '@/app/hoc/withCandidateAuth';
import routePaths from '@/app/config/routePaths';
import { IInterviewRoundsResponse } from '@/app/types/types';
import { Button, Card, CardBody, CardHeader, Skeleton } from '@heroui/react';
import Link from 'next/link';
import { use } from 'react';
import { useEffect, useState } from 'react';

const RoundsSkeleton = () => (
  <div className="space-y-6">
    <Card className="border border-gray-100 bg-white shadow-sm">
      <CardHeader className="flex items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-56 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </CardHeader>
    </Card>

    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Card className="flex-1 border border-gray-100 bg-white shadow-sm">
            <CardBody className="space-y-3 p-5">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-52 rounded" />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-4 rounded" />
              </div>
            </CardBody>
          </Card>
        </div>
      ))}
    </div>
  </div>
);

const Page = ({ params }: { params: Promise<{ applicationId: string }> }) => {
  const { applicationId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [data, setData] = useState<IInterviewRoundsResponse | null>(null);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await http.get(ENDPOINTS.INTERVIEWS.ROUNDS(applicationId));
      setData(response?.data || null);
    } catch (err: any) {
      setData(null);
      setError({
        status: err?.statusCode || err?.status || err?.response?.status,
        message: err?.message || err?.data?.message || 'Could not load interview rounds',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, [applicationId]);

  const renderError = () => {
    const status = error?.status;
    const message =
      status === 403
        ? "You don't have access to this."
        : status === 404
          ? 'Application not found.'
          : error?.message || 'Could not load interview rounds.';

    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">Unable to load rounds</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
        <Button
          color="primary"
          variant="flat"
          className="mt-6 font-semibold"
          as={Link}
          href={routePaths.interviews.list}
        >
          Back to interviews
        </Button>
      </div>
    );
  };

  return (
    <>
      <title>{data?.application?.jobTitle || 'Interview Rounds'}</title>
      <div className="container mx-auto w-full px-4 py-6">
        <div className="mb-5 flex flex-col gap-2">
          <BackButton showLabel path={routePaths.interviews.list} />
          <h1 className="text-2xl font-bold text-gray-950">Interview Rounds</h1>
        </div>

        {loading ? (
          <RoundsSkeleton />
        ) : error ? (
          renderError()
        ) : data ? (
          <InterviewRoundsTimeline data={data} />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
            No interviews scheduled yet for this application.
          </div>
        )}
      </div>
    </>
  );
};

export default withCandidateAuth(Page);
