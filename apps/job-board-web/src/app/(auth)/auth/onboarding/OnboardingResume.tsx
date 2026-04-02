'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { addToast, Button } from '@heroui/react';
import Resumes from './steps/Resumes';
import ResumeParseProgress from './ResumeParseProgress';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { HiOutlineDocumentText, HiOutlineSparkles } from 'react-icons/hi';
import { FiUploadCloud } from 'react-icons/fi';

const STORAGE_KEY = 'resume_parse_job';
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

type Props = {
  errors: any;
  watchedValues: any;
  refetch?: () => void;
  setLoading: (val: boolean) => void;
  onStructuredData?: (data: any) => void;
  onModeChange?: (isResumeMode: boolean) => void;
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
  refetch,
  errors,
  watchedValues,
  onStructuredData,
  onModeChange,
}: Props) => {
  const [parsingJobId, setParsingJobId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; size: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  // Restore active parse job from localStorage on mount
  useEffect(() => {
    const stored = getStoredJob();
    if (stored) {
      setParsingJobId(stored.jobId);
      setPendingFile({ name: stored.fileName, size: stored.fileSize });
      onModeChange?.(true);
    }
  }, []);

  const enterResumeMode = () => {
    setShowUploader(true);
    onModeChange?.(true);
  };

  const exitResumeMode = () => {
    setShowUploader(false);
    onModeChange?.(false);
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleConfirmParse = async () => {
    if (!selectedFile?.name) return;
    const file = selectedFile;
    setSelectedFile(null);

    try {
      const payload = new FormData();
      payload.append('file', file);
      const response = await http.post(ENDPOINTS.AI.PARSE, payload);
      const jobId = response?.data?.job_id;

      if (!jobId) {
        addToast({ color: 'danger', title: 'Upload Failed', description: 'No job ID received.' });
        return;
      }

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

      // Pass parsed data upstream — handleDataExtracted will prefill form + refetch profile
      onStructuredData?.(result);
      setParsingJobId(null);
      setPendingFile(null);
      onModeChange?.(false);
    },
    [onStructuredData, refetch, pendingFile, onModeChange],
  );

  const handleParseError = useCallback(
    (error: string) => {
      localStorage.removeItem(STORAGE_KEY);
      setParsingJobId(null);
      setPendingFile(null);
      onModeChange?.(false);
      addToast({ color: 'danger', title: 'Parsing Failed', description: error });
    },
    [onModeChange],
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

  // Compact trigger — user opts in to upload
  if (!showUploader) {
    return (
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
            <HiOutlineSparkles className="text-primary" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Auto-fill from Resume</p>
            <p className="text-xs text-gray-400">Upload a PDF to pre-fill your profile details</p>
          </div>
        </div>
        <Button size="sm" color="primary" variant="flat" onPress={enterResumeMode}>
          Upload Resume
        </Button>
      </div>
    );
  }

  // Expanded upload zone + confirmation dialog
  return (
    <>
      <ResumeUploadZone onChange={handleFileSelected} onCancel={exitResumeMode} error={errors?.resumes?.message} />
      {selectedFile && (
        <ConfirmationDialog
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          onConfirm={handleConfirmParse}
          title="Analyze Resume"
          color="primary"
          message={
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                Your resume <strong>{selectedFile.name}</strong> will be analyzed to extract experience, education, and skills for your profile setup.
              </p>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="mt-0.5">&#x2022;</span>
                  You can review and edit all extracted details before saving.
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5">&#x2022;</span>
                  Your document is securely processed and stored. Only you control access.
                </li>
              </ul>
            </div>
          }
        />
      )}
    </>
  );
};

export default OnboardingResume;

// ── Inline Resume Upload Component ──

function ResumeUploadZone({ onChange, onCancel, error }: { onChange: (file: File) => void; onCancel?: () => void; error?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      addToast({ color: 'danger', title: 'Invalid File', description: 'Only PDF files are accepted.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast({ color: 'danger', title: 'File Too Large', description: 'Maximum file size is 10 MB.' });
      return;
    }
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center w-full py-10 px-6
          border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
          ${dragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-200 bg-gray-50/50 hover:border-primary/40 hover:bg-gray-50'
          }
        `}
      >
        {/* Icon */}
        <div className={`
          w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors
          ${dragActive ? 'bg-primary/10' : 'bg-primary/5'}
        `}>
          <FiUploadCloud className="text-primary" size={28} />
        </div>

        {/* Main Text */}
        <p className="text-sm font-semibold text-gray-700 mb-1">
          {dragActive ? 'Drop your resume here' : 'Upload your resume'}
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Drag & drop or <span className="text-primary font-medium">browse files</span>
        </p>

        {/* File Badge */}
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
          <HiOutlineDocumentText className="text-red-500" size={16} />
          <span className="text-xs text-gray-500 font-medium">PDF only</span>
          <span className="text-xs text-gray-300">|</span>
          <span className="text-xs text-gray-500">Max 10 MB</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {onCancel && (
        <button type="button" onClick={onCancel} className="text-xs text-red-500 hover:text-red-600 transition-colors mx-auto block">
          Skip — I'll fill manually
        </button>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
