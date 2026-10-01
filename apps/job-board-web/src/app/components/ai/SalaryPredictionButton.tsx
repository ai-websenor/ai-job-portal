'use client';

import React, { useCallback, useState } from 'react';
import { addToast } from '@heroui/react';
import { Control, FieldValues, UseFormSetValue, useWatch } from 'react-hook-form';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { SalaryEstimateRequest, SalaryEstimateResponse, SalaryRange } from '@/app/types/salary';
import AiActionButton from './AiActionButton';
import SalaryPredictionModal, { SalaryPredictionState } from './SalaryPredictionModal';

interface Props {
  control: Control<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

// Mirrors the salary Slider in JobForm. Writing a value outside these bounds
// would leave the slider and the submitted figures disagreeing.
const SLIDER_MIN = 2000;
const SLIDER_MAX = 200000;

/** HeroUI single-selects hand back a Set, so `payRate` can arrive in a few shapes. */
const readSingle = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Set) return String(Array.from(value)[0] ?? '');
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value);
};

const readList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (value instanceof Set) return Array.from(value).map((v) => String(v));
  return [];
};

const readNumber = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampToSlider = (value: number) =>
  Math.round(Math.min(Math.max(value, SLIDER_MIN), SLIDER_MAX));

/**
 * The employer-facing entry point for the salary estimate. It reads the job
 * form live (rather than taking props for every field) so the estimate always
 * reflects what is on screen at the moment of the click.
 */
const SalaryPredictionButton: React.FC<Props> = ({ control, setValue }) => {
  const values = useWatch({ control }) as Record<string, unknown>;

  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<SalaryPredictionState>('loading');
  const [data, setData] = useState<SalaryEstimateResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const title = String(values?.title || '').trim();
  const skills = readList(values?.skills);
  const experienceMin = readNumber(values?.experienceMin);

  // Without a role, its skills and a seniority, any figure we showed would be
  // an average of the whole market dressed up as advice.
  const missing: string[] = [];
  if (!title) missing.push('job title');
  if (skills.length === 0) missing.push('at least one skill');
  if (experienceMin === null) missing.push('minimum experience');

  const isDisabled = missing.length > 0;
  const tooltip = isDisabled
    ? `Add the ${missing.join(', ')} first — an estimate without them would be meaningless.`
    : 'Compare your range with similar live jobs';

  const requestEstimate = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);

    const salaryRange = Array.isArray(values?.salaryRange)
      ? (values.salaryRange as number[])
      : [readNumber(values?.salaryMin) ?? SLIDER_MIN, readNumber(values?.salaryMax) ?? SLIDER_MAX];

    const payload: SalaryEstimateRequest = {
      title,
      skills,
      experience_min: experienceMin,
      experience_max: readNumber(values?.experienceMax),
      location: String(values?.location || '').trim(),
      job_type: readList(values?.jobType),
      work_mode: readList(values?.workMode),
      pay_rate: readSingle(values?.payRate),
      current_range: [Number(salaryRange[0]) || SLIDER_MIN, Number(salaryRange[1]) || SLIDER_MAX],
    };

    try {
      // `http` unwraps axios to the API envelope, so the body sits on `.data`.
      const response = (await http.post(ENDPOINTS.AI.SALARY_ESTIMATE, payload)) as unknown as {
        data?: SalaryEstimateResponse;
      };
      const result = response?.data;

      if (!result || !result.status) {
        setErrorMessage('The estimator returned an unexpected response.');
        setState('error');
        return;
      }

      setData(result);
      setState('ready');
    } catch (error) {
      // The axios interceptor rejects with the API envelope, not an Error.
      const apiMessage = (error as { message?: string } | undefined)?.message;
      setErrorMessage(apiMessage || 'We could not reach the salary estimator. Please try again.');
      setState('error');
    }
  }, [values, title, skills, experienceMin]);

  const handlePress = () => {
    setIsOpen(true);
    requestEstimate();
  };

  const handleApply = (range: SalaryRange) => {
    const min = clampToSlider(range.min);
    const max = clampToSlider(range.max);

    setValue('salaryRange', [min, max], { shouldDirty: true });
    setValue('salaryMin', min, { shouldDirty: true, shouldValidate: true });
    setValue('salaryMax', max, { shouldDirty: true, shouldValidate: true });

    setIsOpen(false);
    addToast({
      color: 'success',
      title: 'Salary range updated',
      description: 'Your job now uses the market range. You can still adjust the slider.',
    });
  };

  return (
    <>
      <AiActionButton
        label="Salary Prediction with AI"
        aria-label="Estimate a market salary range for this job using AI"
        onPress={handlePress}
        isDisabled={isDisabled}
        tooltip={tooltip}
        size="lg"
      />

      <SalaryPredictionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        state={state}
        data={data}
        errorMessage={errorMessage}
        onRetry={requestEstimate}
        onApply={handleApply}
      />
    </>
  );
};

export default SalaryPredictionButton;
