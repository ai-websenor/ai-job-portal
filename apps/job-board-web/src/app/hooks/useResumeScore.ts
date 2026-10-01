'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useResumeScoreStore from '@/app/store/useResumeScoreStore';
import type { ResumeScoreResult } from '@/app/types/resumeScore';

/**
 * Loads and refreshes the candidate's resume score for one job.
 *
 * Two calls, deliberately different in cost:
 *  - `GET /ai/resume-score/latest` — reads the cached row, no GPU work.
 *  - `POST /ai/resume-score` on demand — runs the checks and burns a model slot,
 *    so it only ever happens when the candidate asks for it.
 *
 * The cached read is deliberately NOT done on mount. The widget renders nothing
 * until someone opens it, so a mount fetch showed no one anything — while still
 * hitting the AI engine on every job-page view, and `http` toasts a visible
 * error when that engine is down. It now runs the first time the widget is
 * actually opened.
 *
 * The result lives in `useResumeScoreStore`, not in local state, so it survives
 * the trip to `/profile?tab=3` and back.
 */
const useResumeScore = (jobId: string) => {
  const result = useResumeScoreStore((state) => state.result);
  const status = useResumeScoreStore((state) => state.status);
  const setResult = useResumeScoreStore((state) => state.setResult);
  const syncJob = useResumeScoreStore((state) => state.syncJob);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow reply from a previous job overwriting a newer one.
  const requestId = useRef(0);

  const hasToken = () => (typeof window !== 'undefined' ? !!localStorage.getItem('token') : false);

  const loadLatest = useCallback(async () => {
    if (!jobId || !hasToken()) return;

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const response = await http.get(
        `${ENDPOINTS.AI.RESUME_SCORE_LATEST}?job_id=${encodeURIComponent(jobId)}`,
      );
      if (currentRequest !== requestId.current) return;
      setResult((response?.data as ResumeScoreResult) ?? { status: 'not_scored' });
    } catch {
      if (currentRequest !== requestId.current) return;
      // No cached score is the normal case, not a failure. Fall through to the
      // "check my resume" call to action rather than an error screen. (`http`
      // has already toasted anything that was a genuine server problem.)
      setResult({ status: 'not_scored' });
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [jobId, setResult]);

  const score = useCallback(
    async (force: boolean) => {
      if (!jobId) return;

      const currentRequest = ++requestId.current;
      setLoading(true);
      setError(null);

      try {
        const response = await http.post(ENDPOINTS.AI.RESUME_SCORE, {
          job_id: jobId,
          force,
        });
        if (currentRequest !== requestId.current) return;

        if (response?.data) {
          setResult(response.data as ResumeScoreResult);
        } else {
          setError('We could not read the result. Please try again.');
        }
      } catch (err) {
        if (currentRequest !== requestId.current) return;
        const message = (err as { message?: string })?.message;
        setError(message || 'We could not check your resume just now. Please try again.');
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [jobId, setResult],
  );

  /** Score this resume against this job for the first time. */
  const check = useCallback(() => score(false), [score]);

  /** Re-run the checks after the candidate has edited their profile. */
  const refresh = useCallback(() => score(true), [score]);

  useEffect(() => {
    if (!jobId) return;
    // Drop anything held for a different job before the cached read lands.
    syncJob(jobId);
  }, [jobId, syncJob]);

  useEffect(() => {
    // Only once the candidate has actually opened the widget, and only when we
    // are not already holding a result for this job.
    if (!jobId || status === 'closed' || result) return;
    loadLatest();
  }, [jobId, status, result, loadLatest]);

  return { data: result, loading, error, check, refresh } as const;
};

export default useResumeScore;
