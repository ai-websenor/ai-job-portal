'use client';

import { useEffect, useRef, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

type Props = {
  jobId: string;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
};

const POLL_INTERVAL = 2000;
const MAX_POLLS = 90; // 3 minutes max

const STATUS_STEPS: Record<string, { step: number; total: number; label: string }> = {
  queued: { step: 1, total: 5, label: 'Starting...' },
  extracting: { step: 2, total: 5, label: 'Reading document...' },
  estimating: { step: 2, total: 5, label: 'Analyzing content...' },
  chunking: { step: 3, total: 5, label: 'Extracting details...' },
  merging: { step: 4, total: 5, label: 'Finalizing...' },
  done: { step: 5, total: 5, label: 'Complete!' },
};

const ResumeParseProgress = ({ jobId, onComplete, onError }: Props) => {
  const [status, setStatus] = useState('queued');
  const [chunkProgress, setChunkProgress] = useState('');
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

        if (data?.chunks_done != null && data?.chunks_total) {
          setChunkProgress(`${data.chunks_done}/${data.chunks_total} sections`);
        }

        if (jobStatus === 'done') {
          clearInterval(intervalRef.current!);
          onComplete(data.result);
        } else if (jobStatus === 'error') {
          clearInterval(intervalRef.current!);
          onError(data.error || 'Parsing failed. Please try a different file.');
        }
      } catch {
        // Network hiccup — keep polling, don't fail immediately
      }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    poll(); // immediate first poll

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, onComplete, onError]);

  const info = STATUS_STEPS[status] || STATUS_STEPS.queued;
  const progressPct = (info.step / info.total) * 100;

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-full max-w-sm">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-gray-600">
            {info.label}
            {status === 'chunking' && chunkProgress ? ` (${chunkProgress})` : ''}
          </span>
          <span className="text-sm text-gray-400">
            {info.step}/{info.total}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400">Analyzing your resume with AI...</p>
    </div>
  );
};

export default ResumeParseProgress;
