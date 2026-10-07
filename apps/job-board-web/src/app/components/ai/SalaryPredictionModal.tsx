'use client';

import React from 'react';
import {
  Button,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { FiAlertCircle, FiBriefcase, FiInfo, FiRefreshCw, FiTag } from 'react-icons/fi';
import { IoLocationOutline } from 'react-icons/io5';
import { MdOutlineWorkHistory } from 'react-icons/md';
import {
  SalaryBasisIcon,
  SalaryConfidence,
  SalaryEstimateResponse,
  SalaryRange,
} from '@/app/types/salary';

export type SalaryPredictionState = 'loading' | 'error' | 'ready';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: SalaryPredictionState;
  data: SalaryEstimateResponse | null;
  errorMessage: string | null;
  onRetry: () => void;
  onApply: (range: SalaryRange) => void;
}

/**
 * Words for each pay rate. The estimate comes back in whatever unit the
 * employer picked, so the unit has to travel with every number we print —
 * "45,000" alone is meaningless when the form can mean per hour or per year.
 */
const PAY_RATE_SUFFIX: Record<string, string> = {
  hourly: 'per hour',
  daily: 'per day',
  weekly: 'per week',
  monthly: 'per month',
  yearly: 'per year',
};

const CONFIDENCE_META: Record<
  SalaryConfidence,
  { color: 'success' | 'warning' | 'default'; word: string; meaning: string }
> = {
  high: {
    color: 'success',
    word: 'High confidence',
    meaning: 'Plenty of closely matching jobs, so this range is a dependable guide.',
  },
  medium: {
    color: 'warning',
    word: 'Medium confidence',
    meaning: 'A reasonable number of matches. Useful as a guide, not a rule.',
  },
  low: {
    color: 'default',
    word: 'Low confidence',
    meaning: 'Only a handful of matching jobs, so treat this as a rough starting point.',
  },
};

const BASIS_ICONS: Record<SalaryBasisIcon, React.ReactNode> = {
  experience: <MdOutlineWorkHistory size={18} aria-hidden />,
  role: <FiBriefcase size={18} aria-hidden />,
  skills: <FiTag size={18} aria-hidden />,
  location: <IoLocationOutline size={18} aria-hidden />,
};

const COMPARISON_STYLES: Record<string, string> = {
  below: 'bg-warning-50 border-warning-200 text-warning-700',
  above: 'bg-primary-50 border-primary-200 text-primary-700',
  within: 'bg-success-50 border-success-200 text-success-700',
};

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unexpected currency code should never blank the whole modal.
    return `${currency || 'INR'} ${Math.round(amount).toLocaleString('en-IN')}`;
  }
};

const LoadingSkeleton = () => (
  <div className="animate-pulse" aria-live="polite" aria-busy="true">
    <span className="sr-only">Looking at similar live jobs…</span>
    <div className="rounded-2xl border border-default-100 bg-default-50 p-6">
      <div className="mx-auto h-9 w-2/3 rounded-full bg-default-200" />
      <div className="mx-auto mt-3 h-4 w-1/3 rounded-full bg-default-200" />
      <div className="mx-auto mt-4 h-7 w-44 rounded-full bg-default-200" />
    </div>
    <div className="mt-5 h-4 w-28 rounded-full bg-default-200" />
    <div className="mt-3 grid gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-default-200" />
          <div className="h-4 w-2/3 rounded-full bg-default-200" />
        </div>
      ))}
    </div>
    <div className="mt-5 h-16 w-full rounded-xl bg-default-100" />
  </div>
);

const SalaryPredictionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  state,
  data,
  errorMessage,
  onRetry,
  onApply,
}) => {
  const isReady = state === 'ready' && !!data;
  const hasNumbers = isReady && data!.status === 'ok' && !!data!.range;
  const currency = data?.currency || 'INR';
  const unit = PAY_RATE_SUFFIX[data?.payRate || ''] || '';
  const confidence = data ? CONFIDENCE_META[data.confidence] : null;

  // No platform adverts were involved, so every line that counts them has to
  // say something else instead of "based on 0 similar jobs".
  const isExternal = data?.dataSource === 'externalSource';

  const subtitle = (() => {
    if (state === 'loading') return 'Checking similar live jobs…';
    if (state === 'error') return 'We could not reach the estimator';
    if (!data) return '';
    if (data.status === 'insufficientData') return 'Not enough similar jobs to estimate yet';
    if (isExternal) return 'An outside estimate — no similar jobs posted here yet';
    return `Based on ${data.sampleSize} similar live job${data.sampleSize === 1 ? '' : 's'}`;
  })();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <HiOutlineSparkles className="text-primary" size={22} aria-hidden />
                Market Salary Insight
              </h2>
              <p className="text-sm font-normal text-default-500">{subtitle}</p>
            </ModalHeader>

            <ModalBody className="pb-2">
              {state === 'loading' && <LoadingSkeleton />}

              {state === 'error' && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger-200 bg-danger-50 px-6 py-8 text-center">
                  <FiAlertCircle className="text-danger" size={28} aria-hidden />
                  <p className="text-sm text-danger-700">
                    {errorMessage || 'Something went wrong while estimating this salary.'}
                  </p>
                  <Button
                    color="danger"
                    variant="flat"
                    size="sm"
                    startContent={<FiRefreshCw size={16} aria-hidden />}
                    onPress={onRetry}
                  >
                    Try again
                  </Button>
                </div>
              )}

              {/*
                No sample size, no range, no percentages — an "estimate" built on
                too little data is worse than admitting we do not know yet.
              */}
              {isReady && data!.status === 'insufficientData' && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-default-200 bg-default-50 px-6 py-8 text-center">
                  <FiInfo className="text-default-500" size={28} aria-hidden />
                  <p className="text-base font-medium text-foreground">
                    Not enough similar jobs yet
                  </p>
                  <p className="max-w-sm text-sm text-default-500">
                    We only show a market range when enough comparable live jobs exist. We&apos;ll
                    show this once more employers post this role.
                  </p>
                </div>
              )}

              {hasNumbers && (
                <div className="flex flex-col gap-5">
                  <section
                    className="rounded-2xl border border-default-100 bg-default-50 px-6 py-5 text-center"
                    aria-label="Estimated market range"
                  >
                    <p className="text-xs uppercase tracking-wide text-default-500">
                      Similar roles pay
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
                      {formatMoney(data!.range!.min, currency)} –{' '}
                      {formatMoney(data!.range!.max, currency)}
                      {unit ? <span className="text-base font-medium"> {unit}</span> : null}
                    </p>
                    {typeof data!.typical === 'number' && (
                      <p className="mt-1 text-sm text-default-600">
                        Typical: {formatMoney(data!.typical, currency)}
                        {unit ? ` ${unit}` : ''}
                      </p>
                    )}
                    {confidence && (
                      <div className="mt-3 flex flex-col items-center gap-1">
                        <Chip color={confidence.color} variant="flat" size="sm">
                          {confidence.word}
                          {isExternal
                            ? ' · outside estimate'
                            : ` · ${data!.sampleSize} similar job${
                                data!.sampleSize === 1 ? '' : 's'
                              }`}
                        </Chip>
                        <p className="max-w-xs text-xs text-default-500">{confidence.meaning}</p>
                      </div>
                    )}
                    <p className="mt-3 text-xs text-default-400">
                      {isExternal
                        ? 'An estimate from outside this platform, because no similar jobs have been posted here yet — treat it as a starting point, not a market rate.'
                        : 'A market estimate from live job posts — not a recommendation or a promise.'}
                    </p>
                  </section>

                  {data!.basis?.length > 0 && (
                    <section aria-label="What this estimate is based on">
                      <h3 className="text-sm font-semibold text-foreground">Based on</h3>
                      <ul className="mt-2 flex flex-col gap-2">
                        {data!.basis.map((item, index) => (
                          <li
                            key={`${item.icon}-${index}`}
                            className="flex items-center gap-3 text-sm text-default-600"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                              {BASIS_ICONS[item.icon] ?? <FiInfo size={18} aria-hidden />}
                            </span>
                            {item.label}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {data!.comparison && (
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        COMPARISON_STYLES[data!.comparison.status] || COMPARISON_STYLES.within
                      }`}
                      role="status"
                    >
                      {data!.comparison.message}
                    </div>
                  )}

                  {data!.explanation && (
                    <p className="text-sm text-default-600">{data!.explanation}</p>
                  )}

                  {data!.clamped && (
                    <p className="text-xs text-default-400">
                      Note: the range was capped to the salary slider&apos;s limits, so the real
                      market figure may sit outside it.
                    </p>
                  )}
                </div>
              )}
            </ModalBody>

            <Divider className="mt-2" />

            <ModalFooter>
              {hasNumbers ? (
                <>
                  <Button variant="light" onPress={close}>
                    Keep mine
                  </Button>
                  <Button
                    color="primary"
                    onPress={() => onApply(data!.range!)}
                    aria-label={`Use the market range, ${formatMoney(
                      data!.range!.min,
                      currency,
                    )} to ${formatMoney(data!.range!.max, currency)} ${unit}`}
                  >
                    Use this range
                  </Button>
                </>
              ) : (
                <Button variant="light" onPress={close}>
                  Close
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SalaryPredictionModal;
