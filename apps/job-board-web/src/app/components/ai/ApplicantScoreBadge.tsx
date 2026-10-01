'use client';

import React from 'react';
import { Skeleton, Tooltip } from '@heroui/react';
import {
  APPLICANT_SCORE_CONTEXT_LINE,
  APPLICANT_SCORE_NO_PROFILE_NOTE,
  ApplicantScoreBand,
  ApplicantScoreTone,
  getApplicantScoreBandWord,
  getApplicantScoreTone,
} from '@/app/types/applicantScore';

interface Props {
  score?: number | null;
  band?: ApplicantScoreBand | null;
  /** True while the one bulk request for the whole page is still in flight. */
  loading?: boolean;
  className?: string;
}

/**
 * The compact match badge on an applicant card.
 *
 * Three rules it exists to keep:
 *  - a missing score is never drawn as 0 — an unscored candidate would other-
 *    wise sink to the bottom of a sorted list and look like a bad applicant;
 *  - the band word is always printed, so the colour is reinforcement and never
 *    the only signal;
 *  - the aria-label spells the number out, because "86" inside a coloured pill
 *    is meaningless to a screen reader.
 */
const TONE_CLASSES: Record<ApplicantScoreTone, string> = {
  success: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-100/20',
  warning: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-100/20',
  danger: 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-100/20',
  default: 'bg-default-100 text-default-600 border-default-200',
};

const ApplicantScoreBadge: React.FC<Props> = ({ score, band, loading = false, className = '' }) => {
  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`} aria-busy aria-live="polite">
        <Skeleton className="h-6 w-14 rounded-full" />
        <Skeleton className="h-3 w-20 rounded-full" />
        <span className="sr-only">Loading match score</span>
      </div>
    );
  }

  const hasScore = typeof score === 'number';
  const tone = getApplicantScoreTone(hasScore ? score : null);
  const word = getApplicantScoreBandWord(band, hasScore ? score : null);

  if (!hasScore) {
    return (
      <Tooltip content={APPLICANT_SCORE_NO_PROFILE_NOTE} placement="top">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-default-200 bg-default-50 px-3 py-1 text-xs font-medium text-default-500 ${className}`}
          aria-label="Match score not available for this candidate"
          tabIndex={0}
        >
          Not scored
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={APPLICANT_SCORE_CONTEXT_LINE} placement="top">
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${TONE_CLASSES[tone]} ${className}`}
        aria-label={`Match score ${score} out of 100. ${word}.`}
        tabIndex={0}
      >
        <span className="text-sm font-bold leading-none">
          {score}
          <span className="text-[10px] font-semibold opacity-70">/100</span>
        </span>
        <span className="text-[11px] font-semibold leading-none">{word}</span>
      </span>
    </Tooltip>
  );
};

export default ApplicantScoreBadge;
