'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import AlertCard from './AlertCard';
import type { Alert } from '@/app/types/alerts';

type AlertsCarouselProps = {
  alerts: Alert[];
  slidesPerView?: number;
  autoPlay?: boolean;
  intervalMs?: number;
  loop?: boolean;
};

const AlertsCarousel = ({
  alerts,
  slidesPerView = 1,
  autoPlay = true,
  intervalMs = 5000,
  loop = true,
}: AlertsCarouselProps) => {
  const [page, setPage] = useState(0);
  const pausedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const normalizedSlidesPerView = Math.max(1, slidesPerView);
  const pages = Math.ceil(alerts.length / normalizedSlidesPerView);
  const shouldAutoplay = autoPlay && pages > 1 && !reduceMotion;

  useEffect(() => {
    if (page >= pages) {
      setPage(0);
    }
  }, [page, pages]);

  useEffect(() => {
    if (!shouldAutoplay) {
      return;
    }

    const id = window.setInterval(() => {
      if (pausedRef.current) {
        return;
      }

      setPage((current) => {
        if (current + 1 >= pages) {
          return loop ? 0 : current;
        }

        return current + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, loop, pages, shouldAutoplay]);

  const offset = `-${page * 100}%`;

  if (!alerts.length) {
    return null;
  }

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Alerts"
      className="overflow-hidden"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onFocusCapture={() => {
        pausedRef.current = true;
      }}
      onBlurCapture={() => {
        pausedRef.current = false;
      }}
    >
      <motion.div
        className="flex"
        animate={{ x: offset }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
      >
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="shrink-0 px-0.5"
            style={{ width: `${100 / normalizedSlidesPerView}%` }}
          >
            <AlertCard alert={alert} />
          </div>
        ))}
      </motion.div>

      {pages > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {Array.from({ length: pages }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to alert ${index + 1}`}
              onClick={() => setPage(index)}
              className={clsx(
                'h-2 rounded-full transition-all',
                index === page ? 'w-5 bg-primary' : 'w-2 bg-gray-300',
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default AlertsCarousel;
