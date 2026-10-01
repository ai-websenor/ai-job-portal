import { create } from 'zustand';
import type { ResumeScoreResult } from '../types/resumeScore';

/**
 * Window state for the Resume Health Check panel.
 *
 * Deliberately NOT wrapped in `persist`. The whole point of "minimise" is that
 * the candidate can jump to `/profile?tab=3`, edit their skills and come back
 * to the job page with the panel still holding their score — that survives a
 * client-side route change because this module stays in memory. A full page
 * reload is a fresh start, which is what we want: a score is only meaningful
 * for as long as the profile behind it is unchanged.
 */
export type ResumeScoreWindowStatus = 'closed' | 'open' | 'minimised';

interface ResumeScoreState {
  status: ResumeScoreWindowStatus;
  /** The job the held result belongs to. */
  jobId: string | null;
  result: ResumeScoreResult | null;

  /** Open the panel. Pass a job id when opening from a job page. */
  open: (jobId?: string) => void;
  /** Collapse to the floating bubble. Keeps the result. */
  minimise: () => void;
  /** Dismiss for this session. Keeps the result so re-opening is instant. */
  close: () => void;
  setResult: (result: ResumeScoreResult | null) => void;
  /**
   * Point the store at a job. A different job means a different score, so the
   * held result is dropped and the window goes back to closed. Called by the
   * hook before it loads, so a stale score can never be shown against the
   * wrong job.
   */
  syncJob: (jobId: string) => void;
  reset: () => void;
}

const initialState = {
  status: 'closed' as ResumeScoreWindowStatus,
  jobId: null as string | null,
  result: null as ResumeScoreResult | null,
};

const useResumeScoreStore = create<ResumeScoreState>((set) => ({
  ...initialState,

  open: (jobId) =>
    set((state) => {
      if (jobId && jobId !== state.jobId) {
        return { status: 'open', jobId, result: null };
      }
      return { status: 'open' };
    }),

  minimise: () => set({ status: 'minimised' }),

  close: () => set({ status: 'closed' }),

  setResult: (result) => set({ result }),

  syncJob: (jobId) => set((state) => (state.jobId === jobId ? state : { ...initialState, jobId })),

  reset: () => set({ ...initialState }),
}));

export default useResumeScoreStore;
