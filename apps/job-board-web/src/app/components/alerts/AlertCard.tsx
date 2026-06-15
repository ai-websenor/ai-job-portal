'use client';

import { Button, Chip } from '@heroui/react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiClock, FiZap } from 'react-icons/fi';
import routePaths from '@/app/config/routePaths';
import type { Alert } from '@/app/types/alerts';

type Props = {
  alert: Alert;
};

const severityStyles = {
  info: {
    strip: 'bg-secondary',
    iconWrap: 'bg-secondary',
    icon: 'text-primary',
    chip: 'border-primary/10 bg-secondary text-primary',
    chipLabel: 'Info',
  },
  warning: {
    strip: 'bg-amber-50',
    iconWrap: 'bg-amber-50',
    icon: 'text-amber-600',
    chip: 'border-amber-100 bg-amber-50 text-amber-700',
    chipLabel: 'Warning',
  },
  critical: {
    strip: 'bg-red-50',
    iconWrap: 'bg-red-50',
    icon: 'text-red-600',
    chip: 'border-red-100 bg-red-50 text-red-700',
    chipLabel: 'Critical',
  },
} as const;

const typeIcons = {
  interview_today: FiCalendar,
  low_credits: FiZap,
  job_expiring: FiClock,
} as const;

const resolveHref = (alert: Alert) => {
  switch (alert.type) {
    case 'low_credits':
      return routePaths.employee.plans.list;
    default:
      return alert.actionUrl;
  }
};

const AlertCard = ({ alert }: Props) => {
  const router = useRouter();
  const styles = severityStyles[alert.severity];
  const Icon = typeIcons[alert.type];
  const href = resolveHref(alert);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={clsx('absolute left-0 top-0 h-full w-1', styles.strip)} />

      {/* Top Right Chip */}
      <Chip
        size="sm"
        variant="flat"
        className={clsx(
          'absolute right-4 top-4 z-10 font-bold',
          styles.chip,
        )}
      >
        {styles.chipLabel}
      </Chip>

      <div className="flex flex-col items-start gap-4 pl-1">
        <div
          className={clsx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl',
            styles.iconWrap,
          )}
        >
          <Icon className={styles.icon} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-gray-950">
            {alert.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {alert.message}
          </p>

          <Button
            color="primary"
            radius="lg"
            className="mt-5 w-full font-bold"
            onPress={() => router.push(href)}
          >
            {alert.actionLabel}
          </Button>
        </div>
      </div>
    </article>
  );
};

export default AlertCard;