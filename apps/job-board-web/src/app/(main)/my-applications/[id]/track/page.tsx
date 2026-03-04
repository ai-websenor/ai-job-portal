'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import { IApplicationTrack } from '@/app/types/types';
import { use, useEffect, useState } from 'react';

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
      <title>{application?.jobTitle}</title>

      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="container mx-auto p-6">
          <div className="flex flex-col gap-2 mb-6">
            <BackButton showLabel />
            <h1 className="text-2xl font-bold text-foreground">
              {application?.jobTitle || 'Application'}
            </h1>
          </div>
        </div>
      )}
    </>
  );
};

export default withAuth(page);
