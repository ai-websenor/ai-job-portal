'use client';

import { useEffect, useRef, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { HiOutlineDocumentText } from 'react-icons/hi';

type Props = {
  jobId: string;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
  onInvalidResume?: () => void;
};

const POLL_INTERVAL = 2000;
const MAX_POLLS = 90; // 3 minutes max

const STATUS_STEPS: Record<
  string,
  { step: number; total: number; label: string; subtext: string }
> = {
  queued: {
    step: 1,
    total: 5,
    label: 'Preparing your resume...',
    subtext: 'This will only take a moment',
  },
  extracting: {
    step: 2,
    total: 5,
    label: 'Reading your document...',
    subtext: 'Scanning pages for details',
  },
  estimating: {
    step: 2,
    total: 5,
    label: 'Understanding the content...',
    subtext: 'Identifying key sections',
  },
  chunking: {
    step: 3,
    total: 5,
    label: 'Extracting your details...',
    subtext: 'Pulling out experience, skills & education',
  },
  merging: {
    step: 4,
    total: 5,
    label: 'Putting it all together...',
    subtext: 'Almost there — organizing your profile',
  },
  done: { step: 5, total: 5, label: 'All done!', subtext: 'Your profile is ready to review' },
};

// Rotating reassurance messages shown during slower middle steps
const PATIENCE_MESSAGES = [
  'Hang tight, we are being thorough',
  'Making sure nothing is missed',
  'Still working, detailed resumes take a bit longer',
  'Carefully reading each section',
  'Great resume! Just a few more seconds',
];

const ResumeParseProgress = ({ jobId, onComplete, onError, onInvalidResume }: Props) => {
  const [status, setStatus] = useState('queued');
  const [chunkProgress, setChunkProgress] = useState({ done: 0, total: 0 });
  const [patienceIdx, setPatienceIdx] = useState(0);
  const pollCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      pollCount.current += 1;

      if (pollCount.current > MAX_POLLS) {
        clearInterval(intervalRef.current!);
        onError('Parsing timed out. Please try again.');
        return;
      }

      try {
        const response = await http.get(ENDPOINTS.AI.PARSE_STATUS(jobId));
        const data = response?.data ?? response;
        const jobStatus = data?.status || 'queued';

        setStatus(jobStatus);

        const chunksTotal = data?.progress?.chunks_total ?? data?.chunks_total ?? null;
        const chunksDone = data?.progress?.chunks_done ?? data?.chunks_done ?? null;

        if (chunksDone != null && chunksTotal != null) {
          setChunkProgress({ done: chunksDone, total: chunksTotal });
        }

        // If AI determined 0 sections, the file is likely not a resume
        if (chunksTotal === 0 && ['estimating', 'chunking', 'done'].includes(jobStatus)) {
          clearInterval(intervalRef.current!);
          onInvalidResume?.();
          return;
        }

        if (jobStatus === 'done') {
          clearInterval(intervalRef.current!);
          onComplete(data.result);
        } else if (jobStatus === 'error') {
          clearInterval(intervalRef.current!);
          onError(data.error || 'Parsing failed. Please try a different file.');
        }
      } catch {
        // Network hiccup — keep polling
      }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    poll();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, onComplete, onError, onInvalidResume]);

  // Rotate patience messages every 4 seconds during slower steps
  useEffect(() => {
    if (status !== 'chunking' && status !== 'extracting' && status !== 'estimating') return;
    const timer = setInterval(() => {
      setPatienceIdx((i) => (i + 1) % PATIENCE_MESSAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [status]);

  const info = STATUS_STEPS[status] || STATUS_STEPS.queued;
  const progressPct = Math.min((info.step / info.total) * 100, 100);
  const isSlowStep = status === 'chunking' || status === 'extracting' || status === 'estimating';

  return (
    <div className="flex items-center justify-center min-h-[60vh] pt-[25px] w-full">
      <div className="flex flex-col items-center gap-5 w-full max-w-md">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
          <HiOutlineDocumentText className="text-primary animate-pulse" size={32} />
        </div>

        {/* Main label */}
        <div className="text-center">
          <p className="text-base font-semibold text-gray-800">{info.label}</p>
          <p className="text-sm text-gray-400 mt-1">{info.subtext}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">
              Step {info.step} of 6
              {status === 'chunking' && chunkProgress.total > 0
                ? ` · ${chunkProgress.done}/${chunkProgress.total} sections`
                : ''}
            </span>
            <span className="text-xs text-gray-400">{Math.round(progressPct)}%</span>
          </div>
        </div>

        {/* Rotating patience message during slower steps */}
        {isSlowStep && (
          <p className="text-xs text-gray-400 animate-pulse transition-all duration-500">
            {PATIENCE_MESSAGES[patienceIdx]}
          </p>
        )}
      </div>
    </div>
  );
};

export default ResumeParseProgress;
