'use client';

import http from '@/app/api/http';
import { addToast, Button } from '@heroui/react';
import { useEffect, useState } from 'react';

const TIMER_DURATION = 30;

type Props = { endpoint: string; payload?: Record<string, string> };

const ResendOtpButton = ({ endpoint, payload = {} }: Props) => {
  const [sending, setSending] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);

  useEffect(() => {
    const savedTime = localStorage.getItem('otp_timer');
    if (savedTime) {
      const parsedTime = parseInt(savedTime, 10);
      if (parsedTime > 0) setTimeLeft(parsedTime);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || timeLeft <= 0) {
      if (timeLeft === 0) localStorage.removeItem('otp_timer');
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        const nextValue = prev - 1;
        localStorage.setItem('otp_timer', nextValue.toString());
        return nextValue;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isLoaded]);

  const resendOtp = async () => {
    try {
      setSending(true);
      await http.post(endpoint, payload);
      setTimeLeft(TIMER_DURATION);
      localStorage.setItem('otp_timer', TIMER_DURATION.toString());
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
    <div className="flex items-center">
      {timeLeft > 0 ? (
        <p className="text-sm text-default-500 font-medium">
          Resend OTP in <span className="text-primary">{timeLeft}s</span>
        </p>
      ) : (
        <Button
          type="button"
          size="sm"
          color="primary"
          variant="light"
          isLoading={sending}
          className="w-fit font-medium"
          onPress={resendOtp}
        >
          Resend OTP
        </Button>
      )}
    </div>
  );
};

export default ResendOtpButton;
