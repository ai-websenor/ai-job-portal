'use client';

import { useCallback, useEffect, useState } from 'react';
import { addToast } from '@heroui/react';
import FileUploader from '@/app/components/form/FileUploader';
import Resumes from './steps/Resumes';
import ResumeParseProgress from './ResumeParseProgress';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const STORAGE_KEY = 'resume_parse_job';
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

type Props = {
  errors: any;
  watchedValues: any;
  refetch?: () => void;
  setLoading: (val: boolean) => void;
  onStructuredData?: (data: any) => void;
};

type StoredJob = {
  jobId: string;
  fileName: string;
  fileSize: number;
  timestamp: number;
};

function getStoredJob(): StoredJob | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredJob;
    // Discard stale jobs (>5 min old)
    if (Date.now() - parsed.timestamp > STALE_THRESHOLD_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const OnboardingResume = ({
  setLoading,
  refetch,
  errors,
  watchedValues,
  onStructuredData,
}: Props) => {
  const [parsingJobId, setParsingJobId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; size: number } | null>(null);

  // Restore active parse job from localStorage on mount
  useEffect(() => {
    const stored = getStoredJob();
    if (stored) {
      setParsingJobId(stored.jobId);
      setPendingFile({ name: stored.fileName, size: stored.fileSize });
    }
  }, []);

  const handleChangeFile = async (file: File) => {
    if (!file?.name) return;
    try {
      // Send file directly to AI service for parsing + S3 upload
      const payload = new FormData();
      payload.append('file', file);
      const response = await http.post(ENDPOINTS.AI.PARSE, payload);
      const jobId = response?.data?.job_id ?? response?.job_id;

      if (!jobId) {
        addToast({ color: 'danger', title: 'Upload Failed', description: 'No job ID received.' });
        return;
      }

      // Persist job to localStorage for page-refresh resilience
      const jobInfo: StoredJob = {
        jobId,
        fileName: file.name,
        fileSize: file.size,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobInfo));

      setPendingFile({ name: file.name, size: file.size });
      setParsingJobId(jobId);
    } catch (error) {
      console.debug('[OnboardingResume] Upload error:', error);
      addToast({
        color: 'danger',
        title: 'Upload Failed',
        description: 'Could not start resume parsing. Please try again.',
      });
    }
  };

  const handleParseComplete = useCallback(
    async (result: any) => {
      localStorage.removeItem(STORAGE_KEY);

      // Register the resume DB record via user-service (file already in S3)
      if (result?.s3_key && result?.s3_url && pendingFile) {
        try {
          await http.post(ENDPOINTS.CANDIDATE.REGISTER_RESUME, {
            s3Key: result.s3_key,
            s3Url: result.s3_url,
            fileName: pendingFile.name,
            fileSize: pendingFile.size,
            fileType: 'pdf',
          });
        } catch (e) {
          console.debug('[OnboardingResume] Register resume error:', e);
        }
      }

      // Pass parsed data upstream — handleDataExtracted will prefill the form
      onStructuredData?.(result);
      refetch?.();
      setParsingJobId(null);
      setPendingFile(null);
    },
    [onStructuredData, refetch, pendingFile],
  );

  const handleParseError = useCallback(
    (error: string) => {
      localStorage.removeItem(STORAGE_KEY);
      setParsingJobId(null);
      setPendingFile(null);
      addToast({ color: 'danger', title: 'Parsing Failed', description: error });
    },
    [],
  );

  // Show progress UI while parsing
  if (parsingJobId) {
    return (
      <ResumeParseProgress
        jobId={parsingJobId}
        onComplete={handleParseComplete}
        onError={handleParseError}
      />
    );
  }

  // Show existing resumes if available
  if (watchedValues?.resumes?.length > 0) {
    return <Resumes resumes={watchedValues?.resumes} refetch={refetch} isDeletable />;
  }

  // Show file uploader
  return (
    <>
      <FileUploader accept="application/pdf" onChange={handleChangeFile} />
      {errors?.resumes && <p className="text-red-500 text-sm">{errors?.resumes?.message}</p>}
    </>
  );
};

export default OnboardingResume;
