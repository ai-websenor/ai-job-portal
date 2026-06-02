'use client';

import { useEffect, useState } from 'react';

type Props = {
  seconds?: number;
  onCountdownEnd?: () => void;
};

const RateLimitToastDescription = ({ seconds = 60, onCountdownEnd }: Props) => {
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    setSecondsLeft(seconds);

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 1));
    }, 1000);

    const timeout = window.setTimeout(() => {
      onCountdownEnd?.();
    }, seconds * 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [onCountdownEnd, seconds]);

  return (
    <div className="grid w-full min-w-[240px] max-w-[320px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <p className="w-full text-sm leading-5 text-foreground-600">
        Please try after {seconds} seconds.
      </p>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {secondsLeft}s
      </span>
    </div>
  );
};

export default RateLimitToastDescription;
