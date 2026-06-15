'use client';

import { useCallback, useEffect, useState } from 'react';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import type { Alert, AlertListResponse } from '@/app/types/alerts';

const POLL_MS = 5 * 60 * 1000;

const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = (await http.get(ENDPOINTS.ALERTS.LIST)) as AlertListResponse;
      setAlerts(response?.data?.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return { alerts, loading, reload: load } as const;
};

export default useAlerts;
