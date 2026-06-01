'use client';

import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import { addToast, Button } from '@heroui/react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEventHandler,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { HiLockClosed, HiShieldCheck } from 'react-icons/hi';

const DEFAULT_TIMER_DURATION = 59;
const OTP_LENGTH = 6;
const OTP_DIGIT_INDEXES = Array.from({ length: OTP_LENGTH }, (_, index) => index);

type ResendConfig = {
  endpoint: string;
  payload?: Record<string, string>;
  timerDuration?: number;
  storageKey?: string;
};

type OtpSectionProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  errorMessage?: ReactNode;
  isSubmitting?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onResend?: () => void;
  submitLabel?: string;
  title?: string;
  description?: ReactNode;
  secureLabel?: string;
  backHref?: string;
  backText?: string;
  resend?: ResendConfig;
  showResendText?: boolean;
  timerDuration?: number;
};

const formatTimer = (seconds: number) => {
  const safeSeconds = Math.max(seconds, 0);

  return `00:${safeSeconds.toString().padStart(2, '0')}`;
};

const toOtpDigits = (value: unknown) => {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '').slice(0, OTP_LENGTH) : '';

  return OTP_DIGIT_INDEXES.map((index) => digits[index] ?? '');
};

const toOtpValue = (digits: string[]) => digits.join('');

type FixedOtpInputProps = {
  name: string;
  value: unknown;
  errorMessage?: ReactNode;
  inputRef: RefCallback<HTMLInputElement>;
  onBlur: () => void;
  onChange: (value: string) => void;
};

const FixedOtpInput = ({
  name,
  value,
  errorMessage,
  inputRef,
  onBlur,
  onChange,
}: FixedOtpInputProps) => {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState(() => toOtpDigits(value));
  const hasError = !!errorMessage;

  useEffect(() => {
    setDigits((currentDigits) => {
      if (typeof value === 'string' && value.replace(/\D/g, '') === toOtpValue(currentDigits)) {
        return currentDigits;
      }

      return toOtpDigits(value);
    });
  }, [value]);

  const commitDigits = (nextDigits: string[]) => {
    setDigits(nextDigits);
    onChange(toOtpValue(nextDigits));
  };

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const fillDigits = (startIndex: number, valueToFill: string) => {
    const nextDigits = [...digits];
    const pastedDigits = valueToFill.replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex);

    if (!pastedDigits) return;

    pastedDigits.split('').forEach((digit, offset) => {
      nextDigits[startIndex + offset] = digit;
    });

    commitDigits(nextDigits);
    focusInput(Math.min(startIndex + pastedDigits.length, OTP_LENGTH - 1));
  };

  const updateDigit = (index: number, digit: string) => {
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    commitDigits(nextDigits);
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const valueDigits = event.target.value.replace(/\D/g, '');

    if (valueDigits.length > 1) {
      fillDigits(index, valueDigits);
      return;
    }

    updateDigit(index, valueDigits);

    if (valueDigits && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      updateDigit(index, event.key);

      if (index < OTP_LENGTH - 1) {
        focusInput(index + 1);
      }

      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();

      if (digits[index]) {
        updateDigit(index, '');
        return;
      }

      if (index > 0) {
        updateDigit(index - 1, '');
        focusInput(index - 1);
      }

      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      updateDigit(index, '');
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const pastedValue = event.clipboardData.getData('text');

    if (!pastedValue.replace(/\D/g, '')) return;

    event.preventDefault();
    fillDigits(index, pastedValue);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  };

  return (
    <div className="w-full">
      <div
        role="group"
        aria-label="One-time password"
        className="grid w-full grid-cols-6 gap-1.5 min-[380px]:gap-2 sm:gap-4"
      >
        {OTP_DIGIT_INDEXES.map((index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
              if (index === 0) inputRef(element);
            }}
            name={`${name}-${index}`}
            value={digits[index]}
            aria-label={`OTP digit ${index + 1}`}
            aria-invalid={hasError}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={index === 0}
            inputMode="numeric"
            maxLength={1}
            pattern="[0-9]*"
            type="text"
            onBlur={onBlur}
            onChange={(event) => handleChange(index, event)}
            onFocus={handleFocus}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            className={`h-12 min-[380px]:h-14 sm:h-[68px] w-full min-w-0 rounded-lg border bg-white text-center text-xl sm:text-2xl font-semibold text-foreground shadow-sm transition-colors outline-none focus:ring-2 ${
              hasError
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-gray-200 focus:border-primary focus:ring-primary/20'
            }`}
          />
        ))}
      </div>
      {hasError && <p className="text-tiny text-danger mt-2">{errorMessage}</p>}
    </div>
  );
};

const OtpSection = <TFieldValues extends FieldValues,>({
  control,
  name,
  errorMessage,
  isSubmitting,
  onSubmit,
  onResend,
  submitLabel = 'Verify OTP',
  title = 'Enter OTP',
  description = "We've sent a 6-digit verification code to your registered mobile number or email.",
  secureLabel = 'Secure Verification',
  backHref = routePaths.auth.login,
  backText = 'Back to Sign In',
  resend,
  showResendText = true,
  timerDuration,
}: OtpSectionProps<TFieldValues>) => {
  const duration = timerDuration ?? resend?.timerDuration ?? DEFAULT_TIMER_DURATION;
  const storageKey = resend?.storageKey ?? 'otp_timer';
  const [timeLeft, setTimeLeft] = useState(duration);
  const [sending, setSending] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!resend);

  useEffect(() => {
    if (!resend) return;

    const savedTime = localStorage.getItem(storageKey);
    if (savedTime) {
      const parsedTime = parseInt(savedTime, 10);
      if (parsedTime > 0) setTimeLeft(parsedTime);
    }
    setIsLoaded(true);
  }, [resend, storageKey]);

  useEffect(() => {
    if (!isLoaded || timeLeft <= 0) {
      if (resend && timeLeft === 0) localStorage.removeItem(storageKey);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((currentTime) => {
        const nextTime = Math.max(currentTime - 1, 0);
        if (resend) localStorage.setItem(storageKey, nextTime.toString());

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isLoaded, resend, storageKey, timeLeft]);

  const resendOtp = async () => {
    if (!resend || timeLeft > 0) return;

    try {
      setSending(true);
      onResend?.();
      await http.post(resend.endpoint, resend.payload ?? {});
      setTimeLeft(duration);
      localStorage.setItem(storageKey, duration.toString());
      addToast({
        title: 'Success',
        color: 'success',
        description: 'OTP resent successfully',
      });
    } catch (error) {
      console.log(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="w-full max-w-xl mx-auto py-4 sm:py-0">
      <div className="mb-9 sm:mb-16">
        <Image
          src="/assets/images/logo.svg"
          alt="Logo"
          width={48}
          height={48}
          priority
          className="h-11 w-11 sm:h-12 sm:w-12 object-contain"
        />
      </div>

      <div className="mb-5 sm:mb-7 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base font-semibold text-primary">
        <HiShieldCheck size={16} className="sm:hidden" />
        <HiShieldCheck size={18} className="hidden sm:block" />
        <span>{secureLabel}</span>
      </div>

      <h1 className="text-[38px] sm:text-5xl leading-tight font-bold tracking-normal text-foreground mb-4 sm:mb-5">
        {title}
      </h1>
      <p className="text-base sm:text-lg leading-7 sm:leading-8 text-foreground-500 mb-8 sm:mb-10 max-w-md">
        {description}
      </p>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onSubmit={onSubmit}
        className="flex flex-col gap-6 sm:gap-8 w-full"
      >
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <FixedOtpInput
              name={field.name}
              value={typeof field.value === 'string' ? field.value : ''}
              inputRef={field.ref}
              onBlur={field.onBlur}
              onChange={field.onChange}
              errorMessage={errorMessage}
            />
          )}
        />

        <div className="flex items-center justify-between gap-3 text-sm min-[380px]:text-base">
          {timeLeft > 0 ? (
            <p className="font-medium text-foreground">
              Code expires in{' '}
              <span className="font-semibold text-primary">{formatTimer(timeLeft)}</span>
            </p>
          ) : (
            <span />
          )}
          {showResendText && (
            <button
              type="button"
              disabled={!resend || timeLeft > 0 || sending}
              onClick={resendOtp}
              className="shrink-0 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-80"
            >
              {sending ? 'Sending...' : 'Resend OTP'}
            </button>
          )}
        </div>

        <Button
          type="submit"
          color="primary"
          size="lg"
          radius="sm"
          isLoading={isSubmitting}
          startContent={!isSubmitting ? <HiLockClosed size={20} /> : null}
          className="h-[52px] sm:h-14 w-full text-base sm:text-lg font-semibold text-white shadow-lg shadow-primary/25"
        >
          {submitLabel}
        </Button>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6 text-sm text-foreground-400">
          <span className="h-px bg-gray-200" />
          <span>or</span>
          <span className="h-px bg-gray-200" />
        </div>

        <p className="text-center text-base text-foreground-500">
          Wrong account?{' '}
          <Link href={backHref} className="font-medium text-primary hover:underline">
            {backText}
          </Link>
        </p>
      </motion.form>
    </section>
  );
};

export default OtpSection;
