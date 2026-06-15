'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import NoDataFound from '@/app/components/lib/NoDataFound';
import InterviewRoundsTimeline from '@/app/components/interviews/InterviewRoundsTimeline';
import withAuth from '@/app/hoc/withAuth';
import {
  InterviewDetails as InterviewDetailsType,
  IInterviewRoundsResponse,
} from '@/app/types/types';
import { use } from 'react';
import { useEffect, useState } from 'react';
import InterviewDetails from './InterviewDetails';

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<InterviewDetailsType | null>(null);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [rounds, setRounds] = useState<IInterviewRoundsResponse | null>(null);

  const getRounds = async (applicationId: string) => {
    try {
      setRoundsLoading(true);
      const res = await http.get(ENDPOINTS.EMPLOYER.INTERVIEWS.ROUNDS(applicationId));
      setRounds(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setRoundsLoading(false);
    }
  };

  const loadInterview = async () => {
    try {
      setLoading(true);
      const res = await http.get(ENDPOINTS.EMPLOYER.INTERVIEWS.DETAILS(id));
      setInterview(res.data);
      if (res.data?.applicationId) {
        await getRounds(res.data.applicationId);
      } else {
        setRounds(null);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterview();
  }, []);

  return (
    <>
      <title>Interview</title>
      <div className="container mx-auto px-4 my-6 md:my-10 relative">
        <div className="flex flex-col gap-2 mb-5">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Interview Details</h1>
        </div>
        {loading ? (
          <LoadingProgress />
        ) : interview ? (
          <div className="space-y-8">
            <InterviewDetails interview={interview!} refetch={loadInterview} />
            {roundsLoading ? (
              <LoadingProgress />
            ) : rounds ? (
              <InterviewRoundsTimeline data={rounds} currentInterviewId={interview.id} />
            ) : null}
          </div>
        ) : (
          <NoDataFound />
        )}
      </div>
    </>
  );
};

export default withAuth(page);
