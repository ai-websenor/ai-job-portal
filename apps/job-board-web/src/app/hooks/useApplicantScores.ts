'use client';

import { useCallback, useEffect, useState } from 'react';
import ENDPOINTS from '../api/endpoints';
import http from '../api/http';
import { ApplicantScoreSummary, ApplicantScoresResponse } from '../types/applicantScore';

/**
 * Fetches every applicant's match score for one job in a SINGLE request.
 *
 * The applicant list renders a card per applicant, so the obvious-but-wrong
 * shape here is one request per card. The backend does the whole job in one
 * pass, so we ask once and index the answer by application id.
 */
const useApplicantScores = (jobId?: string) => {
  const [scores, setScores] = useState<Record<string, ApplicantScoreSummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getScores = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      setError(null);

      // `http` unwraps axios to the API envelope, so the body sits on `.data`.
      const response = (await http.post(ENDPOINTS.AI.APPLICANT_SCORES, {
        jobId,
      })) as unknown as { data?: ApplicantScoresResponse };

      setScores(response?.data?.scores ?? {});
    } catch (err) {
      // `http` already toasts the failure, so this only drives the quiet
      // in-page fallback — the list itself must still render without scores.
      console.log('Error fetching applicant scores:', err);
      setScores({});
      setError('Match scores could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    getScores();
  }, [getScores]);

  return { scores, loading, error, refetch: getScores } as const;
};

export default useApplicantScores;
