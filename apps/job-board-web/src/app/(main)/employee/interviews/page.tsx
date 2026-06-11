'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import { useSearchParams } from 'next/navigation';
import InterviewListTable from './InterviewListTable';

const page = () => {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  return (
    <>
      <title>Interviews</title>
      <div className="container mx-auto p-6 w-full">
        <div className="flex flex-col gap-2">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Interviews</h1>
        </div>
        <InterviewListTable initialFilters={status === 'scheduled' ? { status } : undefined} />
      </div>
    </>
  );
};

export default withAuth(page);
