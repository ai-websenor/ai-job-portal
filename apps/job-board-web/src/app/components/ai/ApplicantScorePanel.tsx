'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Chip, Progress, Skeleton } from '@heroui/react';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import {
  APPLICANT_SCORE_CONTEXT_LINE,
  APPLICANT_SCORE_NO_PROFILE_NOTE,
  ApplicantScoreResponse,
  ApplicantScoreTone,
  getApplicantScoreBandWord,
  getApplicantScoreTone,
} from '@/app/types/applicantScore';

interface Props {
  applicationId?: string;
  className?: string;
}

type PanelState = 'loading' | 'error' | 'forbidden' | 'ready';

/**
 * A refusal arrives as an HTTP 403 rather than a status value, and the axios
 * interceptor hands us the error envelope rather than the response, so the
 * code is read from whichever field the envelope carries it in.
 */
const isForbidden = (error: unknown): boolean => {
  const envelope = error as { status?: number; statusCode?: number } | undefined;
  return envelope?.status === 403 || envelope?.statusCode === 403;
};

const TONE_STROKE: Record<ApplicantScoreTone, string> = {
  success: 'text-success-500',
  warning: 'text-warning-500',
  danger: 'text-danger-500',
  default: 'text-default-300',
};

const TONE_TEXT: Record<ApplicantScoreTone, string> = {
  success: 'text-success-700',
  warning: 'text-warning-700',
  danger: 'text-danger-700',
  default: 'text-default-500',
};

const PROGRESS_COLOR: Record<ApplicantScoreTone, 'success' | 'warning' | 'danger' | 'default'> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  default: 'default',
};

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The score ring. Hand-drawn SVG rather than a chart library: it is one arc,
 * and pulling in a charting dependency for it would be the tail wagging the
 * dog. `stroke-dasharray` holds the full circumference and the offset eats
 * into it, which is the standard way to draw a partial arc.
 *
 * The ring itself is `aria-hidden` — the same number and the band word sit
 * next to it as real text, so assistive tech reads words rather than a shape.
 */
const ScoreRing = ({ score, word }: { score: number; word: string }) => {
  const tone = getApplicantScoreTone(score);
  const clamped = Math.max(0, Math.min(100, score));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[128px] w-[128px]">
        <svg
          viewBox="0 0 128 128"
          className="h-full w-full -rotate-90"
          aria-hidden
          focusable="false"
        >
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            className="text-default-200"
            stroke="currentColor"
          />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={TONE_STROKE[tone]}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className={`text-3xl font-bold leading-none ${TONE_TEXT[tone]}`}>{clamped}</span>
          <span className="text-[11px] font-semibold text-default-400">out of 100</span>
        </div>
      </div>
      {/* The text equivalent of the ring, and the only thing a reader hears. */}
      <p className={`text-sm font-semibold ${TONE_TEXT[tone]}`}>
        <span className="sr-only">Match score </span>
        {clamped} out of 100 — {word}
      </p>
    </div>
  );
};

const ListBlock = ({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items?: string[];
  icon: React.ElementType;
}) => {
  if (!items?.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-default-700">
        <Icon size={15} aria-hidden />
        {title}
      </h4>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-default-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const PanelShell = ({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <Card className="shadow-sm border border-default-100 bg-white p-2">
    <CardHeader className="flex w-full flex-row items-center justify-between border-b border-default-100 px-6 pb-3 pt-5">
      <div className="flex items-center gap-2">
        <HiOutlineSparkles className="text-2xl text-primary" aria-hidden />
        <h2 className="text-xl font-bold text-default-900">Match insight</h2>
      </div>
      {action}
    </CardHeader>
    <CardBody className="px-6 pb-6 pt-4">{children}</CardBody>
  </Card>
);

/**
 * The full match breakdown for one applicant, shown on the applicant detail
 * page.
 *
 * This is a hiring screen, so the framing is deliberate: it is labelled
 * "Match insight", it carries a line saying it is not a hiring recommendation,
 * and every phrase describes fit against the job's requirements rather than
 * passing judgement on the person.
 */
const ApplicantScorePanel: React.FC<Props> = ({ applicationId, className = '' }) => {
  const [state, setState] = useState<PanelState>('loading');
  const [data, setData] = useState<ApplicantScoreResponse | null>(null);
  const [rechecking, setRechecking] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!applicationId) return;

      try {
        if (force) setRechecking(true);
        else setState('loading');

        // `http` unwraps axios to the API envelope, so the body sits on `.data`.
        const response = (await http.post(ENDPOINTS.AI.APPLICANT_SCORE, {
          applicationId,
          force,
        })) as unknown as { data?: ApplicantScoreResponse };

        const result = response?.data;

        if (!result || !result.status) {
          setState('error');
          return;
        }

        setData(result);
        setState('ready');
      } catch (error) {
        // `http` has already toasted the failure; this drives the in-panel retry.
        console.log('Error fetching applicant match insight:', error);
        // A refusal is not a fault the employer can retry away, so it gets a
        // quiet line of its own instead of a "try again" button.
        setData(null);
        setState(isForbidden(error) ? 'forbidden' : 'error');
      } finally {
        setRechecking(false);
      }
    },
    [applicationId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  if (!applicationId) return null;

  if (state === 'loading') {
    return (
      <div className={className}>
        <PanelShell>
          <div className="flex flex-col items-center gap-4" aria-busy aria-live="polite">
            <Skeleton className="h-[128px] w-[128px] rounded-full" />
            <Skeleton className="h-4 w-48 rounded-lg" />
            <Skeleton className="h-3 w-full rounded-lg" />
            <Skeleton className="h-3 w-5/6 rounded-lg" />
            <div className="flex w-full flex-col gap-3 pt-2">
              <Skeleton className="h-3 w-full rounded-lg" />
              <Skeleton className="h-3 w-full rounded-lg" />
              <Skeleton className="h-3 w-full rounded-lg" />
            </div>
            <span className="sr-only">Working out how this candidate matches the job</span>
          </div>
        </PanelShell>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={className}>
        <PanelShell>
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-center gap-2 text-sm text-default-600">
              <FiAlertCircle className="text-danger-500" aria-hidden />
              The match insight could not be loaded just now.
            </p>
            <Button
              size="sm"
              variant="flat"
              onPress={() => load(false)}
              startContent={<FiRefreshCw size={15} aria-hidden />}
            >
              Try again
            </Button>
          </div>
        </PanelShell>
      </div>
    );
  }

  if (state === 'forbidden') {
    return (
      <div className={className}>
        <PanelShell>
          <p className="text-sm text-default-500">
            Match insight is not available for this application on your account.
          </p>
        </PanelShell>
      </div>
    );
  }

  if (data?.status === 'noProfile' || typeof data?.score !== 'number') {
    return (
      <div className={className}>
        <PanelShell>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-default-600">{APPLICANT_SCORE_NO_PROFILE_NOTE}</p>
            <p className="text-xs text-default-400">
              Their resume and the rest of this page are unaffected — only the match number is
              missing.
            </p>
          </div>
        </PanelShell>
      </div>
    );
  }

  const word = getApplicantScoreBandWord(data.band, data.score);

  return (
    <div className={className}>
      <PanelShell
        action={
          <Button
            size="sm"
            variant="flat"
            isLoading={rechecking}
            onPress={() => load(true)}
            startContent={!rechecking ? <FiRefreshCw size={15} aria-hidden /> : undefined}
            aria-label="Re-check this candidate's match against the job"
          >
            Re-check
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ScoreRing score={data.score} word={word} />

            <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
              {data.headline && (
                <h3 className="text-base font-bold text-default-900">{data.headline}</h3>
              )}
              {data.summary && <p className="text-sm text-default-600">{data.summary}</p>}
              <p className="flex items-start gap-1.5 text-xs text-default-400">
                <FiInfo className="mt-0.5 shrink-0" aria-hidden />
                {APPLICANT_SCORE_CONTEXT_LINE}
              </p>
            </div>
          </div>

          {!!data.breakdown?.length && (
            <div className="flex flex-col gap-4">
              {data.breakdown!.map((item) => (
                <div key={item.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-default-700">{item.label}</span>
                    <span className="font-semibold text-default-600">{item.score}/100</span>
                  </div>
                  <Progress
                    value={item.score}
                    minValue={0}
                    maxValue={100}
                    size="sm"
                    color={PROGRESS_COLOR[getApplicantScoreTone(item.score)]}
                    aria-label={`${item.label}: ${item.score} out of 100`}
                  />
                </div>
              ))}
            </div>
          )}

          {(!!data.matchedKeywords?.length || !!data.missingKeywords?.length) && (
            <div className="flex flex-col gap-4">
              {!!data.matchedKeywords?.length && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-semibold text-default-700">
                    Requirements found in their profile
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.matchedKeywords!.map((keyword) => (
                      <Chip key={keyword} size="sm" color="success" variant="flat">
                        {keyword}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {!!data.missingKeywords?.length && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-semibold text-default-700">
                    Requirements not mentioned yet
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.missingKeywords!.map((keyword) => (
                      <Chip key={keyword} size="sm" color="warning" variant="flat">
                        {keyword}
                      </Chip>
                    ))}
                  </div>
                  <p className="text-xs text-default-400">
                    Worth asking about — a profile can be out of date even when the experience is
                    there.
                  </p>
                </div>
              )}
            </div>
          )}

          {(!!data.strengths?.length || !!data.gaps?.length) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ListBlock
                title="Strong points for this role"
                items={data.strengths}
                icon={FiCheckCircle}
              />
              <ListBlock
                title="Worth exploring at interview"
                items={data.gaps}
                icon={FiTrendingUp}
              />
            </div>
          )}
        </div>
      </PanelShell>
    </div>
  );
};

export default ApplicantScorePanel;
