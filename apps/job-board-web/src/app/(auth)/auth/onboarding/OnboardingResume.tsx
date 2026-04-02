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
  const [showInvalidAlert, setShowInvalidAlert] = useState(false);
  const reselectInputRef = useRef<HTMLInputElement>(null);

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
      const jobId = response?.data?.job_id ?? response?.job_id;

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

  const showInvalidResumeAlert = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setParsingJobId(null);
    setPendingFile(null);
    setShowUploader(true);
    onModeChange?.(true);
    setShowInvalidAlert(true);
  }, [onModeChange]);

  const handleParseComplete = useCallback(
    async (result: any) => {
      // Check if result has any meaningful resume sections
      const hasContent =
        result?.personalDetails ||
        result?.educationalDetails?.length > 0 ||
        result?.experienceDetails?.length > 0 ||
        result?.skills?.length > 0 ||
        result?.certifications?.length > 0;

      if (!hasContent) {
        console.debug('[OnboardingResume] Empty parse result — not a resume', result);
        showInvalidResumeAlert();
        return;
      }

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
    [onStructuredData, refetch, pendingFile, onModeChange, showInvalidResumeAlert],
  );

  const handleParseError = useCallback(
    (error: string) => {
      const isNotResume =
        error.toLowerCase().includes('no text found') ||
        error.toLowerCase().includes('scanned') ||
        error.toLowerCase().includes('image pdf');

      if (isNotResume) {
        showInvalidResumeAlert();
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      setParsingJobId(null);
      setPendingFile(null);
      setShowUploader(true);
      onModeChange?.(true);
      addToast({ color: 'danger', title: 'Parsing Failed', description: error });
    },
    [onModeChange, showInvalidResumeAlert],
  );

  const handleReselectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setShowInvalidAlert(false);
      handleFileSelected(file);
    }
    e.target.value = '';
  };

  // Show progress UI while parsing
  if (parsingJobId) {
    return (
      <ResumeParseProgress
        jobId={parsingJobId}
        onComplete={handleParseComplete}
        onError={handleParseError}
        onInvalidResume={showInvalidResumeAlert}
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
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <HiOutlineSparkles className="text-amber-600" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Auto-fill from Resume</p>
            <p className="text-xs text-gray-500">Upload a PDF to pre-fill your profile with AI</p>
          </div>
        </div>
        <Button size="sm" className="bg-amber-500 text-white hover:bg-amber-600" onPress={enterResumeMode}>
          Upload Resume
        </Button>
      </div>
    );
  }

  // Expanded upload zone + confirmation dialog
  return (
    <div className="flex items-center justify-center min-h-[60vh] pt-[25px] w-full">
      <ResumeUploadZone onChange={handleFileSelected} onCancel={exitResumeMode} error={errors?.resumes?.message} />

      {/* Hidden input for re-select from invalid resume alert */}
      <input
        ref={reselectInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleReselectFile}
      />

      {/* Invalid resume alert */}
      <ConfirmationDialog
        isOpen={showInvalidAlert}
        onClose={() => setShowInvalidAlert(false)}
        onConfirm={() => {
          setShowInvalidAlert(false);
          reselectInputRef.current?.click();
        }}
        title="Not a Resume"
        color="warning"
        cancelLabel="Cancel"
        confirmLabel="Re-select"
        message="It looks like the selected PDF is not a resume. Please select a valid resume file to continue."
      />

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
    </div>
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
    <div className="space-y-3 w-full max-w-2xl">
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
            : 'border-gray-200 bg-gray-50/50'
          }
        `}
      >
        {/* Icon */}
        <div className={`
          w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors
          ${dragActive ? 'bg-primary/10' : 'bg-gray-100'}
        `}>
          <FiUploadCloud className="text-gray-500" size={28} />
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
