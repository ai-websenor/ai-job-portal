'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import { PlanUsage } from '@/app/types/types';
import { useEffect, useState } from 'react';

const page = () => {
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<PlanUsage | null>(null);

  const getUsage = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.SUBSCRIPTIONS.USAGE);
      if (response?.data) {
        setUsage(response);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUsage();
  }, [page]);

  return (
    <>
      <title>Usage</title>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <BackButton showLabel />
        <h1 className="text-2xl font-bold mt-1 mb-6">Usage</h1>

        {loading ? <LoadingProgress /> : <div></div>}
      </div>
    </>
  );
};

export default withAuth(page);
