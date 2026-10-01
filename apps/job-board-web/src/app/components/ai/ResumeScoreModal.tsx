'use client';

import routePaths from '@/app/config/routePaths';
import type {
  ResumeImprovement,
  ResumeImprovementPriority,
  ResumeScoreResult,
} from '@/app/types/resumeScore';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Progress,
  ScrollShadow,
  Skeleton,
  Tooltip,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { FiAlertTriangle, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { IoClose, IoRemove } from 'react-icons/io5';

type Props = {
  data: ResumeScoreResult | null;
  loading: boolean;
  error: string | null;
  /** Run the first check for this job. */
  onCheck: () => void;
  /** Re-run the checks after a profile edit. */
  onRefresh: () => void;
  onMinimise: () => void;
  onClose: () => void;
};

/** Skills tab — the sensible landing spot when we have nothing more specific. */
const DEFAULT_PROFILE_TAB = 3;

const PRIORITY_ORDER: Record<ResumeImprovementPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Priority is spelled out, never colour alone. */
const PRIORITY_LABEL: Record<ResumeImprovementPriority, string> = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
};

const PRIORITY_COLOR: Record<ResumeImprovementPriority, 'danger' | 'warning' | 'default'> = {
  high: 'danger',
  medium: 'warning',
  low: 'default',
};

const scoreTone = (score: number) => {
  if (score >= 75) return { stroke: 'text-success', text: 'text-success-600', bar: 'success' };
  if (score >= 50) return { stroke: 'text-warning', text: 'text-warning-600', bar: 'warning' };
  return { stroke: 'text-danger', text: 'text-danger-600', bar: 'danger' };
};

const formatCheckedAt = (iso?: string) => {
  if (!iso) return null;

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'checked just now';
  if (minutes < 60) return `checked ${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `checked ${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `checked ${days} day${days === 1 ? '' : 's'} ago`;
};

const sortImprovements = (improvements: ResumeImprovement[]) =>
  [...improvements].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

/**
 * The score ring. Plain SVG with `stroke-dasharray` — no chart library for one
 * circle. Screen readers get the number from the sibling text, so the drawing
 * itself is hidden from them.
 */
const ScoreRing = ({ score }: { score: number }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const tone = scoreTone(score);

  return (
    <div className="relative shrink-0">
      <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90" aria-hidden focusable="false">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="8"
          stroke="currentColor"
          className="text-default-200"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={`${filled} ${circumference}`}
          className={tone.stroke}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-xl font-semibold ${tone.text}`}
        aria-hidden
      >
        {score}
      </span>
    </div>
  );
};

const ResumeScoreModal = ({
  data,
  loading,
  error,
  onCheck,
  onRefresh,
  onMinimise,
  onClose,
}: Props) => {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus starts inside the panel and cycles within it while it is open. The
  // listener sits on the panel itself rather than the document, so nothing else
  // on the page changes behaviour.
  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    const focusable = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onMinimise();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusable();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !node.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [onMinimise]);

  /**
   * Going to the profile MINIMISES, never closes: the candidate edits a tab and
   * comes back to the job page with their score still on screen.
   */
  const goToProfileTab = (tab: number) => {
    onMinimise();
    router.push(`${routePaths.profile}?tab=${tab}`);
    if (typeof window !== 'undefined') {
      setTimeout(() => window.scrollTo({ top: 0 }), 100);
    }
  };

  const improvements = sortImprovements(data?.improvements ?? []);
  const primaryTab = improvements[0]?.action?.tab ?? DEFAULT_PROFILE_TAB;
  const checkedAt = formatCheckedAt(data?.generated_at);
  const hasScore = data?.status === 'ok' && typeof data.score === 'number';

  const renderBody = () => {
    if (loading && !hasScore) {
      return (
        <div className="flex flex-col gap-4 p-5" aria-live="polite" aria-busy="true">
          <span className="sr-only">Checking your resume against this job.</span>
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-3 w-full rounded-lg" />
              <Skeleton className="h-3 w-5/6 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-3 w-full rounded-lg" />
          <Skeleton className="h-3 w-full rounded-lg" />
          <Skeleton className="h-3 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center text-center gap-3 p-6">
          <FiAlertTriangle className="text-warning" size={28} aria-hidden />
          <p className="text-sm font-medium text-default-700">We could not finish the check</p>
          <p className="text-xs text-default-500">{error}</p>
          <Button size="sm" color="primary" variant="flat" onPress={onCheck}>
            Try again
          </Button>
        </div>
      );
    }

    if (data?.status === 'no_profile') {
      return (
        <div className="flex flex-col items-center text-center gap-3 p-6">
          <HiOutlineSparkles className="text-primary" size={28} aria-hidden />
          <p className="text-sm font-medium text-default-700">
            Add your skills and experience first
          </p>
          <p className="text-xs text-default-500">
            There is nothing to score yet. Once your profile lists a few skills and one role, we can
            compare it with this job.
          </p>
          <Button
            size="sm"
            color="primary"
            endContent={<FiArrowRight size={14} aria-hidden />}
            onPress={() => goToProfileTab(DEFAULT_PROFILE_TAB)}
          >
            Add skills
          </Button>
        </div>
      );
    }

    if (!hasScore) {
      // Covers `not_scored` and the first open before anything has been run.
      return (
        <div className="flex flex-col items-center text-center gap-3 p-6">
          <HiOutlineSparkles className="text-primary" size={28} aria-hidden />
          <p className="text-sm font-medium text-default-700">Check my resume against this job</p>
          <p className="text-xs text-default-500">
            We compare your profile with what this job asks for, and show you what is missing. This
            is guidance for you only — it is not sent to the employer.
          </p>
          <Button size="sm" color="primary" isLoading={loading} onPress={onCheck}>
            Check my resume
          </Button>
        </div>
      );
    }

    const score = data?.score as number;
    const tone = scoreTone(score);

    return (
      <div className="flex flex-col gap-5 p-5">
        {data?.degraded && (
          <div
            className="flex gap-2 items-start rounded-lg border border-warning-200 bg-warning-50 p-3"
            role="status"
          >
            <FiAlertTriangle className="text-warning-600 mt-0.5 shrink-0" size={14} aria-hidden />
            <p className="text-[11px] leading-relaxed text-warning-700">
              AI suggestions are briefly unavailable — your score and missing keywords are accurate.
            </p>
          </div>
        )}

        {/* Score */}
        <div className="flex items-center gap-4">
          <ScoreRing score={score} />
          <div className="flex flex-col gap-1">
            <p className={`text-sm font-semibold ${tone.text}`}>
              {score}/100
              <span className="sr-only">
                {' '}
                — your resume scores {score} out of 100 for this job.
              </span>
            </p>
            {data?.headline && (
              <p className="text-sm font-medium text-default-700">{data.headline}</p>
            )}
            {data?.summary && (
              <p className="text-xs text-default-500 leading-relaxed">{data.summary}</p>
            )}
          </div>
        </div>

        {/* Breakdown */}
        {!!data?.breakdown?.length && (
          <div className="flex flex-col gap-3">
            {data.breakdown.map((item) => (
              <Progress
                key={item.key}
                size="sm"
                value={item.score}
                label={item.label}
                showValueLabel
                color={scoreTone(item.score).bar as 'success' | 'warning' | 'danger'}
                aria-label={`${item.label}: ${item.score} percent`}
                classNames={{
                  label: 'text-xs text-default-600',
                  value: 'text-xs text-default-500',
                }}
              />
            ))}
          </div>
        )}

        {/* Missing keywords */}
        {!!data?.missing_keywords?.length && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-default-700">Missing from your profile</p>
            <div className="flex flex-wrap gap-1.5">
              {data.missing_keywords.map((keyword) => (
                <Chip
                  key={keyword}
                  size="sm"
                  variant="flat"
                  color="warning"
                  className="text-[11px]"
                >
                  {keyword}
                </Chip>
              ))}
            </div>
            {!!data?.matched_keywords?.length && (
              <p className="text-[11px] text-default-400">
                {data.matched_keywords.length} of{' '}
                {data.matched_keywords.length + data.missing_keywords.length} skills this job asks
                for are already on your profile.
              </p>
            )}
          </div>
        )}

        {/* Improvements */}
        {!!improvements.length && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-default-700">
              {improvements.length} recommended improvement{improvements.length === 1 ? '' : 's'}
            </p>
            {improvements.map((improvement) => (
              <div
                key={improvement.id}
                className="rounded-lg border border-default-200 bg-default-50/60 p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Chip
                      size="sm"
                      variant="flat"
                      color={PRIORITY_COLOR[improvement.priority]}
                      className="text-[10px] h-5"
                    >
                      {PRIORITY_LABEL[improvement.priority]}
                    </Chip>
                    <p className="text-xs font-medium text-default-700">{improvement.title}</p>
                  </div>
                </div>
                <p className="text-[11px] text-default-500 leading-relaxed">
                  {improvement.description}
                </p>
                {improvement.action && (
                  <div>
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      className="h-7 text-[11px]"
                      endContent={<FiArrowRight size={12} aria-hidden />}
                      onPress={() => goToProfileTab(improvement.action.tab)}
                    >
                      {improvement.action.label}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-default-400 leading-relaxed">
          This is self-assessment guidance to help you improve your profile for roles like this. It
          is not shared with the employer and does not affect your application.
        </p>
      </div>
    );
  };

  return (
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Resume Health Check">
      <Card
        className="flex flex-col w-[400px] max-w-[calc(100vw-4rem)] max-h-[calc(100vh-180px)] overflow-hidden shadow-2xl border-none bg-background/95 backdrop-blur-lg"
        isBlurred
      >
        <CardHeader className="flex justify-between items-start gap-2 bg-gradient-to-r from-primary to-secondary text-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 p-2 rounded-lg shrink-0">
              <HiOutlineSparkles size={18} aria-hidden />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="font-bold text-sm leading-none">Resume Health Check</p>
              <span className="text-[10px] opacity-80 mt-1 truncate">
                {[data?.resume?.name, checkedAt].filter(Boolean).join(' — ') ||
                  'Your profile, measured against this job'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Tooltip content="Minimise" placement="top">
              <Button
                isIconOnly
                variant="light"
                radius="full"
                size="sm"
                onPress={onMinimise}
                aria-label="Minimise the resume health check"
                className="text-white hover:bg-white/10"
              >
                <IoRemove size={20} aria-hidden />
              </Button>
            </Tooltip>
            <Tooltip content="Close" placement="top">
              <Button
                isIconOnly
                variant="light"
                radius="full"
                size="sm"
                onPress={onClose}
                aria-label="Close the resume health check"
                className="text-white hover:bg-white/10"
              >
                <IoClose size={20} aria-hidden />
              </Button>
            </Tooltip>
          </div>
        </CardHeader>

        <CardBody className="p-0 bg-default-50/40">
          <ScrollShadow hideScrollBar className="max-h-[calc(100vh-300px)]">
            {renderBody()}
          </ScrollShadow>
        </CardBody>

        {/* The footer only makes sense once there is a score to re-check. The
            empty, error and no-profile states carry their own call to action. */}
        {hasScore && (
          <CardFooter className="flex flex-col gap-2 items-stretch p-3 bg-white border-t border-default-100">
            {data?.target_job?.title && (
              <p className="text-[10px] text-default-400 truncate">
                Scored against: {data.target_job.title}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="bordered"
                fullWidth
                isLoading={loading}
                onPress={onRefresh}
                startContent={!loading ? <FiRefreshCw size={14} aria-hidden /> : undefined}
                aria-label="Re-check your resume against this job"
              >
                Re-check
              </Button>
              <Button
                size="sm"
                color="primary"
                fullWidth
                endContent={<FiArrowRight size={14} aria-hidden />}
                onPress={() => goToProfileTab(primaryTab)}
              >
                Update Profile
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default ResumeScoreModal;
