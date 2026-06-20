'use client';

import { useCallback, useEffect, useState } from 'react';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import type { Alert, AlertListResponse } from '@/app/types/alerts';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';

const POLL_MS = 5 * 60 * 1000;

const useAlerts = (limit: number | null = 4) => {
  const { user } = useUserStore();
  const [interviewAlerts, setInterviewAlerts] = useState<Alert[]>([]);
  const [subscriptionAlerts, setSubscriptionAlerts] = useState<Alert[]>([]);
  const [interviewCount, setInterviewCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const canLoadSubscriptionAlerts =
    user?.role === Roles.employer || user?.role === Roles.super_employer;

  const buildUrl = useCallback(
    (endpoint: string) => {
      if (typeof limit === 'number' && Number.isFinite(limit)) {
        return `${endpoint}?limit=${limit}`;
      }

      return endpoint;
    },
    [limit],
  );

  const fetchFeed = useCallback(
    async (endpoint: string) => {
      try {
        return (await http.get(buildUrl(endpoint))) as AlertListResponse;
      } catch {
        return null;
      }
    },
    [buildUrl],
  );

  const load = useCallback(async () => {
    try {
      const [interviewData, subscriptionData] = await Promise.all([
        fetchFeed(ENDPOINTS.ALERTS.INTERVIEWS),
        canLoadSubscriptionAlerts ? fetchFeed(ENDPOINTS.ALERTS.SUBSCRIPTION) : Promise.resolve(null),
      ]);

      setInterviewAlerts(interviewData?.data?.alerts ?? []);
      setInterviewCount(interviewData?.data?.count ?? 0);
      setSubscriptionAlerts(subscriptionData?.data?.alerts ?? []);
      setSubscriptionCount(subscriptionData?.data?.count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [canLoadSubscriptionAlerts, fetchFeed]);

  useEffect(() => {
    load();

    const intervalId = window.setInterval(load, POLL_MS);
    const handleFocus = () => load();

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [load]);

  return {
    interviewAlerts,
    interviewCount,
    subscriptionAlerts,
    subscriptionCount,
    loading,
    reload: load,
  } as const;
};

export default useAlerts;
