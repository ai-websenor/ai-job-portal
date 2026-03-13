'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import InterviewListTable from './InterviewListTable';

const page = () => {
  return (
    <>
      <title>Upcoming Interviews</title>
      <div className="container mx-auto p-6 w-full">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Upcoming Interviews</h1>
        </div>

        <InterviewListTable />
      </div>
    </>
  );
};

export default withAuth(page);
